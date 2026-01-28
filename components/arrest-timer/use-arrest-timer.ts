/**
 * Custom hook for Cardiac Arrest Timer logic
 * Manages all state and timing for the arrest assistant
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
import type {
  ArrestState,
  ArrestEvent,
  ArrestEventType,
  CardiacRhythm,
  MedicationState,
  ShockState,
  ECPRCriteria,
  AlertConfig,
  TimerDisplayState,
} from './types';
import { TIME_TARGETS } from './protocol-steps';

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Initial medication state
const INITIAL_MEDICATIONS: MedicationState = {
  epinephrine: {
    doses: 0,
    lastDoseTime: null,
    nextDueTime: null,
  },
  amiodarone: {
    doses: 0,
    lastDoseTime: null,
    totalMg: 0,
  },
};

// Initial shock state
const INITIAL_SHOCKS: ShockState = {
  count: 0,
  timestamps: [],
  vectorChanged: false,
  vectorChangeTime: null,
};

// Initial eCPR criteria
const INITIAL_ECPR: ECPRCriteria = {
  witnessed: null,
  bystanderCPR: null,
  initialShockable: null,
  ageUnder65: null,
  noMajorComorbid: null,
  downTimeLessThan60: null,
};

// Initial arrest state
const INITIAL_STATE: ArrestState = {
  isActive: false,
  startTime: null,
  endTime: null,
  currentRhythm: null,
  shocks: INITIAL_SHOCKS,
  medications: INITIAL_MEDICATIONS,
  events: [],
  ecprCriteria: INITIAL_ECPR,
  airwaySecured: false,
  ivIoAccess: false,
};

export interface UseArrestTimerReturn {
  // State
  state: ArrestState;
  timerDisplay: TimerDisplayState;
  alertConfig: AlertConfig;
  
  // Actions - Arrest Control
  startArrest: () => void;
  endArrest: () => void;
  resetArrest: () => void;
  
  // Actions - Rhythm
  setRhythm: (rhythm: CardiacRhythm) => void;
  
  // Actions - Interventions
  recordShock: () => void;
  recordEpinephrine: () => void;
  recordAmiodarone: () => void;
  recordVectorChange: () => void;
  recordAirwaySecured: () => void;
  recordIvIoAccess: () => void;
  recordROSC: () => void;
  
  // Actions - Events
  addCustomNote: (note: string) => void;
  
  // Actions - eCPR
  updateECPRCriteria: (criteria: Partial<ECPRCriteria>) => void;
  
  // Actions - Alerts
  setAlertConfig: (config: Partial<AlertConfig>) => void;
  acknowledgeAlert: () => void;
  
  // Computed
  isEpiDue: boolean;
  shouldShowVectorPrompt: boolean;
  shouldShowECPRPrompt: boolean;
  ecprScore: number;
}

export function useArrestTimer(): UseArrestTimerReturn {
  // Core state
  const [state, setState] = useState<ArrestState>(INITIAL_STATE);
  const [alertConfig, setAlertConfigState] = useState<AlertConfig>({
    enabled: true,
    vibrate: true,
    sound: true,
  });
  const [alertAcknowledged, setAlertAcknowledged] = useState(false);
  
  // Timer state for display
  const [timerDisplay, setTimerDisplay] = useState<TimerDisplayState>({
    totalElapsed: 0,
    epiTimeRemaining: null,
    isEpiDue: false,
    isEpiOverdue: false,
  });
  
  // Refs for intervals
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastAlertTimeRef = useRef<number>(0);

  // Helper to add event
  const addEvent = useCallback((
    type: ArrestEventType,
    extra?: Partial<ArrestEvent>
  ) => {
    const event: ArrestEvent = {
      id: generateId(),
      type,
      timestamp: Date.now(),
      rhythmAtTime: state.currentRhythm ?? undefined,
      ...extra,
    };
    
    setState(prev => ({
      ...prev,
      events: [...prev.events, event],
    }));
    
    return event;
  }, [state.currentRhythm]);

  // Haptic feedback helper
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' | 'warning' | 'success') => {
    if (Platform.OS === 'web') return;
    
    switch (type) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
    }
  }, []);

  // Alert trigger
  const triggerAlert = useCallback(() => {
    if (!alertConfig.enabled) return;
    
    const now = Date.now();
    // Don't alert more than once per 10 seconds
    if (now - lastAlertTimeRef.current < 10000) return;
    lastAlertTimeRef.current = now;
    
    if (alertConfig.vibrate && Platform.OS !== 'web') {
      // Pattern: short, pause, long
      Vibration.vibrate([0, 200, 100, 400]);
    }
    
    triggerHaptic('warning');
  }, [alertConfig, triggerHaptic]);

  // Timer update effect
  useEffect(() => {
    if (!state.isActive || !state.startTime) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = now - state.startTime!;
      
      // Calculate epi timing
      let epiTimeRemaining: number | null = null;
      let isEpiDue = false;
      let isEpiOverdue = false;
      
      if (state.medications.epinephrine.lastDoseTime) {
        const timeSinceLastEpi = now - state.medications.epinephrine.lastDoseTime;
        const timeToNextEpi = TIME_TARGETS.epiMinInterval - timeSinceLastEpi;
        
        if (timeToNextEpi > 0) {
          epiTimeRemaining = timeToNextEpi;
        } else {
          isEpiDue = true;
          const overdueTime = Math.abs(timeToNextEpi);
          epiTimeRemaining = -overdueTime; // Negative to show overdue
          
          if (overdueTime > TIME_TARGETS.epiMaxInterval - TIME_TARGETS.epiMinInterval) {
            isEpiOverdue = true;
          }
        }
      } else if (state.currentRhythm === 'asystole' || state.currentRhythm === 'pea') {
        // For non-shockable, epi is due ASAP
        isEpiDue = true;
      } else if (state.currentRhythm === 'vf-pvt' && state.shocks.count >= 2) {
        // For VF/pVT, epi due after 2nd shock
        isEpiDue = true;
      }
      
      setTimerDisplay({
        totalElapsed: elapsed,
        epiTimeRemaining,
        isEpiDue,
        isEpiOverdue,
      });
      
      // Trigger alert if epi is due and not acknowledged
      if (isEpiDue && !alertAcknowledged && state.medications.epinephrine.doses > 0) {
        triggerAlert();
      }
    };

    // Update immediately
    updateTimer();
    
    // Then update every second
    timerIntervalRef.current = setInterval(updateTimer, 1000);
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [
    state.isActive,
    state.startTime,
    state.medications.epinephrine,
    state.shocks.count,
    state.currentRhythm,
    alertAcknowledged,
    triggerAlert,
  ]);

  // === ACTIONS ===

  const startArrest = useCallback(() => {
    const now = Date.now();
    setState(prev => ({
      ...INITIAL_STATE,
      isActive: true,
      startTime: now,
      events: [{
        id: generateId(),
        type: 'arrest_started',
        timestamp: now,
      }],
    }));
    triggerHaptic('heavy');
  }, [triggerHaptic]);

  const endArrest = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: false,
      endTime: Date.now(),
    }));
    triggerHaptic('medium');
  }, [triggerHaptic]);

  const resetArrest = useCallback(() => {
    setState(INITIAL_STATE);
    setAlertAcknowledged(false);
    setTimerDisplay({
      totalElapsed: 0,
      epiTimeRemaining: null,
      isEpiDue: false,
      isEpiOverdue: false,
    });
  }, []);

  const setRhythm = useCallback((rhythm: CardiacRhythm) => {
    const wasROSC = state.currentRhythm !== 'rosc' && rhythm === 'rosc';
    
    setState(prev => ({
      ...prev,
      currentRhythm: rhythm,
    }));
    
    addEvent('rhythm_changed', { notes: `Changed to ${rhythm}` });
    
    if (wasROSC) {
      addEvent('rosc_achieved');
      triggerHaptic('success');
    } else {
      triggerHaptic('medium');
    }
  }, [state.currentRhythm, addEvent, triggerHaptic]);

  const recordShock = useCallback(() => {
    const now = Date.now();
    const newCount = state.shocks.count + 1;
    
    setState(prev => ({
      ...prev,
      shocks: {
        ...prev.shocks,
        count: newCount,
        timestamps: [...prev.shocks.timestamps, now],
      },
    }));
    
    addEvent('shock_delivered', { shockNumber: newCount });
    triggerHaptic('heavy');
    setAlertAcknowledged(false);
  }, [state.shocks.count, addEvent, triggerHaptic]);

  const recordEpinephrine = useCallback(() => {
    const now = Date.now();
    const newCount = state.medications.epinephrine.doses + 1;
    
    setState(prev => ({
      ...prev,
      medications: {
        ...prev.medications,
        epinephrine: {
          doses: newCount,
          lastDoseTime: now,
          nextDueTime: now + TIME_TARGETS.epiMinInterval,
        },
      },
    }));
    
    addEvent('epinephrine_given', { epiNumber: newCount });
    triggerHaptic('medium');
    setAlertAcknowledged(false);
  }, [state.medications.epinephrine.doses, addEvent, triggerHaptic]);

  const recordAmiodarone = useCallback(() => {
    const now = Date.now();
    const newCount = state.medications.amiodarone.doses + 1;
    const doseMg = newCount === 1 ? 300 : 150;
    const totalMg = state.medications.amiodarone.totalMg + doseMg;
    
    setState(prev => ({
      ...prev,
      medications: {
        ...prev.medications,
        amiodarone: {
          doses: newCount,
          lastDoseTime: now,
          totalMg,
        },
      },
    }));
    
    addEvent('amiodarone_given', { 
      amioNumber: newCount,
      notes: `${doseMg}mg (total: ${totalMg}mg)`,
    });
    triggerHaptic('medium');
  }, [state.medications.amiodarone, addEvent, triggerHaptic]);

  const recordVectorChange = useCallback(() => {
    const now = Date.now();
    
    setState(prev => ({
      ...prev,
      shocks: {
        ...prev.shocks,
        vectorChanged: true,
        vectorChangeTime: now,
      },
    }));
    
    addEvent('vector_changed', { notes: 'A-L → A-P' });
    triggerHaptic('medium');
  }, [addEvent, triggerHaptic]);

  const recordAirwaySecured = useCallback(() => {
    setState(prev => ({
      ...prev,
      airwaySecured: true,
    }));
    
    addEvent('airway_secured');
    triggerHaptic('light');
  }, [addEvent, triggerHaptic]);

  const recordIvIoAccess = useCallback(() => {
    setState(prev => ({
      ...prev,
      ivIoAccess: true,
    }));
    
    addEvent('iv_io_access');
    triggerHaptic('light');
  }, [addEvent, triggerHaptic]);

  const recordROSC = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentRhythm: 'rosc',
    }));
    
    addEvent('rosc_achieved');
    triggerHaptic('success');
  }, [addEvent, triggerHaptic]);

  const addCustomNote = useCallback((note: string) => {
    addEvent('custom_note', { notes: note });
  }, [addEvent]);

  const updateECPRCriteria = useCallback((criteria: Partial<ECPRCriteria>) => {
    setState(prev => ({
      ...prev,
      ecprCriteria: {
        ...prev.ecprCriteria,
        ...criteria,
      },
    }));
  }, []);

  const setAlertConfig = useCallback((config: Partial<AlertConfig>) => {
    setAlertConfigState(prev => ({
      ...prev,
      ...config,
    }));
  }, []);

  const acknowledgeAlert = useCallback(() => {
    setAlertAcknowledged(true);
  }, []);

  // === COMPUTED ===

  const isEpiDue = timerDisplay.isEpiDue;

  const shouldShowVectorPrompt = useMemo(() => {
    return (
      state.currentRhythm === 'vf-pvt' &&
      state.shocks.count >= TIME_TARGETS.shocksBeforeVector &&
      !state.shocks.vectorChanged
    );
  }, [state.currentRhythm, state.shocks.count, state.shocks.vectorChanged]);

  const shouldShowECPRPrompt = useMemo(() => {
    return (
      state.currentRhythm === 'vf-pvt' &&
      state.shocks.count >= TIME_TARGETS.maxShocksBeforeECPR
    );
  }, [state.currentRhythm, state.shocks.count]);

  const ecprScore = useMemo(() => {
    let score = 0;
    const c = state.ecprCriteria;
    
    if (c.witnessed === true) score += 30;
    if (c.bystanderCPR === true) score += 20;
    if (c.initialShockable === true) score += 20;
    if (c.ageUnder65 === true) score += 10;
    if (c.noMajorComorbid === true) score += 10;
    if (c.downTimeLessThan60 === true) score += 10;
    
    return score;
  }, [state.ecprCriteria]);

  return {
    state,
    timerDisplay,
    alertConfig,
    
    startArrest,
    endArrest,
    resetArrest,
    setRhythm,
    
    recordShock,
    recordEpinephrine,
    recordAmiodarone,
    recordVectorChange,
    recordAirwaySecured,
    recordIvIoAccess,
    recordROSC,
    
    addCustomNote,
    updateECPRCriteria,
    setAlertConfig,
    acknowledgeAlert,
    
    isEpiDue,
    shouldShowVectorPrompt,
    shouldShowECPRPrompt,
    ecprScore,
  };
}
