/**
 * Voice Search UI Helpers
 *
 * Utility functions for formatting and displaying voice search UI elements.
 */

import { RecordingState, VoiceError, ERROR_MESSAGES } from "./voice-constants";

/**
 * Format duration in seconds to MM:SS format
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins + ":" + secs.toString().padStart(2, "0");
}

/**
 * Get status text based on current recording state
 */
export function getStatusText(recordingState: RecordingState, errorType: VoiceError | null): string {
  switch (recordingState) {
    case "idle":
      return "Tap to start voice search";
    case "recording":
      return "Listening... Tap to stop";
    case "processing":
      return "Processing...";
    case "complete":
      return "Success!";
    case "error":
      return errorType ? ERROR_MESSAGES[errorType].title : "An error occurred";
    default:
      return "";
  }
}
