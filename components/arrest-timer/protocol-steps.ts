/**
 * LA County Protocol 1210 - Cardiac Arrest
 * Structured protocol steps for real-time guidance
 * 
 * Reference: http://file.lacounty.gov/SDSInter/dhs/1040511_1210CardiacArrest.pdf
 */

import type { ProtocolStep, CardiacRhythm } from './types';

// H's and T's - Reversible Causes
export const REVERSIBLE_CAUSES = {
  hs: [
    { id: 'hypovolemia', label: 'Hypovolemia', hint: 'Consider fluid bolus' },
    { id: 'hypoxia', label: 'Hypoxia', hint: 'Ensure adequate ventilation' },
    { id: 'hydrogen', label: 'Hydrogen ion (acidosis)', hint: 'Consider sodium bicarb' },
    { id: 'hypokalemia', label: 'Hypo/Hyperkalemia', hint: 'Consider calcium, glucose+insulin' },
    { id: 'hypothermia', label: 'Hypothermia', hint: 'Warm patient' },
    { id: 'hypoglycemia', label: 'Hypoglycemia', hint: 'Check glucose, give D10' },
  ],
  ts: [
    { id: 'tension', label: 'Tension pneumothorax', hint: 'Needle decompression' },
    { id: 'tamponade', label: 'Cardiac tamponade', hint: 'Consider pericardiocentesis' },
    { id: 'toxins', label: 'Toxins', hint: 'Consider antidotes' },
    { id: 'thrombosis-pulm', label: 'Thrombosis (pulmonary)', hint: 'Consider thrombolytics' },
    { id: 'thrombosis-cardiac', label: 'Thrombosis (cardiac/MI)', hint: 'Consider eCPR transport' },
    { id: 'trauma', label: 'Trauma', hint: 'Treat underlying cause' },
  ],
};

// Initial universal steps (all rhythms)
export const INITIAL_STEPS: ProtocolStep[] = [
  {
    id: 'confirm-arrest',
    title: 'Confirm Cardiac Arrest',
    description: 'Check responsiveness, pulse < 10 seconds',
    priority: 'critical',
    rhythms: ['vf-pvt', 'asystole', 'pea'],
  },
  {
    id: 'start-cpr',
    title: 'Start High-Quality CPR',
    description: '100-120/min, 2+ inch depth, full recoil, minimize interruptions',
    priority: 'critical',
    rhythms: ['vf-pvt', 'asystole', 'pea'],
  },
  {
    id: 'apply-pads',
    title: 'Apply Defibrillator Pads',
    description: 'Anterior-Lateral position initially',
    priority: 'critical',
    rhythms: ['vf-pvt', 'asystole', 'pea'],
  },
  {
    id: 'rhythm-check',
    title: 'Analyze Rhythm',
    description: 'Pause CPR briefly to check rhythm',
    priority: 'critical',
    rhythms: ['vf-pvt', 'asystole', 'pea'],
  },
];

// VF/pVT specific steps
export const VF_PVT_STEPS: ProtocolStep[] = [
  {
    id: 'shock-1',
    title: 'Deliver Shock',
    description: 'Biphasic: 120-200J (per device), Monophasic: 360J',
    priority: 'critical',
    rhythms: ['vf-pvt'],
  },
  {
    id: 'cpr-post-shock',
    title: 'Resume CPR Immediately',
    description: '2 minutes of high-quality CPR after shock',
    priority: 'critical',
    rhythms: ['vf-pvt'],
    timing: '2 min cycles',
  },
  {
    id: 'iv-io-access',
    title: 'Establish IV/IO Access',
    description: 'During CPR, do not interrupt compressions',
    priority: 'important',
    rhythms: ['vf-pvt', 'asystole', 'pea'],
  },
  {
    id: 'epi-first',
    title: 'Epinephrine 1mg IV/IO',
    description: 'After 2nd shock for VF/pVT, then every 3-5 minutes',
    priority: 'critical',
    rhythms: ['vf-pvt'],
    timing: 'After 2nd shock',
  },
  {
    id: 'amio-first',
    title: 'Amiodarone 300mg IV/IO',
    description: 'After 3rd shock for refractory VF/pVT',
    priority: 'critical',
    rhythms: ['vf-pvt'],
    timing: 'After 3rd shock',
  },
  {
    id: 'vector-change',
    title: 'Consider Vector Change',
    description: 'Change pad position: A-L → A-P after 3rd shock',
    priority: 'important',
    rhythms: ['vf-pvt'],
    timing: 'After 3rd shock',
  },
  {
    id: 'amio-second',
    title: 'Amiodarone 150mg IV/IO',
    description: 'Second dose for persistent VF/pVT',
    priority: 'important',
    rhythms: ['vf-pvt'],
    timing: 'After 5th shock if still VF',
  },
];

