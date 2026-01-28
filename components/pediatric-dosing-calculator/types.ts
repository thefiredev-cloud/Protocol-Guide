/**
 * Pediatric Dosing Calculator Types
 * 
 * Types specific to LA County EMS pediatric dosing protocols.
 */

export type WeightUnit = 'kg' | 'lbs';

export type MedicationIndication = 
  | 'cardiac-arrest'
  | 'anaphylaxis'
  | 'seizures'
  | 'hypoglycemia'
  | 'allergic-reaction'
  | 'pain'
  | 'respiratory';

export interface PediatricMedication {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Generic name */
  genericName: string;
  /** Clinical indication */
  indication: MedicationIndication;
  /** Dose per kg */
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
  /** Color coding for quick ID */
  color: string;
  /** Icon name */
  icon: string;
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
