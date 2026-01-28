/**
 * Enhanced Medication Dosing Calculator with Guardrails
 * 
 * LA County EMS-specific medication dosing calculator.
 * "You can't give a wrong dose if the app won't let you"
 * 
 * Key Features:
 * - BIG "Give X.X mL" output text
 * - Contraindication alerts with hard blocks
 * - Drug interaction warnings
 * - Weight sanity checks by age
 * - Hard dose ceilings with visual warnings
 * - Adult and pediatric dosing
 * - LA County specific protocols
 * - Offline capable
 */

import * as React from 'react';
import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/use-colors';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { touchTargets, radii, spacing, shadows } from '@/lib/design-tokens';
import { getMedicationsByPatientType } from './medications';
import { 
  runGuardrailChecks, 
  getAvailableConditions, 
  getAvailableMedicationClasses 
} from './guardrails';
import type { 
  PediatricMedication, 
  PediatricDosingResult, 
  WeightUnit, 
  PatientType,
  AgeCategory,
  GuardrailCheckResult,
  AlertLevel
} from './types';
import { getWeightCategory, AGE_CATEGORIES } from './types';

interface MedicationDosingCalculatorProps {
  /** Optional initial weight in kg */
  initialWeightKg?: number;
  /** Optional pre-selected medication ID */
  initialMedicationId?: string;
  /** Initial patient type */
  initialPatientType?: PatientType;
}

/**
 * Calculate the dose and volume for a medication
 */
function calculateDose(
  medication: PediatricMedication,
  weightKg: number,
  patientType: PatientType
): PediatricDosingResult {
  const warnings: string[] = [];
  
  let dose: number;
  let maxDoseReached = false;
  let belowMinDose = false;
  
  // Adult fixed-dose vs pediatric weight-based
  if (patientType === 'adult' && medication.adultDoseRange) {
    // For adults, use the typical dose from range
    dose = medication.adultDoseRange.typical;
  } else {
    // Calculate raw dose based on weight
    dose = medication.dosePerKg * weightKg;
  }
  
  // Check max dose
  if (dose > medication.maxDose) {
    dose = medication.maxDose;
    maxDoseReached = true;
    warnings.push(`⛔ CAPPED AT MAX: ${medication.maxDose} ${medication.maxDoseUnit}`);
  }
  
  // Check min dose
  if (medication.minDose && dose < medication.minDose) {
    belowMinDose = true;
    warnings.push(`Consider minimum dose: ${medication.minDose} ${medication.doseUnit}`);
  }
  
  // Calculate volume in mL
  let volumeMl: number;
  if (medication.id === 'dextrose-d10') {
    volumeMl = dose; // Already in mL
  } else if (medication.id === 'dextrose-adult') {
    volumeMl = dose / medication.concentration; // g to mL
  } else {
    volumeMl = dose / medication.concentration;
  }
  
  // Format displays
  let doseDisplay: string;
  if (medication.id === 'dextrose-d10') {
    doseDisplay = `${dose.toFixed(1)} mL`;
  } else if (medication.id === 'dextrose-adult') {
    doseDisplay = `${dose.toFixed(1)} g`;
  } else if (dose >= 1) {
    doseDisplay = `${dose.toFixed(1)} ${medication.doseUnit}`;
  } else {
    doseDisplay = `${dose.toFixed(2)} ${medication.doseUnit}`;
  }
  
  const volumeDisplay = volumeMl >= 0.1
    ? `${volumeMl.toFixed(1)} mL`
    : `${volumeMl.toFixed(2)} mL`;
  
  return {
    dose,
    volumeMl,
    maxDoseReached,
    belowMinDose,
    doseDisplay,
    volumeDisplay,
    warnings,
  };
}

