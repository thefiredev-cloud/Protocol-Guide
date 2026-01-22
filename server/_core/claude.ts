/**
 * Protocol Guide (Manus) - Claude SDK Integration
 *
 * Tiered LLM routing:
 * - Free tier: Haiku 4.5 only
 * - Pro tier (simple): Haiku 4.5 (fast, cheap)
 * - Pro tier (complex): Sonnet 4.5 (higher accuracy)
 *
 * Cost optimization:
 * - Free: ~$0.0003-0.0005/query
 * - Pro simple: ~$0.0003-0.0005/query
 * - Pro complex: ~$0.002-0.004/query
 *
 * Features:
 * - Exponential backoff retry logic (3 retries, 1s-10s delay)
 * - Custom error types for better error handling
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  parseClaudeError,
  isRetryableError,
  ClaudeApiError,
  ProtocolGuideError,
} from './errors';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Model constants - Updated for 2025 models
const MODELS = {
  HAIKU: 'claude-haiku-4-5-20251001',
  SONNET: 'claude-sonnet-4-5-20250929',
} as const;

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
} as const;

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay for exponential backoff
 */
function calculateBackoffDelay(attempt: number): number {
  const delay = RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
  // Add jitter (10-20% random variation) to prevent thundering herd
  const jitter = delay * (0.1 + Math.random() * 0.1);
  return Math.min(delay + jitter, RETRY_CONFIG.maxDelayMs);
}

/**
 * Execute a function with exponential backoff retry logic
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  operationName: string
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const parsedError = parseClaudeError(error);

      // Log the error
      console.error(
        `[Claude] ${operationName} failed (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}):`,
        parsedError.message
      );

      // Don't retry if error is not retryable or we've exhausted retries
      if (!isRetryableError(error) || attempt === RETRY_CONFIG.maxRetries) {
        throw parsedError;
      }

      // Calculate delay and wait before retrying
      const delayMs = calculateBackoffDelay(attempt);
      console.log(`[Claude] Retrying ${operationName} in ${Math.round(delayMs)}ms...`);
      await sleep(delayMs);
    }
  }

  // Should never reach here, but TypeScript needs this
  throw parseClaudeError(lastError || new Error('Unknown error'));
}

// User tier type
export type UserTier = 'free' | 'pro' | 'enterprise';

// Protocol context for RAG
export interface ProtocolContext {
  id: number;
  protocolNumber: string;
  protocolTitle: string;
  section: string | null;
  content: string;
  imageUrls?: string[] | null;
  similarity?: number;
}

// Response structure
export interface ClaudeResponse {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  stopReason: string | null;
}
// EMS System Prompt - Critical for clinical accuracy and safety
const EMS_SYSTEM_PROMPT = `You are Protocol Guide, an EMS protocol retrieval assistant for paramedics and EMTs on 911 calls.

CRITICAL SAFETY RULES:
1. RETRIEVAL-ONLY: Only provide information from the protocols given to you. NEVER generate clinical content, drug dosages, or medical advice from your training data.
2. CITE SOURCES: Every response MUST include the protocol number and title.
3. CONCISE: Maximum 3-10 sentences. Paramedics need fast, actionable answers.
4. NO ASSUMPTIONS: If the query is unclear or protocols don't cover it, say "Contact medical control."
5. PEDIATRIC ALERTS: Always flag weight-based dosing considerations for pediatric patients.

RESPONSE FORMAT:
**[Protocol Title]** (Protocol #[Number])

[2-5 action-focused sentences with specific doses, routes, and considerations]

Key Actions:
• [Action 1 with dose/route if applicable]
• [Action 2]
• [Action 3]

⚠️ [Any critical warnings or contraindications]

Ref: [Section/Page] | Agency: [Agency Name]

IMPORTANT:
- If protocol includes images, mention: "See protocol images for [procedure/anatomy]"
- For medication queries, always include: dose, route, max dose, and key contraindications
- If no matching protocol found: "No protocol found for this query. Contact medical control for guidance."
- Never say "I think" or "I believe" - only state what the protocol says`;

/**
 * Determines if a query should use Sonnet (complex) or Haiku (simple)
 * Only Pro users get Sonnet access, and only for complex queries
 */
function shouldUseSonnet(query: string, userTier: UserTier): boolean {
  // Free users always use Haiku
  if (userTier === 'free') return false;

  // Check for complexity indicators that warrant Sonnet
  const complexityIndicators = [
    'multiple', 'compare', 'differential', 'versus', 'vs',
    'pediatric and adult', 'contraindicated', 'interaction',
    'why', 'explain', 'mechanism', 'reasoning',
    'pregnancy', 'pregnant', 'neonatal', 'neonate',
    'complex', 'complicated', 'unusual', 'atypical',
  ];

  const queryLower = query.toLowerCase();
  return complexityIndicators.some(indicator => queryLower.includes(indicator));
}


