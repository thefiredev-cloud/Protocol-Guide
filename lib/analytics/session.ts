/**
 * Session Management
 *
 * Handles session tracking, user identification, and session persistence.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const SESSION_STORAGE_KEY = "@protocol_guide_session";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export interface UserTraits {
  email?: string;
  tier?: string;
  certificationLevel?: string;
  state?: string;
  agencyId?: number;
  createdAt?: string;
}

export interface SessionData {
  id: string;
  startTime: number;
}

export type SessionEventCallback = (eventName: string, properties: Record<string, unknown>) => void;

export class SessionManager {
  private sessionId: string = "";
  private userId: number | null = null;
  private userTraits: UserTraits = {};
  private sessionStartTime: number = 0;
  private onTrackEvent?: SessionEventCallback;

  /**
   * Set callback for tracking events
   */
  setEventCallback(callback: SessionEventCallback): void {
    this.onTrackEvent = callback;
  }

  /**
   * Start a new session or resume existing one
   */
  async startSession(): Promise<void> {
    // Check for existing session
    const existingSession = await AsyncStorage.getItem(SESSION_STORAGE_KEY);

    if (existingSession) {
      const session: SessionData = JSON.parse(existingSession);
      const sessionAge = Date.now() - session.startTime;

      // Reuse session if less than 30 minutes old
      if (sessionAge < SESSION_TIMEOUT_MS) {
        this.sessionId = session.id;
        this.sessionStartTime = session.startTime;
        return;
      }
    }

    // Create new session
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();

    await AsyncStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        id: this.sessionId,
        startTime: this.sessionStartTime,
      })
    );

    this.trackEvent("session_started", {
      isReturning: !!existingSession,
    });
  }

  /**
   * End current session and track metrics
   */
  async endSession(): Promise<void> {
    const duration = Math.floor((Date.now() - this.sessionStartTime) / 1000);

    this.trackEvent("session_ended", {
      durationSeconds: duration,
    });
  }

  /**
   * Identify the current user
   */
  identify(userId: number, traits?: UserTraits): void {
    this.userId = userId;
    if (traits) {
      this.userTraits = { ...this.userTraits, ...traits };
    }

    this.trackEvent("user_identified", {
      userId,
      ...traits,
    });
  }

  /**
   * Reset user identification (on logout)
   */
  reset(): void {
    this.userId = null;
    this.userTraits = {};
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get current user ID
   */
  getUserId(): number | null {
    return this.userId;
  }

  /**
   * Get current user traits
   */
  getUserTraits(): UserTraits {
    return { ...this.userTraits };
  }

  /**
   * Update user traits
   */
  updateTraits(traits: UserTraits): void {
    this.userTraits = { ...this.userTraits, ...traits };
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Track event via callback
   */
  private trackEvent(eventName: string, properties: Record<string, unknown>): void {
    if (this.onTrackEvent) {
      this.onTrackEvent(eventName, properties);
    }
  }
}
