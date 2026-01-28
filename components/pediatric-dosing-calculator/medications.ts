/**
 * LA County EMS Pediatric Medications
 * 
 * Based on LA County EMS Agency Treatment Guidelines
 * Priority medications for pediatric patients
 */

import type { PediatricMedication } from './types';

export const PEDIATRIC_MEDICATIONS: PediatricMedication[] = [
  // Epinephrine - Cardiac Arrest (1:10,000)
  {
    id: 'epinephrine-cardiac',
    name: 'Epinephrine (Cardiac)',
    genericName: 'Epinephrine 1:10,000',
    indication: 'cardiac-arrest',
    dosePerKg: 0.01, // 0.01 mg/kg
    doseUnit: 'mg',
    concentration: 0.1, // 0.1 mg/mL (1:10,000)
    concentrationUnit: 'mg/mL',
    route: 'IV/IO',
    maxDose: 1,
    maxDoseUnit: 'mg',
    notes: 'May repeat every 3-5 minutes. Use 1:10,000 concentration for IV/IO.',
    color: '#DC2626', // Red
    icon: 'heart.fill',
  },
  
  // Epinephrine - Anaphylaxis (1:1,000)
  {
    id: 'epinephrine-anaphylaxis',
    name: 'Epinephrine (Anaphylaxis)',
    genericName: 'Epinephrine 1:1,000',
    indication: 'anaphylaxis',
    dosePerKg: 0.01, // 0.01 mg/kg
    doseUnit: 'mg',
    concentration: 1, // 1 mg/mL (1:1,000)
    concentrationUnit: 'mg/mL',
    route: 'IM (lateral thigh)',
    maxDose: 0.3, // Pediatric max is 0.3mg
    maxDoseUnit: 'mg',
    minDose: 0.01,
    notes: 'Administer IM in lateral thigh. May repeat every 5-15 minutes.',
    color: '#EA580C', // Orange
    icon: 'allergens.fill',
  },
  
  // Midazolam - Seizures
  {
    id: 'midazolam-seizures',
    name: 'Midazolam (Seizures)',
    genericName: 'Midazolam',
    indication: 'seizures',
    dosePerKg: 0.1, // 0.1 mg/kg IV/IO, 0.2 mg/kg IN/IM
    doseUnit: 'mg',
    concentration: 5, // 5 mg/mL
    concentrationUnit: 'mg/mL',
    route: 'IV/IO/IN/IM',
    maxDose: 5,
    maxDoseUnit: 'mg',
    notes: 'IV/IO: 0.1 mg/kg. IN/IM: 0.2 mg/kg (double dose). May repeat x1.',
    color: '#7C3AED', // Purple
    icon: 'brain.head.profile.fill',
  },
  
  // Dextrose - Hypoglycemia (D10)
  {
    id: 'dextrose-d10',
    name: 'Dextrose 10% (D10)',
    genericName: 'Dextrose 10%',
    indication: 'hypoglycemia',
    dosePerKg: 5, // 5 mL/kg of D10 = 0.5 g/kg
    doseUnit: 'mL',
    concentration: 1, // Already in mL, concentration is 100 mg/mL
    concentrationUnit: 'mL',
    route: 'IV/IO',
    maxDose: 250,
    maxDoseUnit: 'mL',
    notes: 'Provides 0.5 g/kg dextrose. Recheck glucose in 5-10 minutes.',
    color: '#0891B2', // Cyan
    icon: 'drop.fill',
  },
  
  // Diphenhydramine - Allergic Reaction
  {
    id: 'diphenhydramine',
    name: 'Diphenhydramine',
    genericName: 'Diphenhydramine (Benadryl)',
    indication: 'allergic-reaction',
    dosePerKg: 1, // 1 mg/kg
    doseUnit: 'mg',
    concentration: 50, // 50 mg/mL
    concentrationUnit: 'mg/mL',
    route: 'IV/IM',
    maxDose: 50,
    maxDoseUnit: 'mg',
    notes: 'For allergic reactions. Give slow IV push.',
    color: '#EC4899', // Pink
    icon: 'pills.fill',
  },
  
  // Fentanyl - Pain
  {
    id: 'fentanyl',
    name: 'Fentanyl',
    genericName: 'Fentanyl',
    indication: 'pain',
    dosePerKg: 1, // 1 mcg/kg IV, 2 mcg/kg IN
    doseUnit: 'mcg',
    concentration: 50, // 50 mcg/mL
    concentrationUnit: 'mcg/mL',
    route: 'IV/IO/IN',
    maxDose: 100,
    maxDoseUnit: 'mcg',
    notes: 'IV: 1 mcg/kg. Intranasal: 2 mcg/kg (double dose). May repeat.',
    color: '#F59E0B', // Amber
    icon: 'cross.case.fill',
  },
  
  // Albuterol - Respiratory
  {
    id: 'albuterol',
    name: 'Albuterol',
    genericName: 'Albuterol (Ventolin)',
    indication: 'respiratory',
    dosePerKg: 0.15, // 0.15 mg/kg
    doseUnit: 'mg',
    concentration: 0.5, // 2.5mg/0.5mL nebulizer solution = 5 mg/mL, but typical is 2.5mg unit dose
    concentrationUnit: 'mg/mL',
    route: 'Nebulized',
    maxDose: 5,
    maxDoseUnit: 'mg',
    minDose: 2.5,
    notes: 'Use 2.5mg if <20kg, 5mg if ≥20kg. May repeat every 20 minutes x3.',
    color: '#2563EB', // Blue
    icon: 'lungs.fill',
  },
];

// Medication lookup by ID
export function getMedicationById(id: string): PediatricMedication | undefined {
  return PEDIATRIC_MEDICATIONS.find(med => med.id === id);
}

// Group by indication
export function getMedicationsByIndication(indication: string): PediatricMedication[] {
  return PEDIATRIC_MEDICATIONS.filter(med => med.indication === indication);
}
