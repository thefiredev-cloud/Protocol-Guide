/**
 * Jobs Router
 * Protected endpoints for scheduled jobs (cron triggers)
 *
 * Security: These endpoints are protected by CRON_SECRET, not user auth.
 * Only external cron services (GitHub Actions, cron-job.org) should call these.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import { sendDripEmails } from "../jobs/send-drip-emails";

/**
 * Verify the cron secret to prevent unauthorized job execution
 */
function verifyCronSecret(secret: string): void {
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "CRON_SECRET not configured",
    });
  }

  if (secret !== expectedSecret) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid cron secret",
    });
  }
}

export const jobsRouter = router({
  /**
   * Run drip email sequence
   * Sends onboarding emails to users based on signup date:
   * - Day 3: Tips email
   * - Day 7: Pro pitch email (free users only)
   *
   * @input secret - CRON_SECRET for authentication
   * @returns sent/error counts
   */
  runDripEmails: publicProcedure
    .input(
      z.object({
        secret: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      verifyCronSecret(input.secret);

      console.log("[Jobs] Starting drip email job");
      const result = await sendDripEmails();
      console.log("[Jobs] Drip email job complete:", result);

      return result;
    }),
});

export type JobsRouter = typeof jobsRouter;