// Alert level colors
const ALERT_COLORS: Record<AlertLevel, { bg: string; border: string; text: string; icon: string }> = {
  critical: { bg: '#DC262620', border: '#DC2626', text: '#DC2626', icon: 'xmark.octagon.fill' },
  warning: { bg: '#F59E0B20', border: '#F59E0B', text: '#F59E0B', icon: 'exclamationmark.triangle.fill' },
  info: { bg: '#3B82F620', border: '#3B82F6', text: '#3B82F6', icon: 'info.circle.fill' },
  none: { bg: 'transparent', border: 'transparent', text: '#888', icon: 'checkmark.circle.fill' },
};

export function PediatricDosingCalculator({
  initialWeightKg = 10,
  initialMedicationId,
  initialPatientType = 'pediatric',
}: MedicationDosingCalculatorProps) {
  const colors = useColors();
  
  // State
  const [patientType, setPatientType] = useState<PatientType>(initialPatientType);
  const [weightKg, setWeightKg] = useState(initialWeightKg);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [selectedMedId, setSelectedMedId] = useState<string | null>(
    initialMedicationId ?? null
  );
  const [manualWeightInput, setManualWeightInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [selectedAge, setSelectedAge] = useState<AgeCategory | null>(null);
  const [showAgeSelector, setShowAgeSelector] = useState(false);
  
  // Safety toggles
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedMedClasses, setSelectedMedClasses] = useState<string[]>([]);
  const [showConditionsModal, setShowConditionsModal] = useState(false);
  const [showMedsModal, setShowMedsModal] = useState(false);
  const [overrideActive, setOverrideActive] = useState(false);
  
  // Computed values
  const displayWeight = weightUnit === 'kg' ? weightKg : Math.round(weightKg * 2.205);
  const sliderMin = weightUnit === 'kg' ? (patientType === 'adult' ? 30 : 1) : (patientType === 'adult' ? 66 : 2);
  const sliderMax = weightUnit === 'kg' ? (patientType === 'adult' ? 150 : 50) : (patientType === 'adult' ? 330 : 110);
  
  const weightCategory = useMemo(() => {
    if (patientType === 'adult') return null;
    return getWeightCategory(weightKg);
  }, [weightKg, patientType]);
  
  // Get medications for current patient type
  const availableMedications = useMemo(
    () => getMedicationsByPatientType(patientType),
    [patientType]
  );
  
  const selectedMedication = useMemo(
    () => availableMedications.find(m => m.id === selectedMedId),
    [availableMedications, selectedMedId]
  );
  
  const dosing = useMemo(() => {
    if (!selectedMedication) return null;
    return calculateDose(selectedMedication, weightKg, patientType);
  }, [selectedMedication, weightKg, patientType]);
  
  // Run guardrail checks
  const guardrailResult = useMemo((): GuardrailCheckResult | null => {
    if (!selectedMedication || !dosing) return null;
    
    return runGuardrailChecks(
      selectedMedication.id,
      weightKg,
      dosing.dose,
      selectedMedication.maxDose,
      patientType,
      selectedAge ?? undefined,
      selectedMedClasses,
      selectedConditions
    );
  }, [selectedMedication, dosing, weightKg, patientType, selectedAge, selectedMedClasses, selectedConditions]);
  
  // Can we administer?
  const canAdminister = useMemo(() => {
    if (!guardrailResult) return true;
    return guardrailResult.canAdminister || overrideActive;
  }, [guardrailResult, overrideActive]);
  
  // Handlers
  const handleSliderChange = useCallback((value: number) => {
    const newWeightKg = weightUnit === 'kg' ? value : value / 2.205;
    setWeightKg(Math.round(newWeightKg * 10) / 10);
  }, [weightUnit]);
  
  const handleSliderComplete = useCallback((value: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const newWeightKg = weightUnit === 'kg' ? value : value / 2.205;
    setWeightKg(Math.round(newWeightKg * 10) / 10);
  }, [weightUnit]);
  
  const toggleWeightUnit = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setWeightUnit(prev => prev === 'kg' ? 'lbs' : 'kg');
  }, []);
  
  const handlePatientTypeToggle = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setPatientType(prev => {
      const newType = prev === 'pediatric' ? 'adult' : 'pediatric';
      // Reset weight to appropriate default
      setWeightKg(newType === 'adult' ? 70 : 10);
      setSelectedMedId(null);
      setSelectedAge(null);
      return newType;
    });
  }, []);
  
  const handleMedicationSelect = useCallback((medId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSelectedMedId(medId);
    setOverrideActive(false); // Reset override when changing meds
  }, []);
  
  const handleManualWeightSubmit = useCallback(() => {
    const value = parseFloat(manualWeightInput);
    if (!isNaN(value) && value > 0) {
      const newWeightKg = weightUnit === 'kg' ? value : value / 2.205;
      const maxWeight = patientType === 'adult' ? 200 : 50;
      setWeightKg(Math.min(Math.max(newWeightKg, 1), maxWeight));
      setShowManualInput(false);
      setManualWeightInput('');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  }, [manualWeightInput, weightUnit, patientType]);
  
  const handleQuickWeight = useCallback((weight: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const newWeightKg = weightUnit === 'kg' ? weight : weight / 2.205;
    setWeightKg(newWeightKg);
  }, [weightUnit]);

  const toggleCondition = useCallback((conditionId: string) => {
    setSelectedConditions(prev => 
      prev.includes(conditionId) 
        ? prev.filter(c => c !== conditionId)
        : [...prev, conditionId]
    );
    setOverrideActive(false);
  }, []);

  const toggleMedClass = useCallback((classId: string) => {
    setSelectedMedClasses(prev =>
      prev.includes(classId)
        ? prev.filter(c => c !== classId)
        : [...prev, classId]
    );
    setOverrideActive(false);
  }, []);

  const handleAgeSelect = useCallback((ageId: AgeCategory) => {
    setSelectedAge(ageId);
    setShowAgeSelector(false);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  // Quick weights based on patient type
  const quickWeights = patientType === 'adult'
    ? (weightUnit === 'kg' ? [50, 70, 80, 100, 120] : [110, 154, 176, 220, 265])
    : (weightUnit === 'kg' ? [3, 5, 10, 15, 20, 30] : [7, 11, 22, 33, 44, 66]);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header with Patient Type Toggle */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <IconSymbol 
              name={patientType === 'pediatric' ? 'figure.child' : 'figure.stand'} 
              size={28} 
              color={colors.primary} 
            />
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              {patientType === 'pediatric' ? 'Pediatric' : 'Adult'} Dosing
            </Text>
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
            LA County EMS Protocols • With Guardrails
          </Text>
          
          {/* Patient Type Toggle */}
          <TouchableOpacity
            onPress={handlePatientTypeToggle}
            style={[styles.patientToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <View style={[
              styles.toggleOption,
              patientType === 'pediatric' && { backgroundColor: colors.primary }
            ]}>
              <IconSymbol name="figure.child" size={18} color={patientType === 'pediatric' ? '#FFF' : colors.muted} />
              <Text style={[
                styles.toggleText,
                { color: patientType === 'pediatric' ? '#FFF' : colors.muted }
              ]}>Peds</Text>
            </View>
            <View style={[
              styles.toggleOption,
              patientType === 'adult' && { backgroundColor: colors.primary }
            ]}>
              <IconSymbol name="figure.stand" size={18} color={patientType === 'adult' ? '#FFF' : colors.muted} />
              <Text style={[
                styles.toggleText,
                { color: patientType === 'adult' ? '#FFF' : colors.muted }
              ]}>Adult</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Safety Inputs Section */}
        <View style={[styles.safetySection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.safetySectionTitle, { color: colors.foreground }]}>
            🛡️ Safety Checks
          </Text>
          
          {/* Age Selector (Peds only) */}
          {patientType === 'pediatric' && (
            <TouchableOpacity
              onPress={() => setShowAgeSelector(true)}
              style={[styles.safetyButton, { borderColor: colors.border }]}
            >
              <IconSymbol name="calendar" size={18} color={colors.primary} />
              <Text style={[styles.safetyButtonText, { color: colors.foreground }]}>
                {selectedAge 
                  ? AGE_CATEGORIES.find(a => a.id === selectedAge)?.label 
                  : 'Select Age (for weight check)'}
              </Text>
              <IconSymbol name="chevron.right" size={14} color={colors.muted} />
            </TouchableOpacity>
          )}
          
          {/* Conditions Button */}
          <TouchableOpacity
            onPress={() => setShowConditionsModal(true)}
            style={[styles.safetyButton, { borderColor: colors.border }]}
          >
            <IconSymbol name="heart.text.square" size={18} color={colors.primary} />
            <Text style={[styles.safetyButtonText, { color: colors.foreground }]}>
              Conditions {selectedConditions.length > 0 && `(${selectedConditions.length})`}
            </Text>
            <IconSymbol name="chevron.right" size={14} color={colors.muted} />
          </TouchableOpacity>
          
          {/* Current Medications Button */}
          <TouchableOpacity
            onPress={() => setShowMedsModal(true)}
            style={[styles.safetyButton, { borderColor: colors.border }]}
          >
            <IconSymbol name="pills" size={18} color={colors.primary} />
            <Text style={[styles.safetyButtonText, { color: colors.foreground }]}>
              Current Meds {selectedMedClasses.length > 0 && `(${selectedMedClasses.length})`}
            </Text>
            <IconSymbol name="chevron.right" size={14} color={colors.muted} />
          </TouchableOpacity>
          
          {/* Selected conditions/meds chips */}
          {(selectedConditions.length > 0 || selectedMedClasses.length > 0) && (
            <View style={styles.chipsContainer}>
              {selectedConditions.map(c => {
                const cond = getAvailableConditions().find(x => x.id === c);
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => toggleCondition(c)}
                    style={[styles.chip, { backgroundColor: `${colors.warning}20`, borderColor: colors.warning }]}
                  >
                    <Text style={[styles.chipText, { color: colors.warning }]}>{cond?.label || c}</Text>
                    <Text style={{ color: colors.warning }}> ×</Text>
                  </TouchableOpacity>
                );
              })}
              {selectedMedClasses.map(m => {
                const med = getAvailableMedicationClasses().find(x => x.id === m);
                return (
                  <TouchableOpacity
                    key={m}
                    onPress={() => toggleMedClass(m)}
                    style={[styles.chip, { backgroundColor: `${colors.primary}20`, borderColor: colors.primary }]}
                  >
                    <Text style={[styles.chipText, { color: colors.primary }]}>{med?.label || m}</Text>
                    <Text style={{ color: colors.primary }}> ×</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Weight Input Section */}
        <View style={[styles.weightSection, { backgroundColor: colors.surface }]}>
          {/* Weight Display */}
          <TouchableOpacity
            onPress={() => setShowManualInput(true)}
            style={styles.weightDisplayTouchable}
            activeOpacity={0.8}
            accessibilityLabel={`Weight: ${displayWeight} ${weightUnit}. Tap to enter manually.`}
          >
            <View style={styles.weightDisplay}>
              <Text style={[styles.weightValue, { color: colors.foreground }]}>
                {Math.round(displayWeight)}
              </Text>
              <TouchableOpacity
                onPress={toggleWeightUnit}
                style={[styles.unitToggle, { backgroundColor: `${colors.primary}20` }]}
                activeOpacity={0.7}
                accessibilityLabel={`Unit: ${weightUnit}. Tap to switch.`}
              >
                <Text style={[styles.unitText, { color: colors.primary }]}>
                  {weightUnit}
                </Text>
                <IconSymbol name="arrow.left.arrow.right" size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
            {weightCategory && (
              <View style={[styles.categoryBadge, { backgroundColor: `${colors.primary}15` }]}>
                <Text style={[styles.categoryText, { color: colors.primary }]}>
                  {weightCategory.label} ({weightCategory.typical})
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Manual Weight Input */}
          {showManualInput && (
            <View style={[styles.manualInputContainer, { borderColor: colors.border }]}>
              <TextInput
                style={[styles.manualInput, { color: colors.foreground, borderColor: colors.border }]}
                placeholder={`Enter weight in ${weightUnit}`}
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                value={manualWeightInput}
                onChangeText={setManualWeightInput}
                onSubmitEditing={handleManualWeightSubmit}
                autoFocus
                returnKeyType="done"
              />
              <TouchableOpacity
                onPress={handleManualWeightSubmit}
                style={[styles.submitButton, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.submitButtonText}>Set</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowManualInput(false)}
                style={[styles.cancelButton, { backgroundColor: colors.muted }]}
              >
                <Text style={styles.cancelButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Weight Slider */}
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={sliderMin}
              maximumValue={sliderMax}
              step={1}
              value={displayWeight}
              onValueChange={handleSliderChange}
              onSlidingComplete={handleSliderComplete}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={`${colors.muted}40`}
              thumbTintColor={colors.primary}
            />
            <View style={styles.sliderLabels}>
              <Text style={[styles.sliderLabel, { color: colors.muted }]}>{sliderMin}</Text>
              <Text style={[styles.sliderLabel, { color: colors.muted }]}>{sliderMax}</Text>
            </View>
          </View>

          {/* Quick Weight Buttons */}
          <View style={styles.quickWeights}>
            {quickWeights.map(w => (
              <TouchableOpacity
                key={w}
                onPress={() => handleQuickWeight(w)}
                style={[
                  styles.quickWeightBtn,
                  {
                    backgroundColor: Math.round(displayWeight) === w 
                      ? colors.primary 
                      : `${colors.muted}20`,
                  }
                ]}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.quickWeightText,
                  { color: Math.round(displayWeight) === w ? '#FFF' : colors.foreground }
                ]}>
                  {w}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Medication Selection */}
        <View style={styles.medsSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Select Medication
          </Text>
          <View style={styles.medsGrid}>
            {availableMedications.map(med => (
              <TouchableOpacity
                key={med.id}
                onPress={() => handleMedicationSelect(med.id)}
                style={[
                  styles.medCard,
                  {
                    backgroundColor: selectedMedId === med.id 
                      ? `${med.color}20`
                      : colors.surface,
                    borderColor: selectedMedId === med.id 
                      ? med.color 
                      : colors.border,
                    borderWidth: selectedMedId === med.id ? 2 : 1,
                  }
                ]}
                activeOpacity={0.7}
                accessibilityLabel={`${med.name}. ${med.route}.`}
                accessibilityState={{ selected: selectedMedId === med.id }}
              >
                <View style={[styles.medIconContainer, { backgroundColor: `${med.color}20` }]}>
                  <IconSymbol 
                    name={med.icon as any} 
                    size={24} 
                    color={med.color} 
                  />
                </View>
                <Text 
                  style={[styles.medName, { color: colors.foreground }]}
                  numberOfLines={2}
                >
                  {med.name}
                </Text>
                <Text style={[styles.medRoute, { color: colors.muted }]}>
                  {med.route}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* GUARDRAIL ALERTS */}
        {guardrailResult && guardrailResult.alerts.length > 0 && (
          <View style={styles.alertsSection}>
            {guardrailResult.alerts.map((alert, i) => {
              const alertStyle = ALERT_COLORS[alert.level];
              return (
                <View 
                  key={i}
                  style={[
                    styles.alertCard,
                    { 
                      backgroundColor: alertStyle.bg,
                      borderColor: alertStyle.border,
                    }
                  ]}
                >
                  <View style={styles.alertHeader}>
                    <IconSymbol 
                      name={alertStyle.icon as any} 
                      size={20} 
                      color={alertStyle.text} 
                    />
                    <Text style={[styles.alertType, { color: alertStyle.text }]}>
                      {alert.level.toUpperCase()} • {alert.type.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.alertMessage, { color: colors.foreground }]}>
                    {alert.message}
                  </Text>
                  {alert.recommendation && (
                    <Text style={[styles.alertRecommendation, { color: colors.muted }]}>
                      💡 {alert.recommendation}
                    </Text>
                  )}
                </View>
              );
            })}
            
            {/* Override Button for blocked medications */}
            {guardrailResult.requiresOverride && !overrideActive && (
              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  }
                  setOverrideActive(true);
                }}
                style={[styles.overrideButton, { backgroundColor: colors.error }]}
              >
                <IconSymbol name="exclamationmark.shield.fill" size={20} color="#FFF" />
                <Text style={styles.overrideButtonText}>
                  Clinical Override - Show Dose Anyway
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Dosing Result - THE BIG OUTPUT */}
        {selectedMedication && dosing && canAdminister && (
          <View style={[
            styles.resultSection, 
            { 
              backgroundColor: guardrailResult?.alerts.some(a => a.level === 'warning')
                ? '#F59E0B' // Amber for warnings
                : selectedMedication.color,
              ...shadows.lg 
            }
          ]}>
            {/* Primary: Volume to give */}
            <View style={styles.primaryResult}>
              <Text style={styles.giveLabel}>GIVE</Text>
              <Text style={styles.giveVolume}>
                {dosing.volumeDisplay}
              </Text>
              {guardrailResult?.adjustedDose !== dosing.dose && (
                <Text style={styles.adjustedNote}>
                  (Dose capped from {dosing.dose.toFixed(1)} to {guardrailResult?.adjustedDose.toFixed(1)})
                </Text>
              )}
            </View>

            {/* Secondary info */}
            <View style={styles.secondaryInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Dose:</Text>
                <Text style={styles.infoValue}>{dosing.doseDisplay}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Concentration:</Text>
                <Text style={styles.infoValue}>
                  {selectedMedication.id === 'dextrose-d10' 
                    ? '10% (100 mg/mL)' 
                    : selectedMedication.id === 'dextrose-adult'
                    ? '50% (500 mg/mL)'
                    : `${selectedMedication.concentration} ${selectedMedication.concentrationUnit}`}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Route:</Text>
                <Text style={styles.infoValue}>{selectedMedication.route}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Max Dose:</Text>
                <Text style={styles.infoValue}>
                  {selectedMedication.maxDose} {selectedMedication.maxDoseUnit}
                </Text>
              </View>
              {selectedMedication.repeatInfo && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Repeat:</Text>
                  <Text style={styles.infoValue}>{selectedMedication.repeatInfo}</Text>
                </View>
              )}
            </View>

            {/* Warnings from dosing calc */}
            {dosing.warnings.length > 0 && (
              <View style={styles.warningsContainer}>
                {dosing.warnings.map((warning, i) => (
                  <View key={i} style={styles.warningRow}>
                    <IconSymbol name="exclamationmark.triangle.fill" size={16} color="#FFF" />
                    <Text style={styles.warningText}>{warning}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* LA County Notes */}
            {selectedMedication.laCountyNotes && (
              <View style={styles.laCountyNotesContainer}>
                <View style={styles.laCountyBadge}>
                  <Text style={styles.laCountyBadgeText}>LA COUNTY</Text>
                </View>
                <Text style={styles.laCountyNotesText}>
                  {selectedMedication.laCountyNotes}
                </Text>
              </View>
            )}

            {/* Generic Notes */}
            {selectedMedication.notes && !selectedMedication.laCountyNotes && (
              <View style={styles.notesContainer}>
                <IconSymbol name="info.circle.fill" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.notesText}>{selectedMedication.notes}</Text>
              </View>
            )}
          </View>
        )}

        {/* Blocked medication state */}
        {selectedMedication && dosing && !canAdminister && (
          <View style={[styles.blockedResult, { backgroundColor: '#DC262620', borderColor: '#DC2626' }]}>
            <IconSymbol name="xmark.octagon.fill" size={64} color="#DC2626" />
            <Text style={[styles.blockedTitle, { color: '#DC2626' }]}>
              ⛔ ADMINISTRATION BLOCKED
            </Text>
            <Text style={[styles.blockedText, { color: colors.foreground }]}>
              Critical safety alert triggered.
              {'\n'}Review alerts above or use clinical override.
            </Text>
          </View>
        )}

        {/* No medication selected state */}
        {!selectedMedication && (
          <View style={[styles.emptyResult, { backgroundColor: colors.surface }]}>
            <IconSymbol name="arrow.up.circle.fill" size={48} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Select a medication above
            </Text>
          </View>
        )}

        {/* Disclaimer */}
        <View style={[styles.disclaimer, { backgroundColor: `${colors.warning}15` }]}>
          <IconSymbol name="exclamationmark.triangle.fill" size={20} color={colors.warning} />
          <View style={styles.disclaimerContent}>
            <Text style={[styles.disclaimerTitle, { color: colors.foreground }]}>
              Clinical Reference Only
            </Text>
            <Text style={[styles.disclaimerText, { color: colors.muted }]}>
              Always verify doses with your local protocols and base hospital.
              This calculator does not replace clinical judgment.
            </Text>
          </View>
        </View>

        {/* Bottom padding for scroll */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Age Selector Modal */}
      <Modal
        visible={showAgeSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAgeSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Patient Age</Text>
              <TouchableOpacity onPress={() => setShowAgeSelector(false)}>
                <IconSymbol name="xmark.circle.fill" size={28} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {AGE_CATEGORIES.filter(a => a.id !== 'adult').map(age => (
                <TouchableOpacity
                  key={age.id}
                  onPress={() => handleAgeSelect(age.id as AgeCategory)}
                  style={[
                    styles.modalOption,
                    { 
                      backgroundColor: selectedAge === age.id ? `${colors.primary}20` : colors.surface,
                      borderColor: selectedAge === age.id ? colors.primary : colors.border,
                    }
                  ]}
                >
                  <Text style={[styles.modalOptionTitle, { color: colors.foreground }]}>{age.label}</Text>
                  <Text style={[styles.modalOptionSubtitle, { color: colors.muted }]}>{age.ageRange}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Conditions Modal */}
      <Modal
        visible={showConditionsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConditionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Patient Conditions</Text>
              <TouchableOpacity onPress={() => setShowConditionsModal(false)}>
                <IconSymbol name="xmark.circle.fill" size={28} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
              Select any conditions that apply for contraindication checking
            </Text>
            <ScrollView style={styles.modalScroll}>
              {getAvailableConditions().map(condition => (
                <TouchableOpacity
                  key={condition.id}
                  onPress={() => toggleCondition(condition.id)}
                  style={[
                    styles.modalOption,
                    { 
                      backgroundColor: selectedConditions.includes(condition.id) 
                        ? `${colors.warning}20` 
                        : colors.surface,
                      borderColor: selectedConditions.includes(condition.id) 
                        ? colors.warning 
                        : colors.border,
                    }
                  ]}
                >
                  <View style={styles.modalOptionRow}>
                    <IconSymbol 
                      name={selectedConditions.includes(condition.id) ? 'checkmark.circle.fill' : 'circle'} 
                      size={22} 
                      color={selectedConditions.includes(condition.id) ? colors.warning : colors.muted} 
                    />
                    <View style={styles.modalOptionText}>
                      <Text style={[styles.modalOptionTitle, { color: colors.foreground }]}>
                        {condition.label}
                      </Text>
                      <Text style={[styles.modalOptionSubtitle, { color: colors.muted }]}>
                        {condition.category}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setShowConditionsModal(false)}
              style={[styles.modalDoneButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.modalDoneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Current Medications Modal */}
      <Modal
        visible={showMedsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMedsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Current Medications</Text>
              <TouchableOpacity onPress={() => setShowMedsModal(false)}>
                <IconSymbol name="xmark.circle.fill" size={28} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
              Select medication classes patient is currently taking
            </Text>
            <ScrollView style={styles.modalScroll}>
              {getAvailableMedicationClasses().map(medClass => (
                <TouchableOpacity
                  key={medClass.id}
                  onPress={() => toggleMedClass(medClass.id)}
                  style={[
                    styles.modalOption,
                    { 
                      backgroundColor: selectedMedClasses.includes(medClass.id) 
                        ? `${colors.primary}20` 
                        : colors.surface,
                      borderColor: selectedMedClasses.includes(medClass.id) 
                        ? colors.primary 
                        : colors.border,
                    }
                  ]}
                >
                  <View style={styles.modalOptionRow}>
                    <IconSymbol 
                      name={selectedMedClasses.includes(medClass.id) ? 'checkmark.circle.fill' : 'circle'} 
                      size={22} 
                      color={selectedMedClasses.includes(medClass.id) ? colors.primary : colors.muted} 
                    />
                    <View style={styles.modalOptionText}>
                      <Text style={[styles.modalOptionTitle, { color: colors.foreground }]}>
                        {medClass.label}
                      </Text>
                      <Text style={[styles.modalOptionSubtitle, { color: colors.muted }]}>
                        e.g., {medClass.examples}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setShowMedsModal(false)}
              style={[styles.modalDoneButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.modalDoneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
  },
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  headerSubtitle: {
    fontSize: 14,
    marginLeft: 40,
  },
  patientToggle: {
    flexDirection: 'row',
    marginTop: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 4,
    alignSelf: 'flex-start',
  },
  toggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    gap: spacing.xs,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Safety Section
  safetySection: {
    borderRadius: radii.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  safetySectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  safetyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  safetyButtonText: {
    flex: 1,
    fontSize: 14,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Weight Section
  weightSection: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  weightDisplayTouchable: {
    marginBottom: spacing.md,
  },
  weightDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  weightValue: {
    fontSize: 64,
    fontWeight: '700',
    letterSpacing: -2,
  },
  unitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    marginLeft: spacing.sm,
  },
  unitText: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: spacing.xs,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
  },
  manualInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  manualInput: {
    flex: 1,
    height: touchTargets.standard,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    fontSize: 18,
  },
  submitButton: {
    height: touchTargets.standard,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    width: touchTargets.standard,
    height: touchTargets.standard,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  sliderContainer: {
    marginBottom: spacing.md,
  },
  slider: {
    width: '100%',
    height: touchTargets.standard,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  sliderLabel: {
    fontSize: 12,
  },
  quickWeights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickWeightBtn: {
    minWidth: touchTargets.minimum,
    height: touchTargets.minimum,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickWeightText: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Medication Selection
  medsSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  medsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  medCard: {
    width: '48%',
    padding: spacing.md,
    borderRadius: radii.lg,
    alignItems: 'center',
  },
  medIconContainer: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  medName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  medRoute: {
    fontSize: 12,
    textAlign: 'center',
  },

  // Alerts Section
  alertsSection: {
    marginBottom: spacing.lg,
  },
  alertCard: {
    borderRadius: radii.lg,
    borderWidth: 2,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  alertType: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  alertMessage: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  alertRecommendation: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  overrideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: radii.lg,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  overrideButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  
  // Result Section - THE BIG OUTPUT
  resultSection: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  primaryResult: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  giveLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  giveVolume: {
    fontSize: 72,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -2,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  adjustedNote: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.xs,
  },
  secondaryInfo: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  warningsContainer: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  laCountyNotesContainer: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  laCountyBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  laCountyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  laCountyNotesText: {
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  notesText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
    lineHeight: 18,
  },
  
  // Blocked state
  blockedResult: {
    borderRadius: radii.xl,
    borderWidth: 3,
    padding: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  blockedTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  blockedText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Empty state
  emptyResult: {
    borderRadius: radii.xl,
    padding: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyText: {
    fontSize: 16,
    marginTop: spacing.md,
  },
  
  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: radii.lg,
    marginBottom: spacing.lg,
  },
  disclaimerContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 18,
  },
  
  bottomPadding: {
    height: spacing['3xl'],
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: spacing.md,
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalOption: {
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  modalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalOptionText: {
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOptionSubtitle: {
    fontSize: 13,
  },
  modalDoneButton: {
    padding: spacing.md,
    borderRadius: radii.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  modalDoneButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
