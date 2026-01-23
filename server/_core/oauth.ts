import { COOKIE_NAME } from "../../shared/const.js";
import type { Express, Request, Response } from "express";
import { getSessionCookieOptions } from "./cookies";
import { csrfProtection, getCsrfToken } from "./csrf";
import { logger } from "./logger";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * OAuth routes - simplified for Supabase Auth with CSRF protection
 * Only logout endpoint needed; auth is handled by Supabase client-side
 */
export function registerOAuthRoutes(app: Express) {
  // Get CSRF token - needed for logout
  app.get("/api/auth/csrf-token", getCsrfToken);

  // Logout - clears session cookie with CSRF protection
  app.post("/api/auth/logout", csrfProtection, async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    // Revoke token on Supabase if present
    if (token) {
      try {
        await supabaseAdmin.auth.admin.signOut(token);
        logger.info({ userId: req.ip }, "User logged out with token revocation");
      } catch (error) {
        logger.error({ error }, "Failed to revoke token on logout");
      }
    }

    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });
}
