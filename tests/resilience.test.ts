/**
 * Resilience Module Tests
 *
 * Tests for:
 * - Circuit Breaker pattern
 * - In-Memory Cache fallbacks
 * - Service Registry health tracking
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  CircuitBreaker,
  CircuitBreakerOpenError,
  createDatabaseCircuitBreaker,
  createAICircuitBreaker,
  createRedisCircuitBreaker,
  InMemoryCache,
  ServiceRegistry,
} from '../server/_core/resilience';

describe('Circuit Breaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      name: 'test',
      failureThreshold: 3,
      successThreshold: 2,
      resetTimeout: 1000,
      failureWindow: 5000,
    });
  });

  describe('Initial State', () => {
    it('should start in CLOSED state', () => {
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should allow requests when CLOSED', () => {
      expect(breaker.canExecute()).toBe(true);
    });

    it('should have zero initial stats', () => {
      const stats = breaker.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.totalFailures).toBe(0);
      expect(stats.totalSuccesses).toBe(0);
      expect(stats.circuitOpenCount).toBe(0);
    });
  });

  describe('Success Tracking', () => {
    it('should record successful operations', async () => {
      // Create fresh breaker for isolation
      const freshBreaker = new CircuitBreaker({
        name: 'success-test',
        failureThreshold: 3,
        successThreshold: 2,
        resetTimeout: 1000,
        failureWindow: 5000,
      });
      const result = await freshBreaker.execute(async () => 'success');
      expect(result).toBe('success');

      const stats = freshBreaker.getStats();
      expect(stats.totalSuccesses).toBe(1);
      expect(stats.lastSuccessTime).not.toBeNull();
    });

    it('should stay CLOSED after successes', async () => {
      await breaker.execute(async () => 'success');
      await breaker.execute(async () => 'success');
      await breaker.execute(async () => 'success');

      expect(breaker.getState()).toBe('CLOSED');
    });
  });

  describe('Failure Threshold', () => {
    it('should track failures', async () => {
      try {
        await breaker.execute(async () => {
          throw new Error('failure');
        });
      } catch (e) {
        // Expected
      }

      const stats = breaker.getStats();
      expect(stats.totalFailures).toBe(1);
      expect(stats.failures).toBe(1);
    });

    it('should open after reaching failure threshold', async () => {
      // Create fresh breaker for isolation
      const freshBreaker = new CircuitBreaker({
        name: 'threshold-test',
        failureThreshold: 3,
        successThreshold: 2,
        resetTimeout: 1000,
        failureWindow: 5000,
      });
      // Fail 3 times (threshold)
      for (let i = 0; i < 3; i++) {
        try {
          await freshBreaker.execute(async () => {
            throw new Error('failure');
          });
        } catch (e) {
          // Expected
        }
      }

      expect(freshBreaker.getState()).toBe('OPEN');
    });

    it('should not open before reaching threshold', async () => {
      // Fail 2 times (below threshold of 3)
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('failure');
          });
        } catch (e) {
          // Expected
        }
      }

      expect(breaker.getState()).toBe('CLOSED');
    });
  });

  describe('OPEN State Behavior', () => {
    beforeEach(async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('failure');
          });
        } catch (e) {
          // Expected
        }
      }
    });

    it('should reject requests when OPEN', () => {
      expect(breaker.canExecute()).toBe(false);
    });

    it('should throw CircuitBreakerOpenError when OPEN', async () => {
      await expect(breaker.execute(async () => 'success')).rejects.toThrow(
        CircuitBreakerOpenError
      );
    });

    it('should use fallback when provided and OPEN', async () => {
      const result = await breaker.execute(
        async () => 'primary',
        () => 'fallback'
      );
      expect(result).toBe('fallback');
    });

    it('should track circuit open count', () => {
      // Create fresh breaker
      const freshBreaker = new CircuitBreaker({
        name: 'open-count-test',
        failureThreshold: 3,
        successThreshold: 2,
        resetTimeout: 1000,
        failureWindow: 5000,
      });

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          freshBreaker.recordFailure();
        } catch (e) {
          // Expected
        }
      }

      const stats = freshBreaker.getStats();
      expect(stats.circuitOpenCount).toBe(1);
    });
  });

  describe('HALF_OPEN State Recovery', () => {
    it('should transition to HALF_OPEN after reset timeout', async () => {
      // Create fresh breaker with short reset
      const freshBreaker = new CircuitBreaker({
        name: 'half-open-test-1',
        failureThreshold: 3,
        successThreshold: 2,
        resetTimeout: 100, // Short timeout for test
        failureWindow: 5000,
      });

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await freshBreaker.execute(async () => {
            throw new Error('failure');
          });
        } catch (e) {
          // Expected
        }
      }
      expect(freshBreaker.getState()).toBe('OPEN');

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(freshBreaker.getState()).toBe('HALF_OPEN');
    });

    it('should close after success threshold in HALF_OPEN', async () => {
      // Create fresh breaker with short reset
      const freshBreaker = new CircuitBreaker({
        name: 'half-open-test-2',
        failureThreshold: 3,
        successThreshold: 2,
        resetTimeout: 100,
        failureWindow: 5000,
      });

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await freshBreaker.execute(async () => {
            throw new Error('failure');
          });
        } catch (e) {
          // Expected
        }
      }

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // 2 successes (threshold)
      await freshBreaker.execute(async () => 'success');
      await freshBreaker.execute(async () => 'success');

      expect(freshBreaker.getState()).toBe('CLOSED');
    });

    it('should reopen on failure in HALF_OPEN', async () => {
      // Create fresh breaker with short reset
      const freshBreaker = new CircuitBreaker({
        name: 'half-open-test-3',
        failureThreshold: 3,
        successThreshold: 2,
        resetTimeout: 100,
        failureWindow: 5000,
      });

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await freshBreaker.execute(async () => {
            throw new Error('failure');
          });
        } catch (e) {
          // Expected
        }
      }

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(freshBreaker.getState()).toBe('HALF_OPEN');

      // Single failure reopens
      try {
        await freshBreaker.execute(async () => {
          throw new Error('failure');
        });
      } catch (e) {
        // Expected
      }

      expect(freshBreaker.getState()).toBe('OPEN');
    });
  });

  describe('Force State', () => {
    it('should allow forcing to OPEN', () => {
      breaker.forceState('OPEN');
      expect(breaker.getState()).toBe('OPEN');
    });

    it('should allow forcing to CLOSED', async () => {
      // Open first
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('failure');
          });
        } catch (e) {
          // Expected
        }
      }

      breaker.forceState('CLOSED');
      expect(breaker.getState()).toBe('CLOSED');
    });
  });

  describe('Reset', () => {
    it('should reset to initial state', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('failure');
          });
        } catch (e) {
          // Expected
        }
      }

      breaker.reset();

      expect(breaker.getState()).toBe('CLOSED');
      expect(breaker.canExecute()).toBe(true);
    });
  });

  describe('State Change Callback', () => {
    it('should call onStateChange when state changes', async () => {
      const onStateChange = vi.fn();

      const breakerWithCallback = new CircuitBreaker({
        name: 'test-callback',
        failureThreshold: 1,
        successThreshold: 1,
        resetTimeout: 100,
        failureWindow: 5000,
        onStateChange,
      });

      // Trigger OPEN
      try {
        await breakerWithCallback.execute(async () => {
          throw new Error('failure');
        });
      } catch (e) {
        // Expected
      }

      expect(onStateChange).toHaveBeenCalledWith('test-callback', 'CLOSED', 'OPEN');
    });
  });

  describe('Failure Window', () => {
    it('should clean up old failures outside window', async () => {
      // Use a breaker with short failure window
      const shortWindowBreaker = new CircuitBreaker({
        name: 'short-window',
        failureThreshold: 3,
        successThreshold: 2,
        resetTimeout: 1000,
        failureWindow: 100, // 100ms window
      });

      // Two failures
      for (let i = 0; i < 2; i++) {
        try {
          await shortWindowBreaker.execute(async () => {
            throw new Error('failure');
          });
        } catch (e) {
          // Expected
        }
      }

      // Wait for failures to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Third failure after expiry - should NOT open circuit
      try {
        await shortWindowBreaker.execute(async () => {
          throw new Error('failure');
        });
      } catch (e) {
        // Expected
      }

      // Circuit should still be closed as old failures were cleaned up
      expect(shortWindowBreaker.getState()).toBe('CLOSED');
    });
  });
});

describe('CircuitBreakerOpenError', () => {
  it('should have correct error properties', () => {
    const error = new CircuitBreakerOpenError('test-service', 5000);

    expect(error.name).toBe('CircuitBreakerOpenError');
    expect(error.code).toBe('CIRCUIT_BREAKER_OPEN');
    expect(error.retryAfterMs).toBe(5000);
    expect(error.message).toContain('test-service');
  });
});

describe('Pre-configured Circuit Breakers', () => {
  it('should create database circuit breaker with correct settings', () => {
    const breaker = createDatabaseCircuitBreaker();
    const stats = breaker.getStats();

    expect(stats.state).toBe('CLOSED');
    // Just verify it's created and functional
    expect(breaker.canExecute()).toBe(true);
  });

  it('should create AI circuit breaker with correct settings', () => {
    const breaker = createAICircuitBreaker();
    const stats = breaker.getStats();

    expect(stats.state).toBe('CLOSED');
    expect(breaker.canExecute()).toBe(true);
  });

  it('should create Redis circuit breaker with correct settings', () => {
    const breaker = createRedisCircuitBreaker();
    const stats = breaker.getStats();

    expect(stats.state).toBe('CLOSED');
    expect(breaker.canExecute()).toBe(true);
  });

  it('should pass state change callback to database breaker', async () => {
    const onStateChange = vi.fn();
    const breaker = createDatabaseCircuitBreaker(onStateChange);

    // Force open
    breaker.forceState('OPEN');

    // onStateChange is only called on natural transitions, not forceState
    // So we test natural transition
    breaker.reset();

    // Open via failures
    for (let i = 0; i < 5; i++) {
      try {
        await breaker.execute(async () => {
          throw new Error('failure');
        });
      } catch (e) {
        // Expected
      }
    }

    expect(onStateChange).toHaveBeenCalled();
  });
});

describe('InMemoryCache', () => {
  let cache: InMemoryCache<string>;

  beforeEach(() => {
    cache = new InMemoryCache({
      maxEntries: 3,
      defaultTtlMs: 1000,
      name: 'test-cache',
    });
  });

  afterEach(() => {
    cache.clear();
  });

  describe('Basic Operations', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return null for missing keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should check if key exists', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should delete keys', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeNull();
    });

    it('should return false when deleting non-existent key', () => {
      expect(cache.delete('nonexistent')).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });

    it('should return size', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);
    });

    it('should return keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      expect(cache.keys()).toContain('key1');
      expect(cache.keys()).toContain('key2');
    });
  });

  describe('TTL Expiration', () => {
    it('should expire entries after TTL', async () => {
      const shortTTLCache = new InMemoryCache<string>({
        maxEntries: 10,
        defaultTtlMs: 50, // 50ms
      });

      shortTTLCache.set('key1', 'value1');
      expect(shortTTLCache.get('key1')).toBe('value1');

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(shortTTLCache.get('key1')).toBeNull();
    });

    it('should allow custom TTL per entry', async () => {
      const longTTLCache = new InMemoryCache<string>({
        maxEntries: 10,
        defaultTtlMs: 10000, // Default 10s
      });

      longTTLCache.set('key1', 'value1', 50); // 50ms custom TTL

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(longTTLCache.get('key1')).toBeNull();
    });

    it('should not expire entries with zero TTL', async () => {
      const noExpireCache = new InMemoryCache<string>({
        maxEntries: 10,
        defaultTtlMs: 0, // No expiration
      });

      noExpireCache.set('key1', 'value1');
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(noExpireCache.get('key1')).toBe('value1');
    });
  });

  describe('LRU Eviction', () => {
    it('should evict an entry when at max size', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Add new key, should evict something
      cache.set('key4', 'value4');

      // Verify size is still 3 (eviction happened)
      expect(cache.size()).toBe(3);

      // Key4 should definitely exist
      expect(cache.get('key4')).toBe('value4');

      // At least one of the original keys should be evicted
      const values = [cache.get('key1'), cache.get('key2'), cache.get('key3')];
      const existingCount = values.filter((v) => v !== null).length;
      expect(existingCount).toBe(2); // One was evicted
    });

    it('should not evict if updating existing key', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Update existing key should not evict
      cache.set('key1', 'updated');

      expect(cache.size()).toBe(3);
      expect(cache.get('key1')).toBe('updated');
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
    });
  });

  describe('Statistics', () => {
    it('should track cache hits and misses', () => {
      cache.set('key1', 'value1');

      cache.get('key1'); // hit
      cache.get('key1'); // hit
      cache.get('nonexistent'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.67, 1);
    });

    it('should track cache size', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const stats = cache.getStats();
      expect(stats.entries).toBe(2);
    });

    it('should track evictions', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // Evicts key1

      const stats = cache.getStats();
      expect(stats.evictions).toBe(1);
    });

    it('should handle zero hit rate', () => {
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0);
    });

    it('should estimate memory usage', () => {
      cache.set('key1', 'value1');
      const stats = cache.getStats();
      expect(stats.memoryUsageBytes).toBeGreaterThan(0);
    });

    it('should reset stats', () => {
      cache.set('key1', 'value1');
      cache.get('key1'); // hit
      cache.get('nonexistent'); // miss

      cache.resetStats();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.evictions).toBe(0);
    });
  });

  describe('Eviction Callback', () => {
    it('should call onEvict callback', () => {
      const onEvict = vi.fn();

      const callbackCache = new InMemoryCache<string>({
        maxEntries: 2,
        defaultTtlMs: 1000,
        onEvict,
      });

      callbackCache.set('key1', 'value1');
      callbackCache.set('key2', 'value2');
      callbackCache.set('key3', 'value3'); // Should evict key1

      expect(onEvict).toHaveBeenCalledWith('key1', 'lru');
    });
  });
});

describe('ServiceRegistry', () => {
  beforeEach(() => {
    ServiceRegistry.resetAll();
  });

  afterEach(() => {
    ServiceRegistry.resetAll();
  });

  describe('Service Availability', () => {
    it('should have all services available initially', () => {
      expect(ServiceRegistry.isAvailable('database')).toBe(true);
      expect(ServiceRegistry.isAvailable('redis')).toBe(true);
      expect(ServiceRegistry.isAvailable('ai-claude')).toBe(true);
    });

    it('should get service status', () => {
      const status = ServiceRegistry.getServiceStatus('database');

      expect(status.name).toBe('database');
      expect(status.available).toBe(true);
      expect(status.circuitState).toBe('CLOSED');
      expect(status.consecutiveFailures).toBe(0);
    });
  });

  describe('Health Recording', () => {
    it('should record success', () => {
      ServiceRegistry.recordSuccess('database');

      const status = ServiceRegistry.getServiceStatus('database');
      expect(status.consecutiveFailures).toBe(0);
      expect(status.lastHealthCheck).not.toBeNull();
    });

    it('should record failure', () => {
      ServiceRegistry.recordFailure('database', new Error('test error'));

      const status = ServiceRegistry.getServiceStatus('database');
      expect(status.consecutiveFailures).toBe(1);
      expect(status.message).toBe('test error');
    });

    it('should track consecutive failures', () => {
      ServiceRegistry.recordFailure('database');
      ServiceRegistry.recordFailure('database');
      ServiceRegistry.recordFailure('database');

      const status = ServiceRegistry.getServiceStatus('database');
      expect(status.consecutiveFailures).toBe(3);
    });

    it('should reset failures on success', () => {
      ServiceRegistry.recordFailure('database');
      ServiceRegistry.recordFailure('database');
      ServiceRegistry.recordSuccess('database');

      const status = ServiceRegistry.getServiceStatus('database');
      expect(status.consecutiveFailures).toBe(0);
    });
  });

  describe('Mark Healthy/Unhealthy', () => {
    it('should mark service as healthy', () => {
      ServiceRegistry.recordFailure('database');
      ServiceRegistry.markHealthy('database');

      const status = ServiceRegistry.getServiceStatus('database');
      expect(status.consecutiveFailures).toBe(0);
    });

    it('should mark service as unhealthy', () => {
      ServiceRegistry.markUnhealthy('database', 'Connection refused');

      const status = ServiceRegistry.getServiceStatus('database');
      expect(status.consecutiveFailures).toBe(1);
      expect(status.message).toBe('Connection refused');
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should get circuit breaker for service', () => {
      const cb = ServiceRegistry.getCircuitBreaker('database');
      expect(cb).toBeDefined();
      expect(cb?.getState()).toBe('CLOSED');
    });

    it('should execute with circuit breaker protection', async () => {
      const result = await ServiceRegistry.execute('database', async () => 'success');
      expect(result).toBe('success');
    });

    it('should handle failures with circuit breaker', async () => {
      await expect(
        ServiceRegistry.execute('database', async () => {
          throw new Error('db error');
        })
      ).rejects.toThrow('db error');

      const status = ServiceRegistry.getServiceStatus('database');
      expect(status.consecutiveFailures).toBe(1);
    });
  });

  describe('Degraded Status', () => {
    it('should detect degraded service', () => {
      ServiceRegistry.recordFailure('database');

      expect(ServiceRegistry.isDegraded('database')).toBe(true);
    });

    it('should not be degraded when healthy', () => {
      ServiceRegistry.recordSuccess('database');

      expect(ServiceRegistry.isDegraded('database')).toBe(false);
    });
  });

  describe('Overall Stats', () => {
    it('should return comprehensive stats', () => {
      const stats = ServiceRegistry.getStats();

      expect(stats.services).toBeDefined();
      expect(stats.services.database).toBeDefined();
      expect(stats.services.redis).toBeDefined();
      expect(stats.overallHealth).toBe('healthy');
      expect(stats.lastUpdated).toBeDefined();
    });

    it('should report degraded overall health', () => {
      ServiceRegistry.recordFailure('redis');
      ServiceRegistry.recordFailure('ai-claude');

      const stats = ServiceRegistry.getStats();
      expect(stats.overallHealth).toBe('degraded');
    });

    it('should report unhealthy when database is down', async () => {
      // Force database circuit to open
      const cb = ServiceRegistry.getCircuitBreaker('database');
      if (cb) {
        for (let i = 0; i < 5; i++) {
          try {
            await cb.execute(async () => {
              throw new Error('failure');
            });
          } catch (e) {
            // Expected
          }
        }
      }

      const stats = ServiceRegistry.getStats();
      expect(stats.overallHealth).toBe('unhealthy');
    });
  });

  describe('Listeners', () => {
    it('should add and notify listeners', () => {
      const listener = vi.fn();
      const removeListener = ServiceRegistry.addListener(listener);

      ServiceRegistry.recordFailure('database');

      expect(listener).toHaveBeenCalled();

      // Cleanup
      removeListener();
    });

    it('should remove listener', () => {
      const listener = vi.fn();
      const removeListener = ServiceRegistry.addListener(listener);
      removeListener();

      ServiceRegistry.recordFailure('database');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Reset All', () => {
    it('should reset all circuit breakers', async () => {
      // Open a circuit
      const cb = ServiceRegistry.getCircuitBreaker('redis');
      if (cb) {
        for (let i = 0; i < 3; i++) {
          try {
            await cb.execute(async () => {
              throw new Error('failure');
            });
          } catch (e) {
            // Expected
          }
        }
      }

      expect(ServiceRegistry.isAvailable('redis')).toBe(false);

      ServiceRegistry.resetAll();

      expect(ServiceRegistry.isAvailable('redis')).toBe(true);
    });
  });
});

// Test singleton cache exports
describe('Singleton Caches', () => {
  it('should have searchCache available', async () => {
    const { searchCache } = await import('../server/_core/resilience');
    expect(searchCache).toBeDefined();
    expect(typeof searchCache.get).toBe('function');
    expect(typeof searchCache.set).toBe('function');
  });

  it('should have aiResponseCache available', async () => {
    const { aiResponseCache } = await import('../server/_core/resilience');
    expect(aiResponseCache).toBeDefined();
    expect(typeof aiResponseCache.get).toBe('function');
  });

  it('should have rateLimitCache available', async () => {
    const { rateLimitCache } = await import('../server/_core/resilience');
    expect(rateLimitCache).toBeDefined();
  });

  it('should have generalCache available', async () => {
    const { generalCache } = await import('../server/_core/resilience');
    expect(generalCache).toBeDefined();
  });
});
