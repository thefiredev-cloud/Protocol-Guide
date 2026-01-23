/**
 * Protocol Guide - Comprehensive Health Check Module
 *
 * Provides deep health checks for all infrastructure components:
 * - Database connectivity (MySQL via Drizzle)
 * - Supabase (PostgreSQL + pgvector)
 * - Claude API (Anthropic)
 * - Voyage AI (embeddings)
 * - Redis cache
 * - Memory/resource status
 * - Service resilience status
 */

import { createClient } from '@supabase/supabase-js';
import { ENV } from './env';
import { ServiceRegistry, getResilientRedis } from './resilience';

// Health check result types
export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  message?: string;
  lastChecked: string;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  services: {
    database: ServiceHealth;
    supabase: ServiceHealth;
    claude: ServiceHealth;
    voyage: ServiceHealth;
    redis: ServiceHealth;
  };
  resources: {
    memoryUsedMB: number;
    memoryTotalMB: number;
    memoryPercentage: number;
  };
  resilience: {
    overallHealth: 'healthy' | 'degraded' | 'unhealthy';
    circuitBreakers: Record<string, { state: string; available: boolean }>;
  };
}

// Track server start time for uptime
const serverStartTime = Date.now();

/**
 * Check MySQL database connectivity via Drizzle
 */
async function checkDatabase(): Promise<ServiceHealth> {
  const start = Date.now();
  const now = new Date().toISOString();

  try {
    // Dynamic import to avoid circular dependencies
    const { getDb } = await import('../db');
    const db = await getDb();

    if (!db) {
      return {
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        message: 'Database connection not available',
        lastChecked: now,
      };
    }

    // Simple connectivity test
    const { sql } = await import('drizzle-orm');
    await db.execute(sql`SELECT 1`);

    const latency = Date.now() - start;
    return {
      status: latency < 500 ? 'healthy' : 'degraded',
      latencyMs: latency,
      message: latency >= 500 ? 'High latency detected' : undefined,
      lastChecked: now,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      message: error instanceof Error ? error.message : 'Database check failed',
      lastChecked: now,
    };
  }
}

/**
 * Check Supabase connectivity (PostgreSQL + pgvector)
 */
async function checkSupabase(): Promise<ServiceHealth> {
  const start = Date.now();
  const now = new Date().toISOString();

  if (!ENV.supabaseUrl || !ENV.supabaseServiceRoleKey) {
    return {
      status: 'unhealthy',
      latencyMs: 0,
      message: 'Supabase credentials not configured',
      lastChecked: now,
    };
  }

  try {
    const supabase = createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey);

    // Test with a simple query
    const { error } = await supabase
      .from('manus_protocol_chunks')
      .select('id')
      .limit(1);

    if (error) {
      return {
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        message: error.message,
        lastChecked: now,
      };
    }

    const latency = Date.now() - start;
    return {
      status: latency < 1000 ? 'healthy' : 'degraded',
      latencyMs: latency,
      message: latency >= 1000 ? 'High latency detected' : undefined,
      lastChecked: now,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      message: error instanceof Error ? error.message : 'Supabase check failed',
      lastChecked: now,
    };
  }
}

/**
 * Check Claude API availability (Anthropic)
 * Uses a lightweight models endpoint check instead of actual completion
 */
async function checkClaude(): Promise<ServiceHealth> {
  const start = Date.now();
  const now = new Date().toISOString();

  if (!ENV.anthropicApiKey) {
    return {
      status: 'unhealthy',
      latencyMs: 0,
      message: 'ANTHROPIC_API_KEY not configured',
      lastChecked: now,
    };
  }

  try {
    // Use a lightweight API check - just validate the key works
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ENV.anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      }),
    });

    const latency = Date.now() - start;

    // 200 = success, 401 = bad key, 429 = rate limited (but API is up)
    if (response.ok || response.status === 429) {
      return {
        status: latency < 2000 ? 'healthy' : 'degraded',
        latencyMs: latency,
        message: response.status === 429 ? 'Rate limited but available' : undefined,
        lastChecked: now,
      };
    }

    if (response.status === 401) {
      return {
        status: 'unhealthy',
        latencyMs: latency,
        message: 'Invalid API key',
        lastChecked: now,
      };
    }

    return {
      status: 'degraded',
      latencyMs: latency,
      message: `Unexpected status: ${response.status}`,
      lastChecked: now,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      message: error instanceof Error ? error.message : 'Claude API check failed',
      lastChecked: now,
    };
  }
}

/**
 * Check Voyage AI availability (embeddings service)
 */
async function checkVoyage(): Promise<ServiceHealth> {
  const start = Date.now();
  const now = new Date().toISOString();

  if (!ENV.voyageApiKey) {
    return {
      status: 'unhealthy',
      latencyMs: 0,
      message: 'VOYAGE_API_KEY not configured',
      lastChecked: now,
    };
  }

  try {
    // Lightweight embedding request
    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ENV.voyageApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'voyage-large-2',
        input: 'health check',
      }),
    });

    const latency = Date.now() - start;

    if (response.ok || response.status === 429) {
      return {
        status: latency < 2000 ? 'healthy' : 'degraded',
        latencyMs: latency,
        message: response.status === 429 ? 'Rate limited but available' : undefined,
        lastChecked: now,
      };
    }

    if (response.status === 401) {
      return {
        status: 'unhealthy',
        latencyMs: latency,
        message: 'Invalid API key',
        lastChecked: now,
      };
    }

    return {
      status: 'degraded',
      latencyMs: latency,
      message: `Unexpected status: ${response.status}`,
      lastChecked: now,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      message: error instanceof Error ? error.message : 'Voyage API check failed',
      lastChecked: now,
    };
  }
}

