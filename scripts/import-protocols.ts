/**
 * Import scraped protocol content into the protocol_chunks table
 */
import "./load-env.js";
import { drizzle } from "drizzle-orm/mysql2";
import { protocolChunks, counties } from "../drizzle/schema";
import { eq, like, or } from "drizzle-orm";
import mysql from "mysql2/promise";
import * as fs from "fs";
import * as path from "path";

// Map of source names to state names for county matching
const SOURCE_TO_STATE: Record<string, string> = {
  "Alabama State EMS Protocols": "Alabama",
  "Wyoming Department of Health EMS": "Wyoming",
  "Nebraska State EMS Protocols": "Nebraska",
  "Oklahoma State EMS Protocols": "Oklahoma",
  "Hawaii State EMS Protocols": "Hawaii",
  "New Hampshire Fire Standards and Training and Emergency Medical Services": "New Hampshire",
  "Vermont State EMS Protocols": "Vermont",
  "Maine State EMS Protocols": "Maine",
  "South Carolina State EMS Protocols": "South Carolina",
  "Kentucky State EMS Protocols": "Kentucky",
  "West Virginia Office of Emergency Medical Services": "West Virginia",
  "Maryland Institute for Emergency Medical Services Systems": "Maryland",
  "Connecticut State EMS Protocols": "Connecticut",
  "Massachusetts Office of Emergency Medical Services": "Massachusetts",
  "Oregon State EMS Protocols": "Oregon",
  "Idaho State EMS Protocols": "Idaho",
  "Kansas Board of Emergency Medical Services": "Kansas",
  "Iowa State EMS Protocols": "Iowa",
  "North Dakota State EMS Protocols": "North Dakota",
  "South Dakota State EMS Protocols": "South Dakota",
  "Northwest Arkansas Regional EMS Protocols": "Arkansas",
  "Mississippi State EMS Protocols": "Mississippi",
  "Seattle and King County EMT Patient Care Guidelines": "Washington",
  "Denver Metro EMS Medical Directors": "Colorado",
  "Denver Health Paramedic Division": "Colorado",
  "Multnomah County EMS Protocols": "Oregon",
  "City of Laramie Fire Department EMS": "Wyoming",
  "EMSAOK - Emergency Medical Services Authority": "Oklahoma",
  "EMS System for Metropolitan Oklahoma City and Tulsa": "Oklahoma",
  "Kansas City, Missouri EMS Medical Protocols": "Missouri",
  "DeSoto County, MS EMS": "Mississippi",
  "AMR - Central Mississippi/Hinds": "Mississippi",
  "Montgomery County Fire & Rescue Service": "Maryland",
  "Prince George's County Fire/EMS Department": "Maryland",
  "Baltimore County MD Fire Department": "Maryland",
  "Baltimore City Fire Department": "Maryland",
  "Richland County SC EMS": "South Carolina",
  "Greenville County Emergency Medical Services": "South Carolina",
  "Charleston County EMS Protocols": "South Carolina",
  "Teton County, WY EMS": "Wyoming",
  "Sanford Health EMS": "North Dakota",
  "Cleveland Clinic EMS": "Ohio",
  "Grady EMS": "Georgia",
  "Mayo Clinic Ambulance Service": "Minnesota",
};

interface ProtocolChunk {
  protocolNumber: string;
  protocolTitle: string;
  section: string;
  content: string;
  sourcePdfUrl: string;
}

