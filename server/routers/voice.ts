/**
 * Voice Router
 * Handles voice transcription for protocol queries
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { transcribeAudio } from "../_core/voiceTranscription";
import { storagePut } from "../storage";

export const voiceRouter = router({
  transcribe: protectedProcedure
    .input(z.object({
      audioUrl: z.string(),
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

  uploadAudio: protectedProcedure
    .input(z.object({
      audioBase64: z.string(),
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
