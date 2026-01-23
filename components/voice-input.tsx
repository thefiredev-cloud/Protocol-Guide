/**
 * VoiceInput Component (Standalone)
 *
 * A standalone voice input component for Protocol Guide.
 * Designed for integration into the search page's TextInput area.
 *
 * Features:
 * - Audio recording with expo-audio
 * - Whisper API transcription (OpenAI or self-hosted)
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
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
} from "react-native-reanimated";

// Configuration - Update these for your deployment
const WHISPER_API_ENDPOINT = process.env.EXPO_PUBLIC_WHISPER_API_URL || "https://api.openai.com/v1/audio/transcriptions";
const WHISPER_API_KEY = process.env.EXPO_PUBLIC_WHISPER_API_KEY || "";

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

  // Convert audio to base64 for API (web-only PWA)
  const audioToBase64 = async (uri: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64.split(",")[1]); // Remove data URL prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Send audio to Whisper API (web-only PWA)
  const transcribeAudio = async (audioUri: string): Promise<string> => {
    try {
      const formData = new FormData();

      const audioResponse = await fetch(audioUri);
      const blob = await audioResponse.blob();
      formData.append("file", blob, "recording.webm");

      formData.append("model", "whisper-1");
      formData.append("language", "en");

      const response = await fetch(WHISPER_API_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHISPER_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Transcription failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return result.text || "";
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
    try {
      if (!recordingRef.current) return;

      // Stop duration tracking
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      stopPulseAnimation();
      setRecordingState("processing");

      // Stop and get recording
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        throw new Error("No recording URI available");
      }

      // Transcribe
      const rawTranscription = await transcribeAudio(uri);

      // Apply medical corrections
      const correctedText = correctMedicalTerms(rawTranscription);

      // Send to parent
      onTranscription(correctedText);

      setRecordingState("idle");
      setRecordingDuration(0);

    } catch (error) {
      console.error("Failed to process recording:", error);
      onError?.("Failed to process voice input. Please try again.");
      setRecordingState("idle");
      setRecordingDuration(0);
    }
  };

  const handlePress = useCallback(() => {
    if (disabled) return;

    if (recordingState === "idle") {
      startRecording();
    } else if (recordingState === "recording") {
      stopRecording();
    }
    // Don't do anything while processing
  }, [recordingState, disabled]);

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
