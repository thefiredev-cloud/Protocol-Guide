import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { handleStripeWebhook } from "../webhooks/stripe";
import { summarizeHandler } from "../api/summarize";
import { validateEnv, ENV } from "./env";
import { createRateLimiter } from "./rateLimit";
import { healthHandler, readyHandler, liveHandler } from "./health";

// CORS whitelist - only allow these origins
const CORS_WHITELIST = [
  "https://protocol-guide.com",
  "https://www.protocol-guide.com",
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
    console.error("❌ Missing required environment variables:", envCheck.missing.join(", "));
    process.exit(1);
  }
  console.log("✅ Environment validation passed");

  const app = express();
  const server = createServer(app);

  // Rate limiters
  const publicLimiter = createRateLimiter({ windowMs: 60000, max: 100 }); // 100 req/min
  const searchLimiter = createRateLimiter({ windowMs: 60000, max: 30 });  // 30 req/min
  const aiLimiter = createRateLimiter({ windowMs: 60000, max: 10 });      // 10 req/min

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
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
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

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerOAuthRoutes(app);

  // Health check endpoints - comprehensive monitoring
  app.get("/api/health", publicLimiter, healthHandler);
  app.get("/api/ready", readyHandler);  // Kubernetes readiness probe
  app.get("/api/live", liveHandler);    // Kubernetes liveness probe

  // AI endpoint - stricter rate limiting (10 req/min)
  app.post("/api/summarize", aiLimiter, summarizeHandler);

  // tRPC routes - search/AI procedures use stricter limits internally
  app.use(
    "/api/trpc",
    searchLimiter, // 30 req/min for tRPC (mostly search queries)
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
