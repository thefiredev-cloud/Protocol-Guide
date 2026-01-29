/**
 * Quick Reference Cards Router
 * 
 * Provides instant access to high-frequency EMS protocols
 * in a quick-reference card format optimized for field use.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, publicRateLimitedProcedure, router } from "../_core/trpc";

/**
 * Quick reference card data structure
 * Optimized for one-screen mobile viewing
 */
export type QuickReferenceCard = {
  id: string;
  title: string;
  shortTitle: string;
  category: 'cardiac' | 'respiratory' | 'neurological' | 'trauma' | 'medical' | 'pediatric' | 'obstetric' | 'toxicology';
  priority: 'critical' | 'high' | 'standard';
  icon: string; // SF Symbol name
  color: string; // Hex color for category
  summary: string; // One-line summary
  keySteps: QuickStep[];
  medications: QuickMedication[];
  criticalPoints: string[];
  contraindications: string[];
  pediatricNotes?: string;
  lastUpdated: string;
  sources: string[];
};

type QuickStep = {
  step: number;
  action: string;
  details?: string;
  timing?: string;
};

type QuickMedication = {
  name: string;
  adultDose: string;
  pediatricDose?: string;
  route: string;
  maxDose?: string;
  notes?: string;
};

/**
 * Top 10 High-Frequency Protocol Quick Reference Cards
 * Based on EMS call data and critical nature of protocols
 */
