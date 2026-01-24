/**
 * Native Audio API wrapper for voice recording
 * Platform: iOS and Android
 *
 * Note: This is a stub implementation. To enable native audio recording:
 * 1. Install expo-av: npx expo install expo-av
 * 2. Uncomment the implementation below
 * 3. Remove this stub
 */

// Stub types for compatibility
export const RecordingOptionsPresets = {
  HIGH_QUALITY: {
    android: {
      extension: '.m4a',
      outputFormat: 2,
      audioEncoder: 3,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
    },
    ios: {
      extension: '.m4a',
      outputFormat: 'mpeg4aac',
      audioQuality: 127,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      mimeType: 'audio/webm',
      bitsPerSecond: 128000,
    }
  },
};

export interface Recording {
  stopAndUnloadAsync(): Promise<void>;
  getURI(): string | null;
}

// Stub implementation - throws helpful error
class StubRecording implements Recording {
  async stopAndUnloadAsync(): Promise<void> {
    throw new Error('Native audio recording not configured. Install expo-av to enable.');
  }

  getURI(): string | null {
    return null;
  }
}

export const Audio = {
  async requestPermissionsAsync(): Promise<{ granted: boolean }> {
    console.warn('Native audio not configured. Install expo-av to enable audio recording.');
    return { granted: false };
  },

  async setAudioModeAsync(_options: {
    allowsRecordingIOS?: boolean;
    playsInSilentModeIOS?: boolean;
  }): Promise<void> {
    // No-op
  },

  Recording: {
    async createAsync(
      _options?: typeof RecordingOptionsPresets.HIGH_QUALITY
    ): Promise<{ recording: Recording }> {
      throw new Error('Native audio recording not configured. Install expo-av to enable.');
    },
  },

  RecordingOptionsPresets,
};

export const AudioModule = {
  async requestRecordingPermissionsAsync(): Promise<{ granted: boolean }> {
    return Audio.requestPermissionsAsync();
  },
};

export const RecordingPresets = {
  HIGH_QUALITY: RecordingOptionsPresets.HIGH_QUALITY,
};

export function useAudioRecorder(_preset: typeof RecordingPresets.HIGH_QUALITY) {
  return {
    get uri(): string | null {
      return null;
    },

    async record(): Promise<void> {
      throw new Error('Native audio recording not configured. Install expo-av to enable.');
    },

    async stop(): Promise<void> {
      // No-op
    },
  };
}

export default Audio;

/*
// UNCOMMENT THIS WHEN EXPO-AV IS INSTALLED:

import { Audio as ExpoAudio } from 'expo-av';

export const RecordingOptionsPresets = {
  HIGH_QUALITY: ExpoAudio.RecordingOptionsPresets.HIGH_QUALITY,
};

export interface Recording {
  stopAndUnloadAsync(): Promise<void>;
  getURI(): string | null;
}

class NativeRecording implements Recording {
  constructor(private recording: ExpoAudio.Recording) {}

  async stopAndUnloadAsync(): Promise<void> {
    await this.recording.stopAndUnloadAsync();
  }

  getURI(): string | null {
    return this.recording.getURI();
  }
}

export const Audio = {
  async requestPermissionsAsync(): Promise<{ granted: boolean }> {
    const { status } = await ExpoAudio.requestPermissionsAsync();
    return { granted: status === 'granted' };
  },

  async setAudioModeAsync(options: {
    allowsRecordingIOS?: boolean;
    playsInSilentModeIOS?: boolean;
  }): Promise<void> {
    await ExpoAudio.setAudioModeAsync({
      allowsRecordingIOS: options.allowsRecordingIOS ?? true,
      playsInSilentModeIOS: options.playsInSilentModeIOS ?? true,
    });
  },

  Recording: {
    async createAsync(
      options?: typeof RecordingOptionsPresets.HIGH_QUALITY
    ): Promise<{ recording: Recording }> {
      const { recording } = await ExpoAudio.Recording.createAsync(
        options || RecordingOptionsPresets.HIGH_QUALITY
      );
      return { recording: new NativeRecording(recording) };
    },
  },

  RecordingOptionsPresets,
};

export const AudioModule = {
  async requestRecordingPermissionsAsync(): Promise<{ granted: boolean }> {
    return Audio.requestPermissionsAsync();
  },
};

export const RecordingPresets = {
  HIGH_QUALITY: RecordingOptionsPresets.HIGH_QUALITY,
};

export function useAudioRecorder(_preset: typeof RecordingPresets.HIGH_QUALITY) {
  let recording: NativeRecording | null = null;
  let currentUri: string | null = null;

  return {
    get uri(): string | null {
      return currentUri;
    },

    async record(): Promise<void> {
      const result = await Audio.Recording.createAsync();
      recording = result.recording as NativeRecording;
    },

    async stop(): Promise<void> {
      if (recording) {
        await recording.stopAndUnloadAsync();
        currentUri = recording.getURI();
        recording = null;
      }
    },
  };
}

export default Audio;
*/
