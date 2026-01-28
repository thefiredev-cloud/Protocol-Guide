/**
 * AI Safety Guardrails for Protocol Guide
 * 
 * CRITICAL: This is a medical application. Wrong information can kill people.
 * All AI outputs MUST go through these guardrails before being returned to users.
 * 
 * Guardrails:
 * 1. Citation Validation - Ensures all clinical information cites protocol sources
 * 2. Dose Safety Checks - Validates medication doses against safe ranges
 * 3. Hallucination Detection - Flags responses that may contain hallucinated content
 * 4. Confidence Scoring - Rates how confident we are in the response
 * 5. Audit Logging - Tracks all AI interactions for QA review
 */

export { GuardrailsWrapper, withGuardrails } from './wrapper';
export { validateCitations, type CitationValidation } from './citation-validator';
export { validateDose, checkDoseSafety, type DoseValidation, type DoseSafetyResult } from './dose-safety';
export { detectHallucination, type HallucinationResult } from './hallucination-detector';
export { calculateConfidence, type ConfidenceScore } from './confidence-scorer';
export { logAiInteraction, type AiAuditEntry } from './audit-logger';
export { MEDICAL_DISCLAIMERS, getDisclaimer, type DisclaimerType } from './disclaimers';
export { SAFE_DOSE_RANGES, type MedicationSafeRange } from './dose-ranges';
