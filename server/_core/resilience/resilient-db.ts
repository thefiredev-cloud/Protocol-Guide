/**
 * Protocol Guide - Resilient Database Client
 *
 * Database wrapper with graceful degradation:
 * - Circuit breaker for database failures
 * - Slow query detection and logging
 * - Connection health monitoring
 * - Timeout handling for queries
 */

import { logger } from '../logger';
import { ServiceRegistry } from './service-registry';
import { CircuitBreakerOpenError } from './circuit-breaker';

export interface QueryOptions {
  /** Query timeout in ms (default: 10000) */
  timeoutMs?: number;
  /** Mark query as critical (affects circuit breaker) */
  critical?: boolean;
  /** Operation name for logging */
  operationName?: string;
}

export interface SlowQueryConfig {
  /** Threshold in ms for slow query warning (default: 500) */
  warningThresholdMs: number;
  /** Threshold in ms for slow query error (default: 2000) */
  errorThresholdMs: number;
  /** Callback when slow query detected */
  onSlowQuery?: (operation: string, durationMs: number, severity: 'warning' | 'error') => void;
}

// Default timeout for database queries
const DEFAULT_QUERY_TIMEOUT_MS = 10000;

// Default slow query thresholds
const DEFAULT_SLOW_QUERY_CONFIG: SlowQueryConfig = {
  warningThresholdMs: 500,
  errorThresholdMs: 2000,
};

/**
 * Wrap a promise with timeout
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new DatabaseTimeoutError(operation, timeoutMs));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Database timeout error
 */
export class DatabaseTimeoutError extends Error {
  public readonly code = 'DATABASE_TIMEOUT';
  public readonly operation: string;
  public readonly timeoutMs: number;