const QUICK_REFERENCE_CARDS: QuickReferenceCard[] = [
  // 1. Cardiac Arrest
  {
    id: 'cardiac-arrest',
    title: 'Cardiac Arrest / Code',
    shortTitle: 'Cardiac Arrest',
    category: 'cardiac',
    priority: 'critical',
    icon: 'heart.slash.fill',
    color: '#DC2626',
    summary: 'VF/pVT: Shock → CPR → Epi → Amio. Asystole/PEA: CPR → Epi → H\'s & T\'s',
    keySteps: [
      { step: 1, action: 'High-quality CPR', details: 'Push hard, push fast (100-120/min), full recoil, minimize interruptions' },
      { step: 2, action: 'Attach defibrillator', details: 'Analyze rhythm. VF/pVT = shock. Asystole/PEA = no shock' },
      { step: 3, action: 'Shock if indicated', details: 'Biphasic 120-200J. Resume CPR immediately after' },
      { step: 4, action: 'IV/IO access', details: 'Establish vascular access during CPR' },
      { step: 5, action: 'Epinephrine', timing: 'Every 3-5 min', details: '1 mg IV/IO' },
      { step: 6, action: 'Advanced airway', details: 'ETT or SGA. Continuous CPR if placed' },
      { step: 7, action: 'Amiodarone for VF/pVT', details: '300mg first dose, 150mg second', timing: 'After 3rd shock' },
      { step: 8, action: 'Treat reversible causes', details: 'H\'s: Hypovolemia, Hypoxia, H+, Hypo/Hyperkalemia, Hypothermia. T\'s: Tension PTX, Tamponade, Toxins, Thrombosis' },
    ],
    medications: [
      { name: 'Epinephrine', adultDose: '1 mg', pediatricDose: '0.01 mg/kg', route: 'IV/IO', maxDose: '1 mg', notes: 'Every 3-5 min' },
      { name: 'Amiodarone', adultDose: '300 mg, then 150 mg', pediatricDose: '5 mg/kg', route: 'IV/IO', maxDose: '15 mg/kg', notes: 'For refractory VF/pVT' },
      { name: 'Lidocaine', adultDose: '1-1.5 mg/kg', pediatricDose: '1 mg/kg', route: 'IV/IO', notes: 'Alternative to amiodarone' },
    ],
    criticalPoints: [
      'Minimize CPR interruptions (<10 sec)',
      'Rotate compressors every 2 min',
      'ROSC: Post-arrest care, 12-lead, consider cooling',
      'Consider ECMO for refractory VF (if available)',
    ],
    contraindications: [
      'Amiodarone: Avoid in 2nd/3rd degree AV block, cardiogenic shock',
    ],
    pediatricNotes: 'Compression depth: 1/3 chest depth. 15:2 ratio with 2 rescuers. Epi 0.01 mg/kg (0.1 mL/kg of 1:10,000)',
    lastUpdated: '2025-01-01',
    sources: ['AHA ACLS Guidelines 2025', 'NAEMSP'],
  },

  // 2. Chest Pain / ACS
  {
    id: 'chest-pain-acs',
    title: 'Chest Pain / Acute Coronary Syndrome',
    shortTitle: 'Chest Pain/ACS',
    category: 'cardiac',
    priority: 'critical',
    icon: 'heart.fill',
    color: '#DC2626',
    summary: 'MONA: Morphine, O2 (if needed), Nitro, Aspirin. 12-lead early. STEMI = cath lab activation.',
    keySteps: [
      { step: 1, action: 'Aspirin', details: '324 mg chewed (if no allergy)' },
      { step: 2, action: '12-lead ECG', timing: 'Within 10 min', details: 'Look for ST elevation, depression, or new LBBB' },
      { step: 3, action: 'Oxygen', details: 'If SpO2 < 94% or respiratory distress' },
      { step: 4, action: 'Nitroglycerin', details: '0.4 mg SL every 5 min x 3. Hold if SBP < 90 or recent PDE5 inhibitor' },
      { step: 5, action: 'Morphine', details: '2-4 mg IV if pain persists after nitro. Use with caution.' },
      { step: 6, action: 'Activate cath lab', details: 'If STEMI or high-risk NSTEMI. Door-to-balloon goal < 90 min' },
      { step: 7, action: 'Consider heparin', details: 'Per local protocol for confirmed ACS' },
    ],
    medications: [
      { name: 'Aspirin', adultDose: '324 mg', route: 'PO (chewed)', notes: 'Unless true allergy' },
      { name: 'Nitroglycerin', adultDose: '0.4 mg', route: 'SL', maxDose: '3 doses (5 min apart)', notes: 'Hold if SBP < 90 or PDE5 use' },
      { name: 'Morphine', adultDose: '2-4 mg', route: 'IV', notes: 'Titrate to pain. Use with caution.' },
      { name: 'Fentanyl', adultDose: '25-50 mcg', route: 'IV', notes: 'Alternative to morphine' },
    ],
    criticalPoints: [
      'Time is muscle - early 12-lead and cath lab activation save lives',
      'STEMI equivalents: New LBBB, posterior MI, Wellens, de Winter',
      'Right-sided leads if inferior STEMI suspected',
      'Avoid nitro with RV infarct (hypotension risk)',
    ],
    contraindications: [
      'Nitro: SBP < 90, recent Viagra/Cialis/Levitra (24-48h), RV infarct',
      'Aspirin: True allergy only',
    ],
    lastUpdated: '2025-01-01',
    sources: ['AHA ACLS Guidelines 2025', 'ACC/AHA STEMI Guidelines'],
  },

  // 3. Stroke
  {
    id: 'stroke',
    title: 'Stroke / CVA',
    shortTitle: 'Stroke',
    category: 'neurological',
    priority: 'critical',
    icon: 'brain.head.profile',
    color: '#7C3AED',
    summary: 'FAST assessment. Time of onset critical. Stroke alert activation. Avoid hypotension and hyperglycemia.',
    keySteps: [
      { step: 1, action: 'FAST assessment', details: 'Face droop, Arm drift, Speech slurring, Time of onset' },
      { step: 2, action: 'Establish time of onset', details: 'Last known well time. Critical for tPA eligibility (< 4.5 hrs)' },
      { step: 3, action: 'Blood glucose', details: 'Hypoglycemia can mimic stroke. Treat if < 60 mg/dL' },
      { step: 4, action: 'Cincinnati/NIHSS', details: 'Document severity for receiving facility' },
      { step: 5, action: 'Stroke center notification', timing: 'Early', details: 'Pre-arrival activation of stroke team' },
      { step: 6, action: 'Position', details: 'HOB elevated 30° unless hypotensive' },
      { step: 7, action: 'IV access', details: 'Large bore IV, avoid dextrose unless hypoglycemic' },
      { step: 8, action: 'BP management', details: 'Do NOT aggressively lower. Only treat if > 220/120' },
    ],
    medications: [
      { name: 'Dextrose 50%', adultDose: '25 g', route: 'IV', notes: 'Only if BGL < 60 mg/dL' },
      { name: 'NS', adultDose: 'TKO rate', route: 'IV', notes: 'Avoid dextrose-containing fluids' },
    ],
    criticalPoints: [
      'Document LAST KNOWN WELL time precisely',
      'Do NOT delay transport for interventions',
      'Large vessel occlusion (LVO) = thrombectomy candidate up to 24 hrs',
      'Keep SpO2 ≥ 94%, avoid hypotension (SBP > 90)',
    ],
    contraindications: [
      'Avoid: Excessive BP lowering, dextrose (unless hypoglycemic)',
    ],
    lastUpdated: '2025-01-01',
    sources: ['AHA Stroke Guidelines 2024', 'NAEMSP'],
  },

  // 4. Anaphylaxis
  {
    id: 'anaphylaxis',
    title: 'Anaphylaxis',
    shortTitle: 'Anaphylaxis',
    category: 'medical',
    priority: 'critical',
    icon: 'allergens',
    color: '#EA580C',
    summary: 'Epinephrine IM is first-line. Repeat every 5-15 min. Fluid bolus. Antihistamines are secondary.',
    keySteps: [
      { step: 1, action: 'Remove trigger', details: 'Stop infusion, remove stinger, etc.' },
      { step: 2, action: 'Epinephrine IM', timing: 'Immediately', details: '0.3-0.5 mg (1:1000) IM in lateral thigh' },
      { step: 3, action: 'Position', details: 'Supine with legs elevated (unless respiratory distress)' },
      { step: 4, action: 'High-flow oxygen', details: 'NRB 15 L/min' },
      { step: 5, action: 'IV access + fluids', details: 'NS bolus 1-2 L for hypotension' },
      { step: 6, action: 'Repeat epinephrine', timing: 'Every 5-15 min', details: 'If no improvement' },
      { step: 7, action: 'Albuterol', details: 'For bronchospasm' },
      { step: 8, action: 'Diphenhydramine', details: '25-50 mg IV/IM - adjunct, not first-line' },
    ],
    medications: [
      { name: 'Epinephrine 1:1000', adultDose: '0.3-0.5 mg', pediatricDose: '0.01 mg/kg (max 0.3 mg)', route: 'IM', notes: 'Lateral thigh. Repeat q5-15 min PRN' },
      { name: 'Epinephrine 1:10,000', adultDose: '0.1-0.5 mg', route: 'IV', notes: 'For severe shock, slow push' },
      { name: 'Diphenhydramine', adultDose: '25-50 mg', pediatricDose: '1 mg/kg', route: 'IV/IM', maxDose: '50 mg' },
      { name: 'Methylprednisolone', adultDose: '125 mg', route: 'IV', notes: 'Prevents biphasic reaction' },
      { name: 'Albuterol', adultDose: '2.5 mg', route: 'Neb', notes: 'For bronchospasm' },
    ],
    criticalPoints: [
      'Epinephrine IM is FIRST LINE - do not delay',
      'Antihistamines are adjuncts, NOT replacements for epi',
      'Watch for biphasic reaction (can occur 1-72 hrs later)',
      'Refractory anaphylaxis: Consider epi infusion',
    ],
    contraindications: [
      'NO absolute contraindications to epinephrine in anaphylaxis',
    ],
    pediatricNotes: 'Epi: 0.01 mg/kg (0.01 mL/kg of 1:1000), max 0.3 mg. May use 0.15 mg autoinjector for < 30 kg.',
    lastUpdated: '2025-01-01',
    sources: ['ACAAI Anaphylaxis Guidelines', 'NAEMSP'],
  },

  // 5. Opioid Overdose
  {
    id: 'opioid-overdose',
    title: 'Opioid Overdose',
    shortTitle: 'Opioid OD',
    category: 'toxicology',
    priority: 'high',
    icon: 'pills.fill',
    color: '#0EA5E9',
    summary: 'Airway first. Naloxone titrated to respiratory effort (not consciousness). Avoid precipitating withdrawal.',
    keySteps: [
      { step: 1, action: 'Scene safety', details: 'Fentanyl exposure risk - use PPE, ventilate area' },
      { step: 2, action: 'Open airway', details: 'Position, suction, OPA/NPA if needed' },
      { step: 3, action: 'BVM ventilation', details: 'If apneic or RR < 8, ventilate before naloxone' },
      { step: 4, action: 'Naloxone', details: 'Start low, titrate to respiratory effort' },
      { step: 5, action: 'IV/IO access', details: 'For repeat dosing if needed' },
      { step: 6, action: 'Monitor for re-sedation', details: 'Naloxone half-life < most opioids' },
      { step: 7, action: 'Transport', details: 'All patients need observation period' },
    ],
    medications: [
      { name: 'Naloxone', adultDose: '0.4-2 mg', pediatricDose: '0.1 mg/kg', route: 'IV/IO/IM/IN', notes: 'Start low, titrate to RR. IN: 4 mg (2 mg each nostril)' },
    ],
    criticalPoints: [
      'Goal is adequate ventilation, NOT full alertness',
      'Titrate slowly to avoid precipitating severe withdrawal',
      'Fentanyl may require higher/repeated doses',
      'Re-sedation common - transport all patients',
    ],
    contraindications: [
      'No absolute contraindications to naloxone in overdose',
    ],
    pediatricNotes: 'Naloxone 0.1 mg/kg IV/IO/IM, max 2 mg. IN formulation may be used.',
    lastUpdated: '2025-01-01',
    sources: ['NAEMSP', 'AHA Guidelines'],
  },

  // 6. Seizure / Status Epilepticus
  {
    id: 'seizure',
    title: 'Seizure / Status Epilepticus',
    shortTitle: 'Seizure',
    category: 'neurological',
    priority: 'high',
    icon: 'bolt.fill',
    color: '#7C3AED',
    summary: 'Protect from injury. Status = >5 min or recurring. Benzodiazepines first-line. Blood glucose.',
    keySteps: [
      { step: 1, action: 'Protect patient', details: 'Move hazards, do NOT restrain, do NOT put anything in mouth' },
      { step: 2, action: 'Position', details: 'Recovery position when safe. Suction PRN' },
      { step: 3, action: 'Time the seizure', details: 'Status epilepticus = > 5 minutes' },
      { step: 4, action: 'Blood glucose', details: 'Treat hypoglycemia if present' },
      { step: 5, action: 'Benzodiazepine', timing: 'If > 5 min or recurrent', details: 'Midazolam IM/IN preferred prehospital' },
      { step: 6, action: 'Oxygen', details: 'High-flow during/after seizure' },
      { step: 7, action: 'IV access', details: 'When feasible, for repeat dosing' },
      { step: 8, action: 'Post-ictal care', details: 'Protect airway, monitor for recurrence' },
    ],
    medications: [
      { name: 'Midazolam', adultDose: '10 mg IM/IN or 5 mg IV', pediatricDose: '0.2 mg/kg IM/IN (max 10 mg)', route: 'IM/IN/IV', notes: 'Preferred prehospital - no IV needed' },
      { name: 'Lorazepam', adultDose: '4 mg IV', pediatricDose: '0.1 mg/kg IV (max 4 mg)', route: 'IV', notes: 'Longer duration' },
      { name: 'Diazepam', adultDose: '5-10 mg IV/PR', pediatricDose: '0.2-0.5 mg/kg PR', route: 'IV/PR', notes: 'Rectal gel available for peds' },
      { name: 'Dextrose 50%', adultDose: '25 g', route: 'IV', notes: 'If hypoglycemic' },
    ],
    criticalPoints: [
      'Most seizures self-terminate < 2 min',
      'Status epilepticus is life-threatening emergency',
      'Midazolam IM/IN works as fast as IV lorazepam',
      'Consider eclampsia in pregnant patients',
    ],
    contraindications: [
      'Benzodiazepines: Caution with respiratory depression, recent alcohol/sedatives',
    ],
    pediatricNotes: 'Febrile seizures common in 6mo-5yo. Usually benign if simple. Midazolam IN effective for peds.',
    lastUpdated: '2025-01-01',
    sources: ['Neurocritical Care Society', 'NAEMSP'],
  },

  // 7. Respiratory Distress / Asthma / COPD
  {
    id: 'respiratory-distress',
    title: 'Respiratory Distress / Asthma / COPD',
    shortTitle: 'Resp Distress',
    category: 'respiratory',
    priority: 'high',
    icon: 'lungs.fill',
    color: '#0D9488',
    summary: 'Bronchodilators (albuterol) first. CPAP for severe distress. Steroids. Magnesium for severe asthma.',
    keySteps: [
      { step: 1, action: 'Position of comfort', details: 'Usually upright (tripod position)' },
      { step: 2, action: 'High-flow oxygen', details: 'Titrate to SpO2 > 94%' },
      { step: 3, action: 'Albuterol', details: '2.5-5 mg via nebulizer. Can be continuous for severe' },
      { step: 4, action: 'Ipratropium', details: '0.5 mg with albuterol for severe cases' },
      { step: 5, action: 'CPAP', details: 'For severe distress not responding to nebs' },
      { step: 6, action: 'Steroids', details: 'Methylprednisolone 125 mg IV or prednisone 60 mg PO' },
      { step: 7, action: 'Magnesium', details: 'For severe asthma not responding to bronchodilators' },
      { step: 8, action: 'Epinephrine', details: 'Consider for severe bronchospasm/impending arrest' },
    ],
    medications: [
      { name: 'Albuterol', adultDose: '2.5-5 mg', pediatricDose: '2.5 mg', route: 'Neb', notes: 'Can give continuously for severe' },
      { name: 'Ipratropium', adultDose: '0.5 mg', pediatricDose: '0.25 mg', route: 'Neb', notes: 'Add to albuterol for severe' },
      { name: 'Methylprednisolone', adultDose: '125 mg', pediatricDose: '2 mg/kg', route: 'IV', maxDose: '125 mg' },
      { name: 'Magnesium sulfate', adultDose: '2 g over 20 min', pediatricDose: '25-50 mg/kg', route: 'IV', maxDose: '2 g', notes: 'For severe asthma' },
      { name: 'Epinephrine', adultDose: '0.3-0.5 mg', route: 'IM', notes: 'Severe bronchospasm/impending arrest' },
    ],
    criticalPoints: [
      'Silent chest = severe obstruction (no air movement)',
      'COPD: Be cautious with high-flow O2 (hypercapnic drive)',
      'CPAP can dramatically improve work of breathing',
      'Intubation is last resort - very difficult in severe bronchospasm',
    ],
    contraindications: [
      'Magnesium: Avoid in renal failure, hypotension',
    ],
    pediatricNotes: 'Croup: Consider racemic epinephrine. Bronchiolitis: Supportive care, no albuterol benefit in most cases.',
    lastUpdated: '2025-01-01',
    sources: ['NAEMSP', 'GINA Guidelines'],
  },

  // 8. Trauma (General/Hemorrhage Control)
  {
    id: 'trauma',
    title: 'Trauma / Hemorrhage Control',
    shortTitle: 'Trauma',
    category: 'trauma',
    priority: 'critical',
    icon: 'cross.fill',
    color: '#DC2626',
    summary: 'Stop the bleed: Direct pressure, tourniquet, wound packing. Permissive hypotension (SBP 80-90). TXA early.',
    keySteps: [
      { step: 1, action: 'Scene safety + C-spine', details: 'Control obvious hemorrhage immediately' },
      { step: 2, action: 'Stop the bleeding', details: 'Direct pressure → Tourniquet → Wound packing' },
      { step: 3, action: 'Tourniquet', details: 'Apply high & tight for extremity hemorrhage. Note time.' },
      { step: 4, action: 'Primary survey', details: 'ABCDE. Identify life threats.' },
      { step: 5, action: 'IV access', details: 'Large bore x 2 if shock' },
      { step: 6, action: 'TXA', timing: 'Within 3 hours', details: '1 g IV over 10 min for significant hemorrhage' },
      { step: 7, action: 'Permissive hypotension', details: 'Target SBP 80-90 (higher for TBI)' },
      { step: 8, action: 'Trauma center transport', details: 'Do not delay for procedures' },
    ],
    medications: [
      { name: 'Tranexamic acid (TXA)', adultDose: '1 g over 10 min', pediatricDose: '15 mg/kg', route: 'IV', notes: 'Within 3 hrs of injury. Followed by infusion.' },
      { name: 'NS/LR', adultDose: '1-2 L', route: 'IV', notes: 'Permissive hypotension - avoid over-resuscitation' },
      { name: 'Fentanyl', adultDose: '25-50 mcg', route: 'IV/IM/IN', notes: 'Pain control' },
      { name: 'Ketamine', adultDose: '0.3-0.5 mg/kg', route: 'IV/IM', notes: 'Analgesia without hypotension' },
    ],
    criticalPoints: [
      'Tourniquets save lives - use early and high',
      'Permissive hypotension: SBP 80-90 (penetrating), higher for TBI',
      'TXA most effective within 1 hour of injury',
      'Time is critical - minimize scene time',
    ],
    contraindications: [
      'TXA: Active intravascular clotting (DIC)',
    ],
    pediatricNotes: 'Fluid bolus 20 mL/kg. TXA 15 mg/kg. Tourniquets can be used on children.',
    lastUpdated: '2025-01-01',
    sources: ['NAEMSP', 'TCCC Guidelines', 'ACS COT'],
  },

  // 9. Hypoglycemia
  {
    id: 'hypoglycemia',
    title: 'Hypoglycemia',
    shortTitle: 'Hypoglycemia',
    category: 'medical',
    priority: 'high',
    icon: 'drop.fill',
    color: '#F59E0B',
    summary: 'BGL < 60 mg/dL. D10 preferred. Glucagon if no IV. Oral glucose if alert.',
    keySteps: [
      { step: 1, action: 'Check blood glucose', details: 'Document reading' },
      { step: 2, action: 'If alert and can swallow', details: 'Oral glucose 15-20 g (juice, glucose tabs)' },
      { step: 3, action: 'If altered/unable to swallow', details: 'IV access for dextrose' },
      { step: 4, action: 'IV dextrose', details: 'D10 preferred: 100-250 mL (10-25 g). D50 25-50 mL if D10 not available' },
      { step: 5, action: 'If no IV access', details: 'Glucagon 1 mg IM' },
      { step: 6, action: 'Recheck glucose', timing: '5-10 min', details: 'Repeat dextrose if still < 70' },
      { step: 7, action: 'Identify cause', details: 'Insulin, oral agents, sepsis, liver disease' },
    ],
    medications: [
      { name: 'Dextrose 10% (D10)', adultDose: '100-250 mL (10-25 g)', pediatricDose: '2-4 mL/kg', route: 'IV', notes: 'Preferred over D50 (less tissue damage)' },
      { name: 'Dextrose 50% (D50)', adultDose: '25-50 mL (12.5-25 g)', route: 'IV', notes: 'If D10 unavailable. Causes tissue necrosis if infiltrates' },
      { name: 'Glucagon', adultDose: '1 mg', pediatricDose: '0.5 mg (<20 kg), 1 mg (≥20 kg)', route: 'IM/SQ', notes: 'If no IV access. Slower onset (10-15 min)' },
      { name: 'Oral glucose', adultDose: '15-20 g', route: 'PO', notes: 'Only if alert and can protect airway' },
    ],
    criticalPoints: [
      'D10 is preferred over D50 (safer, equivalent efficacy)',
      'Glucagon less effective in alcoholics (depleted glycogen)',
      'Look for underlying cause (infection, medication error)',
      'May refuse transport after treatment, but document thoroughly',
    ],
    contraindications: [
      'Oral glucose: Altered mental status, unable to protect airway',
      'Glucagon: Limited effectiveness in chronic alcohol use',
    ],
    pediatricNotes: 'D10 2-4 mL/kg IV, or D25 2 mL/kg. Avoid D50 in children (risk of hyperosmolar injury).',
    lastUpdated: '2025-01-01',
    sources: ['NAEMSP', 'ADA Guidelines'],
  },

  // 10. Pediatric Emergencies (General Approach)
  {
    id: 'pediatric-emergency',
    title: 'Pediatric Emergency Approach',
    shortTitle: 'Pediatric',
    category: 'pediatric',
    priority: 'high',
    icon: 'figure.child',
    color: '#EC4899',
    summary: 'Weight-based dosing. Broselow tape. Respiratory failure most common cause of arrest. Early IO access.',
    keySteps: [
      { step: 1, action: 'Pediatric Assessment Triangle', details: 'Appearance, Work of breathing, Circulation to skin' },
      { step: 2, action: 'Weight estimation', details: 'Broselow tape or (age + 4) × 2 kg' },
      { step: 3, action: 'Airway positioning', details: 'Sniffing position. Avoid hyperextension (neutral in infants)' },
      { step: 4, action: 'O2 delivery', details: 'Blow-by for infants, NRB or NC for older children' },
      { step: 5, action: 'Vascular access', details: 'IV or IO. Early IO if IV difficult (> 90 sec)' },
      { step: 6, action: 'Fluid bolus', details: '20 mL/kg NS, reassess after each bolus' },
      { step: 7, action: 'Medications', details: 'All weight-based. Use Broselow or calculation' },
      { step: 8, action: 'Temperature management', details: 'Children cool rapidly. Keep warm' },
    ],
    medications: [
      { name: 'Epinephrine (arrest)', adultDose: 'N/A', pediatricDose: '0.01 mg/kg (0.1 mL/kg of 1:10,000)', route: 'IV/IO', maxDose: '1 mg' },
      { name: 'Epinephrine (anaphylaxis)', adultDose: 'N/A', pediatricDose: '0.01 mg/kg (0.01 mL/kg of 1:1000)', route: 'IM', maxDose: '0.3 mg' },
      { name: 'Atropine', adultDose: 'N/A', pediatricDose: '0.02 mg/kg', route: 'IV/IO', notes: 'Min 0.1 mg, max 0.5 mg' },
      { name: 'Midazolam (seizure)', adultDose: 'N/A', pediatricDose: '0.2 mg/kg IN/IM or 0.1 mg/kg IV', route: 'IN/IM/IV', maxDose: '10 mg' },
      { name: 'Albuterol', adultDose: 'N/A', pediatricDose: '2.5 mg', route: 'Neb', notes: 'Same as adult dose' },
    ],
    criticalPoints: [
      'Respiratory failure is #1 cause of pediatric arrest',
      'Early IO if IV not obtained in 90 seconds',
      'CPR ratio 15:2 with 2 rescuers, 30:2 single rescuer',
      'Do NOT delay transport for interventions',
    ],
    contraindications: [],
    pediatricNotes: 'Normal vitals vary by age. HR: Infant 100-160, Child 80-120. RR: Infant 30-60, Child 20-30. SBP: 70 + (2 × age).',
    lastUpdated: '2025-01-01',
    sources: ['PALS Guidelines 2025', 'NAEMSP'],
  },
];

