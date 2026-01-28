/**
 * Pediatric Dosing Calculator
 * 
 * LA County EMS-specific pediatric medication dosing calculator.
 * Designed for one-hand operation in the field.
 * 
 * Key Features:
 * - BIG "Give X.X mL" output text
 * - Weight input with kg/lbs toggle
 * - LA County priority medications
 * - Dark mode optimized
 * - Offline capable (no API calls)
 * - Touch-friendly 48px+ targets
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
} from 'react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/use-colors';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { touchTargets, radii, spacing, shadows } from '@/lib/design-tokens';
import { PEDIATRIC_MEDICATIONS } from './medications';
import type { PediatricMedication, PediatricDosingResult, WeightUnit } from './types';
import { getWeightCategory } from './types';

interface PediatricDosingCalculatorProps {
  /** Optional initial weight in kg */
  initialWeightKg?: number;
  /** Optional pre-selected medication ID */
  initialMedicationId?: string;
}

/**
 * Calculate the dose and volume for a pediatric medication
 */
function calculateDose(
  medication: PediatricMedication,
  weightKg: number
): PediatricDosingResult {
  const warnings: string[] = [];
  
  // Calculate raw dose
  let dose = medication.dosePerKg * weightKg;
  let maxDoseReached = false;
  let belowMinDose = false;
  
  // Check max dose
  if (dose > medication.maxDose) {
    dose = medication.maxDose;
    maxDoseReached = true;
    warnings.push(`Max dose: ${medication.maxDose} ${medication.maxDoseUnit}`);
  }
  
  // Check min dose
  if (medication.minDose && dose < medication.minDose) {
    belowMinDose = true;
    warnings.push(`Consider minimum dose: ${medication.minDose} ${medication.doseUnit}`);
  }
  
  // Calculate volume in mL
  // For D10, dose is already in mL
  let volumeMl: number;
  if (medication.id === 'dextrose-d10') {
    volumeMl = dose; // Already in mL
  } else {
    volumeMl = dose / medication.concentration;
  }
  
  // Format displays
  const doseDisplay = medication.id === 'dextrose-d10'
    ? `${dose.toFixed(1)} mL` // D10 dose is already mL
    : dose >= 1
      ? `${dose.toFixed(1)} ${medication.doseUnit}`
      : `${dose.toFixed(2)} ${medication.doseUnit}`;
  
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

export function PediatricDosingCalculator({
  initialWeightKg = 10,
  initialMedicationId,
}: PediatricDosingCalculatorProps) {
  const colors = useColors();
  
  // State
  const [weightKg, setWeightKg] = useState(initialWeightKg);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [selectedMedId, setSelectedMedId] = useState<string | null>(
    initialMedicationId ?? null
  );
  const [manualWeightInput, setManualWeightInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  
  // Computed values
  const displayWeight = weightUnit === 'kg' ? weightKg : Math.round(weightKg * 2.205);
  const sliderMin = weightUnit === 'kg' ? 1 : 2;
  const sliderMax = weightUnit === 'kg' ? 50 : 110;
  
  const weightCategory = useMemo(() => getWeightCategory(weightKg), [weightKg]);
  
  const selectedMedication = useMemo(
    () => PEDIATRIC_MEDICATIONS.find(m => m.id === selectedMedId),
    [selectedMedId]
  );
  
  const dosing = useMemo(() => {
    if (!selectedMedication) return null;
    return calculateDose(selectedMedication, weightKg);
  }, [selectedMedication, weightKg]);
  
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
  
  const handleMedicationSelect = useCallback((medId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSelectedMedId(medId);
  }, []);
  
  const handleManualWeightSubmit = useCallback(() => {
    const value = parseFloat(manualWeightInput);
    if (!isNaN(value) && value > 0) {
      const newWeightKg = weightUnit === 'kg' ? value : value / 2.205;
      setWeightKg(Math.min(Math.max(newWeightKg, 1), 50));
      setShowManualInput(false);
      setManualWeightInput('');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  }, [manualWeightInput, weightUnit]);
  
  const handleQuickWeight = useCallback((weight: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const newWeightKg = weightUnit === 'kg' ? weight : weight / 2.205;
    setWeightKg(newWeightKg);
  }, [weightUnit]);

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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <IconSymbol name="figure.child" size={28} color={colors.primary} />
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Pediatric Dosing
            </Text>
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
            LA County EMS Protocols
          </Text>
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
            {(weightUnit === 'kg' ? [3, 5, 10, 15, 20, 30] : [7, 11, 22, 33, 44, 66]).map(w => (
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
            {PEDIATRIC_MEDICATIONS.map(med => (
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

        {/* Dosing Result - THE BIG OUTPUT */}
        {selectedMedication && dosing && (
          <View style={[
            styles.resultSection, 
            { 
              backgroundColor: selectedMedication.color,
              ...shadows.lg 
            }
          ]}>
            {/* Primary: Volume to give */}
            <View style={styles.primaryResult}>
              <Text style={styles.giveLabel}>GIVE</Text>
              <Text style={styles.giveVolume}>
                {dosing.volumeDisplay}
              </Text>
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
            </View>

            {/* Warnings */}
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

            {/* Notes */}
            {selectedMedication.notes && (
              <View style={styles.notesContainer}>
                <IconSymbol name="info.circle.fill" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.notesText}>{selectedMedication.notes}</Text>
              </View>
            )}
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
    marginLeft: 40, // Align with title
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
});
