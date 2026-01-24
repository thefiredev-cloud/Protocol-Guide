/**
 * Event Queue Management
 *
 * Handles batching, persistence, and server communication for analytics events.
 * Supports offline queuing and automatic retry on failure.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";
import type { AnalyticsEvent } from "./index";

// Queue Configuration
const ANALYTICS_STORAGE_KEY = "@protocol_guide_analytics_queue";
const BATCH_SIZE = 20;
const FLUSH_INTERVAL_MS = 30000; // 30 seconds
const MAX_QUEUE_SIZE = 500;

export interface EventQueueConfig {
  batchSize?: number;
  flushIntervalMs?: number;
  maxQueueSize?: number;
}

export class EventQueue {
  private queue: AnalyticsEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private readonly batchSize: number;
  private readonly flushIntervalMs: number;
  private readonly maxQueueSize: number;

  constructor(config: EventQueueConfig = {}) {
    this.batchSize = config.batchSize || BATCH_SIZE;
    this.flushIntervalMs = config.flushIntervalMs || FLUSH_INTERVAL_MS;
    this.maxQueueSize = config.maxQueueSize || MAX_QUEUE_SIZE;
  }

  /**
   * Initialize queue by loading persisted events and starting flush timer
   */
  async init(): Promise<void> {
    await this.loadQueue();
    this.startFlushTimer();
  }

  /**
   * Clean up queue (stop timer and flush remaining events)
   */
  async destroy(): Promise<void> {
    this.stopFlushTimer();
    await this.flush();
  }

  /**
   * Add event to queue with automatic batching
   */
  enqueue(event: AnalyticsEvent): void {
    this.queue.push(event);

    // Prevent queue from growing too large
    if (this.queue.length > this.maxQueueSize) {
      this.queue = this.queue.slice(-this.maxQueueSize);
    }

    // Auto-flush if batch is ready
    if (this.queue.length >= this.batchSize) {
      this.flush().catch(console.error);
    }

    // Persist queue for offline support
    this.saveQueue().catch(console.error);
  }

  /**
   * Get current queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Flush events to the server
   */
  async flush(sessionId?: string, userId?: number | null): Promise<void> {
    if (this.queue.length === 0) return;

    const eventsToSend = [...this.queue];
    this.queue = [];

    try {
      const response = await fetch("/api/analytics/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          events: eventsToSend,
          sessionId,
          userId,
          deviceInfo: {
            platform: Platform.OS,
            appVersion: Constants.expoConfig?.version,
          },
        }),
      });

      if (!response.ok) {
        // Re-queue events on failure
        this.queue = [...eventsToSend, ...this.queue];
        await this.saveQueue();
        throw new Error(`Analytics flush failed: ${response.status}`);
      }

      // Clear persisted queue on success
      await AsyncStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      // Re-queue events on network failure
      this.queue = [...eventsToSend, ...this.queue];
      await this.saveQueue();
      console.error("[Analytics] Flush failed:", error);
    }
  }

  /**
   * Save queue to AsyncStorage for offline persistence
   */
  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error("[Analytics] Failed to save queue:", error);
    }
  }

  /**
   * Load queue from AsyncStorage
   */
  private async loadQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(ANALYTICS_STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error("[Analytics] Failed to load queue:", error);
      this.queue = [];
    }
  }

  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(console.error);
    }, this.flushIntervalMs);
  }

  /**
   * Stop periodic flush timer
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}
