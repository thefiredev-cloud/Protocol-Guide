/**
 * Contact Router
 * Handles public contact form submissions
 */

import { z } from "zod";
import { strictPublicRateLimitedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const contactRouter = router({
  submit: strictPublicRateLimitedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      email: z.string().email().max(320),
      message: z.string().min(10).max(5000),
    }))
    .mutation(async ({ input }) => {
      try {
        await db.createContactSubmission({
          name: input.name,
          email: input.email,
          message: input.message,
        });
        return { success: true, error: null };
      } catch (error) {
        console.error("Failed to submit contact form:", error);
        return { success: false, error: "Failed to submit. Please try again." };
      }
    }),
});

export type ContactRouter = typeof contactRouter;
