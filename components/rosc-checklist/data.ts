/**
 * Post-ROSC Bundle Data
 * 
 * Based on:
 * - 2025 AHA ACLS Guidelines
 * - LA County DHS Treatment Protocol 1210 (Cardiac Arrest)
 * 
 * References:
 * [1] https://pubmed.ncbi.nlm.nih.gov/41122894/ (AHA Post-Cardiac Arrest Care 2025)
 * [2] http://file.lacounty.gov/SDSInter/dhs/1040511_1210CardiacArrest.pdf
 */

import type { VitalTarget, ChecklistItem } from './types';

/**
 * Vital sign targets per 2025 AHA Guidelines
 */
export const VITAL_TARGETS: Record<string, VitalTarget> = {
  map: {
    name: 'Mean Arterial Pressure',
    abbrev: 'MAP',
    unit: 'mmHg',
    normalMin: 65,
    normalMax: 100,
    criticalLow: 60,
    criticalHigh: 110,
    note: 'Target MAP ≥65 mmHg for adequate organ perfusion',
    evidence: '2025 AHA: MAP goal ≥65 mmHg, avoid hypotension (Class I)',
  },
  sbp: {
    name: 'Systolic Blood Pressure',
    abbrev: 'SBP',
    unit: 'mmHg',
    normalMin: 90,
    normalMax: 100,
    criticalLow: 80,
    criticalHigh: 180,
    note: 'Target SBP 90-100 mmHg initially; avoid hypertension',
    evidence: '2025 AHA: SBP ≥90 mmHg minimum, avoid excessive pressors',
  },
  spo2: {
    name: 'Oxygen Saturation',
    abbrev: 'SpO₂',
    unit: '%',
    normalMin: 94,
    normalMax: 98,
    criticalLow: 90,
    criticalHigh: 100,
    note: 'Titrate FiO₂ to 94-98%; avoid hyperoxia',
    evidence: '2025 AHA: Titrate to SpO₂ 94-98% (Class IIa), hyperoxia harmful',
  },
  etco2: {
    name: 'End-Tidal CO₂',
    abbrev: 'ETCO₂',
    unit: 'mmHg',
    normalMin: 35,
    normalMax: 45,
    criticalLow: 25,
    criticalHigh: 50,
    note: 'Avoid hyperventilation; target normocarbia',
    evidence: '2025 AHA: Target ETCO₂ 35-45 mmHg, hyperventilation harmful (Class III)',
  },
  hr: {
    name: 'Heart Rate',
    abbrev: 'HR',
    unit: 'bpm',
    normalMin: 60,
    normalMax: 100,
    criticalLow: 40,
    criticalHigh: 150,
    note: 'Monitor for bradycardia, tachycardia, and arrhythmias',
    evidence: 'Watch for re-arrest triggers',
  },
  rr: {
    name: 'Respiratory Rate',
    abbrev: 'RR',
    unit: '/min',
    normalMin: 10,
    normalMax: 12,
    criticalLow: 6,
    criticalHigh: 20,
    note: '10-12 breaths/min post-ROSC; avoid hyperventilation',
    evidence: '2025 AHA: Controlled ventilation to avoid hypocapnia',
  },
  temp: {
    name: 'Temperature',
    abbrev: 'Temp',
    unit: '°C',
    normalMin: 32,
    normalMax: 36,
    criticalLow: 30,
    criticalHigh: 38,
    note: 'Targeted Temperature Management (TTM) target 32-36°C',
    evidence: '2025 AHA: Prevent fever, TTM 32-36°C for comatose patients',
  },
  glucose: {
    name: 'Blood Glucose',
    abbrev: 'BGL',
    unit: 'mg/dL',
    normalMin: 140,
    normalMax: 180,
    criticalLow: 70,
    criticalHigh: 250,
    note: 'Avoid hypoglycemia; moderate glycemic control',
    evidence: '2025 AHA: Target glucose 140-180 mg/dL, avoid hypoglycemia',
  },
};

/**
 * Post-ROSC Checklist Items
 * Organized by clinical priority and category
 */
