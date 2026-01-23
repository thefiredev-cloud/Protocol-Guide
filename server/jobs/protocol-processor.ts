/**
 * Protocol Processor Job
 * Processes uploaded PDF protocols: extracts text, chunks, generates embeddings
 */

import * as db from "../db";
import { createClient } from "@supabase/supabase-js";

// Supabase client for vector storage
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Voyage AI for embeddings
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;
const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";

interface ChunkResult {
  content: string;
  protocolNumber: string;
  protocolTitle: string;
  section: string | null;
  pageNumber?: number;
}

/**
 * Process a single protocol upload
 */
export async function processProtocolUpload(uploadId: number): Promise<{
  success: boolean;
  chunksCreated: number;
  error?: string;
}> {
  console.log(`[ProtocolProcessor] Starting processing for upload ${uploadId}`);

  try {
    // Get upload record
    const upload = await db.getProtocolUpload(uploadId);
    if (!upload) {
      return { success: false, chunksCreated: 0, error: "Upload not found" };
    }

    if (upload.status !== "pending") {
      return { success: false, chunksCreated: 0, error: `Upload status is ${upload.status}, expected pending` };
    }

    // Update status to processing
    await db.updateProtocolUploadStatus(uploadId, "processing");

    // Download PDF from storage
    console.log(`[ProtocolProcessor] Downloading PDF from ${upload.fileUrl}`);
    const pdfResponse = await fetch(upload.fileUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to download PDF: ${pdfResponse.statusText}`);
    }
    const pdfBuffer = await pdfResponse.arrayBuffer();

    // Extract text from PDF
    await db.updateProtocolUploadStatus(uploadId, "chunking", { progress: 10 });
    console.log(`[ProtocolProcessor] Extracting text from PDF`);

    const extractedText = await extractTextFromPdf(Buffer.from(pdfBuffer));

    // Get protocol version info for metadata
    const { protocolVersions } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const dbInstance = await db.getDb();

    let protocolNumber = "UNKNOWN";
    let protocolTitle = upload.fileName.replace(".pdf", "");

    if (dbInstance) {
      const [version] = await dbInstance
        .select()
        .from(protocolVersions)
        .where(eq(protocolVersions.sourceFileUrl, upload.fileUrl))
        .limit(1);

      if (version) {
        protocolNumber = version.protocolNumber;
        protocolTitle = version.title;
      }
    }

    // Chunk the extracted text
    console.log(`[ProtocolProcessor] Chunking text`);
    const chunks = chunkProtocolText(extractedText, protocolNumber, protocolTitle);
    console.log(`[ProtocolProcessor] Created ${chunks.length} chunks`);

    await db.updateProtocolUploadStatus(uploadId, "embedding", { progress: 40 });

    // Generate embeddings in batches
    console.log(`[ProtocolProcessor] Generating embeddings`);
    const embeddedChunks = await generateEmbeddings(chunks);

    await db.updateProtocolUploadStatus(uploadId, "embedding", { progress: 70 });

    // Get agency info
    const agency = await db.getAgencyById(upload.agencyId);
    const stateCode = agency?.stateCode || "CA";

    // Insert chunks into Supabase
    console.log(`[ProtocolProcessor] Inserting ${embeddedChunks.length} chunks into Supabase`);

    const insertData = embeddedChunks.map((chunk) => ({
      agency_id: upload.agencyId,
      state_code: stateCode,
      protocol_number: chunk.protocolNumber,
      protocol_title: chunk.protocolTitle,
      section: chunk.section,
      content: chunk.content,
      embedding: chunk.embedding,
      metadata: {
        source_file: upload.fileName,
        upload_id: uploadId,
        page_number: chunk.pageNumber,
      },
    }));

    // Insert in batches of 100
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < insertData.length; i += batchSize) {
      const batch = insertData.slice(i, i + batchSize);
      const { error } = await supabase.from("manus_protocol_chunks").insert(batch);

      if (error) {
        console.error(`[ProtocolProcessor] Insert error:`, error);
        throw new Error(`Failed to insert chunks: ${error.message}`);
      }

      insertedCount += batch.length;
      const progress = 70 + Math.floor((insertedCount / insertData.length) * 25);
      await db.updateProtocolUploadStatus(uploadId, "embedding", {
        progress,
        chunksCreated: insertedCount,
      });
    }

    // Mark as completed
    await db.updateProtocolUploadStatus(uploadId, "completed", {
      progress: 100,
      chunksCreated: insertedCount,
    });

    // Update protocol version with chunk count
    if (dbInstance) {
      const { protocolVersions } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      await dbInstance
        .update(protocolVersions)
        .set({ chunksGenerated: insertedCount })
        .where(eq(protocolVersions.sourceFileUrl, upload.fileUrl));
    }

    console.log(`[ProtocolProcessor] Completed processing upload ${uploadId}: ${insertedCount} chunks`);

    return { success: true, chunksCreated: insertedCount };
  } catch (error) {
    console.error(`[ProtocolProcessor] Error processing upload ${uploadId}:`, error);

    await db.updateProtocolUploadStatus(uploadId, "failed", {
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      success: false,
      chunksCreated: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Extract text from PDF buffer
 * Uses pdf-parse or similar library
 */
async function extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
  // Dynamic import for pdf-parse (may not be available in all environments)
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(pdfBuffer);
    return data.text;
  } catch (error) {
    console.warn("[ProtocolProcessor] pdf-parse not available, using fallback");
    // Fallback: return empty string, will need manual processing
    throw new Error("PDF parsing not available. Install pdf-parse package.");
  }
}

/**
 * Chunk protocol text into semantic sections
 */
function chunkProtocolText(
  text: string,
  protocolNumber: string,
  protocolTitle: string
): ChunkResult[] {
  const chunks: ChunkResult[] = [];

  // Split by common protocol section markers
  const sectionPatterns = [
    /^#{1,3}\s+(.+)$/gm, // Markdown headers
    /^(?:SECTION|Section)\s*(\d+[\.\d]*)[:\s]+(.+)$/gm,
    /^(?:CHAPTER|Chapter)\s*(\d+)[:\s]+(.+)$/gm,
    /^\d+\.\d+[\.\d]*\s+(.+)$/gm, // Numbered sections like 1.2.3
    /^(?:PROCEDURE|Procedure|TREATMENT|Treatment|ASSESSMENT|Assessment)[:\s]*(.*)$/gm,
  ];

  // Simple chunking by paragraphs with overlap
  const paragraphs = text.split(/\n\s*\n/);
  let currentChunk = "";
  let currentSection: string | null = null;
  const maxChunkSize = 1500; // Characters
  const overlapSize = 200;

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    // Check if this is a section header
    for (const pattern of sectionPatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        currentSection = match[1] || match[0];
        break;
      }
    }

    // Add to current chunk
    if (currentChunk.length + trimmed.length > maxChunkSize) {
      // Save current chunk
      if (currentChunk.trim()) {
        chunks.push({
          content: currentChunk.trim(),
          protocolNumber,
          protocolTitle,
          section: currentSection,
        });
      }

      // Start new chunk with overlap
      const words = currentChunk.split(/\s+/);
      const overlapWords = words.slice(-Math.ceil(overlapSize / 6)); // ~6 chars per word
      currentChunk = overlapWords.join(" ") + "\n\n" + trimmed;
    } else {
      currentChunk += "\n\n" + trimmed;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      protocolNumber,
      protocolTitle,
      section: currentSection,
    });
  }

  return chunks;
}

/**
 * Generate embeddings for chunks using Voyage AI
 */
async function generateEmbeddings(
  chunks: ChunkResult[]
): Promise<(ChunkResult & { embedding: number[] })[]> {
  if (!VOYAGE_API_KEY) {
    throw new Error("VOYAGE_API_KEY not configured");
  }

  const results: (ChunkResult & { embedding: number[] })[] = [];
  const batchSize = 100; // Voyage AI batch limit

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const texts = batch.map((c) => c.content);

    const response = await fetch(VOYAGE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "voyage-3",
        input: texts,
        input_type: "document",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Voyage AI error: ${response.status} ${error}`);
    }

    const data = await response.json();

    // Map embeddings back to chunks
    for (let j = 0; j < batch.length; j++) {
      results.push({
        ...batch[j],
        embedding: data.data[j].embedding,
      });
    }

    // Rate limiting: small delay between batches
    if (i + batchSize < chunks.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * Process all pending uploads (called by cron job)
 */
export async function processPendingUploads(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const pendingUploads = await db.getPendingProtocolUploads(5); // Process 5 at a time

  let succeeded = 0;
  let failed = 0;

  for (const upload of pendingUploads) {
    const result = await processProtocolUpload(upload.id);
    if (result.success) {
      succeeded++;
    } else {
      failed++;
    }
  }

  return {
    processed: pendingUploads.length,
    succeeded,
    failed,
  };
}