// Asystole/PEA specific steps
export const ASYSTOLE_PEA_STEPS: ProtocolStep[] = [
  {
    id: 'confirm-asystole',
    title: 'Confirm Asystole/PEA',
    description: 'Check leads, gain, and confirm in multiple leads',
    priority: 'critical',
    rhythms: ['asystole', 'pea'],
  },
  {
    id: 'epi-immediate',
    title: 'Epinephrine 1mg IV/IO',
    description: 'Give ASAP for non-shockable rhythms, then every 3-5 min',
    priority: 'critical',
    rhythms: ['asystole', 'pea'],
    timing: 'ASAP, then q3-5min',
  },
  {
    id: 'reversible-causes',
    title: 'Search for Reversible Causes',
    description: "H's and T's - treat any identified causes",
    priority: 'critical',
    rhythms: ['asystole', 'pea'],
  },
];

// Airway management (all rhythms)
export const AIRWAY_STEPS: ProtocolStep[] = [
  {
    id: 'bvm-ventilation',
    title: 'BVM Ventilation',
    description: 'Initial: 30:2 compression:ventilation ratio',
    priority: 'important',
    rhythms: ['vf-pvt', 'asystole', 'pea'],
  },
  {
    id: 'advanced-airway',
    title: 'Advanced Airway',
    description: 'SGA or ETI when appropriate, then continuous compressions',
    priority: 'important',
    rhythms: ['vf-pvt', 'asystole', 'pea'],
  },
  {
    id: 'waveform-capno',
    title: 'Waveform Capnography',
    description: 'ETCO2 ≥10 mmHg suggests adequate CPR, ≥40 may indicate ROSC',
    priority: 'standard',
    rhythms: ['vf-pvt', 'asystole', 'pea'],
  },
];

// Post-ROSC steps
export const ROSC_STEPS: ProtocolStep[] = [
  {
    id: 'confirm-rosc',
    title: 'Confirm ROSC',
    description: 'Sustained pulse, rising ETCO2, arterial waveform if available',
    priority: 'critical',
    rhythms: ['rosc'],
  },
  {
    id: 'vitals-monitoring',
    title: 'Continuous Monitoring',
    description: 'SpO2, ETCO2, BP, ECG - be prepared for re-arrest',
    priority: 'critical',
    rhythms: ['rosc'],
  },
  {
    id: 'airway-secure',
    title: 'Secure Airway if Needed',
    description: 'Intubate if not protecting airway, GCS ≤8',
    priority: 'important',
    rhythms: ['rosc'],
  },
  {
    id: 'target-spo2',
    title: 'Target SpO2 94-99%',
    description: 'Avoid hyperoxia, titrate O2 to maintain target',
    priority: 'important',
    rhythms: ['rosc'],
  },
  {
    id: 'target-ventilation',
    title: 'Target ETCO2 35-45 mmHg',
    description: 'Avoid hyper/hypoventilation, 10-12 breaths/min',
    priority: 'important',
    rhythms: ['rosc'],
  },
  {
    id: 'bp-support',
    title: 'Support Blood Pressure',
    description: 'Fluids and/or vasopressors to maintain SBP >90',
    priority: 'important',
    rhythms: ['rosc'],
  },
  {
    id: '12-lead',
    title: '12-Lead ECG',
    description: 'Evaluate for STEMI, transport to STEMI center if indicated',
    priority: 'important',
    rhythms: ['rosc'],
  },
  {
    id: 'notify-hospital',
    title: 'Early Hospital Notification',
    description: 'Notify receiving facility, request STEMI/cath lab activation if indicated',
    priority: 'standard',
    rhythms: ['rosc'],
  },
];

