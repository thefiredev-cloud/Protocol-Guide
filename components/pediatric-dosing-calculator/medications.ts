/**
 * LA County EMS Medications
 * 
 * Based on LA County EMS Agency Treatment Guidelines
 * Priority medications for pediatric and adult patients
 * 
 * Key: Each medication includes LA County specific notes
 */

import type { PediatricMedication } from './types';

export const PEDIATRIC_MEDICATIONS: PediatricMedication[] = [
  // ==================================================
  // PEDIATRIC MEDICATIONS
  // ==================================================
  
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
    laCountyNotes: 'LA County: Administer immediately for VF/pVT. Epinephrine BEFORE Amiodarone. Give q3-5min during arrest. Switch to high-dose epinephrine (0.1-0.2 mg/kg) only if prolonged arrest.',
    color: '#DC2626', // Red
    icon: 'heart.fill',
    patientType: 'pediatric',
    contraindicationCategories: ['hypothermia-severe'],
    repeatInfo: 'Repeat q3-5 min during arrest',
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
    laCountyNotes: 'LA County: First-line for anaphylaxis. Give IM in lateral thigh, NOT deltoid. If no response in 5-15 min, repeat dose. For refractory anaphylaxis with IV access, consider epi drip. Auto-injectors: <25kg = 0.15mg, ≥25kg = 0.3mg.',
    color: '#EA580C', // Orange
    icon: 'allergens.fill',
    patientType: 'pediatric',
    contraindicationCategories: ['pregnancy'],
    repeatInfo: 'Repeat q5-15 min PRN',
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
    laCountyNotes: 'LA County: Preferred benzo for peds seizures. IN route preferred if no IV - split dose between nostrils. If seizure continues after 5 min, give 2nd dose (same route/dose).',
    color: '#7C3AED', // Purple
    icon: 'brain.head.profile.fill',
    patientType: 'pediatric',
    contraindicationCategories: ['hypotension', 'respiratory-depression'],
    repeatInfo: 'May repeat x1 after 5 min',
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
    laCountyNotes: 'LA County: D10 is preferred for ALL pediatric patients (never D50). For neonates use D10 only. Recheck BGL q5-10min until >60 mg/dL. Goal BGL >60.',
    color: '#0891B2', // Cyan
    icon: 'drop.fill',
    patientType: 'pediatric',
    repeatInfo: 'Repeat PRN for BGL <60',
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
    laCountyNotes: 'LA County: Adjunct therapy only - NOT a substitute for epinephrine in anaphylaxis. Give slow IVP over 1-2 min. May cause sedation.',
    color: '#EC4899', // Pink
    icon: 'pills.fill',
    patientType: 'pediatric',
    contraindicationCategories: ['altered-mental-status', 'glaucoma'],
  },
  
  // Fentanyl - Pain (Pediatric)
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
    laCountyNotes: 'LA County Peds: 1 mcg/kg IV/IO (max 100 mcg), may repeat q5min. Intranasal: 2 mcg/kg (max 100 mcg), split between nostrils. Hold for RR <12 or SpO2 <94%.',
    color: '#F59E0B', // Amber
    icon: 'cross.case.fill',
    patientType: 'pediatric',
    contraindicationCategories: ['head-injury', 'hypotension', 'respiratory-depression'],
    titrationInterval: 'q5 min',
    repeatInfo: 'May repeat q5min PRN, max 3 doses',
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
    laCountyNotes: 'LA County: For bronchospasm/wheezing. Use 2.5mg neb for <20kg, 5mg for ≥20kg. Can give continuous nebs for severe distress. Add ipratropium (Atrovent) for severe asthma.',
    color: '#2563EB', // Blue
    icon: 'lungs.fill',
    patientType: 'pediatric',
    contraindicationCategories: ['tachyarrhythmia'],
    repeatInfo: 'May repeat q20min x3',
  },

  // Amiodarone - Pediatric Cardiac Arrest
  {
    id: 'amiodarone-peds',
    name: 'Amiodarone',
    genericName: 'Amiodarone',
    indication: 'antiarrhythmic',
    dosePerKg: 5, // 5 mg/kg
    doseUnit: 'mg',
    concentration: 50, // 50 mg/mL
    concentrationUnit: 'mg/mL',
    route: 'IV/IO',
    maxDose: 300,
    maxDoseUnit: 'mg',
    notes: 'For VF/pVT refractory to defibrillation. May repeat x1.',
    laCountyNotes: 'LA County: Give AFTER 3rd shock in VF/pVT arrest. 5 mg/kg IV/IO bolus. May repeat once. Total max 15 mg/kg. Give AFTER epinephrine, not before.',
    color: '#059669', // Green
    icon: 'waveform.path.ecg',
    patientType: 'pediatric',
    contraindicationCategories: ['bradycardia', 'hypotension', 'iodine-allergy'],
    repeatInfo: 'May repeat x1 after 5th shock',
  },

  // ==================================================
  // ADULT MEDICATIONS
  // ==================================================

  // Epinephrine - Adult Cardiac Arrest
  {
    id: 'epinephrine-cardiac-adult',
    name: 'Epinephrine (Cardiac)',
    genericName: 'Epinephrine 1:10,000',
    indication: 'cardiac-arrest',
    dosePerKg: 0, // Fixed dose for adults
    doseUnit: 'mg',
    concentration: 0.1, // 0.1 mg/mL (1:10,000)
    concentrationUnit: 'mg/mL',
    route: 'IV/IO',
    maxDose: 1,
    maxDoseUnit: 'mg',
    notes: '1 mg IV/IO every 3-5 minutes. No maximum cumulative dose during arrest.',
    laCountyNotes: 'LA County: 1 mg IV/IO q3-5min during arrest. Give as soon as possible for non-shockable rhythms (PEA/asystole). For shockable rhythms (VF/pVT), give AFTER 2nd shock.',
    color: '#DC2626',
    icon: 'heart.fill',
    patientType: 'adult',
    adultDoseRange: { min: 1, max: 1, typical: 1, unit: 'mg' },
    repeatInfo: 'Repeat q3-5 min during arrest',
  },

  // Epinephrine - Adult Anaphylaxis
  {
    id: 'epinephrine-anaphylaxis-adult',
    name: 'Epinephrine (Anaphylaxis)',
    genericName: 'Epinephrine 1:1,000',
    indication: 'anaphylaxis',
    dosePerKg: 0,
    doseUnit: 'mg',
    concentration: 1, // 1 mg/mL
    concentrationUnit: 'mg/mL',
    route: 'IM (lateral thigh)',
    maxDose: 0.5, // Adult max per dose
    maxDoseUnit: 'mg',
    notes: '0.3-0.5 mg IM. May repeat every 5-15 minutes.',
    laCountyNotes: 'LA County: 0.3-0.5 mg IM (use 0.3 mg for smaller adults, 0.5 mg for larger). Lateral thigh preferred. For refractory anaphylaxis, consider epi drip 2-10 mcg/min.',
    color: '#EA580C',
    icon: 'allergens.fill',
    patientType: 'adult',
    adultDoseRange: { min: 0.3, max: 0.5, typical: 0.3, unit: 'mg' },
    repeatInfo: 'Repeat q5-15 min PRN',
  },

  // Fentanyl - Adult Pain
  {
    id: 'fentanyl-adult',
    name: 'Fentanyl',
    genericName: 'Fentanyl',
    indication: 'pain',
    dosePerKg: 0, // Fixed dose for adults
    doseUnit: 'mcg',
    concentration: 50, // 50 mcg/mL
    concentrationUnit: 'mcg/mL',
    route: 'IV/IO/IN',
    maxDose: 300, // Session max
    maxDoseUnit: 'mcg',
    notes: '25-100 mcg IV/IO. Titrate every 5 minutes. Session max 300 mcg.',
    laCountyNotes: 'LA County Adult: Initial dose 25-100 mcg IV/IO (start low in elderly). May repeat 25-50 mcg q5min to effect. Session max 300 mcg. Intranasal: 100 mcg (2mL of 50mcg/mL) split between nostrils. Hold for RR <12 or SpO2 <94%. Have Narcan ready.',
    color: '#F59E0B',
    icon: 'cross.case.fill',
    patientType: 'adult',
    adultDoseRange: { min: 25, max: 100, typical: 50, unit: 'mcg' },
    titrationInterval: 'q5 min',
    contraindicationCategories: ['head-injury', 'hypotension', 'respiratory-depression'],
    repeatInfo: 'Titrate 25-50 mcg q5min, max 300 mcg total',
  },

  // Midazolam - Adult Seizures
  {
    id: 'midazolam-adult',
    name: 'Midazolam (Seizures)',
    genericName: 'Midazolam',
    indication: 'seizures',
    dosePerKg: 0,
    doseUnit: 'mg',
    concentration: 5,
    concentrationUnit: 'mg/mL',
    route: 'IV/IO/IN/IM',
    maxDose: 10,
    maxDoseUnit: 'mg',
    notes: '5 mg IV/IO or 10 mg IM/IN. May repeat once.',
    laCountyNotes: 'LA County Adult: 5 mg IV/IO (give over 2 min) OR 10 mg IM/IN. For IN, split between nostrils. May repeat x1 after 5 min. Max 20 mg total. Have BVM ready.',
    color: '#7C3AED',
    icon: 'brain.head.profile.fill',
    patientType: 'adult',
    adultDoseRange: { min: 5, max: 10, typical: 5, unit: 'mg' },
    contraindicationCategories: ['hypotension', 'respiratory-depression'],
    repeatInfo: 'May repeat x1 after 5 min',
  },

  // Amiodarone - Adult Cardiac Arrest
  {
    id: 'amiodarone-adult',
    name: 'Amiodarone',
    genericName: 'Amiodarone',
    indication: 'antiarrhythmic',
    dosePerKg: 0,
    doseUnit: 'mg',
    concentration: 50,
    concentrationUnit: 'mg/mL',
    route: 'IV/IO',
    maxDose: 450, // 300 + 150
    maxDoseUnit: 'mg',
    notes: 'First dose: 300 mg IV/IO. Second dose: 150 mg.',
    laCountyNotes: 'LA County Adult: Give AFTER 3rd shock in VF/pVT arrest. First dose: 300 mg IV/IO bolus. May repeat 150 mg after 5th shock. Total max 450 mg. Give AFTER epinephrine.',
    color: '#059669',
    icon: 'waveform.path.ecg',
    patientType: 'adult',
    adultDoseRange: { min: 150, max: 300, typical: 300, unit: 'mg' },
    contraindicationCategories: ['bradycardia', 'hypotension', 'iodine-allergy'],
    repeatInfo: '300 mg first, then 150 mg after 5th shock',
  },

  // Diphenhydramine - Adult
  {
    id: 'diphenhydramine-adult',
    name: 'Diphenhydramine',
    genericName: 'Diphenhydramine (Benadryl)',
    indication: 'allergic-reaction',
    dosePerKg: 0,
    doseUnit: 'mg',
    concentration: 50,
    concentrationUnit: 'mg/mL',
    route: 'IV/IM',
    maxDose: 50,
    maxDoseUnit: 'mg',
    notes: '25-50 mg IV/IM. Give slow IV push.',
    laCountyNotes: 'LA County Adult: 25-50 mg IV slow push or IM. Adjunct only - not a substitute for epinephrine. May cause significant sedation in elderly.',
    color: '#EC4899',
    icon: 'pills.fill',
    patientType: 'adult',
    adultDoseRange: { min: 25, max: 50, typical: 50, unit: 'mg' },
    contraindicationCategories: ['altered-mental-status', 'glaucoma'],
  },

  // Dextrose - Adult (D50)
  {
    id: 'dextrose-adult',
    name: 'Dextrose 50% (D50)',
    genericName: 'Dextrose 50%',
    indication: 'hypoglycemia',
    dosePerKg: 0,
    doseUnit: 'g',
    concentration: 0.5, // 0.5 g/mL = 500 mg/mL
    concentrationUnit: 'g/mL',
    route: 'IV/IO',
    maxDose: 25,
    maxDoseUnit: 'g',
    notes: '12.5-25 g (25-50 mL) IV push. Recheck glucose.',
    laCountyNotes: 'LA County Adult: 25g (50 mL of D50) IV push. May repeat if BGL still <60. For dialysis patients or elderly, consider half dose (12.5g). Recheck BGL q5min.',
    color: '#0891B2',
    icon: 'drop.fill',
    patientType: 'adult',
    adultDoseRange: { min: 12.5, max: 25, typical: 25, unit: 'g' },
    repeatInfo: 'Repeat PRN for BGL <60',
  },

  // Albuterol - Adult
  {
    id: 'albuterol-adult',
    name: 'Albuterol',
    genericName: 'Albuterol (Ventolin)',
    indication: 'respiratory',
    dosePerKg: 0,
    doseUnit: 'mg',
    concentration: 5, // 5mg/mL for nebulizer
    concentrationUnit: 'mg/mL',
    route: 'Nebulized',
    maxDose: 15, // 3 doses of 5mg
    maxDoseUnit: 'mg',
    minDose: 2.5,
    notes: '2.5-5 mg nebulized. May repeat every 20 minutes x3.',
    laCountyNotes: 'LA County Adult: 5 mg neb (use 2.5 mg unit dose vials or 1mL of 5mg/mL solution). May give continuous nebs for severe distress. Add ipratropium for severe asthma/COPD.',
    color: '#2563EB',
    icon: 'lungs.fill',
    patientType: 'adult',
    adultDoseRange: { min: 2.5, max: 5, typical: 5, unit: 'mg' },
    contraindicationCategories: ['tachyarrhythmia'],
    repeatInfo: 'May repeat q20min x3',
  },
];

// Medication lookup by ID
export function getMedicationById(id: string): PediatricMedication | undefined {
  return PEDIATRIC_MEDICATIONS.find(med => med.id === id);
}

// Get medications by patient type
export function getMedicationsByPatientType(patientType: 'pediatric' | 'adult'): PediatricMedication[] {
  return PEDIATRIC_MEDICATIONS.filter(med => med.patientType === patientType);
}

// Group by indication
export function getMedicationsByIndication(indication: string): PediatricMedication[] {
  return PEDIATRIC_MEDICATIONS.filter(med => med.indication === indication);
}

// Get unique medications (collapse peds/adult variants for selection)
export function getUniqueMedicationNames(): string[] {
  const names = new Set(PEDIATRIC_MEDICATIONS.map(m => m.genericName));
  return Array.from(names);
}
