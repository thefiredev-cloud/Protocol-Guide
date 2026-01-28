/**
 * Medication Dose Guardrails
 * 
 * Safety system to prevent medication errors.
 * "You can't give a wrong dose if the app won't let you"
 * 
 * Features:
 * - Contraindication alerts
 * - Hard dose ceilings
 * - Drug interaction warnings
 * - Weight sanity checks
 * - Age-appropriate dosing validation
 */

import type { 
  PatientType, 
  MedicationGuardrail, 
  DrugInteraction,
  ContraindicationCheck,
  WeightSanityResult,
  GuardrailCheckResult,
  AlertLevel
} from './types';

/**
 * Expected weight ranges by age (kg)
 * Based on CDC growth charts, 5th-95th percentile
 */
export const AGE_WEIGHT_RANGES: Record<string, { min: number; max: number; typical: number }> = {
  'newborn': { min: 2.5, max: 4.5, typical: 3.5 },
  '1month': { min: 3, max: 6, typical: 4.5 },
  '3months': { min: 4.5, max: 8, typical: 6 },
  '6months': { min: 6, max: 10, typical: 7.5 },
  '9months': { min: 7, max: 11, typical: 9 },
  '1year': { min: 8, max: 12, typical: 10 },
  '2years': { min: 10, max: 16, typical: 12 },
  '3years': { min: 12, max: 18, typical: 14 },
  '4years': { min: 14, max: 22, typical: 16 },
  '5years': { min: 16, max: 26, typical: 18 },
  '6years': { min: 18, max: 30, typical: 21 },
  '8years': { min: 22, max: 40, typical: 26 },
  '10years': { min: 26, max: 50, typical: 32 },
  '12years': { min: 32, max: 65, typical: 40 },
  '14years': { min: 40, max: 80, typical: 50 },
  '16years': { min: 45, max: 90, typical: 60 },
  'adult': { min: 40, max: 200, typical: 70 },
};

/**
 * Drug Interactions Database
 * Key interactions that need warnings in the field
 */
export const DRUG_INTERACTIONS: DrugInteraction[] = [
  {
    drug1: 'epinephrine',
    drug2: 'beta-blocker',
    severity: 'major',
    description: 'Beta-blockers may reduce epinephrine effectiveness and cause paradoxical hypertension',
    recommendation: 'Consider glucagon 1-2mg IV for anaphylaxis in beta-blocked patients',
  },
  {
    drug1: 'epinephrine',
    drug2: 'tricyclic-antidepressant',
    severity: 'major',
    description: 'TCAs potentiate epinephrine effects - risk of severe hypertension/arrhythmias',
    recommendation: 'Use reduced dose, monitor closely',
  },
  {
    drug1: 'epinephrine',
    drug2: 'cocaine',
    severity: 'major',
    description: 'Cocaine + epinephrine increases risk of MI and lethal arrhythmias',
    recommendation: 'Avoid if possible; use benzodiazepines for agitation',
  },
  {
    drug1: 'fentanyl',
    drug2: 'benzodiazepine',
    severity: 'major',
    description: 'Combined CNS/respiratory depression - high overdose risk',
    recommendation: 'Reduce doses by 50% when used together; have naloxone ready',
  },
  {
    drug1: 'fentanyl',
    drug2: 'maoi',
    severity: 'critical',
    description: 'MAOIs + opioids can cause serotonin syndrome or severe respiratory depression',
    recommendation: 'CONTRAINDICATED - use alternative analgesia',
  },
  {
    drug1: 'midazolam',
    drug2: 'opioid',
    severity: 'major',
    description: 'Combined CNS/respiratory depression',
    recommendation: 'Reduce both doses; monitor respiratory status closely',
  },
  {
    drug1: 'amiodarone',
    drug2: 'beta-blocker',
    severity: 'moderate',
    description: 'Additive bradycardia and AV block risk',
    recommendation: 'Monitor rhythm closely; expect bradycardia',
  },
  {
    drug1: 'amiodarone',
    drug2: 'calcium-channel-blocker',
    severity: 'moderate', 
    description: 'Increased risk of bradycardia, AV block, and hypotension',
    recommendation: 'Monitor closely; avoid non-DHP CCBs if possible',
  },
  {
    drug1: 'albuterol',
    drug2: 'beta-blocker',
    severity: 'moderate',
    description: 'Beta-blockers may reduce albuterol effectiveness',
    recommendation: 'May need higher doses; consider ipratropium',
  },
];

/**
 * Contraindications Database
 */
