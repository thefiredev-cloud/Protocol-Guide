/**
 * Auth Router
 * Handles authentication-related procedures
 */

import { COOKIE_NAME } from "../../shared/const.js";
import { getSessionCookieOptions } from "../_core/cookies";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { revokeUserTokens } from "../_core/token-blacklist";

export const authRouter = router({
  me: publicProcedure.query((opts) => opts.ctx.user),

  logout: publicProcedure.mutation(({ ctx }) => {
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
