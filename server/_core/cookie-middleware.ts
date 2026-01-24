/**
 * Cookie Middleware
 * Handles cookie parsing and CSRF token generation
 */

import { Request, Response, NextFunction } from "express";
import { parse as parseCookie } from "cookie";
import { getCsrfCookieOptions } from "./cookies";
import * as crypto from "crypto";

const CSRF_COOKIE_NAME = "csrf_token";

/**
 * Cookie parser middleware
 * Parses cookies from request headers and attaches them to req.cookies
 * This is a lightweight alternative to cookie-parser package
 */
export function cookieParser(req: Request, _res: Response, next: NextFunction): void {
  const cookieHeader = req.headers.cookie;

  if (cookieHeader) {
    try {
      req.cookies = parseCookie(cookieHeader);
    } catch (error) {
      console.error("[Cookie Parser] Failed to parse cookies:", error);
      req.cookies = {};
    }
  } else {
    req.cookies = {};
  }

  next();
}

/**
 * CSRF token generation middleware
 * Sets a CSRF token cookie for all requests that don't have one
 * This enables the double-submit cookie pattern for CSRF protection
 */
export function csrfTokenGenerator(req: Request, res: Response, next: NextFunction): void {
  const existingToken = req.cookies?.[CSRF_COOKIE_NAME];

  // If token already exists and is valid (64 hex chars), don't regenerate
  if (existingToken && /^[a-f0-9]{64}$/i.test(existingToken)) {
    return next();
  }

  // Generate new CSRF token
  const csrfToken = crypto.randomBytes(32).toString("hex");

  // Get CSRF cookie options (httpOnly:false for double-submit pattern)
  const cookieOptions = getCsrfCookieOptions(req);

  // Set CSRF token cookie
  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    ...cookieOptions,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
  });

  // Also set it in req.cookies for immediate use
  req.cookies = req.cookies || {};
  req.cookies[CSRF_COOKIE_NAME] = csrfToken;

  next();
}

/**
 * Combined middleware - parses cookies and generates CSRF token
 * Use this instead of applying both middlewares separately
 */
export function cookieMiddleware(req: Request, res: Response, next: NextFunction): void {
  cookieParser(req, res, (err?: unknown) => {
    if (err) {
      return next(err);
    }
    csrfTokenGenerator(req, res, next);
  });
}
