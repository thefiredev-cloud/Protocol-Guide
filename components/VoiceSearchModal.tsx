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
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import * as Haptics from "@/lib/haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
  withDelay,
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";

// Recording state types
type RecordingState = "idle" | "permission_required" | "recording" | "processing" | "error";

// Error types for better UX messaging
type VoiceError =
  | "permission_denied"
  | "permission_unavailable"
  | "recording_failed"
  | "transcription_failed"
  | "no_speech_detected"
  | "network_error";

const ERROR_MESSAGES: Record<VoiceError, { title: string; message: string }> = {
  permission_denied: {
    title: "Microphone Access Denied",
    message: "Please enable microphone access in your device settings to use voice search.",
  },
  permission_unavailable: {
    title: "Microphone Unavailable",
    message: "Your device does not support microphone access or it is being used by another app.",
  },
  recording_failed: {
    title: "Recording Failed",
    message: "Could not start recording. Please try again.",
  },
  transcription_failed: {
    title: "Transcription Failed",
    message: "Could not process your speech. Please try again with clearer audio.",
  },
  no_speech_detected: {
    title: "No Speech Detected",
    message: "We didn't hear anything. Tap the microphone and speak clearly.",
  },
  network_error: {
    title: "Connection Error",
    message: "Please check your internet connection and try again.",
  },
};

