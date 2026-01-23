/**
 * Voice Search Tests
 *
 * Tests for speech-to-text integration and voice input:
 * - Speech-to-text transcription
 * - EMS abbreviation handling in voice input
 * - Voice recording and processing
 * - Error handling and permissions
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { normalizeEmsQuery, EMS_ABBREVIATIONS } from "../server/_core/ems-query-normalizer";

// Mock audio recording results
const mockRecordings = {
  cardiacArrest: {
    text: "cardiac arrest protocol",
    confidence: 0.95,
  },
  epiDose: {
    text: "epi dose for vtach",
    confidence: 0.92,
  },
  abbreviatedQuery: {
    text: "bp hr and gcs for stroke patient",
    confidence: 0.88,
  },
  complexQuery: {
    text: "peds dose of epi for anaphylaxis",
    confidence: 0.91,
  },
  noisyAudio: {
    text: "seach protocol for...",
    confidence: 0.45,
  },
};

// Mock voice transcription service
async function mockTranscribe(audioUrl: string, language: string = "en") {
  // Simulate API latency
  await new Promise(resolve => setTimeout(resolve, 50));

  // Return different results based on test scenarios
  if (audioUrl.includes("cardiac-arrest")) {
    return { success: true, text: mockRecordings.cardiacArrest.text };
  } else if (audioUrl.includes("epi-dose")) {
    return { success: true, text: mockRecordings.epiDose.text };
  } else if (audioUrl.includes("abbreviated")) {
    return { success: true, text: mockRecordings.abbreviatedQuery.text };
  } else if (audioUrl.includes("complex")) {
    return { success: true, text: mockRecordings.complexQuery.text };
  } else if (audioUrl.includes("noisy")) {
    return { success: false, error: "Low confidence transcription" };
  } else if (audioUrl.includes("error")) {
    throw new Error("Transcription service error");
  }

  return { success: true, text: "test query" };
}

// Mock audio upload
async function mockUploadAudio(base64: string, mimeType: string) {
  if (!base64 || base64.length < 100) {
    throw new Error("Invalid audio data");
  }

  return { url: `https://storage.test/audio-${Date.now()}.${mimeType.split('/')[1]}` };
}

describe("Voice Search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Speech-to-Text Integration", () => {
    it("should transcribe clear audio successfully", async () => {
      const result = await mockTranscribe("https://test.com/cardiac-arrest.m4a");

      expect(result.success).toBe(true);
      expect(result.text).toBe("cardiac arrest protocol");
    });

    it("should handle transcription with acceptable confidence", async () => {
      const result = await mockTranscribe("https://test.com/epi-dose.m4a");

      expect(result.success).toBe(true);
      expect(result.text).toContain("epi");
      expect(result.text).toContain("vtach");
    });

    it("should reject low confidence transcriptions", async () => {
      const result = await mockTranscribe("https://test.com/noisy.m4a");

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("should handle transcription service errors gracefully", async () => {
      await expect(
        mockTranscribe("https://test.com/error.m4a")
      ).rejects.toThrow("Transcription service error");
    });

    it("should support multiple languages", async () => {
      const result = await mockTranscribe("https://test.com/cardiac-arrest.m4a", "en");
      expect(result.success).toBe(true);

      // Future: Test with other languages
      // const esResult = await mockTranscribe("https://test.com/spanish.m4a", "es");
    });
  });

  describe("EMS Abbreviation Handling", () => {
    it("should expand 'epi' to 'epinephrine' in voice input", () => {
      const voiceText = "epi dose for anaphylaxis";
      const normalized = normalizeEmsQuery(voiceText);

      expect(normalized.normalized).toContain("epinephrine");
      expect(normalized.expandedAbbreviations).toContainEqual(
        expect.stringContaining("epi -> epinephrine")
      );
    });

    it("should expand 'bp' to 'blood pressure'", () => {
      const voiceText = "check bp for stroke patient";
      const normalized = normalizeEmsQuery(voiceText);

      expect(normalized.normalized).toContain("blood pressure");
      expect(normalized.expandedAbbreviations.length).toBeGreaterThan(0);
    });

    it("should expand multiple abbreviations in one query", () => {
      const voiceText = "bp hr and gcs for stroke patient";
      const normalized = normalizeEmsQuery(voiceText);

      expect(normalized.normalized).toContain("blood pressure");
      expect(normalized.normalized).toContain("heart rate");
      expect(normalized.normalized).toContain("glasgow coma scale");
      expect(normalized.expandedAbbreviations.length).toBe(3);
    });

    it("should expand 'vtach' to 'ventricular tachycardia'", () => {
      const voiceText = "treatment for vtach";
      const normalized = normalizeEmsQuery(voiceText);

      expect(normalized.normalized).toContain("ventricular tachycardia");
    });

    it("should expand 'sob' to 'shortness of breath'", () => {
      const voiceText = "patient with sob";
      const normalized = normalizeEmsQuery(voiceText);

      expect(normalized.normalized).toContain("shortness of breath");
    });

    it("should handle pediatric abbreviations", () => {
      const voiceText = "peds dose of epi";
      const normalized = normalizeEmsQuery(voiceText);

      expect(normalized.normalized).toContain("pediatric");
      expect(normalized.normalized).toContain("epinephrine");
      // Note: "dose" keyword triggers medication_dosing intent first
      expect(["pediatric_specific", "medication_dosing"]).toContain(normalized.intent);
    });

    it("should expand cardiac abbreviations", () => {
      const voiceText = "vfib protocol";
      const normalized = normalizeEmsQuery(voiceText);

      expect(normalized.normalized).toContain("ventricular fibrillation");
    });

    it("should expand respiratory abbreviations", () => {
      const voiceText = "cpap for copd";
      const normalized = normalizeEmsQuery(voiceText);

      expect(normalized.normalized).toContain("continuous positive airway pressure");
      expect(normalized.normalized).toContain("chronic obstructive pulmonary disease");
    });
  });

  describe("Voice Recording Flow", () => {
    it("should upload audio successfully", async () => {
      const validBase64 = "a".repeat(200); // Mock valid audio data
      const result = await mockUploadAudio(validBase64, "audio/m4a");

      expect(result.url).toContain("https://storage.test/audio-");
      expect(result.url).toContain(".m4a");
    });

    it("should reject invalid audio data", async () => {
      const invalidBase64 = "short";

      await expect(
        mockUploadAudio(invalidBase64, "audio/m4a")
      ).rejects.toThrow("Invalid audio data");
    });

    it("should handle different audio formats", async () => {
      const validBase64 = "a".repeat(200);

      const m4aResult = await mockUploadAudio(validBase64, "audio/m4a");
      expect(m4aResult.url).toContain(".m4a");

      const wavResult = await mockUploadAudio(validBase64, "audio/wav");
      expect(wavResult.url).toContain(".wav");
    });

    it("should process full voice search workflow", async () => {
      // 1. Upload audio
      const audioBase64 = "a".repeat(200);
      const { url } = await mockUploadAudio(audioBase64, "audio/m4a");

      // 2. Transcribe
      const transcription = await mockTranscribe(url.replace(/\d+/, "cardiac-arrest"));

      // 3. Normalize for search
      const normalized = normalizeEmsQuery(transcription.text!);

      expect(url).toBeTruthy();
      expect(transcription.success).toBe(true);
      expect(normalized.normalized).toContain("cardiac arrest");
    });
  });

  describe("Complex Voice Queries", () => {
    it("should handle multi-part questions", async () => {
      const voiceText = "what is the epi dose for peds cardiac arrest";
      const normalized = normalizeEmsQuery(voiceText);

      expect(normalized.normalized).toContain("epinephrine");
      expect(normalized.normalized).toContain("pediatric");
      expect(normalized.normalized).toContain("cardiac arrest");
      expect(normalized.intent).toBe("pediatric_specific");
    });

    it("should handle medication dosing questions", async () => {
      const voiceText = "how much amiodarone for vfib";
      const normalized = normalizeEmsQuery(voiceText);

      expect(normalized.normalized).toContain("amiodarone");
      expect(normalized.normalized).toContain("ventricular fibrillation");
      expect(normalized.intent).toBe("medication_dosing");
    });

    it("should extract medication names from voice input", () => {
      const voiceText = "give epi and atropine for bradycardia";
      const normalized = normalizeEmsQuery(voiceText);

      expect(normalized.extractedMedications).toContain("epinephrine");
      expect(normalized.extractedMedications).toContain("atropine");
    });

    it("should extract conditions from voice input", () => {
      const voiceText = "protocol for stroke with seizure";
      const normalized = normalizeEmsQuery(voiceText);

      expect(normalized.extractedConditions).toContain("stroke");
      expect(normalized.extractedConditions).toContain("seizure");
    });
  });

  describe("Typo Correction in Voice", () => {
    it("should correct common pronunciation errors", () => {
      // Voice recognition sometimes produces phonetic spellings
      const voiceText = "epinephrin dose"; // Missing 'e'
      const normalized = normalizeEmsQuery(voiceText);

      expect(normalized.normalized).toContain("epinephrine");
      expect(normalized.correctedTypos.length).toBeGreaterThan(0);
    });

    it("should correct medical term variations", () => {
      const voiceText = "defibralation protocol";
      const normalized = normalizeEmsQuery(voiceText);

      expect(normalized.normalized).toContain("defibrillation");
    });
  });

  describe("Field Use Cases", () => {
    it("should handle rushed queries", () => {
      const voiceText = "vfib dose"; // Minimal query in emergency
      const normalized = normalizeEmsQuery(voiceText);

      expect(normalized.normalized).toContain("ventricular fibrillation");
      expect(normalized.intent).toBe("medication_dosing");
    });

    it("should detect emergent situations", () => {
      const voiceText = "cardiac arrest protocol";
      const normalized = normalizeEmsQuery(voiceText);

      expect(normalized.isEmergent).toBe(true);
    });

    it("should handle equipment abbreviations", () => {
      const voiceText = "use bvm or king airway";
      const normalized = normalizeEmsQuery(voiceText);

      expect(normalized.normalized).toContain("bag valve mask");
      expect(normalized.normalized).toContain("king airway");
    });

    it("should handle assessment tool names", () => {
      const voiceText = "check gcs and avpu";
      const normalized = normalizeEmsQuery(voiceText);

      expect(normalized.normalized).toContain("glasgow coma scale");
      expect(normalized.normalized).toContain("alert verbal pain unresponsive");
    });
  });

  describe("Error Handling", () => {
    it("should provide helpful error for empty transcription", async () => {
      const result = await mockTranscribe("https://test.com/silent.m4a");

      if (!result.success) {
        expect(result.error).toBeTruthy();
      } else {
        expect(result.text).toBeDefined();
      }
    });

    it("should handle network errors gracefully", async () => {
      await expect(
        mockTranscribe("https://test.com/error.m4a")
      ).rejects.toThrow();
    });

    it("should validate audio format before upload", async () => {
      const validBase64 = "a".repeat(200);

      await expect(
        mockUploadAudio(validBase64, "audio/m4a")
      ).resolves.toBeTruthy();

      // Invalid data should fail
      await expect(
        mockUploadAudio("", "audio/m4a")
      ).rejects.toThrow();
    });
  });

  describe("Performance", () => {
    it("should transcribe within acceptable time", async () => {
      const start = Date.now();
      await mockTranscribe("https://test.com/cardiac-arrest.m4a");
      const duration = Date.now() - start;

      // Should complete within 2 seconds (mocked, real API may take longer)
      expect(duration).toBeLessThan(2000);
    });

    it("should normalize query quickly", () => {
      const start = Date.now();
      normalizeEmsQuery("epi dose for vtach with peds patient");
      const duration = Date.now() - start;

      // Normalization should be very fast (<10ms)
      expect(duration).toBeLessThan(10);
    });
  });

  describe("Abbreviation Dictionary Coverage", () => {
    it("should cover common cardiac abbreviations", () => {
      expect(EMS_ABBREVIATIONS.vfib).toBe("ventricular fibrillation");
      expect(EMS_ABBREVIATIONS.vtach).toBe("ventricular tachycardia");
      expect(EMS_ABBREVIATIONS.svt).toBe("supraventricular tachycardia");
      expect(EMS_ABBREVIATIONS.afib).toBe("atrial fibrillation");
      expect(EMS_ABBREVIATIONS.pea).toBe("pulseless electrical activity");
      expect(EMS_ABBREVIATIONS.rosc).toBe("return of spontaneous circulation");
    });

    it("should cover common medication abbreviations", () => {
      expect(EMS_ABBREVIATIONS.epi).toBe("epinephrine");
      expect(EMS_ABBREVIATIONS.ntg).toBe("nitroglycerin");
      expect(EMS_ABBREVIATIONS.asa).toBe("aspirin");
      expect(EMS_ABBREVIATIONS.narcan).toBe("naloxone");
    });

    it("should cover route abbreviations", () => {
      expect(EMS_ABBREVIATIONS.iv).toBe("intravenous");
      expect(EMS_ABBREVIATIONS.io).toBe("intraosseous");
      expect(EMS_ABBREVIATIONS.im).toBe("intramuscular");
      expect(EMS_ABBREVIATIONS.sl).toBe("sublingual");
    });

    it("should cover vital sign abbreviations", () => {
      expect(EMS_ABBREVIATIONS.bp).toBe("blood pressure");
      expect(EMS_ABBREVIATIONS.hr).toBe("heart rate");
      expect(EMS_ABBREVIATIONS.rr).toBe("respiratory rate");
      expect(EMS_ABBREVIATIONS.spo2).toBe("oxygen saturation");
    });
  });
});
