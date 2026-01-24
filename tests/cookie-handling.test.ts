/**
 * Cookie Handling Tests
 * Verifies subdomain cookie sharing and CSRF token generation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { cookieParser, csrfTokenGenerator, cookieMiddleware } from "../server/_core/cookie-middleware";
import { getSessionCookieOptions } from "../server/_core/cookies";

describe("Cookie Middleware", () => {
  describe("cookieParser", () => {
    it("parses cookies from Cookie header", () => {
      const req = {
        headers: {
          cookie: "session_id=abc123; csrf_token=xyz789",
        },
      } as Request;

      const res = {} as Response;
      const next = vi.fn();

      cookieParser(req, res, next);

      expect(req.cookies).toEqual({
        session_id: "abc123",
        csrf_token: "xyz789",
      });
      expect(next).toHaveBeenCalled();
    });

    it("handles missing Cookie header", () => {
      const req = {
        headers: {},
      } as Request;

      const res = {} as Response;
      const next = vi.fn();

      cookieParser(req, res, next);

      expect(req.cookies).toEqual({});
      expect(next).toHaveBeenCalled();
    });

    it("handles malformed cookies gracefully", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const req = {
        headers: {
          cookie: "malformed;;;cookie",
        },
      } as Request;

      const res = {} as Response;
      const next = vi.fn();

      cookieParser(req, res, next);

      expect(req.cookies).toEqual({});
      expect(next).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("csrfTokenGenerator", () => {
    let setCookieCalls: Array<{ name: string; value: string; options: Record<string, unknown> }>;

    beforeEach(() => {
      setCookieCalls = [];
    });

    it("generates CSRF token when none exists", () => {
      const req = {
        cookies: {},
        hostname: "localhost",
        protocol: "https",
        headers: {},
      } as unknown as Request;

      const res = {
        cookie: vi.fn((name: string, value: string, options: Record<string, unknown>) => {
          setCookieCalls.push({ name, value, options });
        }),
      } as unknown as Response;

      const next = vi.fn();

      csrfTokenGenerator(req, res, next);

      expect(setCookieCalls).toHaveLength(1);
      expect(setCookieCalls[0].name).toBe("csrf_token");
      expect(setCookieCalls[0].value).toMatch(/^[a-f0-9]{64}$/); // 64 hex chars
      expect(setCookieCalls[0].options).toMatchObject({
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 86400000, // 24 hours
      });
      expect(req.cookies?.csrf_token).toMatch(/^[a-f0-9]{64}$/);
      expect(next).toHaveBeenCalled();
    });

    it("reuses existing valid CSRF token", () => {
      const existingToken = "a".repeat(64); // Valid 64-char hex

      const req = {
        cookies: {
          csrf_token: existingToken,
        },
        hostname: "localhost",
        protocol: "https",
        headers: {},
      } as unknown as Request;

      const res = {
        cookie: vi.fn(),
      } as unknown as Response;

      const next = vi.fn();

      csrfTokenGenerator(req, res, next);

      expect(res.cookie).not.toHaveBeenCalled(); // Should NOT regenerate
      expect(next).toHaveBeenCalled();
    });

    it("regenerates invalid CSRF token", () => {
      const req = {
        cookies: {
          csrf_token: "invalid-token",
        },
        hostname: "localhost",
        protocol: "https",
        headers: {},
      } as unknown as Request;

      const res = {
        cookie: vi.fn((name: string, value: string, options: Record<string, unknown>) => {
          setCookieCalls.push({ name, value, options });
        }),
      } as unknown as Response;

      const next = vi.fn();

      csrfTokenGenerator(req, res, next);

      expect(setCookieCalls).toHaveLength(1);
      expect(setCookieCalls[0].name).toBe("csrf_token");
      expect(setCookieCalls[0].value).toMatch(/^[a-f0-9]{64}$/);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("cookieMiddleware", () => {
    it("parses cookies and generates CSRF token", () => {
      const setCookieCalls: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

      const req = {
        headers: {
          cookie: "session_id=abc123",
        },
        hostname: "localhost",
        protocol: "https",
      } as unknown as Request;

      const res = {
        cookie: vi.fn((name: string, value: string, options: Record<string, unknown>) => {
          setCookieCalls.push({ name, value, options });
        }),
      } as unknown as Response;

      const next = vi.fn();

      cookieMiddleware(req, res, next);

      // Should parse existing cookies
      expect(req.cookies?.session_id).toBe("abc123");

      // Should generate CSRF token
      expect(setCookieCalls).toHaveLength(1);
      expect(setCookieCalls[0].name).toBe("csrf_token");
      expect(setCookieCalls[0].value).toMatch(/^[a-f0-9]{64}$/);

      expect(next).toHaveBeenCalled();
    });
  });
});

describe("Cookie Options", () => {
  describe("Development subdomain sharing", () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = "development";
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it("shares cookies across subdomains in development", () => {
      const req = {
        hostname: "3000-xxx.manuspre.computer",
        protocol: "https",
        headers: {},
      } as unknown as Request;

      const options = getSessionCookieOptions(req);

      expect(options.domain).toBe(".manuspre.computer");
      expect(options.httpOnly).toBe(true);
      expect(options.secure).toBe(true);
      expect(options.sameSite).toBe("strict");
      expect(options.path).toBe("/");
    });

    it("handles localhost correctly", () => {
      const req = {
        hostname: "localhost",
        protocol: "http",
        headers: {},
      } as unknown as Request;

      const options = getSessionCookieOptions(req);

      expect(options.domain).toBeUndefined(); // No domain for localhost
      expect(options.secure).toBe(false); // HTTP on localhost
    });

    it("handles IP addresses correctly", () => {
      const req = {
        hostname: "127.0.0.1",
        protocol: "http",
        headers: {},
      } as unknown as Request;

      const options = getSessionCookieOptions(req);

      expect(options.domain).toBeUndefined(); // No domain for IP
    });
  });

  describe("Production subdomain sharing", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalSubdomainCookies = process.env.ENABLE_SUBDOMAIN_COOKIES;

    beforeEach(() => {
      process.env.NODE_ENV = "production";
      delete process.env.ENABLE_SUBDOMAIN_COOKIES;
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
      if (originalSubdomainCookies !== undefined) {
        process.env.ENABLE_SUBDOMAIN_COOKIES = originalSubdomainCookies;
      }
    });

    it("does NOT share cookies by default in production", () => {
      const req = {
        hostname: "api.example.com",
        protocol: "https",
        headers: {},
      } as unknown as Request;

      const options = getSessionCookieOptions(req);

      expect(options.domain).toBeUndefined(); // No subdomain sharing
      expect(options.httpOnly).toBe(true);
      expect(options.secure).toBe(true);
      expect(options.sameSite).toBe("strict");
    });

    it("shares cookies when explicitly enabled", () => {
      process.env.ENABLE_SUBDOMAIN_COOKIES = "true";

      const req = {
        hostname: "api.example.com",
        protocol: "https",
        headers: {},
      } as unknown as Request;

      const options = getSessionCookieOptions(req);

      expect(options.domain).toBe(".example.com"); // Subdomain sharing enabled
    });
  });

  describe("Reverse proxy support", () => {
    it("detects HTTPS from X-Forwarded-Proto header", () => {
      const req = {
        hostname: "api.example.com",
        protocol: "http", // Backend sees HTTP
        headers: {
          "x-forwarded-proto": "https", // But reverse proxy uses HTTPS
        },
      } as unknown as Request;

      const options = getSessionCookieOptions(req);

      expect(options.secure).toBe(true); // Should be true because of forwarded proto
    });

    it("handles comma-separated forwarded protocols", () => {
      const req = {
        hostname: "api.example.com",
        protocol: "http",
        headers: {
          "x-forwarded-proto": "http,https", // Multiple proxies
        },
      } as unknown as Request;

      const options = getSessionCookieOptions(req);

      expect(options.secure).toBe(true); // Should detect HTTPS in list
    });
  });
});