export const CONTRAINDICATIONS: ContraindicationCheck[] = [
  // Epinephrine
  {
    medicationId: 'epinephrine-cardiac',
    condition: 'hypothermia-severe',
    severity: 'relative',
    message: 'Limited effectiveness in severe hypothermia (<30°C)',
    recommendation: 'Warm patient; may space doses to q10min',
  },
  {
    medicationId: 'epinephrine-anaphylaxis',
    condition: 'pregnancy',
    severity: 'relative',
    message: 'Use with caution - may reduce uterine blood flow',
    recommendation: 'Still indicated for anaphylaxis; benefits outweigh risks',
  },
  
  // Fentanyl
  {
    medicationId: 'fentanyl',
    condition: 'head-injury',
    severity: 'relative',
    message: 'May increase ICP and mask neurological changes',
    recommendation: 'Use lowest effective dose; frequent neuro checks',
  },
  {
    medicationId: 'fentanyl',
    condition: 'hypotension',
    severity: 'relative',
    message: 'May worsen hypotension',
    recommendation: 'Ensure adequate volume resuscitation first',
  },
  {
    medicationId: 'fentanyl',
    condition: 'respiratory-depression',
    severity: 'absolute',
    message: 'CONTRAINDICATED in respiratory depression without airway control',
    recommendation: 'Secure airway before administering',
  },
  {
    medicationId: 'fentanyl-adult',
    condition: 'head-injury',
    severity: 'relative',
    message: 'May increase ICP and mask neurological changes',
    recommendation: 'Use lowest effective dose; frequent neuro checks',
  },
  {
    medicationId: 'fentanyl-adult',
    condition: 'hypotension',
    severity: 'relative',
    message: 'May worsen hypotension',
    recommendation: 'Ensure adequate volume resuscitation first',
  },
  {
    medicationId: 'fentanyl-adult',
    condition: 'respiratory-depression',
    severity: 'absolute',
    message: 'CONTRAINDICATED in respiratory depression without airway control',
    recommendation: 'Secure airway before administering',
  },
  
  // Midazolam
  {
    medicationId: 'midazolam-seizures',
    condition: 'hypotension',
    severity: 'relative',
    message: 'May cause hypotension; use caution',
    recommendation: 'Have fluids ready; consider reduced dose',
  },
  {
    medicationId: 'midazolam-seizures',
    condition: 'respiratory-depression',
    severity: 'relative',
    message: 'Risk of respiratory depression especially with other CNS depressants',
    recommendation: 'Have BVM ready; consider airway management',
  },
  
  // Amiodarone
  {
    medicationId: 'amiodarone',
    condition: 'bradycardia',
    severity: 'relative',
    message: 'May worsen bradycardia',
    recommendation: 'Use in VF/pVT only; not for bradycardic rhythms',
  },
  {
    medicationId: 'amiodarone',
    condition: 'hypotension',
    severity: 'relative',
    message: 'May cause significant hypotension',
    recommendation: 'Slow infusion; have vasopressors available',
  },
  {
    medicationId: 'amiodarone',
    condition: 'iodine-allergy',
    severity: 'relative',
    message: 'Contains iodine - caution in severe iodine allergy',
    recommendation: 'Consider lidocaine as alternative',
  },
  
  // Albuterol
  {
    medicationId: 'albuterol',
    condition: 'tachyarrhythmia',
    severity: 'relative',
    message: 'May worsen tachycardia/arrhythmias',
    recommendation: 'Monitor heart rate; use if bronchospasm is life-threatening',
  },
  
  // Diphenhydramine
  {
    medicationId: 'diphenhydramine',
    condition: 'altered-mental-status',
    severity: 'relative',
    message: 'Anticholinergic effects may worsen confusion',
    recommendation: 'Use lowest effective dose; monitor mental status',
  },
  {
    medicationId: 'diphenhydramine',
    condition: 'glaucoma',
    severity: 'relative',
    message: 'May increase intraocular pressure',
    recommendation: 'Use with caution; consider alternatives',
  },
];

/**
 * Check weight sanity against stated age
 */