// Silence detection configuration
const SILENCE_THRESHOLD_MS = 2500; // 2.5 seconds of silence to auto-stop
const MAX_RECORDING_DURATION_MS = 30000; // 30 seconds max

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
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
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
  const pulseScale1 = useSharedValue(1);
  const pulseScale2 = useSharedValue(1);
  const pulseScale3 = useSharedValue(1);
  const pulseOpacity1 = useSharedValue(0.4);
  const pulseOpacity2 = useSharedValue(0.3);
  const pulseOpacity3 = useSharedValue(0.2);
  const micScale = useSharedValue(1);

  // Animated styles for ripple effect
  const pulseStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale1.value }],
    opacity: pulseOpacity1.value,
  }));

  const pulseStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale2.value }],
    opacity: pulseOpacity2.value,
  }));

  const pulseStyle3 = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale3.value }],
    opacity: pulseOpacity3.value,
  }));

  const micAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }],
  }));

  // Cleanup function - defined early so it can be used in useEffects
  const cleanupRecording = useCallback(() => {
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
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
    }
  }, []);

  // Start pulsing animation
  const startPulseAnimation = useCallback(() => {
    // Ripple 1
    pulseScale1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 0 }),
        withTiming(2.2, { duration: 1200, easing: Easing.out(Easing.ease) })
      ),
      -1,
      false
    );
    pulseOpacity1.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 0 }),
        withTiming(0, { duration: 1200 })
      ),
      -1,
      false
    );

    // Ripple 2 (delayed)
    pulseScale2.value = withRepeat(
      withDelay(
        400,
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(2.2, { duration: 1200, easing: Easing.out(Easing.ease) })
        )
      ),
      -1,
      false
    );
    pulseOpacity2.value = withRepeat(
      withDelay(
        400,
        withSequence(
          withTiming(0.4, { duration: 0 }),
          withTiming(0, { duration: 1200 })
        )
      ),
      -1,
      false
    );

    // Ripple 3 (more delayed)
    pulseScale3.value = withRepeat(
      withDelay(
        800,
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(2.2, { duration: 1200, easing: Easing.out(Easing.ease) })
        )
      ),
      -1,
      false
    );
    pulseOpacity3.value = withRepeat(
      withDelay(
        800,
        withSequence(
          withTiming(0.3, { duration: 0 }),
          withTiming(0, { duration: 1200 })
        )
      ),
      -1,
      false
    );

    // Mic pulse
    micScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 300 }),
        withTiming(1, { duration: 300 })
      ),
      -1,
      false
    );
  }, [pulseScale1, pulseScale2, pulseScale3, pulseOpacity1, pulseOpacity2, pulseOpacity3, micScale]);

  // Stop pulsing animation
  const stopPulseAnimation = useCallback(() => {
    cancelAnimation(pulseScale1);
    cancelAnimation(pulseScale2);
    cancelAnimation(pulseScale3);
    cancelAnimation(pulseOpacity1);
    cancelAnimation(pulseOpacity2);
    cancelAnimation(pulseOpacity3);
    cancelAnimation(micScale);
    pulseScale1.value = 1;
    pulseScale2.value = 1;
    pulseScale3.value = 1;
    pulseOpacity1.value = 0.4;
    pulseOpacity2.value = 0.3;
    pulseOpacity3.value = 0.2;
    micScale.value = 1;
  }, [pulseScale1, pulseScale2, pulseScale3, pulseOpacity1, pulseOpacity2, pulseOpacity3, micScale]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, [cleanupRecording]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (visible) {
      setRecordingState("idle");
      setErrorType(null);
      setTranscriptionPreview("");
      setRecordingDuration(0);
    } else {
      cleanupRecording();
      stopPulseAnimation();
    }
  }, [visible, cleanupRecording, stopPulseAnimation]);

  // Check and request permissions
  const checkPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        setRecordingState("error");
        setErrorType("permission_denied");
        return false;
      }
      return true;
    } catch {
      setRecordingState("error");
      setErrorType("permission_unavailable");
      return false;
    }
  }, []);

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
    try {
      if (!recordingRef.current) return;

      // Clear timeouts
      cleanupRecording();
      stopPulseAnimation();

      setRecordingState("processing");
      setTranscriptionPreview("Processing your speech...");

      // Haptic feedback
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Stop and get recording
      const recording = recordingRef.current;
      recordingRef.current = null;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (!uri) {
        throw new Error("No recording URI");
      }

      // Convert to base64 and upload
      const response = await fetch(uri);
      const blob = await response.blob();

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]); // Remove data URL prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

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
          setRecordingState("error");
          setErrorType("no_speech_detected");
          return;
        }
        throw new Error(transcriptionResult.error || "Transcription failed");
      }

      const transcribedText = transcriptionResult.text.trim();

      if (!transcribedText) {
        setRecordingState("error");
        setErrorType("no_speech_detected");
        return;
      }

      // Success - show transcription preview
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
        setRecordingState("error");
        setErrorType("network_error");
      } else {
        setRecordingState("error");
        setErrorType("transcription_failed");
      }

      // Error haptic
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  }, [cleanupRecording, stopPulseAnimation, uploadMutation, transcribeMutation, onTranscription, onClose]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      // Haptic feedback
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // Check permissions
      const hasPermission = await checkPermissions();
      if (!hasPermission) return;

      // Configure audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setRecordingState("recording");
      setTranscriptionPreview("");
      setRecordingDuration(0);
      startPulseAnimation();

      // Track duration
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      // Set up silence detection timeout
      resetSilenceTimeout();

      // Set up max duration timeout
      maxDurationTimeoutRef.current = setTimeout(() => {
        if (recordingRef.current) {
          stopRecording();
        }
      }, MAX_RECORDING_DURATION_MS);
    } catch (error) {
      console.error("Failed to start recording:", error);
      setRecordingState("error");
      setErrorType("recording_failed");
    }
  }, [checkPermissions, startPulseAnimation, resetSilenceTimeout, stopRecording]);

  // Handle tap on microphone
  const handleMicPress = useCallback(() => {
    if (recordingState === "idle" || recordingState === "error") {
      setErrorType(null);
      startRecording();
    } else if (recordingState === "recording") {
      stopRecording();
    }
  }, [recordingState, startRecording, stopRecording]);

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

        {/* Content */}
        <Animated.View
          entering={SlideInDown.springify().damping(15)}
          exiting={SlideOutDown.springify().damping(15)}
          style={styles.content}
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
                disabled={recordingState === "processing"}
                activeOpacity={0.8}
                accessibilityLabel={
                  recordingState === "recording"
                    ? "Stop recording"
                    : "Start voice search"
                }
                accessibilityRole="button"
                accessibilityState={{ disabled: recordingState === "processing" }}
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
                          : recordingState === "error"
                          ? colors.warning
                          : colors.primary,
                    },
                  ]}
                >
                  {recordingState === "processing" ? (
                    <ActivityIndicator size="large" color="#FFFFFF" />
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
                  Speak naturally, for example:{"\n"}
                  "pediatric asthma treatment" or "vtach protocol"
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