// eCPR transport criteria prompts
export const ECPR_CRITERIA_QUESTIONS = [
  { id: 'witnessed', question: 'Was the arrest witnessed?', weight: 'required' },
  { id: 'bystanderCPR', question: 'Was bystander CPR performed?', weight: 'important' },
  { id: 'initialShockable', question: 'Was initial rhythm shockable (VF/pVT)?', weight: 'important' },
  { id: 'ageUnder65', question: 'Is patient < 65 years old?', weight: 'preferred' },
  { id: 'noMajorComorbid', question: 'No major comorbidities?', weight: 'preferred' },
  { id: 'downTimeLessThan60', question: 'Down time < 60 minutes?', weight: 'important' },
];

// Transport decision points
export const TRANSPORT_CRITERIA = {
  ecprConsider: [
    'Refractory VF/pVT after 3+ shocks and medications',
    'Witnessed arrest with immediate bystander CPR',
    'Age typically < 65-70 years',
    'No obvious non-survivable injuries',
    'Transport time < 30 min to eCPR center',
  ],
  continueOnScene: [
    'ROSC achieved - stabilize before transport',
    'Non-witnessed asystole with down time > 20 min',
    'Obvious signs of death',
    'Valid DNR/POLST',
  ],
  standardTransport: [
    'ROSC achieved and stable',
    'STEMI suspected - to STEMI center',
    'Suspected PE, tamponade - to capable facility',
  ],
};

// Time targets
export const TIME_TARGETS = {
  epiMinInterval: 3 * 60 * 1000,  // 3 minutes in ms
  epiMaxInterval: 5 * 60 * 1000,  // 5 minutes in ms
  epiWarningBuffer: 30 * 1000,    // 30 seconds warning
  cprCycleLength: 2 * 60 * 1000,  // 2 minutes in ms
  shocksBeforeAmio: 3,
  shocksBeforeVector: 3,
  maxShocksBeforeECPR: 6,
  maxOnSceneTime: 40 * 60 * 1000, // ~40 minutes
};

/**
 * Get relevant protocol steps based on current rhythm
 */
export function getStepsForRhythm(rhythm: CardiacRhythm | null): ProtocolStep[] {
  if (!rhythm) return INITIAL_STEPS;
  
  if (rhythm === 'rosc') {
    return ROSC_STEPS;
  }
  
  const steps: ProtocolStep[] = [];
  
  // Add initial steps
  steps.push(...INITIAL_STEPS.filter(s => s.rhythms.includes(rhythm)));
  
  // Add rhythm-specific steps
  if (rhythm === 'vf-pvt') {
    steps.push(...VF_PVT_STEPS);
  } else {
    steps.push(...ASYSTOLE_PEA_STEPS);
  }
  
  // Add airway steps
  steps.push(...AIRWAY_STEPS.filter(s => s.rhythms.includes(rhythm)));
  
  return steps;
}

/**
 * Get contextual prompts based on arrest state
 */
export function getContextualPrompts(
  shockCount: number,
  epiCount: number,
  amioCount: number,
  rhythm: CardiacRhythm | null,
  vectorChanged: boolean
): string[] {
  const prompts: string[] = [];
  
  if (!rhythm) return prompts;
  
  // VF/pVT specific prompts
  if (rhythm === 'vf-pvt') {
    if (shockCount >= 2 && epiCount === 0) {
      prompts.push('💉 Epinephrine 1mg is due after 2nd shock');
    }
    
    if (shockCount >= 3 && amioCount === 0) {
      prompts.push('💊 Amiodarone 300mg is due after 3rd shock');
    }
    
    if (shockCount >= 3 && !vectorChanged) {
      prompts.push('🔄 Consider vector change (A-L → A-P)');
    }
    
    if (shockCount >= 5 && amioCount === 1) {
      prompts.push('💊 Consider 2nd Amiodarone 150mg');
    }
    
    if (shockCount >= 6) {
      prompts.push('🏥 Consider eCPR transport criteria');
    }
  }
  
  // Asystole/PEA prompts
  if (rhythm === 'asystole' || rhythm === 'pea') {
    if (epiCount === 0) {
      prompts.push('💉 Give Epinephrine 1mg ASAP for non-shockable rhythm');
    }
    
    prompts.push("🔍 Search for reversible causes (H's and T's)");
  }
  
  return prompts;
}
