/**
 * Auth Router
 * Handles authentication-related procedures with CSRF protection
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "../../shared/const.js";
import { getSessionCookieOptions } from "../_core/cookies";
import { publicProcedure, publicRateLimitedProcedure, csrfProtectedProcedure, protectedProcedure, router } from "../_core/trpc";
import { revokeUserTokens, getRevocationDetails } from "../_core/token-blacklist";
import { createClient } from "@supabase/supabase-js";
import { logger } from "../_core/logger";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Regular Supabase client for password verification (non-admin operations)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export const authRouter = router({
  // Rate limited to prevent account enumeration attacks and brute force attempts
  me: publicRateLimitedProcedure.query((opts) => opts.ctx.user),

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
   * SECURITY: This invalidates all sessions including the current one
   */
  logoutAllDevices: protectedProcedure.mutation(async ({ ctx }) => {
    const revoked = await revokeUserTokens(ctx.user.id.toString(), "user_initiated_logout_all");
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });

    logger.info(
      { userId: ctx.user.id, requestId: ctx.trace?.requestId },
      "User logged out from all devices"
    );

    return { success: true, revoked } as const;
  }),

  /**
   * Change password - automatically revokes all tokens
   * SECURITY: Forces re-authentication on all devices
   */
  changePassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8).max(128),
    }))
    .mutation(async ({ ctx, input }) => {
      const authHeader = ctx.req.headers.authorization;
      const token = authHeader?.replace("Bearer ", "");

      if (!token) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "No authentication token provided",
        });
      }

      try {
        // Get user session first
        const { data: { user }, error: getUserError } = await supabaseAdmin.auth.getUser(token);

        if (getUserError || !user || !user.email) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid session",
          });
        }

        // SECURITY: Verify current password before allowing change
        // This prevents attackers with a valid session token from changing
        // the password without knowing the current password
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: input.currentPassword,
        });

        if (verifyError) {
          logger.warn(
            { userId: ctx.user.id, requestId: ctx.trace?.requestId },
            "Failed password change attempt - incorrect current password"
          );
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Current password is incorrect",
          });
        }

        // Current password verified, now safe to update password in Supabase
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          { password: input.newPassword }
        );

        if (updateError) {
          logger.error(
            { error: updateError, userId: ctx.user.id },
            "Password change failed"
          );
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Failed to update password",
          });
        }

        // Revoke all tokens to force re-authentication
        await revokeUserTokens(ctx.user.id.toString(), "password_change");

        // Sign out all sessions
        await supabaseAdmin.auth.admin.signOut(user.id, "global");

        logger.info(
          { userId: ctx.user.id, requestId: ctx.trace?.requestId },
          "Password changed successfully, all sessions invalidated"
        );

        // Clear current session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });

        return { success: true, message: "Password changed. Please sign in again." };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        logger.error(
          { error, userId: ctx.user.id },
          "Unexpected error during password change"
        );

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to change password",
        });
      }
    }),

  /**
   * Update email - automatically revokes all tokens
   * SECURITY: Forces re-authentication and email verification
   */
  updateEmail: protectedProcedure
    .input(z.object({
      newEmail: z.string().email(),
    }))
    .mutation(async ({ ctx, input }) => {
      const authHeader = ctx.req.headers.authorization;
      const token = authHeader?.replace("Bearer ", "");

      if (!token) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "No authentication token provided",
        });
      }

      try {
        const { data: { user }, error: getUserError } = await supabaseAdmin.auth.getUser(token);

        if (getUserError || !user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid session",
          });
        }

        // Update email in Supabase (requires confirmation)
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          { email: input.newEmail }
        );

        if (updateError) {
          logger.error(
            { error: updateError, userId: ctx.user.id },
            "Email update failed"
          );
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Failed to update email. Email may already be in use.",
          });
        }

        // Revoke all tokens to force re-authentication
        await revokeUserTokens(
          ctx.user.id.toString(),
          "email_change",
          { oldEmail: ctx.user.email, newEmail: input.newEmail }
        );

        // Sign out all sessions
        await supabaseAdmin.auth.admin.signOut(user.id, "global");

        logger.info(
          { userId: ctx.user.id, oldEmail: ctx.user.email, newEmail: input.newEmail },
          "Email updated successfully, all sessions invalidated"
        );

        // Clear current session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });

        return {
          success: true,
          message: "Email updated. Please check your new email to confirm and sign in again."
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        logger.error(
          { error, userId: ctx.user.id },
          "Unexpected error during email update"
        );

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update email",
        });
      }
    }),

  /**
   * Get account security status
   * Shows if tokens are revoked and why
   */
  securityStatus: protectedProcedure.query(async ({ ctx }) => {
    const revocationDetails = await getRevocationDetails(ctx.user.id.toString());

    return {
      isRevoked: revocationDetails !== null,
      revocationReason: revocationDetails?.reason || null,
      revokedAt: revocationDetails?.revokedAt || null,
      metadata: revocationDetails?.metadata || null,
    };
  }),
});

export type AuthRouter = typeof authRouter;
