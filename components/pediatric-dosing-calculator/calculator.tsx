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
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerRow}>
            <View style={{
              width: 36,
              height: 36,
              borderRadius: radii.lg,
              backgroundColor: `${colors.primary}20`,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <IconSymbol name="figure.child" size={22} color={colors.primary} />
            </View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Peds Dosing
            </Text>
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.primary }]}>
            LA County EMS
          </Text>
        </View>

        {/* Weight Input Section */}
        <View style={[styles.weightSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
          <View style={[styles.emptyResult, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="arrow.up.circle.fill" size={56} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Select a medication above
            </Text>
            <Text style={{ color: colors.muted, fontSize: 14, marginTop: spacing.sm, opacity: 0.7 }}>
              Dose will calculate automatically
            </Text>
          </View>
        )}

        {/* Disclaimer */}
        <View style={[styles.disclaimer, { backgroundColor: `${colors.warning}12`, borderLeftColor: colors.warning }]}>
          <IconSymbol name="exclamationmark.triangle.fill" size={22} color={colors.warning} />
          <View style={styles.disclaimerContent}>
            <Text style={[styles.disclaimerTitle, { color: colors.foreground }]}>
              Clinical Reference Only
            </Text>
            <Text style={[styles.disclaimerText, { color: colors.muted }]}>
              Always verify with your local protocols and base hospital. Does not replace clinical judgment.
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  header: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginLeft: spacing.md,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 46,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  
  // Weight Section - Medical-grade card design
  weightSection: {
    borderRadius: radii['2xl'],
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    ...shadows.lg,
  },
  weightDisplayTouchable: {
    marginBottom: spacing.lg,
  },
  weightDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  weightValue: {
    fontSize: 72,
    fontWeight: '800',
    letterSpacing: -3,
    fontVariant: ['tabular-nums'],
  },
  unitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    marginLeft: spacing.md,
    minHeight: touchTargets.standard,
  },
  unitText: {
    fontSize: 20,
    fontWeight: '700',
    marginRight: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  manualInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  manualInput: {
    flex: 1,
    height: touchTargets.large,
    borderWidth: 2,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    fontSize: 20,
    fontWeight: '600',
  },
  submitButton: {
    height: touchTargets.large,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cancelButton: {
    width: touchTargets.large,
    height: touchTargets.large,
    borderRadius: radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  sliderContainer: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  slider: {
    width: '100%',
    height: touchTargets.large,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  sliderLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  quickWeights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'center',
  },
  quickWeightBtn: {
    minWidth: touchTargets.standard,
    height: touchTargets.standard,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickWeightText: {
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  
  // Medication Selection - Professional grid
  medsSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  medsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  medCard: {
    width: '47%',
    padding: spacing.lg,
    borderRadius: radii.xl,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
  },
  medIconContainer: {
    width: 56,
    height: 56,
    borderRadius: radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  medName: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
    letterSpacing: -0.2,
  },
  medRoute: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  
  // Result Section - THE BIG OUTPUT (medical-grade prominence)
  resultSection: {
    borderRadius: radii['2xl'],
    padding: spacing['2xl'],
    marginBottom: spacing.xl,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  primaryResult: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingBottom: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  giveLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 4,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  giveVolume: {
    fontSize: 84,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -3,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
    fontVariant: ['tabular-nums'],
  },
  secondaryInfo: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  infoLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  warningsContainer: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: '#FBBF24',
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  warningText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    lineHeight: 22,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  notesText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
  },
  
  // Empty state - more inviting
  emptyResult: {
    borderRadius: radii['2xl'],
    padding: spacing['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 17,
    marginTop: spacing.lg,
    fontWeight: '600',
  },
  
  // Disclaimer - professional warning style
  disclaimer: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderRadius: radii.xl,
    marginBottom: spacing.xl,
    borderLeftWidth: 4,
  },
  disclaimerContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing.xs,
    letterSpacing: 0.2,
  },
  disclaimerText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  
  bottomPadding: {
    height: spacing['4xl'],
  },
});
