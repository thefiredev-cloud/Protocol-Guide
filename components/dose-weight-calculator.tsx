/**
 * Dose/Weight Calculator Component
 *
 * Interactive medication dosing calculator for EMS professionals.
 * Features:
 * - Native slider for patient weight input (iOS/Android optimized)
 * - Real-time dose calculations for common EMS medications
 * - Haptic feedback on slider changes
 * - Dark mode support for low-light environments
 * - Accessible touch targets (48px minimum)
 * - Unit conversions (kg/lbs)
 */

import * as React from "react";
import { useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StyleSheet,
  useWindowDimensions,
  Animated,
} from "react-native";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { touchTargets, radii, spacing, shadows } from "@/lib/design-tokens";
import {
  type WeightUnit,
  type MedicationCategory,
  type Medication,
  MEDICATIONS,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  CATEGORY_COLORS,
} from "./dose-calculator";

interface DoseWeightCalculatorProps {
  /** Initial weight in kg */
  initialWeight?: number;
  /** Category filter */
  categoryFilter?: MedicationCategory;
  /** Callback when weight changes */
  onWeightChange?: (weight: number) => void;
  /** Compact mode for embedding in protocol views */
  compact?: boolean;
}

export function DoseWeightCalculator({
  initialWeight = 70,
  categoryFilter,
  onWeightChange,
  compact = false,
}: DoseWeightCalculatorProps) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // State
  const [weight, setWeight] = useState(initialWeight);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [selectedCategory, setSelectedCategory] = useState<MedicationCategory | null>(
    categoryFilter || null
  );
  const [expandedMed, setExpandedMed] = useState<string | null>(null);

  // Refs for haptic throttling
  const lastHapticRef = useRef<number>(0);

  // Convert weight between units
  const weightInKg = weightUnit === "kg" ? weight : weight / 2.205;
  const displayWeight = weight;
  const displayUnit = weightUnit;

  // Calculate slider bounds based on unit
  const sliderMin = weightUnit === "kg" ? 1 : 2;
  const sliderMax = weightUnit === "kg" ? 150 : 330;

  // Handle weight change with haptic feedback
  const handleWeightChange = useCallback(
    (newValue: number) => {
      const roundedValue = Math.round(newValue);
      setWeight(roundedValue);

      // Throttle haptic feedback to every 50ms
      const now = Date.now();
      if (Platform.OS !== "web" && now - lastHapticRef.current > 50) {
        lastHapticRef.current = now;
        Haptics.selectionAsync();
      }

      onWeightChange?.(weightUnit === "kg" ? roundedValue : roundedValue / 2.205);
    },
    [weightUnit, onWeightChange]
  );

  // Haptic feedback on slider start/end
  const handleSlidingStart = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const handleSlidingComplete = useCallback(
    (value: number) => {
      const roundedValue = Math.round(value);
      setWeight(roundedValue);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      onWeightChange?.(weightUnit === "kg" ? roundedValue : roundedValue / 2.205);
    },
    [weightUnit, onWeightChange]
  );

  // Toggle weight unit
  const toggleWeightUnit = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setWeightUnit((prev) => {
      const newUnit = prev === "kg" ? "lbs" : "kg";
      // Convert current weight to new unit
      if (prev === "kg") {
        setWeight(Math.round(weight * 2.205));
      } else {
        setWeight(Math.round(weight / 2.205));
      }
      return newUnit;
    });
  }, [weight]);

  // Filter medications by category
  const filteredMedications = useMemo(() => {
    if (!selectedCategory) return MEDICATIONS;
    return MEDICATIONS.filter((med) => med.category === selectedCategory);
  }, [selectedCategory]);

  // Group medications by category for display
  const groupedMedications = useMemo(() => {
    const groups: Record<MedicationCategory, Medication[]> = {
      cardiac: [],
      respiratory: [],
      analgesia: [],
      pediatric: [],
      overdose: [],
    };

    filteredMedications.forEach((med) => {
      groups[med.category].push(med);
    });

    return groups;
  }, [filteredMedications]);

  // Calculate dose for a medication
  const calculateDose = useCallback(
    (med: Medication): { dose: number; displayDose: string; warning?: string } => {
      let dose = med.dosePerKg * weightInKg;
      let warning: string | undefined;

      // Apply min/max constraints
      if (med.maxDose && dose > med.maxDose) {
        dose = med.maxDose;
        warning = `Max dose reached (${med.maxDose} ${med.unit})`;
      } else if (med.minDose && dose < med.minDose) {
        warning = `Below minimum dose (${med.minDose} ${med.unit})`;
      }

      // Format display dose
      let displayDose: string;
      if (dose >= 1) {
        displayDose = `${dose.toFixed(1)} ${med.unit}`;
      } else if (dose >= 0.01) {
        displayDose = `${dose.toFixed(2)} ${med.unit}`;
      } else {
        displayDose = `${(dose * 1000).toFixed(1)} mcg`;
      }

      return { dose, displayDose, warning };
    },
    [weightInKg]
  );

  // Determine patient type for guidance
  const patientType = useMemo(() => {
    if (weightInKg < 3) return "Neonate";
    if (weightInKg < 10) return "Infant";
    if (weightInKg < 25) return "Child";
    if (weightInKg < 40) return "Adolescent";
    return "Adult";
  }, [weightInKg]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      {!compact && (
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <IconSymbol name="scalemass.fill" size={24} color={colors.primary} />
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Dose Calculator
            </Text>
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
            Enter patient weight to calculate medication doses
          </Text>
        </View>
      )}

      {/* Weight Input Section */}
      <View style={[styles.weightSection, { backgroundColor: colors.surface }]}>
        {/* Weight Display */}
        <View style={styles.weightDisplay}>
          <View style={styles.weightValueContainer}>
            <Text style={[styles.weightValue, { color: colors.foreground }]}>
              {displayWeight}
            </Text>
            <TouchableOpacity
              onPress={toggleWeightUnit}
              style={[styles.unitToggle, { backgroundColor: `${colors.primary}15` }]}
              activeOpacity={0.7}
              accessibilityLabel={`Weight unit: ${displayUnit}. Tap to switch.`}
              accessibilityRole="button"
            >
              <Text style={[styles.unitText, { color: colors.primary }]}>{displayUnit}</Text>
              <IconSymbol name="arrow.left.arrow.right" size={12} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={[styles.patientTypeBadge, { backgroundColor: `${colors.primary}10` }]}>
            <Text style={[styles.patientTypeText, { color: colors.primary }]}>
              {patientType}
            </Text>
          </View>
        </View>

        {/* Native Slider */}
        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            minimumValue={sliderMin}
            maximumValue={sliderMax}
            step={1}
            value={weight}
            onValueChange={handleWeightChange}
            onSlidingStart={handleSlidingStart}
            onSlidingComplete={handleSlidingComplete}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={`${colors.muted}40`}
            thumbTintColor={colors.primary}
            accessibilityLabel={`Patient weight: ${displayWeight} ${displayUnit}`}
            accessibilityValue={{
              min: sliderMin,
              max: sliderMax,
              now: weight,
              text: `${displayWeight} ${displayUnit}`,
            }}
          />
          {/* Scale Labels */}
          <View style={styles.scaleLabels}>
            <Text style={[styles.scaleLabel, { color: colors.muted }]}>{sliderMin}</Text>
            <Text style={[styles.scaleLabel, { color: colors.muted }]}>
              {Math.round(sliderMax / 2)}
            </Text>
            <Text style={[styles.scaleLabel, { color: colors.muted }]}>{sliderMax}</Text>
          </View>
        </View>

        {/* Quick Weight Buttons */}
        <View style={styles.quickWeights}>
          {(weightUnit === "kg" ? [3, 10, 25, 50, 70, 100] : [7, 22, 55, 110, 154, 220]).map(
            (quickWeight) => (
              <TouchableOpacity
                key={quickWeight}
                onPress={() => {
                  setWeight(quickWeight);
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                style={[
                  styles.quickWeightButton,
                  {
                    backgroundColor:
                      weight === quickWeight ? colors.primary : `${colors.muted}15`,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.quickWeightText,
                    { color: weight === quickWeight ? "#FFFFFF" : colors.foreground },
                  ]}
                >
                  {quickWeight}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        <TouchableOpacity
          onPress={() => {
            setSelectedCategory(null);
            if (Platform.OS !== "web") {
              Haptics.selectionAsync();
            }
          }}
          style={[
            styles.categoryButton,
            {
              backgroundColor: !selectedCategory ? colors.primary : colors.surface,
              borderColor: !selectedCategory ? colors.primary : colors.border,
            },
          ]}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.categoryButtonText,
              { color: !selectedCategory ? "#FFFFFF" : colors.foreground },
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {(Object.keys(CATEGORY_LABELS) as MedicationCategory[]).map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => {
              setSelectedCategory(cat);
              if (Platform.OS !== "web") {
                Haptics.selectionAsync();
              }
            }}
            style={[
              styles.categoryButton,
              {
                backgroundColor:
                  selectedCategory === cat ? CATEGORY_COLORS[cat] : colors.surface,
                borderColor: selectedCategory === cat ? CATEGORY_COLORS[cat] : colors.border,
              },
            ]}
            activeOpacity={0.7}
          >
            <IconSymbol
              name={CATEGORY_ICONS[cat] as any}
              size={14}
              color={selectedCategory === cat ? "#FFFFFF" : CATEGORY_COLORS[cat]}
            />
            <Text
              style={[
                styles.categoryButtonText,
                { color: selectedCategory === cat ? "#FFFFFF" : colors.foreground },
              ]}
            >
              {CATEGORY_LABELS[cat]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Medications List */}
      <ScrollView
        style={styles.medicationsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.medicationsContent}
      >
        {(Object.entries(groupedMedications) as [MedicationCategory, Medication[]][])
          .filter(([_, meds]) => meds.length > 0)
          .map(([category, meds]) => (
            <View key={category} style={styles.categoryGroup}>
              {!selectedCategory && (
                <View style={styles.categoryHeader}>
                  <IconSymbol
                    name={CATEGORY_ICONS[category] as any}
                    size={16}
                    color={CATEGORY_COLORS[category]}
                  />
                  <Text style={[styles.categoryTitle, { color: colors.foreground }]}>
                    {CATEGORY_LABELS[category]}
                  </Text>
                </View>
              )}
              {meds.map((med) => {
                const { displayDose, warning } = calculateDose(med);
                const isExpanded = expandedMed === med.id;

                return (
                  <TouchableOpacity
                    key={med.id}
                    onPress={() => {
                      setExpandedMed(isExpanded ? null : med.id);
                      if (Platform.OS !== "web") {
                        Haptics.selectionAsync();
                      }
                    }}
                    style={[
                      styles.medicationCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: warning ? colors.warning : colors.border,
                        borderLeftColor: CATEGORY_COLORS[med.category],
                      },
                    ]}
                    activeOpacity={0.7}
                    accessibilityLabel={`${med.name}: ${displayDose}`}
                    accessibilityHint="Tap for more details"
                  >
                    <View style={styles.medicationMain}>
                      <View style={styles.medicationInfo}>
                        <Text style={[styles.medicationName, { color: colors.foreground }]}>
                          {med.name}
                        </Text>
                        <Text style={[styles.medicationRoute, { color: colors.muted }]}>
                          {med.route}
                        </Text>
                      </View>
                      <View style={styles.doseContainer}>
                        <Text style={[styles.doseValue, { color: colors.primary }]}>
                          {displayDose}
                        </Text>
                        {warning && (
                          <IconSymbol
                            name="exclamationmark.triangle.fill"
                            size={14}
                            color={colors.warning}
                          />
                        )}
                      </View>
                    </View>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <View style={[styles.expandedDetails, { borderTopColor: colors.border }]}>
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: colors.muted }]}>
                            Dose Formula:
                          </Text>
                          <Text style={[styles.detailValue, { color: colors.foreground }]}>
                            {med.dosePerKg} {med.unit}/kg
                          </Text>
                        </View>
                        {med.maxDose && (
                          <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: colors.muted }]}>
                              Max Dose:
                            </Text>
                            <Text style={[styles.detailValue, { color: colors.foreground }]}>
                              {med.maxDose} {med.unit}
                            </Text>
                          </View>
                        )}
                        {med.concentration && (
                          <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: colors.muted }]}>
                              Concentration:
                            </Text>
                            <Text style={[styles.detailValue, { color: colors.foreground }]}>
                              {med.concentration}
                            </Text>
                          </View>
                        )}
                        {med.notes && (
                          <View style={styles.notesContainer}>
                            <IconSymbol name="info.circle.fill" size={14} color={colors.primary} />
                            <Text style={[styles.notesText, { color: colors.muted }]}>
                              {med.notes}
                            </Text>
                          </View>
                        )}
                        {warning && (
                          <View
                            style={[
                              styles.warningContainer,
                              { backgroundColor: `${colors.warning}15` },
                            ]}
                          >
                            <IconSymbol
                              name="exclamationmark.triangle.fill"
                              size={14}
                              color={colors.warning}
                            />
                            <Text style={[styles.warningText, { color: colors.warning }]}>
                              {warning}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

        {/* Disclaimer */}
        <View style={[styles.disclaimer, { backgroundColor: `${colors.warning}10` }]}>
          <IconSymbol name="exclamationmark.triangle.fill" size={18} color={colors.warning} />
          <View style={styles.disclaimerContent}>
            <Text style={[styles.disclaimerTitle, { color: colors.foreground }]}>
              Clinical Reference Only
            </Text>
            <Text style={[styles.disclaimerText, { color: colors.muted }]}>
              Always verify doses with your local protocols and medical director. This calculator
              is for reference only and should not replace clinical judgment.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginLeft: spacing.sm,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: spacing.xs,
  },
  weightSection: {
    margin: spacing.base,
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  weightDisplay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  weightValueContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  weightValue: {
    fontSize: 48,
    fontWeight: "700",
    letterSpacing: -1,
  },
  unitToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
    marginLeft: spacing.sm,
  },
  unitText: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: spacing.xs,
  },
  patientTypeBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
  },
  patientTypeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  sliderContainer: {
    marginBottom: spacing.md,
  },
  slider: {
    width: "100%",
    height: touchTargets.standard,
  },
  scaleLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
    marginTop: -spacing.xs,
  },
  scaleLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  quickWeights: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  quickWeightButton: {
    minWidth: touchTargets.minimum,
    height: touchTargets.minimum,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    justifyContent: "center",
    alignItems: "center",
  },
  quickWeightText: {
    fontSize: 14,
    fontWeight: "600",
  },
  categoryScroll: {
    maxHeight: 48,
    marginBottom: spacing.sm,
  },
  categoryContainer: {
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  categoryButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  medicationsList: {
    flex: 1,
  },
  medicationsContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing["2xl"],
  },
  categoryGroup: {
    marginBottom: spacing.lg,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    paddingLeft: spacing.xs,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginLeft: spacing.sm,
  },
  medicationCard: {
    borderRadius: radii.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderLeftWidth: 4,
    overflow: "hidden",
  },
  medicationMain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.base,
  },
  medicationInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  medicationName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  medicationRoute: {
    fontSize: 12,
  },
  doseContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  doseValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  expandedDetails: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "500",
  },
  notesContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: spacing.sm,
  },
  notesText: {
    fontSize: 12,
    marginLeft: spacing.xs,
    flex: 1,
    lineHeight: 18,
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
  },
  warningText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: spacing.xs,
    flex: 1,
  },
  disclaimer: {
    flexDirection: "row",
    padding: spacing.base,
    borderRadius: radii.lg,
    marginTop: spacing.md,
  },
  disclaimerContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  disclaimerTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 18,
  },
});

export default DoseWeightCalculator;
