import { useState, useRef, useCallback, useEffect } from "react";

export function useVoiceSearch() {
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const voiceErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleVoiceError = useCallback((error: string) => {
    setVoiceError(error);
    // Clear any existing timer before setting a new one
    if (voiceErrorTimerRef.current) {
      clearTimeout(voiceErrorTimerRef.current);
    }
    // Clear error after 3 seconds
    voiceErrorTimerRef.current = setTimeout(() => setVoiceError(null), 3000);
  }, []);

  const clearVoiceError = useCallback(() => {
    setVoiceError(null);
    if (voiceErrorTimerRef.current) {
      clearTimeout(voiceErrorTimerRef.current);
    }
  }, []);

  // Cleanup voice error timer on unmount
  useEffect(() => {
    return () => {
      if (voiceErrorTimerRef.current) {
        clearTimeout(voiceErrorTimerRef.current);
      }
    };
  }, []);

  return {
    voiceError,
    handleVoiceError,
    clearVoiceError,
  };
}
