/**
 * Counties Router
 * Handles county listing and retrieval procedures
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const countiesRouter = router({
  list: publicProcedure.query(async () => {
    const counties = await db.getAllCounties();
    // Group by state
    const grouped: Record<string, typeof counties> = {};
    for (const county of counties) {
      if (!grouped[county.state]) {
        grouped[county.state] = [];
      }
      grouped[county.state].push(county);
    }
    return { counties, grouped };
  }),

  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getCountyById(input.id);
    }),
});

export type CountiesRouter = typeof countiesRouter;