/**
 * Build the user prompt with protocol context
 */
function buildPrompt(query: string, protocols: ProtocolContext[], agencyName?: string): string {
  if (protocols.length === 0) {
    return `Agency: ${agencyName || 'Unknown'}

No matching protocols were found in the database.

User Query: ${query}

Please respond that no protocol was found and advise contacting medical control.`;
  }

  const protocolContext = protocols
    .map((p, i) => `
--- PROTOCOL ${i + 1} ---
Protocol #: ${p.protocolNumber}
Title: ${p.protocolTitle}
Section: ${p.section || 'General'}
${p.imageUrls?.length ? `Images Available: ${p.imageUrls.join(', ')}` : ''}
Content:
${p.content}
${p.similarity ? `(Relevance: ${Math.round(p.similarity * 100)}%)` : ''}
`)
    .join('\n');

  return `Agency: ${agencyName || 'Unknown'}

=== AVAILABLE PROTOCOLS ===
${protocolContext}
=== END PROTOCOLS ===

User Query: ${query}

Based ONLY on the protocols above, provide a concise, actionable response. Cite the protocol number and title.`;
}


/**
 * Main RAG invocation function
 * Routes to Haiku or Sonnet based on tier and query complexity
 * Includes exponential backoff retry logic for transient failures
 */
export async function invokeClaudeRAG(params: {
  query: string;
  protocols: ProtocolContext[];
  userTier: UserTier;
  agencyName?: string;
}): Promise<ClaudeResponse> {
  const { query, protocols, userTier, agencyName } = params;

  // Determine model based on tier and complexity
  const useSonnet = shouldUseSonnet(query, userTier);
  const model = useSonnet ? MODELS.SONNET : MODELS.HAIKU;

  const userPrompt = buildPrompt(query, protocols, agencyName);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      system: EMS_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Extract text content
    const textContent = response.content.find(c => c.type === 'text');
    const content = textContent?.type === 'text' ? textContent.text : '';

    return {
      content,
      model: response.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      stopReason: response.stop_reason,
    };
  }, 'invokeClaudeRAG');
}


/**
 * Simple query helper (no RAG, direct question)
 * Useful for medication lookups or general questions
 */
export async function invokeClaudeSimple(params: {
  query: string;
  userTier: UserTier;
  systemPrompt?: string;
}): Promise<ClaudeResponse> {
  const { query, userTier, systemPrompt } = params;

  // Always use Haiku for simple queries
  const model = MODELS.HAIKU;

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 512,
      system: systemPrompt || 'You are a helpful medical reference assistant. Be concise and accurate.',
      messages: [
        {
          role: 'user',
          content: query,
        },
      ],
    });

    const textContent = response.content.find(c => c.type === 'text');
    const content = textContent?.type === 'text' ? textContent.text : '';

    return {
      content,
      model: response.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      stopReason: response.stop_reason,
    };
  } catch (error) {
    console.error('Claude API error:', error);
    throw new Error(`Claude invocation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


/**
 * Streaming response for real-time output
 * Better UX for longer responses
 */
export async function* streamClaudeRAG(params: {
  query: string;
  protocols: ProtocolContext[];
  userTier: UserTier;
  agencyName?: string;
}): AsyncGenerator<string, ClaudeResponse, unknown> {
  const { query, protocols, userTier, agencyName } = params;

  const useSonnet = shouldUseSonnet(query, userTier);
  const model = useSonnet ? MODELS.SONNET : MODELS.HAIKU;

  const userPrompt = buildPrompt(query, protocols, agencyName);

  const stream = anthropic.messages.stream({
    model,
    max_tokens: 1024,
    system: EMS_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  let fullContent = '';
  let inputTokens = 0;
  let outputTokens = 0;

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      fullContent += event.delta.text;
      yield event.delta.text;
    }
    if (event.type === 'message_delta' && event.usage) {
      outputTokens = event.usage.output_tokens;
    }
    if (event.type === 'message_start' && event.message.usage) {
      inputTokens = event.message.usage.input_tokens;
    }
  }

  return {
    content: fullContent,
    model,
    inputTokens,
    outputTokens,
    stopReason: 'end_turn',
  };
}

// Export model constants for reference
export { MODELS };