  constructor(operation: string, timeoutMs: number) {
    super(`Database operation "${operation}" timed out after ${timeoutMs}ms`);
    this.name = 'DatabaseTimeoutError';
    this.operation = operation;
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Database unavailable error (circuit breaker open)
 */
export class DatabaseUnavailableError extends Error {
  public readonly code = 'DATABASE_UNAVAILABLE';
  public readonly retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super('Database service is temporarily unavailable');
    this.name = 'DatabaseUnavailableError';
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Resilient database query executor
 */
export class ResilientDatabase {
  private slowQueryConfig: SlowQueryConfig;
  private queryCount = 0;
  private slowQueryCount = 0;
  private failedQueryCount = 0;

  constructor(config?: { slowQuery?: Partial<SlowQueryConfig> }) {
    this.slowQueryConfig = {
      ...DEFAULT_SLOW_QUERY_CONFIG,
      ...config?.slowQuery,
    };
  }

  /**
   * Execute a database query with resilience patterns
   */
  async execute<T>(
    operation: () => Promise<T>,
    options: QueryOptions = {}
  ): Promise<T> {
    const {
      timeoutMs = DEFAULT_QUERY_TIMEOUT_MS,
      critical = false,
      operationName = 'database-query',
    } = options;

    this.queryCount++;
    const startTime = Date.now();

    // Check circuit breaker
    if (!ServiceRegistry.isAvailable('database')) {
      const cb = ServiceRegistry.getCircuitBreaker('database');
      const retryAfterMs = cb ? 30000 : 0;

      logger.warn(
        { operation: operationName },
        'Database circuit breaker is open'
      );

      throw new DatabaseUnavailableError(retryAfterMs);
    }

    try {
      // Execute with circuit breaker protection and timeout
      const result = await ServiceRegistry.execute('database', () =>
        withTimeout(operation(), timeoutMs, operationName)
      );

      const durationMs = Date.now() - startTime;

      // Check for slow query
      this.checkSlowQuery(operationName, durationMs);

      return result;
    } catch (error) {
      this.failedQueryCount++;
      const durationMs = Date.now() - startTime;

      // Log the failure
      logger.error(
        {
          error,
          operation: operationName,
          durationMs,
          critical,
        },
        'Database query failed'
      );

      // Re-throw appropriate error
      if (error instanceof CircuitBreakerOpenError) {
        throw new DatabaseUnavailableError(error.retryAfterMs);
      }

      throw error;
    }
  }

  /**
   * Execute a read-only query (less critical, more lenient timeout)
   */
  async read<T>(operation: () => Promise<T>, operationName = 'read-query'): Promise<T> {
    return this.execute(operation, {
      timeoutMs: 15000, // Longer timeout for reads
      critical: false,
      operationName,
    });
  }

  /**
   * Execute a write query (critical, shorter timeout)
   */
  async write<T>(operation: () => Promise<T>, operationName = 'write-query'): Promise<T> {
    return this.execute(operation, {
      timeoutMs: 10000,
      critical: true,
      operationName,
    });
  }

  /**
   * Execute a transaction with all-or-nothing semantics
   */
  async transaction<T>(
    operation: () => Promise<T>,
    operationName = 'transaction'
  ): Promise<T> {
    return this.execute(operation, {
      timeoutMs: 30000, // Longer timeout for transactions
      critical: true,
      operationName,
    });
  }

  /**
   * Check if query was slow and log/notify
   */
  private checkSlowQuery(operation: string, durationMs: number): void {
    if (durationMs >= this.slowQueryConfig.errorThresholdMs) {
      this.slowQueryCount++;
      logger.error(
        { operation, durationMs, threshold: this.slowQueryConfig.errorThresholdMs },
        'Slow database query detected (ERROR level)'
      );
      this.slowQueryConfig.onSlowQuery?.(operation, durationMs, 'error');
    } else if (durationMs >= this.slowQueryConfig.warningThresholdMs) {
      this.slowQueryCount++;
      logger.warn(
        { operation, durationMs, threshold: this.slowQueryConfig.warningThresholdMs },
        'Slow database query detected (WARNING level)'
      );
      this.slowQueryConfig.onSlowQuery?.(operation, durationMs, 'warning');
    }
  }

  /**
   * Check if database is available
   */
  isAvailable(): boolean {
    return ServiceRegistry.isAvailable('database');
  }

  /**
   * Check if database is degraded
   */
  isDegraded(): boolean {
    return ServiceRegistry.isDegraded('database');
  }

  /**
   * Get query statistics
   */
  getStats(): {
    queryCount: number;
    slowQueryCount: number;
    failedQueryCount: number;
    slowQueryRate: number;
    failureRate: number;
    available: boolean;
    degraded: boolean;
    circuitState: string;
  } {
    const cb = ServiceRegistry.getCircuitBreaker('database');
    return {
      queryCount: this.queryCount,
      slowQueryCount: this.slowQueryCount,
      failedQueryCount: this.failedQueryCount,
      slowQueryRate:
        this.queryCount > 0
          ? Math.round((this.slowQueryCount / this.queryCount) * 100) / 100
          : 0,
      failureRate:
        this.queryCount > 0
          ? Math.round((this.failedQueryCount / this.queryCount) * 100) / 100
          : 0,
      available: this.isAvailable(),
      degraded: this.isDegraded(),
      circuitState: cb?.getState() || 'UNKNOWN',
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.queryCount = 0;
    this.slowQueryCount = 0;
    this.failedQueryCount = 0;
  }

  /**
   * Update slow query configuration
   */
  setSlowQueryConfig(config: Partial<SlowQueryConfig>): void {
    this.slowQueryConfig = {
      ...this.slowQueryConfig,
      ...config,
    };
  }
}

// Singleton instance
let _resilientDb: ResilientDatabase | null = null;

/**
 * Get the singleton ResilientDatabase instance
 */
export function getResilientDb(): ResilientDatabase {
  if (!_resilientDb) {
    _resilientDb = new ResilientDatabase();
  }
  return _resilientDb;
}

/**
 * Initialize ResilientDatabase with custom config
 */
export function initResilientDb(config?: {
  slowQuery?: Partial<SlowQueryConfig>;
}): ResilientDatabase {
  _resilientDb = new ResilientDatabase(config);
  return _resilientDb;
}

/**
 * Helper to wrap existing database operations with resilience
 */
export function withResilience<T>(
  operation: () => Promise<T>,
  options?: QueryOptions
): Promise<T> {
  return getResilientDb().execute(operation, options);
}
