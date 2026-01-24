/**
 * Voice Router
 * Handles voice transcription for protocol queries
 */

import { z } from "zod";
import { rateLimitedProcedure, router } from "../_core/trpc";
import { transcribeAudio } from "../_core/voiceTranscription";
import { storagePut } from "../storage";

// Allowlist for audio URLs - only accept uploads from our storage
const ALLOWED_URL_PATTERNS = [
  /^https:\/\/storage\.protocol-guide\.com\//,
  /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\//,
  /^https:\/\/[a-z0-9-]+\.r2\.cloudflarestorage\.com\//,
];

function isAllowedUrl(url: string): boolean {
  try {
    new URL(url); // Validate URL format
    return ALLOWED_URL_PATTERNS.some(pattern => pattern.test(url));
  } catch {
    return false;
  }
}

export const voiceRouter = router({
  transcribe: rateLimitedProcedure
    .input(z.object({
      audioUrl: z.string().url().refine(isAllowedUrl, {
        message: "Audio URL must be from an authorized storage domain",
      }),
      language: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await transcribeAudio({
        audioUrl: input.audioUrl,
        language: input.language,
        prompt: "Transcribe the EMS professional's voice query about medical protocols",
      });

      if ('error' in result) {
        return {
          success: false,
          error: result.error,
          text: null,
        };
      }

      return {
        success: true,
        error: null,
        text: result.text,
      };
    }),

  uploadAudio: rateLimitedProcedure
    .input(z.object({
      // Max 10MB base64 (actual file ~7.5MB after encoding overhead)
      audioBase64: z.string().max(10_000_000, "Audio file exceeds 10MB limit"),
      mimeType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const timestamp = Date.now();
      const extension = input.mimeType.split('/')[1] || 'webm';
      const key = `voice/${ctx.user.id}/${timestamp}.${extension}`;

      // Decode base64 to buffer
      const buffer = Buffer.from(input.audioBase64, 'base64');

      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url };
    }),
});

export type VoiceRouter = typeof voiceRouter;
