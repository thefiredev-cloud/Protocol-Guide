/**
 * Feedback Router
 * Handles user feedback submissions
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const feedbackRouter = router({
  submit: protectedProcedure
    .input(z.object({
      category: z.enum(["error", "suggestion", "general"]),
      subject: z.string().min(1).max(255),
      message: z.string().min(1),
      protocolRef: z.string().max(255).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const user = await db.getUserById(ctx.user.id);
        await db.createFeedback({
          userId: ctx.user.id,
          category: input.category,
          subject: input.subject,
          message: input.message,
          protocolRef: input.protocolRef || null,
          countyId: user?.selectedAgencyId || null,
        });
        return { success: true, error: null };
      } catch (error) {
        console.error("Failed to submit feedback:", error);
        return { success: false, error: "Failed to submit feedback" };
      }
    }),

  myFeedback: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserFeedback(ctx.user.id);
  }),
});

export type FeedbackRouter = typeof feedbackRouter;
