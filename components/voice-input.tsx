/**
 * VoiceInput Component (Standalone)
 *
 * A standalone voice input component for Protocol Guide.
 * Designed for integration into the search page's TextInput area.
 *
 * Features:
 * - Audio recording with expo-audio
 * - Server-side Whisper API transcription via tRPC (secure, rate-limited)
 * - Visual feedback during recording
 * - Medical terminology post-processing
 *
 * Integration Point: search.tsx - alongside the search TextInput
 */

import { useState, useRef, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Audio, Recording } from "@/lib/audio";
import { uriToBase64 } from "@/lib/blob-utils";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
} from "react-native-reanimated";

// Medical terminology corrections for common EMS/medical terms
const MEDICAL_CORRECTIONS: Record<string, string> = {
  // Drug names (common mishearings)
  "epi pen": "EpiPen",
  "epi nephron": "epinephrine",
  "episode reen": "epinephrine",
  "narrow can": "Narcan",
  "nal oxone": "naloxone",
  "a beautiful": "albuterol",
  "al buterol": "albuterol",
  "nitro glycerin": "nitroglycerin",
  "benny drill": "Benadryl",
  "die fen hyde ramine": "diphenhydramine",
  "more feen": "morphine",
  "fentanyl": "fentanyl",
  "ami oh dar own": "amiodarone",
  "a trip in": "atropine",
  "dope a mean": "dopamine",
  "add a no seen": "adenosine",
  "lie dough cane": "lidocaine",
  "val yum": "Valium",
  "die as a pam": "diazepam",
  "verse said": "Versed",
  "mid as oh lam": "midazolam",

  // Conditions
  "my oh card ee al in fark shun": "myocardial infarction",
  "stemi": "STEMI",
  "end stemi": "NSTEMI",
  "a fib": "AFib",
  "v fib": "VFib",
  "v tack": "VTach",
  "pea": "PEA",
  "a sis toe lee": "asystole",
  "anna fill axis": "anaphylaxis",
  "hip oh gly see me ah": "hypoglycemia",
  "hyper gly see me ah": "hyperglycemia",
  "see sure": "seizure",
  "seize her": "seizure",
  "stroke": "stroke",
  "c v a": "CVA",
  "t i a": "TIA",

  // Procedures
  "in tuba shun": "intubation",
  "in too bate": "intubate",
  "c p r": "CPR",
  "a e d": "AED",
  "iv": "IV",
  "i o": "IO",
  "im": "IM",
  "sub q": "SubQ",

  // Patient types
  "pee dee at rick": "pediatric",
  "jerry at rick": "geriatric",
  "neonatal": "neonatal",
  "neo nate": "neonate",

  // Common medical terms
  "bee pee": "BP",
  "blood pressure": "blood pressure",
  "oh two sat": "O2 sat",
  "pulse ox": "pulse ox",
  "respiration": "respiration",
  "heart rate": "heart rate",
};

