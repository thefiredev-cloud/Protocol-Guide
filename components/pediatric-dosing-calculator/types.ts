/**
 * Medication Dosing Calculator Types
 * 
 * Types for LA County EMS dosing protocols.
 * Supports both pediatric and adult dosing.
 */

export type WeightUnit = 'kg' | 'lbs';
export type PatientType = 'pediatric' | 'adult';
export type AlertLevel = 'critical' | 'warning' | 'info' | 'none';

export type MedicationIndication = 
  | 'cardiac-arrest'
  | 'anaphylaxis'
  | 'seizures'
  | 'hypoglycemia'
  | 'allergic-reaction'
  | 'pain'
  | 'respiratory'
  | 'antiarrhythmic';

export interface MedicationDoseRange {
  /** Minimum dose for this range */
  min: number;
  /** Maximum dose for this range */
  max: number;
  /** Typical/starting dose */
  typical: number;
  /** Unit (mg, mcg, etc.) */
  unit: string;
}

export interface PediatricMedication {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Generic name */
  genericName: string;
  /** Clinical indication */
  indication: MedicationIndication;
  /** Dose per kg (for weight-based dosing) */
  dosePerKg: number;
  /** Unit for dose calculation (mg, mcg, etc.) */
  doseUnit: string;
  /** Concentration of available preparation */
  concentration: number;
  /** Unit for concentration (mg/mL, etc.) */
  concentrationUnit: string;
  /** Route of administration */
  route: string;
  /** Maximum single dose */
  maxDose: number;
  /** Maximum dose unit */
  maxDoseUnit: string;
  /** Minimum effective dose (optional) */
  minDose?: number;
  /** Clinical notes */
  notes?: string;
  /** LA County specific notes */
  laCountyNotes?: string;
  /** Color coding for quick ID */
  color: string;
  /** Icon name */
  icon: string;
  /** Patient type this medication entry is for */
  patientType: PatientType;
  /** For adult fixed-dose meds: dose range */
  adultDoseRange?: MedicationDoseRange;
  /** Titration interval */
  titrationInterval?: string;
  /** Repeat dose info */
  repeatInfo?: string;
  /** Contraindication categories */
  contraindicationCategories?: string[];
}

export interface PediatricDosingResult {
  /** Calculated dose in dose units (mg, mcg) */
  dose: number;
  /** Volume to administer in mL */
  volumeMl: number;
  /** Whether max dose was reached */
  maxDoseReached: boolean;
  /** Whether dose is below minimum */
  belowMinDose: boolean;
  /** Display string for dose */
  doseDisplay: string;
  /** Display string for volume */
  volumeDisplay: string;
  /** Any warnings */
  warnings: string[];
}

export interface WeightRange {
  label: string;
  minKg: number;
  maxKg: number;
  typical: string;
}

export const WEIGHT_RANGES: WeightRange[] = [
  { label: 'Neonate', minKg: 0, maxKg: 4, typical: 'Birth-1 month' },
  { label: 'Infant', minKg: 4, maxKg: 10, typical: '1-12 months' },
  { label: 'Toddler', minKg: 10, maxKg: 15, typical: '1-3 years' },
  { label: 'Child', minKg: 15, maxKg: 25, typical: '4-8 years' },
  { label: 'School Age', minKg: 25, maxKg: 40, typical: '9-12 years' },
  { label: 'Adolescent', minKg: 40, maxKg: 80, typical: '13+ years' },
];

export function getWeightCategory(weightKg: number): WeightRange | null {
  return WEIGHT_RANGES.find(r => weightKg >= r.minKg && weightKg < r.maxKg) ?? null;
}

// ============================================
// GUARDRAIL TYPES
// ============================================

export interface MedicationGuardrail {
  /** Medication ID this applies to */
  medicationId: string;
  /** Hard ceiling - NEVER exceed */
  absoluteMaxDose: number;
  /** Unit for the absolute max */
  absoluteMaxUnit: string;
  /** Warning threshold (percentage of max) */
  warningThreshold: number;
  /** Additional validation rules */
  customRules?: Array<{
    condition: string;
    action: 'warn' | 'block';
    message: string;
  }>;
}

export interface DrugInteraction {
  /** First drug (or class) */
  drug1: string;
  /** Second drug (or class) */
  drug2: string;
  /** Severity level */
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  /** Description of the interaction */
  description: string;
  /** Clinical recommendation */
  recommendation: string;
}

export interface ContraindicationCheck {
  /** Medication ID */
  medicationId: string;
  /** Condition that contraindicates */
  condition: string;
  /** Is it absolute or relative */
  severity: 'absolute' | 'relative';
  /** Warning message */
  message: string;
  /** Recommendation */
  recommendation: string;
}

export interface WeightSanityResult {
  /** Is the weight plausible for the stated age */
  isPlausible: boolean;
  /** Alert level */
  alertLevel: AlertLevel;
  /** Message to display */
  message: string | null;
  /** Expected weight range for stated age */
  expectedRange: { min: number; max: number; typical: number } | null;
}

export interface GuardrailAlert {
  /** Severity level */
  level: AlertLevel;
  /** Type of alert */
  type: 'contraindication' | 'interaction' | 'weight' | 'dose';
  /** Alert message */
  message: string;
  /** Recommendation */
  recommendation?: string;
}

export interface GuardrailCheckResult {
  /** Can this medication be administered? */
  canAdminister: boolean;
  /** Adjusted dose after guardrail application */
  adjustedDose: number;
  /** All alerts triggered */
  alerts: GuardrailAlert[];
  /** Does this require explicit override? */
  requiresOverride: boolean;
}

// ============================================
// AGE CATEGORIES
// ============================================

export const AGE_CATEGORIES = [
  { id: 'newborn', label: 'Newborn', ageRange: '0-28 days' },
  { id: '1month', label: '1 month', ageRange: '1-2 months' },
  { id: '3months', label: '3 months', ageRange: '2-4 months' },
  { id: '6months', label: '6 months', ageRange: '4-8 months' },
  { id: '9months', label: '9 months', ageRange: '8-12 months' },
  { id: '1year', label: '1 year', ageRange: '12-18 months' },
  { id: '2years', label: '2 years', ageRange: '18-30 months' },
  { id: '3years', label: '3 years', ageRange: '2.5-3.5 years' },
  { id: '4years', label: '4 years', ageRange: '3.5-4.5 years' },
  { id: '5years', label: '5 years', ageRange: '4.5-6 years' },
  { id: '6years', label: '6 years', ageRange: '6-7 years' },
  { id: '8years', label: '8 years', ageRange: '7-9 years' },
  { id: '10years', label: '10 years', ageRange: '9-11 years' },
  { id: '12years', label: '12 years', ageRange: '11-13 years' },
  { id: '14years', label: '14 years', ageRange: '13-15 years' },
  { id: '16years', label: '16 years', ageRange: '15-18 years' },
  { id: 'adult', label: 'Adult', ageRange: '18+ years' },
] as const;

export type AgeCategory = typeof AGE_CATEGORIES[number]['id'];
