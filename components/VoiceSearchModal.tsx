/**
 * VoiceSearchModal Component
 *
 * A full-screen modal overlay for voice search with real-time transcription.
 * Designed for EMS professionals who need hands-free operation in the field.
 *
 * Features:
 * - Full-screen recording overlay
 * - Animated pulsing microphone
 * - Real-time transcription preview
 * - Permission handling with clear messaging
 * - Error states and retry functionality
 * - Auto-stop on silence detection
 * - Dark mode optimized for low-light environments
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
} from "react-native";
import { Audio, Recording } from "@/lib/audio";
import { uriToBase64 } from "@/lib/blob-utils";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import * as Haptics from "@/lib/haptics";
import Animated, {
  useSharedValue,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import {
  createButtonA11y,
  createLiveRegionA11y,
  announceForAccessibility,
  MEDICAL_A11Y_LABELS,
  useFocusTrap,
} from "@/lib/accessibility";
import {
  RecordingState,
  VoiceError,
  ERROR_MESSAGES,
  SILENCE_THRESHOLD_MS,
  MAX_RECORDING_DURATION_MS,

  startPulseAnimation,
  stopPulseAnimation,
  createRippleStyles,
  RippleAnimationValues} from "@/components/voice";
import { useVoiceStateMachine } from "@/hooks/use-voice-state-machine";
import { useVoiceRecording } from "@/hooks/use-voice-recording";

type VoiceSearchModalProps = {
  visible: boolean;
  onClose: () => void;
  onTranscription: (text: string) => void;
};

export function VoiceSearchModal({
  visible,
  onClose,
  onTranscription,
}: VoiceSearchModalProps) {
  const colors = useColors();

  // State machine hook
  const { recordingState, stateRef, transitionTo, resetState } = useVoiceStateMachine();

  // Focus trap for accessibility (WCAG 2.4.3)
  const { containerRef, containerProps } = useFocusTrap({
    visible,
    onClose,
    allowEscapeClose: true,
  });
  const [errorType, setErrorType] = useState<VoiceError | null>(null);
  const [transcriptionPreview, setTranscriptionPreview] = useState("");
  const [recordingDuration, setRecordingDuration] = useState(0);

  const recordingRef = useRef<Recording | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxDurationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // tRPC mutations
  const uploadMutation = trpc.voice.uploadAudio.useMutation();
  const transcribeMutation = trpc.voice.transcribe.useMutation();

  // Animation values
  const animationValues: RippleAnimationValues = {
    pulseScale1: useSharedValue(1),
    pulseScale2: useSharedValue(1),
    pulseScale3: useSharedValue(1),
    pulseOpacity1: useSharedValue(0.4),
    pulseOpacity2: useSharedValue(0.3),
    pulseOpacity3: useSharedValue(0.2),
    micScale: useSharedValue(1),
  };

  // Animated styles for ripple effect
  const { pulseStyle1, pulseStyle2, pulseStyle3, micAnimatedStyle } = createRippleStyles(animationValues);

  // Clear only timeouts/intervals (safe to call anytime)
  const clearTimers = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (maxDurationTimeoutRef.current) {
      clearTimeout(maxDurationTimeoutRef.current);
      maxDurationTimeoutRef.current = null;
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  // Full cleanup function - stops recording AND clears timers (for unmount/cancel)
  const cleanupRecording = useCallback(() => {
    clearTimers();
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
    }
  }, [clearTimers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, [cleanupRecording]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (visible) {
      resetState();
      setErrorType(null);
      setTranscriptionPreview("");
      setRecordingDuration(0);
    } else {
      cleanupRecording();
      stopPulseAnimation(animationValues);
      resetState();
    }
  }, [visible, cleanupRecording, resetState, animationValues]);

  // Check and request permissions
  const checkPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        transitionTo("error");
        setErrorType("permission_denied");
        return false;
      }
      return true;
    } catch {
      transitionTo("error");
      setErrorType("permission_unavailable");
      return false;
    }
  }, [transitionTo]);

  // Reset silence timeout
  const resetSilenceTimeout = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    silenceTimeoutRef.current = setTimeout(() => {
      if (recordingRef.current) {
        // Will be handled by stopRecording
      }
    }, SILENCE_THRESHOLD_MS);
  }, []);

  // Stop recording and process
  const stopRecording = useCallback(async () => {
    // Guard: Only allow stopping from recording state
    if (stateRef.current !== "recording") {
      console.warn(`stopRecording called in invalid state: ${stateRef.current}`);
      return;
    }

    // Guard: Must have an active recording
    if (!recordingRef.current) {
      console.warn("stopRecording called but no recording ref exists");
      transitionTo("error");
      setErrorType("recording_failed");
      return;
    }

    try {
      // Clear timers but DON'T cleanup recording yet - we need the ref!
      clearTimers();
      stopPulseAnimation(animationValues);

      // Transition to processing state
      if (!transitionTo("processing")) return;
      setTranscriptionPreview("Processing your speech...");

      // Haptic feedback
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Capture and clear the recording ref BEFORE async operations
      const recording = recordingRef.current;
      recordingRef.current = null;

      // Now stop and get recording URI
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (!uri) {
        throw new Error("No recording URI");
      }

      // Convert to base64 and upload (cross-platform)
      const base64 = await uriToBase64(uri);

      // Upload audio to server
      const { url: audioUrl } = await uploadMutation.mutateAsync({
        audioBase64: base64,
        mimeType: "audio/webm",
      });

      setTranscriptionPreview("Transcribing...");

      // Transcribe using server-side Whisper
      const transcriptionResult = await transcribeMutation.mutateAsync({
        audioUrl,
        language: "en",
      });

      if (!transcriptionResult.success || !transcriptionResult.text) {
        // Check for specific errors
        if (transcriptionResult.error?.includes("no speech")) {
          transitionTo("error");
          setErrorType("no_speech_detected");
          return;
        }
        throw new Error(transcriptionResult.error || "Transcription failed");
      }

      const transcribedText = transcriptionResult.text.trim();

      if (!transcribedText) {
        transitionTo("error");
        setErrorType("no_speech_detected");
        return;
      }

      // Transition to complete state
      if (!transitionTo("complete")) return;

      // Show transcription preview
      setTranscriptionPreview(transcribedText);

      // Success haptic
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Small delay to show the transcription before closing
      setTimeout(() => {
        onTranscription(transcribedText);
        onClose();
      }, 500);
    } catch (error) {
      console.error("Voice search error:", error);

      // Check for network errors
      if (error instanceof Error && error.message.includes("network")) {
        transitionTo("error");
        setErrorType("network_error");
      } else {
        transitionTo("error");
        setErrorType("transcription_failed");
      }

      // Error haptic
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  }, [clearTimers, animationValues, transitionTo, uploadMutation, transcribeMutation, onTranscription, onClose]);

  // Start recording
  const startRecording = useCallback(async () => {
    // Guard: Only allow starting from idle or error state
    if (stateRef.current !== "idle" && stateRef.current !== "error") {
      console.warn(`startRecording called in invalid state: ${stateRef.current}`);
      return;
    }

    try {
      // Haptic feedback
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // Check permissions
      const hasPermission = await checkPermissions();
      if (!hasPermission) return;

      // Verify state hasn't changed during async permission check
      if (stateRef.current !== "idle" && stateRef.current !== "error") {
        console.warn("State changed during permission check, aborting startRecording");
        return;
      }

      // Configure audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Verify state again after async audio setup
      if (stateRef.current !== "idle" && stateRef.current !== "error") {
        console.warn("State changed during audio setup, aborting startRecording");
        return;
      }

      // Start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;

      // Transition to recording state
      if (!transitionTo("recording")) {
        // If transition failed, clean up the recording we just created
        recording.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
        return;
      }

      setTranscriptionPreview("");
      setRecordingDuration(0);
      startPulseAnimation(animationValues);

      // Track duration
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      // Set up silence detection timeout
      resetSilenceTimeout();

      // Set up max duration timeout
      maxDurationTimeoutRef.current = setTimeout(() => {
        // Only stop if we're still recording
        if (stateRef.current === "recording" && recordingRef.current) {
          stopRecording();
        }
      }, MAX_RECORDING_DURATION_MS);
    } catch (error) {
      console.error("Failed to start recording:", error);
      transitionTo("error");
      setErrorType("recording_failed");
    }
  }, [checkPermissions, transitionTo, animationValues, resetSilenceTimeout, stopRecording]);

  // Handle tap on microphone - uses stateRef for synchronous state checking
  const handleMicPress = useCallback(() => {
    const currentState = stateRef.current;

    if (currentState === "idle" || currentState === "error") {
      setErrorType(null);
      startRecording();
    } else if (currentState === "recording") {
      stopRecording();
    }
    // Ignore presses during processing or complete states
  }, [startRecording, stopRecording]);

  // Format duration for display
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Get status text
  const getStatusText = (): string => {
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
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Dark overlay background */}
        <Pressable
          style={[styles.overlay, { backgroundColor: "rgba(0, 0, 0, 0.85)" }]}
          onPress={onClose}
        />

        {/* Content - Focus trap container */}
        <Animated.View
          ref={containerRef}
          entering={SlideInDown.springify().damping(15)}
          exiting={SlideOutDown.springify().damping(15)}
          style={styles.content}
          {...containerProps}
        >
          {/* Close button */}
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeButton, { backgroundColor: colors.surface + "80" }]}
            accessibilityLabel="Close voice search"
            accessibilityRole="button"
          >
            <IconSymbol name="xmark" size={20} color={colors.foreground} />
          </TouchableOpacity>

          {/* Main content card */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {/* Title */}
            <Text style={[styles.title, { color: colors.foreground }]}>
              Voice Search
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {getStatusText()}
            </Text>

            {/* Microphone button with pulse rings */}
            <View style={styles.micContainer}>
              {/* Pulse rings (only when recording) */}
              {recordingState === "recording" && (
                <>
                  <Animated.View
                    style={[
                      pulseStyle1,
                      styles.pulseRing,
                      { backgroundColor: colors.error },
                    ]}
                  />
                  <Animated.View
                    style={[
                      pulseStyle2,
                      styles.pulseRing,
                      { backgroundColor: colors.error },
                    ]}
                  />
                  <Animated.View
                    style={[
                      pulseStyle3,
                      styles.pulseRing,
                      { backgroundColor: colors.error },
                    ]}
                  />
                </>
              )}

              {/* Mic button */}
              <TouchableOpacity
                onPress={handleMicPress}
                disabled={recordingState === "processing" || recordingState === "complete"}
                activeOpacity={0.8}
                accessibilityLabel={
                  recordingState === "recording"
                    ? "Stop recording"
                    : recordingState === "complete"
                    ? "Transcription complete"
                    : "Start voice search"
                }
                accessibilityRole="button"
                accessibilityState={{ disabled: recordingState === "processing" || recordingState === "complete" }}
              >
                <Animated.View
                  style={[
                    micAnimatedStyle,
                    styles.micButton,
                    {
                      backgroundColor:
                        recordingState === "recording"
                          ? colors.error
                          : recordingState === "processing"
                          ? colors.primary
                          : recordingState === "complete"
                          ? colors.success
                          : recordingState === "error"
                          ? colors.warning
                          : colors.primary,
                    },
                  ]}
                >
                  {recordingState === "processing" ? (
                    <ActivityIndicator size="large" color="#FFFFFF" />
                  ) : recordingState === "complete" ? (
                    <IconSymbol
                      name="checkmark"
                      size={32}
                      color="#FFFFFF"
                    />
                  ) : (
                    <IconSymbol
                      name={recordingState === "recording" ? "stop.fill" : "mic.fill"}
                      size={32}
                      color="#FFFFFF"
                    />
                  )}
                </Animated.View>
              </TouchableOpacity>
            </View>

            {/* Recording duration */}
            {recordingState === "recording" && (
              <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(200)}
                style={styles.durationContainer}
              >
                <View style={[styles.recordingDot, { backgroundColor: colors.error }]} />
                <Text style={[styles.durationText, { color: colors.error }]}>
                  {formatDuration(recordingDuration)}
                </Text>
              </Animated.View>
            )}

            {/* Transcription preview */}
            {transcriptionPreview && (
              <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(200)}
                style={[styles.transcriptionBox, { backgroundColor: colors.background }]}
              >
                <Text style={[styles.transcriptionLabel, { color: colors.muted }]}>
                  Transcription:
                </Text>
                <Text
                  style={[styles.transcriptionText, { color: colors.foreground }]}
                  numberOfLines={3}
                >
                  {transcriptionPreview}
                </Text>
              </Animated.View>
            )}

            {/* Error message */}
            {recordingState === "error" && errorType && (
              <Animated.View
                entering={FadeIn.duration(200)}
                style={[styles.errorBox, { backgroundColor: colors.error + "15" }]}
              >
                <Text style={[styles.errorTitle, { color: colors.error }]}>
                  {ERROR_MESSAGES[errorType].title}
                </Text>
                <Text style={[styles.errorMessage, { color: colors.muted }]}>
                  {ERROR_MESSAGES[errorType].message}
                </Text>
                <TouchableOpacity
                  onPress={handleMicPress}
                  style={[styles.retryButton, { backgroundColor: colors.error }]}
                >
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Tips (shown in idle state) */}
            {recordingState === "idle" && !errorType && (
              <View style={styles.tipsContainer}>
                <Text style={[styles.tipsText, { color: colors.muted }]}>
                  {"Speak naturally, for example:\n\"pediatric asthma treatment\" or \"vtach protocol\""}
                </Text>
              </View>
            )}
          </View>

          {/* Bottom hint */}
          <Text style={styles.bottomHint}>
            {recordingState === "recording"
              ? "Recording stops automatically after 2.5s of silence"
              : "Tap anywhere outside to cancel"}
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  closeButton: {
    position: "absolute",
    top: 64,
    right: 24,
    padding: 12,
    borderRadius: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 32,
  },
  micContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    width: 160,
    height: 160,
    marginBottom: 32,
  },
  pulseRing: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  durationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  durationText: {
    fontSize: 18,
    fontWeight: "600",
  },
  transcriptionBox: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  transcriptionLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  transcriptionText: {
    fontSize: 16,
  },
  errorBox: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 12,
  },
  retryButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  tipsContainer: {
    width: "100%",
  },
  tipsText: {
    fontSize: 12,
    textAlign: "center",
  },
  bottomHint: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 24,
    textAlign: "center",
  },
});

export default VoiceSearchModal;
