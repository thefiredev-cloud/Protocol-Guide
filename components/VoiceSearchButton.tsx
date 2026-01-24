/**
 * VoiceSearchButton Component
 *
 * A microphone button for voice-activated protocol search.
 * Designed for EMS professionals who need hands-free operation.
 *
 * Features:
 * - One-tap to start recording
 * - Automatic silence detection (stops after 2s of silence)
 * - Visual "Listening..." feedback with pulsing animation
 * - Server-side Whisper transcription via tRPC
 * - EMS terminology post-processing
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Platform,
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
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
} from "react-native-reanimated";
import {
  createButtonA11y,
  announceForAccessibility,
  MEDICAL_A11Y_LABELS,
} from "@/lib/accessibility";

// EMS terminology corrections for common voice recognition errors
const EMS_TERMINOLOGY: Record<string, string> = {
  // Medications - Critical
  "epi pen": "EpiPen",
  "epi nephron": "epinephrine",
  "episode reen": "epinephrine",
  "epic nephron": "epinephrine",
  "epi": "epinephrine",
  "narrow can": "Narcan",
  "nar can": "Narcan",
  "knocks own": "naloxone",
  "nal oxone": "naloxone",
  "a beautiful": "albuterol",
  "al buterol": "albuterol",
  "nitro glycerin": "nitroglycerin",
  "nitro": "nitroglycerin",
  "benny drill": "Benadryl",
  "die fen hyde ramine": "diphenhydramine",
  "more feen": "morphine",
  "fent nil": "fentanyl",
  "ami oh dar own": "amiodarone",
  "amio": "amiodarone",
  "a trip in": "atropine",
  "dope a mean": "dopamine",
  "add a no seen": "adenosine",
  "lie dough cane": "lidocaine",
  "val yum": "Valium",
  "die as a pam": "diazepam",
  "verse said": "Versed",
  "mid as oh lam": "midazolam",

  // Cardiac Conditions
  "v tack": "VTach",
  "v tech": "VTach",
  "vee tack": "VTach",
  "v fib": "VFib",
  "vee fib": "VFib",
  "a fib": "AFib",
  "a-fib": "AFib",
  "pea less": "PEA",
  "pea": "PEA",
  "a sis toe lee": "asystole",
  "a cis totally": "asystole",
  "stemi": "STEMI",
  "st elevation": "STEMI",
  "end stemi": "NSTEMI",
  "non stemi": "NSTEMI",
  "my oh card ee al in fark shun": "myocardial infarction",
  "mi": "myocardial infarction",
  "heart attack": "myocardial infarction",

  // Other Conditions
  "anna fill axis": "anaphylaxis",
  "anna full axis": "anaphylaxis",
  "hip oh gly see me ah": "hypoglycemia",
  "low blood sugar": "hypoglycemia",
  "hyper gly see me ah": "hyperglycemia",
  "high blood sugar": "hyperglycemia",
  "see sure": "seizure",
  "seize her": "seizure",
  "c v a": "CVA",
  "t i a": "TIA",
  "stroke": "stroke",

  // Procedures
  "c p r": "CPR",
  "see pee are": "CPR",
  "a e d": "AED",
  "ay ee dee": "AED",
  "in tuba shun": "intubation",
  "in too bate": "intubate",
  "iv": "IV",
  "i v": "IV",
  "i o": "IO",
  "intra osseous": "IO",
  "im": "IM",
  "sub q": "SubQ",
  "subcutaneous": "SubQ",

  // Patient Types
  "pee dee at rick": "pediatric",
  "pediatric": "pediatric",
  "peds": "pediatric",
  "jerry at rick": "geriatric",
  "geriatric": "geriatric",
  "neonatal": "neonatal",
  "neo nate": "neonate",

  // Vitals
  "bee pee": "BP",
  "blood pressure": "blood pressure",
  "oh two sat": "O2 sat",
  "o2 sat": "O2 sat",
  "pulse ox": "pulse ox",
  "sp o2": "SpO2",
  "heart rate": "heart rate",
  "hr": "heart rate",
};

type VoiceSearchButtonProps = {
  onTranscription: (text: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  size?: "small" | "medium" | "large";
};

type RecordingState = "idle" | "recording" | "processing";

// Silence detection configuration
const SILENCE_THRESHOLD = 2000; // 2 seconds of silence to stop
const MAX_RECORDING_DURATION = 30000; // 30 seconds max

export function VoiceSearchButton({
  onTranscription,
  onError,
  disabled = false,
  size = "medium",
}: VoiceSearchButtonProps) {
  const colors = useColors();
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [statusText, setStatusText] = useState("");
  const recordingRef = useRef<Recording | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxDurationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use ref to avoid stale closures in setTimeout callbacks
  const recordingStateRef = useRef<RecordingState>("idle");

  // Keep ref in sync with state
  useEffect(() => {
    recordingStateRef.current = recordingState;
  }, [recordingState]);

  // tRPC mutations
  const uploadMutation = trpc.voice.uploadAudio.useMutation();
  const transcribeMutation = trpc.voice.transcribe.useMutation();

  // Animation for recording indicator
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const startPulseAnimation = useCallback(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 600 }),
        withTiming(1, { duration: 600 })
      ),
      -1,
      false
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 600 }),
        withTiming(0.6, { duration: 600 })
      ),
      -1,
      false
    );
  }, [pulseScale, pulseOpacity]);

  const stopPulseAnimation = useCallback(() => {
    cancelAnimation(pulseScale);
    cancelAnimation(pulseOpacity);
    pulseScale.value = 1;
    pulseOpacity.value = 0.6;
  }, [pulseScale, pulseOpacity]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (maxDurationTimeoutRef.current) {
        clearTimeout(maxDurationTimeoutRef.current);
      }
    };
  }, []);

  // Apply EMS terminology corrections
  const correctEMSTerminology = useCallback((text: string): string => {
    let corrected = text.toLowerCase();

    // Apply corrections
    for (const [mishearing, correction] of Object.entries(EMS_TERMINOLOGY)) {
      const regex = new RegExp(`\\b${mishearing}\\b`, "gi");
      corrected = corrected.replace(regex, correction);
    }

    // Capitalize first letter of each sentence
    corrected = corrected.replace(/(^\s*\w|[.!?]\s*\w)/g, (c) =>
      c.toUpperCase()
    );

    return corrected.trim();
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // Haptic feedback
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // Request permissions
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        const permissionError = "Microphone permission required for voice search";
        onError?.(permissionError);
        announceForAccessibility(permissionError);
        return;
      }

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
      setStatusText("Listening...");
      announceForAccessibility(MEDICAL_A11Y_LABELS.voice.recording);
      startPulseAnimation();

      // Set up silence detection (auto-stop after 2s of no input)
      // Use ref to avoid stale closure in setTimeout
      silenceTimeoutRef.current = setTimeout(() => {
        if (recordingStateRef.current === "recording") {
          stopRecording();
        }
      }, SILENCE_THRESHOLD);

      // Set up max duration timeout
      maxDurationTimeoutRef.current = setTimeout(() => {
        if (recordingRef.current) {
          stopRecording();
        }
      }, MAX_RECORDING_DURATION);
    } catch (error) {
      console.error("Failed to start recording:", error);
      onError?.("Failed to start recording. Please try again.");
      setRecordingState("idle");
      setStatusText("");
    }
  }, [startPulseAnimation, onError]);

  const stopRecording = useCallback(async () => {
    try {
      if (!recordingRef.current) return;

      // Clear timeouts
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      if (maxDurationTimeoutRef.current) {
        clearTimeout(maxDurationTimeoutRef.current);
        maxDurationTimeoutRef.current = null;
      }

      stopPulseAnimation();
      setRecordingState("processing");
      setStatusText("Processing...");
      announceForAccessibility(MEDICAL_A11Y_LABELS.voice.processing);

      // Haptic feedback
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Stop and get recording
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        throw new Error("No recording available");
      }

      // Convert to base64 and upload (cross-platform)
      const base64 = await uriToBase64(uri);

      // Upload audio to server
      const { url: audioUrl } = await uploadMutation.mutateAsync({
        audioBase64: base64,
        mimeType: "audio/webm",
      });

      // Transcribe using server-side Whisper
      const transcriptionResult = await transcribeMutation.mutateAsync({
        audioUrl,
        language: "en",
      });

      if (!transcriptionResult.success || !transcriptionResult.text) {
        throw new Error(
          transcriptionResult.error || "Transcription failed"
        );
      }

      // Apply EMS terminology corrections
      const correctedText = correctEMSTerminology(transcriptionResult.text);

      // Success haptic
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Send to parent
      onTranscription(correctedText);

      setRecordingState("idle");
      setStatusText("");
    } catch (error) {
      console.error("Voice search error:", error);
      onError?.(
        error instanceof Error ? error.message : "Voice search failed"
      );
      setRecordingState("idle");
      setStatusText("");

      // Error haptic
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  }, [stopPulseAnimation, uploadMutation, transcribeMutation, correctEMSTerminology, onTranscription, onError]);

  const handlePress = useCallback(() => {
    if (disabled) return;

    if (recordingState === "idle") {
      startRecording();
    } else if (recordingState === "recording") {
      // Reset silence timeout on tap (user is still engaged)
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = setTimeout(() => {
          stopRecording();
        }, SILENCE_THRESHOLD);
      }
      stopRecording();
    }
    // Don't do anything while processing
  }, [recordingState, disabled]);

  // Size configurations (all sizes meet 48pt minimum for EMS glove accessibility)
  const sizeConfig = {
    small: { button: 48, icon: 18, ring: 56 },
    medium: { button: 48, icon: 22, ring: 56 },
    large: { button: 56, icon: 26, ring: 66 },
  };

  const config = sizeConfig[size];

  const getButtonColor = (): string => {
    switch (recordingState) {
      case "recording":
        return colors.error;
      case "processing":
        return colors.primary;
      default:
        return colors.surface;
    }
  };

  const getIconColor = (): string => {
    switch (recordingState) {
      case "recording":
        return "#FFFFFF";
      case "processing":
        return "#FFFFFF";
      default:
        return colors.primary;
    }
  };

  return (
    <View style={styles.container}>
      {/* Status text */}
      {statusText && (
        <View style={styles.statusContainer}>
          {recordingState === "recording" && (
            <Animated.View
              style={[
                styles.recordingDot,
                { backgroundColor: colors.error },
              ]}
            />
          )}
          {recordingState === "processing" && (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={styles.spinner}
            />
          )}
          <Text
            style={[
              styles.statusText,
              {
                color:
                  recordingState === "recording"
                    ? colors.error
                    : colors.primary,
              },
            ]}
          >
            {statusText}
          </Text>
        </View>
      )}

      {/* Pulse ring (only when recording) */}
      {recordingState === "recording" && (
        <Animated.View
          style={[
            pulseStyle,
            styles.pulseRing,
            {
              width: config.ring,
              height: config.ring,
              borderRadius: config.ring / 2,
              backgroundColor: colors.error,
            },
          ]}
        />
      )}

      {/* Main button */}
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || recordingState === "processing"}
        activeOpacity={0.7}
        style={[
          styles.button,
          {
            width: config.button,
            height: config.button,
            borderRadius: config.button / 2,
            backgroundColor: getButtonColor(),
            opacity: disabled ? 0.5 : 1,
          },
        ]}
        accessible={true}
        accessibilityLabel={
          recordingState === "idle"
            ? MEDICAL_A11Y_LABELS.search.voiceSearch
            : recordingState === "recording"
            ? MEDICAL_A11Y_LABELS.search.stopVoice
            : MEDICAL_A11Y_LABELS.voice.processing
        }
        accessibilityRole="button"
        accessibilityHint={
          recordingState === "idle"
            ? "Activates voice recording for hands-free search"
            : recordingState === "recording"
            ? "Stops voice recording and processes your speech"
            : undefined
        }
        accessibilityState={{
          disabled: disabled || recordingState === "processing",
          busy: recordingState === "processing",
        }}
      >
        {recordingState === "processing" ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <IconSymbol
            name={recordingState === "recording" ? "stop.fill" : "mic.fill"}
            size={config.icon}
            color={getIconColor()}
          />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  spinner: {
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  pulseRing: {
    position: "absolute",
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default VoiceSearchButton;