export const ROSC_CHECKLIST_ITEMS: ChecklistItem[] = [
  // VITALS - Immediate Assessment
  {
    id: 'confirm-rosc',
    title: 'Confirm ROSC',
    description: 'Verify palpable pulse, organized rhythm, ETCO₂ rise >40 mmHg',
    category: 'vitals',
    priority: 1,
    critical: true,
    protocolRef: 'LA County 1210',
  },
  {
    id: 'bp-assessment',
    title: 'Blood Pressure Assessment',
    description: 'Target SBP 90-100 mmHg, MAP ≥65 mmHg',
    category: 'vitals',
    priority: 2,
    vitalTarget: VITAL_TARGETS.sbp,
    critical: true,
    timing: { target: 5, max: 10 },
    protocolRef: 'LA County 1210 / 2025 AHA',
    subItems: [
      'Obtain BP via cuff or arterial line',
      'Calculate MAP: (SBP + 2×DBP) ÷ 3',
      'Initiate vasopressors if MAP <65',
    ],
  },
  {
    id: 'spo2-target',
    title: 'Titrate Oxygen to SpO₂ 94-98%',
    description: 'Avoid both hypoxia and hyperoxia',
    category: 'vitals',
    priority: 3,
    vitalTarget: VITAL_TARGETS.spo2,
    critical: true,
    timing: { target: 2 },
    protocolRef: '2025 AHA Class IIa',
    subItems: [
      'Reduce FiO₂ if SpO₂ >98%',
      'Increase FiO₂ if SpO₂ <94%',
      'Document titration',
    ],
  },
  
  // AIRWAY & VENTILATION
  {
    id: 'airway-secure',
    title: 'Secure Advanced Airway',
    description: 'ETT or SGA with confirmation if not already in place',
    category: 'airway',
    priority: 4,
    critical: true,
    timing: { target: 5 },
    protocolRef: 'LA County 1210',
    subItems: [
      'Confirm tube placement (waveform capnography)',
      'Secure airway device',
      'Note ETT depth at teeth',
    ],
  },
  {
    id: 'ventilation-rate',
    title: 'Set Ventilation Rate 10-12/min',
    description: 'Avoid hyperventilation - it increases intrathoracic pressure and decreases cerebral perfusion',
    category: 'airway',
    priority: 5,
    vitalTarget: VITAL_TARGETS.rr,
    critical: true,
    timing: { target: 2 },
    protocolRef: '2025 AHA Class III (Harm)',
    subItems: [
      'Set BVM or vent rate to 10-12',
      'Do NOT hyperventilate',
      'Target ETCO₂ 35-45 mmHg',
    ],
  },
  {
    id: 'etco2-monitor',
    title: 'Monitor ETCO₂ Continuously',
    description: 'Target 35-45 mmHg; watch for re-arrest (<20 sudden drop)',
    category: 'airway',
    priority: 6,
    vitalTarget: VITAL_TARGETS.etco2,
    critical: true,
    protocolRef: '2025 AHA',
  },
  
  // CIRCULATION
  {
    id: 'iv-access',
    title: 'Confirm IV/IO Access',
    description: 'Establish or confirm reliable vascular access',
    category: 'circulation',
    priority: 7,
    critical: true,
    protocolRef: 'LA County 1210',
  },
  {
    id: 'fluid-bolus',
    title: 'Fluid Resuscitation PRN',
    description: 'NS 250-500 mL bolus if hypotensive; reassess',
    category: 'circulation',
    priority: 8,
    critical: false,
    protocolRef: 'LA County 1210',
    subItems: [
      'Consider fluid if SBP <90',
      'Give 250-500 mL NS bolus',
      'Reassess BP after bolus',
      'Avoid fluid overload',
    ],
  },
  {
    id: 'vasopressors',
    title: 'Vasopressors if Hypotensive',
    description: 'Epinephrine or Norepinephrine infusion per protocol',
    category: 'circulation',
    priority: 9,
    critical: true,
    protocolRef: 'LA County 1210',
    subItems: [
      'If MAP <65 despite fluids',
      'Epinephrine: 2-10 mcg/min',
      'Or Norepinephrine if available',
    ],
  },
  {
    id: '12-lead-ecg',
    title: 'Obtain 12-Lead ECG',
    description: 'Check for STEMI; guides transport destination',
    category: 'circulation',
    priority: 10,
    critical: true,
    timing: { target: 10, max: 15 },
    protocolRef: 'LA County 1210 / 2025 AHA',
    subItems: [
      'Acquire 12-lead as soon as feasible',
      'Look for ST elevation',
      'Transmit to receiving facility',
    ],
  },
  {
    id: 'antiarrhythmic',
    title: 'Continue Antiarrhythmic',
    description: 'Continue amiodarone/lidocaine infusion if given during arrest',
    category: 'circulation',
    priority: 11,
    critical: false,
    protocolRef: '2025 AHA',
    subItems: [
      'If amiodarone given: 150mg over 10 min, then 1mg/min',
      'If lidocaine: 1-4 mg/min maintenance',
    ],
  },
  
  // NEURO PROTECTION
  {
    id: 'neuro-assessment',
    title: 'Assess Neurological Status',
    description: 'GCS, pupil reactivity, motor response',
    category: 'neuro',
    priority: 12,
    critical: true,
    timing: { target: 10 },
    protocolRef: '2025 AHA',
    subItems: [
      'Document GCS',
      'Check pupils (size, reactivity)',
      'Note any purposeful movement',
    ],
  },
  {
    id: 'glucose-check',
    title: 'Check Blood Glucose',
    description: 'Target 140-180 mg/dL; treat hypoglycemia aggressively',
    category: 'neuro',
    priority: 13,
    vitalTarget: VITAL_TARGETS.glucose,
    critical: true,
    timing: { target: 10 },
    protocolRef: '2025 AHA',
    subItems: [
      'Check BGL',
      'If <70: D10 push or D50 per protocol',
      'Avoid hypoglycemia',
    ],
  },
  {
    id: 'temp-management',
    title: 'Initiate Temperature Management',
    description: 'Target 32-36°C for comatose patients; prevent fever',
    category: 'neuro',
    priority: 14,
    vitalTarget: VITAL_TARGETS.temp,
    critical: true,
    timing: { target: 15 },
    protocolRef: '2025 AHA Class I',
    subItems: [
      'Check temperature',
      'Prevent/treat fever aggressively',
      'Consider cooling measures if available',
      'Do NOT actively rewarm',
    ],
  },
  {
    id: 'seizure-watch',
    title: 'Monitor for Seizures',
    description: 'Post-anoxic seizures common; treat aggressively',
    category: 'neuro',
    priority: 15,
    critical: false,
    protocolRef: '2025 AHA',
    subItems: [
      'Watch for myoclonus, focal seizures',
      'Benzos first-line if seizing',
    ],
  },
  
  // TRANSPORT
  {
    id: 'transport-decision',
    title: 'Transport Destination Decision',
    description: 'STEMI-Receiving Center or Cardiac Arrest Center',
    category: 'transport',
    priority: 16,
    critical: true,
    timing: { target: 15 },
    protocolRef: 'LA County 1210',
    subItems: [
      'STEMI on ECG → STEMI-Receiving Center',
      'No STEMI → Cardiac Arrest Center if available',
      'Consider eCPR center if was refractory VF',
    ],
  },
  {
    id: 'notify-hospital',
    title: 'Early Hospital Notification',
    description: 'Alert receiving facility: ROSC, vital signs, ECG findings',
    category: 'transport',
    priority: 17,
    critical: true,
    timing: { target: 15 },
    protocolRef: 'LA County 1210',
    subItems: [
      'Call receiving hospital',
      'Transmit 12-lead ECG',
      'Provide ROSC time, current status',
    ],
  },
  {
    id: 'document-times',
    title: 'Document Key Times',
    description: 'Arrest time, CPR start, first shock, ROSC time',
    category: 'transport',
    priority: 18,
    critical: true,
    protocolRef: 'Best Practice',
    subItems: [
      'Time of arrest (witnessed/unwitnessed)',
      'Bystander CPR? When?',
      'First EMS arrival',
      'First shock time',
      'ROSC time',
      'Total down time',
    ],
  },
  {
    id: 'consider-causes',
    title: 'Consider Reversible Causes',
    description: 'Hs and Ts - address any identified causes',
    category: 'transport',
    priority: 19,
    critical: false,
    protocolRef: '2025 AHA',
    subItems: [
      'Hypovolemia → Fluids',
      'Hypoxia → Oxygen',
      'H+ (Acidosis) → Bicarb if indicated',
      'Hypo/Hyperkalemia → Check BMP',
      'Hypothermia → Prevent further cooling',
      'Tension PTX → Decompress',
      'Tamponade → Consider',
      'Toxins → Antidote if known',
      'Thrombosis (MI) → Cath lab',
      'Thrombosis (PE) → Lytics?',
    ],
  },
];

/**
 * Get checklist items by category
 */
export function getItemsByCategory(category: string): ChecklistItem[] {
  return ROSC_CHECKLIST_ITEMS.filter(item => item.category === category);
}

/**
 * Get all critical items
 */
export function getCriticalItems(): ChecklistItem[] {
  return ROSC_CHECKLIST_ITEMS.filter(item => item.critical);
}

/**
 * Get items that should be done by a specific time (in minutes)
 */
export function getItemsByTiming(maxMinutes: number): ChecklistItem[] {
  return ROSC_CHECKLIST_ITEMS.filter(
    item => item.timing && item.timing.target <= maxMinutes
  );
}