export function checkWeightSanity(
  weightKg: number, 
  ageCategory?: string
): WeightSanityResult {
  if (!ageCategory) {
    // No age provided - just check if weight is plausible for any human
    if (weightKg < 0.5) {
      return {
        isPlausible: false,
        alertLevel: 'critical',
        message: 'Weight too low - verify measurement',
        expectedRange: null,
      };
    }
    if (weightKg > 300) {
      return {
        isPlausible: false,
        alertLevel: 'critical',
        message: 'Weight exceeds maximum - verify measurement',
        expectedRange: null,
      };
    }
    return { isPlausible: true, alertLevel: 'none', message: null, expectedRange: null };
  }

  const range = AGE_WEIGHT_RANGES[ageCategory];
  if (!range) {
    return { isPlausible: true, alertLevel: 'none', message: null, expectedRange: null };
  }

  // Check if significantly outside range
  const percentBelow = ((range.min - weightKg) / range.min) * 100;
  const percentAbove = ((weightKg - range.max) / range.max) * 100;

  if (weightKg < range.min * 0.5) {
    return {
      isPlausible: false,
      alertLevel: 'critical',
      message: `Weight ${weightKg}kg is VERY LOW for ${ageCategory} (expected ${range.min}-${range.max}kg)`,
      expectedRange: range,
    };
  }

  if (weightKg < range.min) {
    return {
      isPlausible: true,
      alertLevel: 'warning',
      message: `Weight ${weightKg}kg is below typical for ${ageCategory} (expected ${range.min}-${range.max}kg)`,
      expectedRange: range,
    };
  }

  if (weightKg > range.max * 1.5) {
    return {
      isPlausible: false,
      alertLevel: 'critical', 
      message: `Weight ${weightKg}kg is VERY HIGH for ${ageCategory} (expected ${range.min}-${range.max}kg)`,
      expectedRange: range,
    };
  }

  if (weightKg > range.max) {
    return {
      isPlausible: true,
      alertLevel: 'warning',
      message: `Weight ${weightKg}kg is above typical for ${ageCategory} (expected ${range.min}-${range.max}kg)`,
      expectedRange: range,
    };
  }

  return { 
    isPlausible: true, 
    alertLevel: 'none', 
    message: null, 
    expectedRange: range 
  };
}

/**
 * Check for drug interactions
 */
export function checkDrugInteractions(
  medicationId: string,
  currentMedications: string[]
): DrugInteraction[] {
  const interactions: DrugInteraction[] = [];
  
  // Normalize medication ID to base drug name
  const baseDrug = medicationId.split('-')[0];
  
  for (const currentMed of currentMedications) {
    const currentBase = currentMed.toLowerCase();
    
    for (const interaction of DRUG_INTERACTIONS) {
      // Check if this interaction applies
      const match1 = interaction.drug1 === baseDrug && interaction.drug2 === currentBase;
      const match2 = interaction.drug2 === baseDrug && interaction.drug1 === currentBase;
      
      if (match1 || match2) {
        interactions.push(interaction);
      }
    }
  }
  
  return interactions;
}

/**
 * Check contraindications
 */
export function checkContraindications(
  medicationId: string,
  conditions: string[]
): ContraindicationCheck[] {
  return CONTRAINDICATIONS.filter(
    c => c.medicationId === medicationId && conditions.includes(c.condition)
  );
}

/**
 * Validate dose against hard ceilings
 */
export function validateDose(
  medicationId: string,
  calculatedDose: number,
  maxDose: number,
  patientType: PatientType
): { 
  isValid: boolean; 
  alertLevel: AlertLevel;
  adjustedDose: number;
  message: string | null;
} {
  // Hard ceiling check - NEVER exceed these
  if (calculatedDose > maxDose) {
    return {
      isValid: false,
      alertLevel: 'critical',
      adjustedDose: maxDose,
      message: `⛔ DOSE CAPPED: Calculated ${calculatedDose.toFixed(2)} exceeds max ${maxDose}`,
    };
  }

  // Check for pediatric patient getting adult doses
  if (patientType === 'pediatric' && calculatedDose >= maxDose * 0.9) {
    return {
      isValid: true,
      alertLevel: 'warning',
      adjustedDose: calculatedDose,
      message: `⚠️ Near max dose for pediatric patient - verify weight`,
    };
  }

  return {
    isValid: true,
    alertLevel: 'none',
    adjustedDose: calculatedDose,
    message: null,
  };
}

/**
 * Complete guardrail check for a medication dose
 */
