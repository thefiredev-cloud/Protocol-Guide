/**
 * Embedding Cache Module
 * LRU cache for embeddings with TTL support
 * Prevents redundant API calls for identical queries
 */

import { createHash } from 'crypto';

// Cache configuration
export const CACHE_CONFIG = {
  maxSize: 1000, // Maximum number of cached embeddings
  ttlMs: 24 * 60 * 60 * 1000, // 24 hours TTL
  cleanupIntervalMs: 60 * 60 * 1000, // Cleanup every hour
} as const;

interface CacheEntry {
  embedding: number[];
  timestamp: number;
  accessCount: number;
}

/**
 * LRU Cache for embeddings with TTL support
 * Prevents redundant API calls for identical queries
 */
export class EmbeddingCache {
  private cache: Map<string, CacheEntry> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Generate cache key from text using SHA-256 hash
   */
  private generateKey(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }

  /**
   * Get embedding from cache if exists and not expired
   */
  get(text: string): number[] | null {
    const key = this.generateKey(text);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > CACHE_CONFIG.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Update access count and move to end (LRU)
    entry.accessCount++;
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.embedding;
  }

  /**
   * Store embedding in cache
   */
  set(text: string, embedding: number[]): void {
    const key = this.generateKey(text);

    // Evict if at capacity
    if (this.cache.size >= CACHE_CONFIG.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      embedding,
      timestamp: Date.now(),
      accessCount: 1,
    });
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    // Map maintains insertion order, first entry is oldest accessed
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
    }
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    for (let i = 0; i < entries.length; i++) {
      const [key, entry] = entries[i];
      if (now - entry.timestamp > CACHE_CONFIG.ttlMs) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Start periodic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, CACHE_CONFIG.cleanupIntervalMs);

    // Don't keep process alive
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: CACHE_CONFIG.maxSize,
    };
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }
}

// Global cache instance
export const embeddingCache = new EmbeddingCache();
