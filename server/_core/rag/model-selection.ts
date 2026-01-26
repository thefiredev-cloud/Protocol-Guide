/**
 * Model and Parameter Selection for RAG Pipeline
 * 
 * Selects optimal similarity thresholds, result limits, and LLM models
 * based on query intent and complexity.
 */

import type { NormalizedQuery } from '../ems-query-normalizer';
import { RAG_CONFIG } from './config';

// ============================================================================
// SIMILARITY THRESHOLD SELECTION
// ============================================================================

/**
 * Select optimal similarity threshold based on query intent
 */
export function selectSimilarityThreshold(normalized: NormalizedQuery): number {
  const { intent, extractedMedications } = normalized;

  // Medication queries need high precision for safety
  if (intent === 'medication_dosing' || extractedMedications.length > 0) {
    return RAG_CONFIG.similarity.medication;
  }

  // Procedure queries need good precision
  if (intent === 'procedure_steps') {
    return RAG_CONFIG.similarity.procedure;
  }

  // Contraindication checks are safety critical
  if (intent === 'contraindication_check') {
    return RAG_CONFIG.similarity.medication;
  }

  // Default to general threshold for better recall
  return RAG_CONFIG.similarity.general;
}

/**
 * Select result limit based on query complexity
 */
export function selectResultLimit(normalized: NormalizedQuery): number {
  if (normalized.isComplex) {
    return RAG_CONFIG.results.complexReturn;
  }

  if (normalized.intent === 'differential_diagnosis') {
    return RAG_CONFIG.results.complexReturn;
  }

  return RAG_CONFIG.results.finalReturn;
}

// ============================================================================
// MODEL ROUTING
// ============================================================================

/**
 * Determine optimal model based on query analysis
 */
export function selectModel(
  normalized: NormalizedQuery,
  userTier: 'free' | 'pro' | 'enterprise'
): 'haiku' | 'sonnet' {
  // Free tier always uses Haiku
  if (userTier === 'free') {
    return 'haiku';
  }

  // Use Sonnet for complex queries
  if (normalized.isComplex) {
    return 'sonnet';
  }

  // Use Sonnet for differential diagnosis
  if (normalized.intent === 'differential_diagnosis') {
    return 'sonnet';
  }

  // Use Sonnet for pediatric medication queries (weight-based dosing is complex)
  if (
    normalized.intent === 'pediatric_specific' &&
    normalized.extractedMedications.length > 0
  ) {
    return 'sonnet';
  }

  // Default to Haiku for speed
  return 'haiku';
}
