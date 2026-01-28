/**
 * Types for Cardiac Arrest Assistant
 * LA County Protocol 1210 Implementation
 */

// Cardiac rhythms
export type CardiacRhythm = 
  | 'vf-pvt'      // Ventricular Fibrillation / Pulseless VT
  | 'asystole'    // Asystole
  | 'pea'         // Pulseless Electrical Activity
  | 'rosc';       // Return of Spontaneous Circulation

export interface RhythmInfo {
  id: CardiacRhythm;
  label: string;
  shortLabel: string;
  shockable: boolean;
  color: string;
  description: string;
}

export const RHYTHMS: Record<CardiacRhythm, RhythmInfo> = {
  'vf-pvt': {
    id: 'vf-pvt',
    label: 'VF / Pulseless VT',
    shortLabel: 'VF/pVT',
    shockable: true,
    color: '#EF4444', // Red - urgent
    description: 'Shockable rhythm - defibrillate immediately',
  },
  'asystole': {
    id: 'asystole',
    label: 'Asystole',
    shortLabel: 'Asystole',
    shockable: false,
    color: '#6B7280', // Gray - flatline
    description: 'Non-shockable - continue CPR, meds',
  },
  'pea': {
    id: 'pea',
    label: 'PEA',
    shortLabel: 'PEA',
    shockable: false,
    color: '#F59E0B', // Amber - organized but pulseless
    description: 'Non-shockable - identify reversible causes',
  },
  'rosc': {
    id: 'rosc',
    label: 'ROSC',
    shortLabel: 'ROSC',
    shockable: false,
    color: '#22C55E', // Green - success
    description: 'Return of spontaneous circulation achieved',
  },
};

// Event types for logging
export type ArrestEventType =
  | 'arrest_started'
  | 'shock_delivered'
  | 'epinephrine_given'
  | 'amiodarone_given'
  | 'rhythm_check'
  | 'rhythm_changed'
  | 'vector_changed'
  | 'airway_secured'
  | 'iv_io_access'
  | 'rosc_achieved'
  | 'transport_initiated'
  | 'custom_note';

export interface ArrestEvent {
  id: string;
  type: ArrestEventType;
  timestamp: number;
  rhythmAtTime?: CardiacRhythm;
  notes?: string;
  shockNumber?: number;
  epiNumber?: number;
  amioNumber?: number;
}

// Medication tracking
export interface MedicationState {
  epinephrine: {
    doses: number;
    lastDoseTime: number | null;
    nextDueTime: number | null;
  };
  amiodarone: {
    doses: number; // Max 2 (300mg then 150mg)
    lastDoseTime: number | null;
    totalMg: number;
  };
}

// Shock tracking
export interface ShockState {
  count: number;
  timestamps: number[];
  vectorChanged: boolean;
  vectorChangeTime: number | null;
}

// eCPR criteria (for transport decision)
export interface ECPRCriteria {
  witnessed: boolean | null;
  bystanderCPR: boolean | null;
  initialShockable: boolean | null;
  ageUnder65: boolean | null;
  noMajorComorbid: boolean | null;
  downTimeLessThan60: boolean | null;
}

// Full arrest state
export interface ArrestState {
  // Status
  isActive: boolean;
  startTime: number | null;
  endTime: number | null;
  
  // Current rhythm
  currentRhythm: CardiacRhythm | null;
  
  // Tracking
  shocks: ShockState;
  medications: MedicationState;
  
  // Events log
  events: ArrestEvent[];
  
  // eCPR evaluation
  ecprCriteria: ECPRCriteria;
  
  // Airway/Access
  airwaySecured: boolean;
  ivIoAccess: boolean;
}

// Timer display state
export interface TimerDisplayState {
  totalElapsed: number;
  epiTimeRemaining: number | null;
  isEpiDue: boolean;
  isEpiOverdue: boolean;
}

// Protocol step types
export type StepPriority = 'critical' | 'important' | 'standard';

export interface ProtocolStep {
  id: string;
  title: string;
  description: string;
  priority: StepPriority;
  rhythms: CardiacRhythm[]; // Which rhythms this applies to
  timing?: string; // e.g., "Every 3-5 min"
  completed?: boolean;
}

// Alert configuration
export interface AlertConfig {
  enabled: boolean;
  vibrate: boolean;
  sound: boolean;
}
