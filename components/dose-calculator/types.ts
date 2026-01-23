/**
 * Dose/Weight Calculator Types
 * Type definitions for medication calculator
 */

export type WeightUnit = "kg" | "lbs";

export type MedicationCategory = "cardiac" | "respiratory" | "analgesia" | "pediatric" | "overdose";

export interface Medication {
  id: string;
  name: string;
  category: MedicationCategory;
  dosePerKg: number; // mg/kg
  unit: string; // mg, mcg, mL, etc.
  maxDose?: number;
  minDose?: number;
  route: string;
  notes?: string;
  pediatricOnly?: boolean;
  concentration?: string; // e.g., "1 mg/mL"
}