type VoiceInputProps = {
  onTranscription: (text: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
};

type RecordingState = "idle" | "recording" | "processing" | "complete";

// Valid state transitions - prevents invalid state changes
const VALID_TRANSITIONS: Record<RecordingState, RecordingState[]> = {
  idle: ["recording"],
  recording: ["processing", "idle"], // idle for cancel/error
  processing: ["complete", "idle"], // idle for error
  complete: ["idle"],
};

export function VoiceInput({ onTranscription, onError, disabled = false }: VoiceInputProps) {
  const colors = useColors();
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingRef = useRef<Recording | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // tRPC mutations for server-side transcription
  const uploadAudioMutation = trpc.voice.uploadAudio.useMutation();
  const transcribeMutation = trpc.voice.transcribe.useMutation();

  // Use ref to track current state synchronously (prevents race conditions)
  const stateRef = useRef<RecordingState>("idle");

  // State machine transition function - validates transitions
  const transitionTo = useCallback((newState: RecordingState): boolean => {
    const currentState = stateRef.current;
    const validNextStates = VALID_TRANSITIONS[currentState];

    if (!validNextStates.includes(newState)) {
      console.warn(`VoiceInput: Invalid state transition: ${currentState} -> ${newState}`);
      return false;
    }

    stateRef.current = newState;
    setRecordingState(newState);
    return true;
  }, []);

  // Animation for recording indicator
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(1);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const startPulseAnimation = useCallback(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 500 }),
        withTiming(1, { duration: 500 })
      ),
      -1,
      false
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 500 }),
        withTiming(1, { duration: 500 })
      ),
      -1,
      false
    );
  }, []);

  const stopPulseAnimation = useCallback(() => {
    cancelAnimation(pulseScale);
    cancelAnimation(pulseOpacity);
    pulseScale.value = 1;
    pulseOpacity.value = 1;
  }, []);

  // Apply medical terminology corrections
  const correctMedicalTerms = useCallback((text: string): string => {
    let corrected = text.toLowerCase();

    // Apply corrections
    for (const [mishearing, correction] of Object.entries(MEDICAL_CORRECTIONS)) {
      const regex = new RegExp(mishearing, "gi");
      corrected = corrected.replace(regex, correction);
    }

    // Capitalize first letter
    corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);

    return corrected;
  }, []);

  // Convert audio to base64 for API (cross-platform)
  const audioToBase64 = async (uri: string): Promise<string> => {
    return uriToBase64(uri);
  };

  // Get MIME type based on platform
  const getMimeType = (): string => {
    return Platform.OS === 'web' ? 'audio/webm' : 'audio/m4a';
  };

  // Send audio to server via tRPC for secure transcription
  const transcribeAudio = async (audioUri: string): Promise<string> => {
    try {
      // Step 1: Convert audio to base64
      let audioBase64: string;
      if (Platform.OS === 'web') {
        const audioResponse = await fetch(audioUri);
        const blob = await audioResponse.blob();
        const arrayBuffer = await blob.arrayBuffer();
        audioBase64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ''
          )
        );
      } else {
        audioBase64 = await audioToBase64(audioUri);
      }

      // Step 2: Upload audio to server storage
      const uploadResult = await uploadAudioMutation.mutateAsync({
        audioBase64,
        mimeType: getMimeType(),
      });

      // Step 3: Transcribe via server-side Whisper API
      const transcribeResult = await transcribeMutation.mutateAsync({
        audioUrl: uploadResult.url,
        language: 'en',
      });

      if (!transcribeResult.success || !transcribeResult.text) {
        throw new Error(transcribeResult.error || 'Transcription failed');
      }

      return transcribeResult.text;
    } catch (error) {
      console.error("Transcription error:", error);
      throw error;
    }
  };

  const startRecording = async () => {
    // Guard: Only allow starting from idle state
    if (stateRef.current !== "idle") {
      console.warn(`startRecording called in invalid state: ${stateRef.current}`);
      return;
    }

    try {
      // Request permissions
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        onError?.("Microphone permission is required for voice input");
        return;
      }

      // Verify state hasn't changed during async permission check
      if (stateRef.current !== "idle") {
        console.warn("State changed during permission check, aborting startRecording");
        return;
      }

      // Configure audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Verify state again after async audio setup
      if (stateRef.current !== "idle") {
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

      setRecordingDuration(0);
      startPulseAnimation();

      // Track duration
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

    } catch (error) {
      console.error("Failed to start recording:", error);
      onError?.("Failed to start recording. Please try again.");
      stateRef.current = "idle";
      setRecordingState("idle");
    }
  };

  const stopRecording = async () => {
    // Guard: Only allow stopping from recording state
    if (stateRef.current !== "recording") {
      console.warn(`stopRecording called in invalid state: ${stateRef.current}`);
      return;
    }

    // Guard: Must have an active recording
    if (!recordingRef.current) {
      console.warn("stopRecording called but no recording ref exists");
      stateRef.current = "idle";
      setRecordingState("idle");
      onError?.("No recording found");
      return;
    }

    try {
      // Stop duration tracking first
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      stopPulseAnimation();

      // Transition to processing state
      if (!transitionTo("processing")) return;

      // Capture and clear the recording ref BEFORE async operations
      const recording = recordingRef.current;
      recordingRef.current = null;

      // Stop and get recording
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (!uri) {
        throw new Error("No recording URI available");
      }

      // Transcribe
      const rawTranscription = await transcribeAudio(uri);

      // Apply medical corrections
      const correctedText = correctMedicalTerms(rawTranscription);

      // Transition to complete state
      if (!transitionTo("complete")) return;

      // Send to parent
      onTranscription(correctedText);

      // Reset to idle after a brief moment
      setTimeout(() => {
        if (stateRef.current === "complete") {
          transitionTo("idle");
          setRecordingDuration(0);
        }
      }, 100);

    } catch (error) {
      console.error("Failed to process recording:", error);
      onError?.("Failed to process voice input. Please try again.");
      stateRef.current = "idle";
      setRecordingState("idle");
      setRecordingDuration(0);
    }
  };

  const handlePress = useCallback(() => {
    if (disabled) return;

    const currentState = stateRef.current;
    if (currentState === "idle") {
      startRecording();
    } else if (currentState === "recording") {
      stopRecording();
    }
    // Ignore presses during processing or complete states
  }, [disabled]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getButtonColor = (): string => {
    switch (recordingState) {
      case "recording":
        return colors.error;
      case "processing":
        return colors.warning;
      default:
        return colors.primary;
    }
  };

  return (
    <View className="flex-row items-center">
      {/* Recording duration indicator */}
      {recordingState === "recording" && (
        <View className="mr-2 flex-row items-center">
          <Animated.View
            style={[
              pulseStyle,
              {
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.error,
                marginRight: 6,
              },
            ]}
          />
          <Text className="text-sm text-error font-medium">
            {formatDuration(recordingDuration)}
          </Text>
        </View>
      )}

      {/* Processing indicator */}
      {recordingState === "processing" && (
        <View className="mr-2 flex-row items-center">
          <ActivityIndicator size="small" color={colors.warning} />
          <Text className="text-sm text-warning ml-2">Processing...</Text>
        </View>
      )}

      {/* Voice button */}
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || recordingState === "processing"}
        activeOpacity={0.7}
        className="p-2 rounded-full"
        style={{
          backgroundColor: getButtonColor() + "20",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <IconSymbol
          name={recordingState === "recording" ? "stop.fill" : "mic.fill"}
          size={22}
          color={getButtonColor()}
        />
      </TouchableOpacity>
    </View>
  );
}

export default VoiceInput;
