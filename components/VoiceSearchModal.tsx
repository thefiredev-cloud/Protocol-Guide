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

import { useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import Animated, {
  useSharedValue,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { useFocusTrap } from "@/lib/accessibility";
import {
  ERROR_MESSAGES,
  stopPulseAnimation,
  useRippleStyles,
  RippleAnimationValues,
  formatDuration,
  getStatusText,
  voiceModalStyles,
} from "@/components/voice";
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
  const { pulseStyle1, pulseStyle2, pulseStyle3, micAnimatedStyle } = useRippleStyles(animationValues);

  // Recording hook
  const {
    errorType,
    setErrorType,
    transcriptionPreview,
    recordingDuration,
    cleanupRecording,
    handleMicPress,
  } = useVoiceRecording({
    stateRef,
    transitionTo,
    animationValues,
    onTranscription,
    onClose,
  });

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
    } else {
      cleanupRecording();
      stopPulseAnimation(animationValues);
      resetState();
    }
  }, [visible, cleanupRecording, resetState, setErrorType, animationValues]);

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
              {getStatusText(recordingState, errorType)}
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

// Alias the imported styles for use in this component
const styles = voiceModalStyles;

export default VoiceSearchModal;