function parseProtocolFile(content: string, sourceUrl: string): ProtocolChunk[] {
  const chunks: ProtocolChunk[] = [];
  
  // Split by protocol separator (---)
  const sections = content.split(/\n---\n/);
  
  for (const section of sections) {
    if (!section.trim()) continue;
    
    // Try to extract protocol title
    const titleMatch = section.match(/Protocol Title:\s*(.+)/i) || 
                       section.match(/^#+\s*(.+)/m) ||
                       section.match(/^\*\*(.+?)\*\*/m);
    
    const protocolTitle = titleMatch ? titleMatch[1].trim() : "General Protocol";
    
    // Try to extract protocol number/ID
    const idMatch = section.match(/Protocol ID:\s*(.+)/i) ||
                    section.match(/Protocol Number:\s*(.+)/i) ||
                    section.match(/^(\d+[\.\-]\d+)/m);
    
    const protocolNumber = idMatch && idMatch[1] !== "Not specified" ? idMatch[1].trim() : "";
    
    // Clean up the content
    let cleanContent = section
      .replace(/Protocol Title:\s*.+/i, "")
      .replace(/Protocol ID:\s*.+/i, "")
      .replace(/Protocol Number:\s*.+/i, "")
      .replace(/Clinical Content:/i, "")
      .trim();
    
    // Skip if content is too short
    if (cleanContent.length < 50) continue;
    
    // Determine section type from content
    let sectionType = "General";
    if (/cardiac|heart|stemi|arrest|vf|vtach|bradycardia|tachycardia/i.test(protocolTitle)) {
      sectionType = "Cardiac";
    } else if (/respiratory|asthma|copd|breathing|airway|chf|pulmonary/i.test(protocolTitle)) {
      sectionType = "Respiratory";
    } else if (/trauma|injury|bleeding|hemorrhage|fracture/i.test(protocolTitle)) {
      sectionType = "Trauma";
    } else if (/stroke|seizure|neuro|altered|consciousness/i.test(protocolTitle)) {
      sectionType = "Neurological";
    } else if (/overdose|poison|toxic|naloxone|opioid/i.test(protocolTitle)) {
      sectionType = "Toxicology";
    } else if (/pediatric|child|infant|newborn|neonatal/i.test(protocolTitle)) {
      sectionType = "Pediatric";
    } else if (/allergy|anaphylaxis/i.test(protocolTitle)) {
      sectionType = "Allergic/Anaphylaxis";
    } else if (/diabetic|glucose|hypoglycemia|hyperglycemia/i.test(protocolTitle)) {
      sectionType = "Diabetic Emergency";
    } else if (/ob|obstetric|pregnancy|childbirth|delivery/i.test(protocolTitle)) {
      sectionType = "OB/GYN";
    } else if (/pain|sedation|medication/i.test(protocolTitle)) {
      sectionType = "Pain Management";
    } else if (/abdominal|gi|gastrointestinal/i.test(protocolTitle)) {
      sectionType = "Abdominal";
    }
    
    chunks.push({
      protocolNumber,
      protocolTitle,
      section: sectionType,
      content: cleanContent.substring(0, 10000), // Limit content size
      sourcePdfUrl: sourceUrl,
    });
  }
  
  return chunks;
}

async function importProtocols() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL not set");
  }

  const pool = mysql.createPool(connectionString);
  const db = drizzle(pool);

  try {
    // Read the CSV results
    const csvPath = "/home/ubuntu/scrape_ems_protocols.csv";
    const csvContent = fs.readFileSync(csvPath, "utf-8");
    const lines = csvContent.split("\n").slice(1); // Skip header

    let totalChunks = 0;
    let successfulSources = 0;

    for (const line of lines) {
      if (!line.trim()) continue;

      // Parse CSV line (handle commas in quoted fields)
      const parts = line.match(/(".*?"|[^,]+)(?=,|$)/g);
      if (!parts || parts.length < 6) continue;

      const sourceUrl = parts[0].replace(/"/g, "").trim();
      const sourceName = parts[1].replace(/"/g, "").trim();
      const protocolsFound = parseInt(parts[3]) || 0;
      const contentPath = parts[4].replace(/"/g, "").trim();
      const accessStatus = parts[5].replace(/"/g, "").trim();

      // Skip failed sources
      if (accessStatus === "error" || accessStatus === "not_found" || accessStatus === "login_required") {
        console.log(`Skipping ${sourceName}: ${accessStatus}`);
        continue;
      }

      // Skip if no content file
      if (!contentPath || !fs.existsSync(contentPath)) {
        console.log(`No content file for ${sourceName}`);
        continue;
      }

      // Read and parse the protocol content
      const content = fs.readFileSync(contentPath, "utf-8");
      if (content.length < 100) {
        console.log(`Content too short for ${sourceName}`);
        continue;
      }

      const chunks = parseProtocolFile(content, sourceUrl);
      if (chunks.length === 0) {
        console.log(`No chunks parsed for ${sourceName}`);
        continue;
      }

      // Find matching county/entity in database
      const state = SOURCE_TO_STATE[sourceName];
      let countyId: number | null = null;

      if (state) {
        // For state protocols, find any county in that state
        const stateCounties = await db.select().from(counties).where(eq(counties.state, state)).limit(1);
        if (stateCounties.length > 0) {
          countyId = stateCounties[0].id;
        }
      } else {
        // Try to find by name match
        const nameMatch = await db.select().from(counties).where(
          like(counties.name, `%${sourceName.split(" ")[0]}%`)
        ).limit(1);
        if (nameMatch.length > 0) {
          countyId = nameMatch[0].id;
        }
      }

      if (!countyId) {
        // Create a new county entry for this source
        const result = await db.insert(counties).values({
          name: sourceName,
          state: state || "Unknown",
          usesStateProtocols: false,
          protocolVersion: "2025",
        });
        countyId = Number(result[0].insertId);
      }

      // Insert protocol chunks
      for (const chunk of chunks) {
        try {
          await db.insert(protocolChunks).values({
            countyId,
            protocolNumber: chunk.protocolNumber || "N/A",
            protocolTitle: chunk.protocolTitle,
            section: chunk.section,
            content: chunk.content,
            sourcePdfUrl: chunk.sourcePdfUrl,
          });
          totalChunks++;
        } catch (error: any) {
          // Skip duplicates
          if (!error.message?.includes("Duplicate")) {
            console.error(`Error inserting chunk: ${error.message}`);
          }
        }
      }

      successfulSources++;
      console.log(`Imported ${chunks.length} chunks from ${sourceName}`);
    }

    console.log(`\n=== Import Complete ===`);
    console.log(`Successful sources: ${successfulSources}`);
    console.log(`Total protocol chunks imported: ${totalChunks}`);
  } catch (error) {
    console.error("Error importing protocols:", error);
    throw error;
  } finally {
    // Always close pool, even on error
    await pool.end();
  }
}

importProtocols().catch(console.error);
