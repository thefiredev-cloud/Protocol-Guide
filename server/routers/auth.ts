/**
 * Auth Router
 * Handles authentication-related procedures with CSRF protection
 */

import { COOKIE_NAME } from "../../shared/const.js";
import { getSessionCookieOptions } from "../_core/cookies";
import { publicProcedure, csrfProtectedProcedure, protectedProcedure, router } from "../_core/trpc";
import { revokeUserTokens } from "../_core/token-blacklist";
import { createClient } from "@supabase/supabase-js";
import { logger } from "../_core/logger";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const authRouter = router({
  me: publicProcedure.query((opts) => opts.ctx.user),

  /**
   * Logout - requires CSRF protection but NOT authentication
   * - CSRF protection prevents malicious sites from logging users out
   * - Works for both authenticated and unauthenticated users (to clear cookies)
   * - Revokes the token on Supabase if user is authenticated
   */
  logout: csrfProtectedProcedure.mutation(async ({ ctx }) => {
    const authHeader = ctx.req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    // Revoke token on Supabase if present for immediate invalidation
    // This works for both authenticated and unauthenticated requests
    if (token && ctx.user) {
      try {
        await supabaseAdmin.auth.admin.signOut(token);
        logger.info(
          { userId: ctx.user.id, requestId: ctx.trace?.requestId },
          "User logged out with token revocation"
        );
      } catch (error) {
        logger.error(
          { error, userId: ctx.user.id, requestId: ctx.trace?.requestId },
          "Failed to revoke token on logout"
        );
      }
    }

    // Clear session cookie (works for both authenticated and unauthenticated)
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),

  /**
   * Logout from all devices by revoking all existing tokens
   * Useful for password changes, security incidents, or user-initiated logout
   */
  logoutAllDevices: protectedProcedure.mutation(async ({ ctx }) => {
    const revoked = await revokeUserTokens(ctx.user.id.toString(), "user_initiated_logout_all");
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true, revoked } as const;
  }),
});

export type AuthRouter = typeof authRouter;