/**
 * Check Redis connectivity (with fallback awareness)
 */
async function checkRedis(): Promise<ServiceHealth> {
  const start = Date.now();
  const now = new Date().toISOString();

  try {
    const resilientRedis = getResilientRedis();
    const health = await resilientRedis.healthCheck();
    const latency = Date.now() - start;

    if (health.redis) {
      ServiceRegistry.markHealthy('redis');
      return {
        status: latency < 100 ? 'healthy' : 'degraded',
        latencyMs: latency,
        message: latency >= 100 ? 'High latency detected' : undefined,
        lastChecked: now,
      };
    }

    // Redis unavailable but fallback is working
    if (health.fallback) {
      ServiceRegistry.markUnhealthy('redis', 'Using in-memory fallback');
      return {
        status: 'degraded',
        latencyMs: latency,
        message: 'Redis unavailable, using in-memory fallback',
        lastChecked: now,
      };
    }

    ServiceRegistry.markUnhealthy('redis', 'Redis and fallback unavailable');
    return {
      status: 'unhealthy',
      latencyMs: latency,
      message: 'Redis and fallback both unavailable',
      lastChecked: now,
    };
  } catch (error) {
    ServiceRegistry.markUnhealthy('redis', error instanceof Error ? error.message : 'Check failed');
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      message: error instanceof Error ? error.message : 'Redis check failed',
      lastChecked: now,
    };
  }
}

/**
 * Get resilience status from ServiceRegistry
 */
function getResilienceStatus(): HealthCheckResult['resilience'] {
  const stats = ServiceRegistry.getStats();
  const circuitBreakers: Record<string, { state: string; available: boolean }> = {};

  for (const [name, status] of Object.entries(stats.services)) {
    circuitBreakers[name] = {
      state: status.circuitState,
      available: status.available,
    };
  }

  return {
    overallHealth: stats.overallHealth,
    circuitBreakers,
  };
}

/**
 * Get memory usage statistics
 */
function getResourceUsage() {
  const memUsage = process.memoryUsage();
  const totalMemory = require('os').totalmem();
  const usedMemory = memUsage.heapUsed;

  return {
    memoryUsedMB: Math.round(usedMemory / 1024 / 1024),
    memoryTotalMB: Math.round(totalMemory / 1024 / 1024),
    memoryPercentage: Math.round((usedMemory / totalMemory) * 100),
  };
}

/**
 * Determine overall health status from service statuses
 */
function determineOverallStatus(services: HealthCheckResult['services']): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(services).map(s => s.status);

  // Critical services that must be healthy
  const criticalServices = [services.database, services.supabase];
  const criticalUnhealthy = criticalServices.some(s => s.status === 'unhealthy');

  if (criticalUnhealthy) {
    return 'unhealthy';
  }

  if (statuses.includes('unhealthy') || statuses.filter(s => s === 'degraded').length >= 2) {
    return 'degraded';
  }

  if (statuses.includes('degraded')) {
    return 'degraded';
  }

  return 'healthy';
}

/**
 * Run comprehensive health check
 *
 * @param options - Configuration options
 * @param options.quick - If true, only check critical services (faster)
 */
export async function runHealthCheck(options?: { quick?: boolean }): Promise<HealthCheckResult> {
  const isQuick = options?.quick ?? false;
  const skipPlaceholder = { status: 'healthy' as const, latencyMs: 0, lastChecked: new Date().toISOString() };

  // Run checks in parallel for speed
  const [database, supabase, claude, voyage, redis] = await Promise.all([
    checkDatabase(),
    checkSupabase(),
    isQuick ? Promise.resolve(skipPlaceholder) : checkClaude(),
    isQuick ? Promise.resolve(skipPlaceholder) : checkVoyage(),
    checkRedis(), // Always check Redis (fast operation)
  ]);

  const services = { database, supabase, claude, voyage, redis };

  return {
    status: determineOverallStatus(services),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: ENV.isProduction ? 'production' : 'development',
    uptime: Math.floor((Date.now() - serverStartTime) / 1000),
    services,
    resources: getResourceUsage(),
    resilience: getResilienceStatus(),
  };
}

/**
 * Express handler for /api/health endpoint
 */
export async function healthHandler(req: any, res: any): Promise<void> {
  try {
    const quick = req.query.quick === 'true';
    const result = await runHealthCheck({ quick });

    // Set appropriate HTTP status based on health
    const httpStatus = result.status === 'healthy' ? 200 :
                       result.status === 'degraded' ? 200 : 503;

    res.status(httpStatus).json(result);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed',
    });
  }
}

/**
 * Express handler for /api/ready endpoint (kubernetes-style)
 * Only checks if the service can accept traffic
 */
export async function readyHandler(_req: any, res: any): Promise<void> {
  try {
    // Quick check - only database connectivity
    const database = await checkDatabase();

    if (database.status === 'unhealthy') {
      res.status(503).send('not ready');
    } else {
      res.status(200).send('ready');
    }
  } catch {
    res.status(503).send('not ready');
  }
}

/**
 * Express handler for /api/live endpoint (kubernetes-style)
 * Indicates if the process is alive
 */
export function liveHandler(_req: any, res: any): void {
  res.status(200).send('alive');
}
