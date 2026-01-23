/**
 * useSimulationTimer - Custom hook for managing simulation timer state
 *
 * Features:
 * - Count-up timer with millisecond precision
 * - Pause/resume capability
 * - Reset functionality
 * - Formatted output (MM:SS or HH:MM:SS)
 * - Proper cleanup on unmount
 */

import { useState, useRef, useCallback, useEffect } from "react";

export interface SimulationTimerState {
  /** Elapsed time in milliseconds */
  elapsedMs: number;
  /** Whether the timer is currently running */
  isRunning: boolean;
  /** Whether the timer is paused */
  isPaused: boolean;
  /** Formatted time string (MM:SS or HH:MM:SS) */
  formattedTime: string;
  /** Formatted time with deciseconds (MM:SS.D) */
  formattedTimeWithDeciseconds: string;
}

export interface SimulationTimerActions {
  /** Start or resume the timer */
  start: () => void;
  /** Pause the timer (can be resumed) */
  pause: () => void;
  /** Resume a paused timer */
  resume: () => void;
  /** Reset the timer to zero and stop */
  reset: () => void;
  /** Toggle between paused and running states */
  togglePause: () => void;
}

export type UseSimulationTimerReturn = SimulationTimerState & SimulationTimerActions;

/**
 * Format milliseconds to MM:SS or HH:MM:SS string
 */
export function formatTime(ms: number, includeHours = false): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number): string => n.toString().padStart(2, "0");

  if (includeHours || hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Format milliseconds to MM:SS.D string (with deciseconds)
 */
export function formatTimeWithDeciseconds(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const deciseconds = Math.floor((ms % 1000) / 100);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number): string => n.toString().padStart(2, "0");

  return `${pad(minutes)}:${pad(seconds)}.${deciseconds}`;
}

/**
 * Custom hook for simulation timer functionality
 *
 * @param updateInterval - How often to update the timer (default: 100ms)
 * @returns Timer state and control functions
 */
export function useSimulationTimer(updateInterval = 100): UseSimulationTimerReturn {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedElapsedRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    startTimeRef.current = Date.now() - pausedElapsedRef.current;

    intervalRef.current = setInterval(() => {
      const newElapsed = Date.now() - startTimeRef.current;
      setElapsedMs(newElapsed);
    }, updateInterval);
  }, [clearTimer, updateInterval]);

  const start = useCallback(() => {
    pausedElapsedRef.current = 0;
    setElapsedMs(0);
    setIsRunning(true);
    setIsPaused(false);
    startTimer();
  }, [startTimer]);

  const pause = useCallback(() => {
    if (isRunning && !isPaused) {
      clearTimer();
      pausedElapsedRef.current = elapsedMs;
      setIsPaused(true);
    }
  }, [isRunning, isPaused, clearTimer, elapsedMs]);

  const resume = useCallback(() => {
    if (isRunning && isPaused) {
      setIsPaused(false);
      startTimer();
    }
  }, [isRunning, isPaused, startTimer]);

  const reset = useCallback(() => {
    clearTimer();
    pausedElapsedRef.current = 0;
    setElapsedMs(0);
    setIsRunning(false);
    setIsPaused(false);
  }, [clearTimer]);

  const togglePause = useCallback(() => {
    if (isPaused) {
      resume();
    } else {
      pause();
    }
  }, [isPaused, pause, resume]);

  return {
    elapsedMs,
    isRunning,
    isPaused,
    formattedTime: formatTime(elapsedMs),
    formattedTimeWithDeciseconds: formatTimeWithDeciseconds(elapsedMs),
    start,
    pause,
    resume,
    reset,
    togglePause,
  };
}

export default useSimulationTimer;