export function runGuardrailChecks(
  medicationId: string,
  weightKg: number,
  calculatedDose: number,
  maxDose: number,
  patientType: PatientType,
  ageCategory?: string,
  currentMedications: string[] = [],
  conditions: string[] = []
): GuardrailCheckResult {
  const alerts: Array<{
    level: AlertLevel;
    type: 'contraindication' | 'interaction' | 'weight' | 'dose';
    message: string;
    recommendation?: string;
  }> = [];

  let canAdminister = true;

  // 1. Weight sanity check
  const weightCheck = checkWeightSanity(weightKg, ageCategory);
  if (weightCheck.alertLevel !== 'none') {
    alerts.push({
      level: weightCheck.alertLevel,
      type: 'weight',
      message: weightCheck.message!,
      recommendation: 'Verify patient weight before administering',
    });
    if (weightCheck.alertLevel === 'critical') {
      canAdminister = false;
    }
  }

  // 2. Dose validation
  const doseCheck = validateDose(medicationId, calculatedDose, maxDose, patientType);
  if (doseCheck.alertLevel !== 'none') {
    alerts.push({
      level: doseCheck.alertLevel,
      type: 'dose',
      message: doseCheck.message!,
      recommendation: doseCheck.alertLevel === 'critical' 
        ? 'Dose has been automatically capped at maximum'
        : 'Verify weight and indication',
    });
  }

  // 3. Drug interactions
  const interactions = checkDrugInteractions(medicationId, currentMedications);
  for (const interaction of interactions) {
    const level: AlertLevel = interaction.severity === 'critical' ? 'critical' : 
                              interaction.severity === 'major' ? 'warning' : 'info';
    alerts.push({
      level,
      type: 'interaction',
      message: `Drug Interaction (${interaction.drug2}): ${interaction.description}`,
      recommendation: interaction.recommendation,
    });
    if (interaction.severity === 'critical') {
      canAdminister = false;
    }
  }

  // 4. Contraindications
  const contraindications = checkContraindications(medicationId, conditions);
  for (const contra of contraindications) {
    const level: AlertLevel = contra.severity === 'absolute' ? 'critical' : 'warning';
    alerts.push({
      level,
      type: 'contraindication',
      message: contra.message,
      recommendation: contra.recommendation,
    });
    if (contra.severity === 'absolute') {
      canAdminister = false;
    }
  }

  // Sort alerts by severity
  const severityOrder: Record<AlertLevel, number> = { 
    critical: 0, 
    warning: 1, 
    info: 2, 
    none: 3 
  };
  alerts.sort((a, b) => severityOrder[a.level] - severityOrder[b.level]);

  return {
    canAdminister,
    adjustedDose: doseCheck.adjustedDose,
    alerts,
    requiresOverride: !canAdminister,
  };
}

/**
 * Get all available conditions for the conditions selector
 */
export function getAvailableConditions(): Array<{ id: string; label: string; category: string }> {
  return [
    // Cardiovascular
    { id: 'hypotension', label: 'Hypotension', category: 'Cardiovascular' },
    { id: 'bradycardia', label: 'Bradycardia', category: 'Cardiovascular' },
    { id: 'tachyarrhythmia', label: 'Tachyarrhythmia', category: 'Cardiovascular' },
    
    // Respiratory
    { id: 'respiratory-depression', label: 'Respiratory Depression', category: 'Respiratory' },
    
    // Neurological  
    { id: 'head-injury', label: 'Head Injury', category: 'Neurological' },
    { id: 'altered-mental-status', label: 'Altered Mental Status', category: 'Neurological' },
    
    // Environmental
    { id: 'hypothermia-severe', label: 'Severe Hypothermia', category: 'Environmental' },
    
    // Allergies
    { id: 'iodine-allergy', label: 'Iodine Allergy', category: 'Allergies' },
    
    // Other
    { id: 'pregnancy', label: 'Pregnancy', category: 'Special Populations' },
    { id: 'glaucoma', label: 'Glaucoma', category: 'Medical History' },
  ];
}

/**
 * Get available medication classes for interaction checking
 */
export function getAvailableMedicationClasses(): Array<{ id: string; label: string; examples: string }> {
  return [
    { id: 'beta-blocker', label: 'Beta-Blocker', examples: 'metoprolol, atenolol, propranolol' },
    { id: 'calcium-channel-blocker', label: 'Calcium Channel Blocker', examples: 'diltiazem, verapamil, amlodipine' },
    { id: 'tricyclic-antidepressant', label: 'Tricyclic Antidepressant', examples: 'amitriptyline, nortriptyline' },
    { id: 'maoi', label: 'MAOI', examples: 'phenelzine, tranylcypromine, selegiline' },
    { id: 'benzodiazepine', label: 'Benzodiazepine', examples: 'lorazepam, diazepam, alprazolam' },
    { id: 'opioid', label: 'Opioid', examples: 'morphine, oxycodone, hydrocodone' },
    { id: 'cocaine', label: 'Cocaine/Stimulant', examples: 'cocaine, methamphetamine' },
  ];
}
