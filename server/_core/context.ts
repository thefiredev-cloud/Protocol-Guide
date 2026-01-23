import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { createClient } from "@supabase/supabase-js";
import * as db from "../db";
import type { RateLimitInfo } from "./trpc";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  /** Rate limit info (populated by rate limit middleware) */
  rateLimitInfo?: RateLimitInfo;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Extract Bearer token from Authorization header
    const authHeader = opts.req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (token) {
      // Verify token with Supabase
      const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.getUser(token);

      if (supabaseUser && !error) {
        // Find or create user in our database
        user = await db.findOrCreateUserBySupabaseId(supabaseUser.id, {
          email: supabaseUser.email,
          name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name,
        });
      }
    }
  } catch (error) {
    console.error("[Context] Auth error:", error);
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
