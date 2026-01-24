import "dotenv/config";
import express from "express";
import helmet from "helmet";
import { createServer } from "http";
import net from "net";
import crypto from "crypto";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { handleStripeWebhook } from "../webhooks/stripe";
import { summarizeHandler } from "../api/summarize";
import { imageTrendLaunchHandler, imageTrendHealthHandler } from "../api/imagetrend";
import { clientErrorHandler } from "../api/client-error";
import { validateEnv, ENV } from "./env";
import { logger, httpLogger } from "./logger";
import { initRedis, isRedisAvailable } from "./redis";
import { createTimeoutMiddleware } from "./timeout";
import { createSearchLimiter, createAiLimiter, createPublicLimiter } from "./rateLimitRedis";
import { healthHandler, readyHandler, liveHandler } from "./health";
import { initResilientRedis, initResilientDb, ServiceRegistry } from "./resilience";
import { cookieMiddleware } from "./cookie-middleware";

// CORS whitelist - only allow these origins
const CORS_WHITELIST = [
  "https://protocol-guide.com",
  "https://www.protocol-guide.com",
  "https://protocol-guide.netlify.app",
  // Railway backend (allows cross-origin from frontend)
  "https://protocol-guide-production.up.railway.app",
  // Development only
  ...(ENV.isProduction ? [] : [
    "http://localhost:8081",
    "http://localhost:3000",
    "http://127.0.0.1:8081",
    "http://127.0.0.1:3000",
  ]),
];

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Validate required environment variables
  const envCheck = validateEnv();
  if (!envCheck.valid) {
    logger.error({ missing: envCheck.missing }, "Missing required environment variables");
    process.exit(1);
  }
  logger.info("Environment validation passed");

  // Initialize Redis for distributed rate limiting
  initRedis();
  if (isRedisAvailable()) {
    logger.info("Redis initialized - using distributed rate limiting");
  } else {
    logger.warn("Redis not available - using in-memory rate limiting (not recommended for production)");
  }

  // Initialize resilience infrastructure (circuit breakers, fallback caches)
  const resilientRedis = initResilientRedis();
  initResilientDb({
    slowQuery: {
      warningThresholdMs: 500,
      errorThresholdMs: 2000,
      onSlowQuery: (operation, durationMs, severity) => {
        logger.warn({ operation, durationMs, severity }, "Slow database query detected");
      },
    },
  });

  // Log initial resilience status
  const resilienceStatus = ServiceRegistry.getStats();
  logger.info({
    overallHealth: resilienceStatus.overallHealth,
    redisMode: resilientRedis.isAvailable() ? "redis" : "fallback",
  }, "Resilience infrastructure initialized");

  const app = express();
  const server = createServer(app);

  // CSP Nonce middleware - generates unique nonce per request for inline scripts/styles
  // This prevents XSS attacks while allowing necessary inline code
  app.use((req, res, next) => {
    res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
    next();
  });

  // Security headers middleware - comprehensive protection
  app.use(helmet({
    // Content Security Policy - prevents XSS, injection attacks
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          // SECURITY: Use nonce-based CSP instead of 'unsafe-inline' - prevents XSS attacks
          (req, res) => `'nonce-${res.locals.cspNonce}'`,
          ENV.isProduction ? "" : "'unsafe-eval'", // Only in development for HMR
        ].filter(Boolean),
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Required for NativeWind/React Native Web dynamic inline styles
          // Nonce kept for future <style> tag usage
          (req, res) => `'nonce-${res.locals.cspNonce}'`,
        ],
        // SECURITY: Restrict image sources to specific trusted domains only
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://*.supabase.co", // Supabase storage only
        ],
        // SECURITY: Restrict font sources to specific trusted domains only
        fontSrc: [
          "'self'",
          "data:",
          "https://fonts.gstatic.com", // Google Fonts only
        ],
        connectSrc: [
          "'self'",
          "https://protocol-guide.com",
          "https://www.protocol-guide.com",
          "https://protocol-guide.netlify.app",
          "https://protocol-guide-production.up.railway.app", // Railway backend
          "https://*.supabase.co", // Supabase API
          ...(ENV.isProduction ? [] : ["http://localhost:*", "ws://localhost:*"]),
        ],
        frameSrc: ["'none'"], // Prevent embedding in iframes
        objectSrc: ["'none'"], // Prevent Flash/Java/etc plugins
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"], // Prevent site from being framed (redundant with X-Frame-Options)
        upgradeInsecureRequests: ENV.isProduction ? [] : null, // Force HTTPS in production
      },
    },
    // Strict-Transport-Security - force HTTPS for 1 year
    hsts: {
      maxAge: 31536000,      // 1 year in seconds
      includeSubDomains: true,
      preload: true,          // Submit to browser HSTS preload list
    },
    // X-Frame-Options - prevent clickjacking attacks
    frameguard: {
      action: "deny", // Don't allow ANY framing
    },
    // X-Content-Type-Options - prevent MIME sniffing
    noSniff: true,
    // X-DNS-Prefetch-Control - control DNS prefetching
    dnsPrefetchControl: {
      allow: false,
    },
    // Referrer-Policy - control referrer information leakage
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },
    // Permissions-Policy - control browser features (replaces Feature-Policy)
    permissionsPolicy: {
      features: {
        camera: ["'none'"],
        microphone: ["'none'"],
        geolocation: ["'self'"],
        payment: ["'none'"],
        usb: ["'none'"],
        magnetometer: ["'none'"],
        gyroscope: ["'none'"],
        accelerometer: ["'none'"],
      },
    },
    // X-Powered-By - hide Express framework (already done by helmet by default)
    hidePoweredBy: true,
    // Expect-CT - Certificate Transparency (deprecated but still useful)
    expectCt: {
      enforce: true,
      maxAge: 86400, // 24 hours
    },
  }));

  // Request timeout middleware (30s default)
  app.use(createTimeoutMiddleware({ timeout: 30000 }));

  // Structured logging middleware
  app.use(httpLogger);

  // Redis-based rate limiters with tier support
  const publicLimiter = createPublicLimiter();   // IP-based, tier-aware
  const searchLimiter = createSearchLimiter();   // User-based, tier-aware (free: 30/min, pro: 100/min, premium: 500/min)
  const aiLimiter = createAiLimiter();           // User-based, tier-aware (free: 10/min, pro: 50/min, premium: 200/min)

  // CORS middleware - whitelist-based for security
  app.use((req, res, next) => {
    const origin = req.headers.origin;

    // Only allow whitelisted origins
    if (origin && CORS_WHITELIST.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Credentials", "true");
    }

    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token",
    );
    // Expose rate limit headers to browsers
    res.header(
      "Access-Control-Expose-Headers",
      "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-RateLimit-Daily-Limit, X-RateLimit-Daily-Remaining, X-RateLimit-Daily-Reset, Retry-After",
    );

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Stripe webhook needs raw body for signature verification
  // Must be registered BEFORE express.json() middleware
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    handleStripeWebhook
  );

  // JSON body limit - 10MB max (file uploads use base64 in request body)
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // Cookie parsing and CSRF token generation
  // Must be after express.json() but before routes that need cookies
  app.use(cookieMiddleware);

  registerOAuthRoutes(app);

  // Health check endpoints - comprehensive monitoring with rate limiting
  // Even health checks need rate limiting to prevent DoS attacks
  app.get("/api/health", publicLimiter, healthHandler);
  app.get("/api/ready", publicLimiter, readyHandler);  // Kubernetes readiness probe (rate limited)
  app.get("/api/live", publicLimiter, liveHandler);    // Kubernetes liveness probe (rate limited)

  // Resilience status endpoint - for monitoring circuit breakers and fallbacks
  app.get("/api/resilience", publicLimiter, (_req, res) => {
    const stats = ServiceRegistry.getStats();
    const redisStats = resilientRedis.getStats();
    res.json({
      ...stats,
      redis: redisStats,
      timestamp: new Date().toISOString(),
    });
  });

  // AI endpoint - stricter rate limiting (10 req/min)
  app.post("/api/summarize", aiLimiter, summarizeHandler);

  // Client error reporting endpoint - for ErrorBoundary/Sentry
  app.post("/api/client-error", publicLimiter, clientErrorHandler);

  // ImageTrend integration endpoints
  app.get("/api/imagetrend/launch", publicLimiter, imageTrendLaunchHandler);
  app.get("/api/imagetrend/health", publicLimiter, imageTrendHealthHandler);

  // tRPC routes - use general public limiter
  // Search-specific limits are enforced by publicRateLimitedProcedure in tRPC procedures
  app.use(
    "/api/trpc",
    publicLimiter, // General limit for all tRPC procedures
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    logger.info({ preferredPort, actualPort: port }, `Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    logger.info({
      port,
      environment: ENV.isProduction ? "production" : "development",
      redis: isRedisAvailable() ? "enabled" : "disabled",
    }, `Server listening on port ${port}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info("Shutting down gracefully...");
    server.close(() => {
      logger.info("Server closed");
      process.exit(0);
    });

    // Force close after 10s
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

startServer().catch((error) => {
  logger.error({ error }, "Failed to start server");
  process.exit(1);
});