export const quickReferenceRouter = router({
  /**
   * Get all quick reference cards
   */
  getAll: publicProcedure.query(() => {
    return {
      cards: QUICK_REFERENCE_CARDS,
      totalCards: QUICK_REFERENCE_CARDS.length,
      lastUpdated: '2025-01-01',
    };
  }),

  /**
   * Get a single quick reference card by ID
   */
  getById: publicRateLimitedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const card = QUICK_REFERENCE_CARDS.find(c => c.id === input.id);
      if (!card) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Quick reference card "${input.id}" not found`,
        });
      }
      return card;
    }),

  /**
   * Get cards by category
   */
  getByCategory: publicRateLimitedProcedure
    .input(z.object({
      category: z.enum(['cardiac', 'respiratory', 'neurological', 'trauma', 'medical', 'pediatric', 'obstetric', 'toxicology']),
    }))
    .query(({ input }) => {
      const cards = QUICK_REFERENCE_CARDS.filter(c => c.category === input.category);
      return {
        category: input.category,
        cards,
      };
    }),

  /**
   * Get cards by priority (for critical alerts)
   */
  getByPriority: publicRateLimitedProcedure
    .input(z.object({
      priority: z.enum(['critical', 'high', 'standard']),
    }))
    .query(({ input }) => {
      const cards = QUICK_REFERENCE_CARDS.filter(c => c.priority === input.priority);
      return {
        priority: input.priority,
        cards,
      };
    }),

  /**
   * Search quick reference cards
   */
  search: publicRateLimitedProcedure
    .input(z.object({
      query: z.string().min(1).max(100),
    }))
    .query(({ input }) => {
      const queryLower = input.query.toLowerCase();
      
      const matchingCards = QUICK_REFERENCE_CARDS.filter(card => {
        // Check title
        if (card.title.toLowerCase().includes(queryLower)) return true;
        if (card.shortTitle.toLowerCase().includes(queryLower)) return true;
        
        // Check summary
        if (card.summary.toLowerCase().includes(queryLower)) return true;
        
        // Check medications
        if (card.medications.some(m => m.name.toLowerCase().includes(queryLower))) return true;
        
        // Check key steps
        if (card.keySteps.some(s => s.action.toLowerCase().includes(queryLower))) return true;
        
        return false;
      });

      return {
        query: input.query,
        cards: matchingCards,
      };
    }),

  /**
   * Get medication quick lookup across all cards
   */
  medicationLookup: publicRateLimitedProcedure
    .input(z.object({
      medication: z.string().min(1).max(100),
    }))
    .query(({ input }) => {
      const medLower = input.medication.toLowerCase();
      
      const results: { card: string; cardId: string; medication: QuickMedication }[] = [];
      
      for (const card of QUICK_REFERENCE_CARDS) {
        for (const med of card.medications) {
          if (med.name.toLowerCase().includes(medLower)) {
            results.push({
              card: card.shortTitle,
              cardId: card.id,
              medication: med,
            });
          }
        }
      }

      return {
        medication: input.medication,
        results,
      };
    }),
});

export type QuickReferenceRouter = typeof quickReferenceRouter;
