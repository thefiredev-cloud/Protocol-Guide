import { useState, useRef, useCallback } from "react";
import { Platform, Alert } from "react-native";
import { useAudioRecorder, AudioModule, RecordingPresets } from "@/lib/audio";
import * as FileSystem from "expo-file-system/legacy";
import { trpc } from "@/lib/trpc";

// Proper state machine states
type RecordingState = "idle" | "recording" | "processing" | "complete";

// Valid state transitions
const VALID_TRANSITIONS: Record<RecordingState, RecordingState[]> = {
  idle: ["recording"],
  recording: ["processing", "idle"], // idle for cancel/error
  processing: ["complete", "idle"], // idle for error
  complete: ["idle"],
};

type VoiceInputState = {
  recordingState: RecordingState;
  error: string | null;
};

// Legacy computed properties for backwards compatibility
type VoiceInputStateComputed = VoiceInputState & {
  isRecording: boolean;
  isProcessing: boolean;
};

export function useVoiceInput(onTranscription: (text: string) => void) {
  const [state, setState] = useState<VoiceInputState>({
    isRecording: false,
    isProcessing: false,
    error: null,
  });

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  
  const uploadMutation = trpc.voice.uploadAudio.useMutation();
  const transcribeMutation = trpc.voice.transcribe.useMutation();

  const startRecording = useCallback(async () => {
    try {
      setState({ isRecording: true, isProcessing: false, error: null });

      // Request permissions
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        setState({ isRecording: false, isProcessing: false, error: "Microphone permission denied" });
        if (Platform.OS !== "web") {
          Alert.alert("Permission Required", "Please enable microphone access in settings.");
        }
        return;
      }

      // Start recording
      await audioRecorder.record();
    } catch (error) {
      console.error("Failed to start recording:", error);
      setState({ 
        isRecording: false, 
        isProcessing: false, 
        error: "Failed to start recording" 
      });
    }
  }, [audioRecorder]);

  const stopRecording = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isRecording: false, isProcessing: true }));

      // Stop recording
      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      if (!uri) {
        setState({ isRecording: false, isProcessing: false, error: "No recording found" });
        return;
      }

      // Read the file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Upload to storage
      const { url } = await uploadMutation.mutateAsync({
        audioBase64: base64,
        mimeType: "audio/m4a",
      });

      // Transcribe
      const result = await transcribeMutation.mutateAsync({
        audioUrl: url,
        language: "en",
      });

      if (result.success && result.text) {
        onTranscription(result.text);
        setState({ isRecording: false, isProcessing: false, error: null });
      } else {
        setState({ 
          isRecording: false, 
          isProcessing: false, 
          error: result.error || "Transcription failed" 
        });
      }

      // Clean up the local file
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } catch {
        // Ignore cleanup errors
      }
    } catch (error) {
      console.error("Failed to process recording:", error);
      setState({ 
        isRecording: false, 
        isProcessing: false, 
        error: "Failed to process recording" 
      });
    }
  }, [audioRecorder, uploadMutation, transcribeMutation, onTranscription]);

  const toggleRecording = useCallback(async () => {
    if (state.isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }, [state.isRecording, startRecording, stopRecording]);

  return {
    ...state,
    startRecording,
    stopRecording,
    toggleRecording,
  };
}
