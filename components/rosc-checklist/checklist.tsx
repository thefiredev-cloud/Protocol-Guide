/**
 * Post-ROSC Bundle Checklist Component
 * 
 * Real-time checklist for post-cardiac arrest care based on:
 * - 2025 AHA ACLS Guidelines
 * - LA County 1210 Protocol
 * 
 * Features:
 * - Timer since ROSC
 * - Tap-to-complete checklist items
 * - Visual vital sign status indicators (green/yellow/red)
 * - Offline capable (no API calls)
 * - Touch-friendly for gloved use
 */

import * as React from 'react';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StyleSheet,
  TextInput,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/use-colors';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { touchTargets, radii, spacing, shadows } from '@/lib/design-tokens';
import { ROSC_CHECKLIST_ITEMS, VITAL_TARGETS } from './data';
import {
  type ChecklistItem,
  type VitalStatus,
  type ChecklistItemCategory,
  CATEGORY_META,
  getCategoryMeta,
  getVitalStatus,
  formatElapsedTime,
} from './types';

interface RoscChecklistProps {
  /** Initial ROSC time (for resuming) */
  initialRoscTime?: number;
}

// Status colors
const STATUS_COLORS: Record<VitalStatus, string> = {
  normal: '#22C55E',
  caution: '#FBBF24',
  critical: '#EF4444',
  unknown: '#6B7280',
};

/**
 * Timer component that updates every second
 */
function RoscTimer({ 
  roscTime, 
  onStart, 
  onReset,
  colors,
}: { 
  roscTime: number | null; 
  onStart: () => void; 
  onReset: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [elapsed, setElapsed] = useState('00:00');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    if (!roscTime) return;
    
    const updateTimer = () => {
      setElapsed(formatElapsedTime(roscTime));
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    // Pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    
    return () => {
      clearInterval(interval);
      pulse.stop();
    };
  }, [roscTime, pulseAnim]);
  
  if (!roscTime) {
    return (
      <TouchableOpacity
        onPress={onStart}
        style={[styles.timerButton, { backgroundColor: '#22C55E' }]}
        activeOpacity={0.8}
        accessibilityLabel="Start ROSC timer"
        accessibilityRole="button"
      >
        <IconSymbol name="clock.fill" size={28} color="#FFF" />
        <Text style={styles.timerButtonText}>START ROSC TIMER</Text>
      </TouchableOpacity>
    );
  }
  
  return (
    <View style={styles.timerContainer}>
      <Animated.View 
        style={[
          styles.timerDisplay,
          { backgroundColor: colors.surface, transform: [{ scale: pulseAnim }] }
        ]}
      >
        <Text style={[styles.timerLabel, { color: colors.muted }]}>TIME SINCE ROSC</Text>
        <Text style={[styles.timerValue, { color: colors.foreground }]}>{elapsed}</Text>
        <View style={styles.timerPulse}>
          <View style={[styles.pulseDot, { backgroundColor: '#22C55E' }]} />
        </View>
      </Animated.View>
      <TouchableOpacity
        onPress={onReset}
        style={[styles.resetButton, { backgroundColor: `${colors.error}20` }]}
        activeOpacity={0.7}
        accessibilityLabel="Reset timer"
      >
        <IconSymbol name="xmark" size={16} color={colors.error} />
        <Text style={[styles.resetText, { color: colors.error }]}>Reset</Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Vital sign input with status indicator
 */
function VitalInput({
  vitalKey,
  value,
  onChange,
  colors,
}: {
  vitalKey: string;
  value: number | null;
  onChange: (value: number | null) => void;
  colors: ReturnType<typeof useColors>;
}) {
  // Define hooks before any conditional returns (React hooks rules)
  const handleChange = useCallback((text: string) => {
    if (text === '') {
      onChange(null);
      return;
    }
    const num = parseFloat(text);
    if (!isNaN(num)) {
      onChange(num);
    }
  }, [onChange]);

  const target = VITAL_TARGETS[vitalKey];
  if (!target) return null;
  
  const status = getVitalStatus(value, target);
  const statusColor = STATUS_COLORS[status];
  
  return (
    <View style={[styles.vitalInputContainer, { borderColor: statusColor }]}>
      <View style={styles.vitalInputHeader}>
        <Text style={[styles.vitalAbbrev, { color: colors.foreground }]}>
          {target.abbrev}
        </Text>
        <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
      </View>
      <TextInput
        style={[styles.vitalInput, { color: colors.foreground, borderColor: colors.border }]}
        placeholder={`${target.normalMin}-${target.normalMax}`}
        placeholderTextColor={colors.muted}
        keyboardType="numeric"
        value={value?.toString() ?? ''}
        onChangeText={handleChange}
        accessibilityLabel={`${target.name} input. Target: ${target.normalMin} to ${target.normalMax} ${target.unit}`}
      />
      <Text style={[styles.vitalUnit, { color: colors.muted }]}>{target.unit}</Text>
    </View>
  );
}

/**
 * Single checklist item component
 */
function ChecklistItemRow({
  item,
  isCompleted,
  onToggle,
  elapsedMinutes,
  colors,
}: {
  item: ChecklistItem;
  isCompleted: boolean;
  onToggle: () => void;
  elapsedMinutes: number;
  colors: ReturnType<typeof useColors>;
}) {
  const [expanded, setExpanded] = useState(false);
  
  const isOverdue = item.timing && elapsedMinutes > (item.timing.max ?? item.timing.target);
  
  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(
        isCompleted 
          ? Haptics.ImpactFeedbackStyle.Light 
          : Haptics.ImpactFeedbackStyle.Medium
      );
    }
    onToggle();
  }, [isCompleted, onToggle]);
  
  const categoryMeta = getCategoryMeta(item.category);
  
  return (
    <View style={[
      styles.checklistItem,
      { 
        backgroundColor: isCompleted ? `${colors.success}10` : colors.surface,
        borderColor: isOverdue && !isCompleted ? colors.error : colors.border,
        borderWidth: isOverdue && !isCompleted ? 2 : 1,
      }
    ]}>
      <TouchableOpacity
        onPress={handlePress}
        style={styles.checklistItemMain}
        activeOpacity={0.7}
        accessibilityLabel={`${item.title}. ${isCompleted ? 'Completed' : 'Not completed'}. Tap to toggle.`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isCompleted }}
      >
        {/* Checkbox */}
        <View style={[
          styles.checkbox,
          { 
            backgroundColor: isCompleted ? colors.success : 'transparent',
            borderColor: isCompleted ? colors.success : colors.border,
          }
        ]}>
          {isCompleted && (
            <IconSymbol name="checkmark" size={16} color="#FFF" />
          )}
        </View>
        
        {/* Content */}
        <View style={styles.checklistItemContent}>
          <View style={styles.itemTitleRow}>
            <Text style={[
              styles.itemTitle,
              { 
                color: isCompleted ? colors.muted : colors.foreground,
                textDecorationLine: isCompleted ? 'line-through' : 'none',
              }
            ]}>
              {item.title}
            </Text>
            {item.critical && !isCompleted && (
              <View style={[styles.criticalBadge, { backgroundColor: `${colors.error}20` }]}>
                <Text style={[styles.criticalText, { color: colors.error }]}>CRITICAL</Text>
              </View>
            )}
          </View>
          
          {item.description && !isCompleted && (
            <Text style={[styles.itemDescription, { color: colors.muted }]}>
              {item.description}
            </Text>
          )}
          
          {/* Timing indicator */}
          {item.timing && !isCompleted && (
            <View style={styles.timingRow}>
              <IconSymbol name="clock.fill" size={12} color={isOverdue ? colors.error : colors.muted} />
              <Text style={[
                styles.timingText,
                { color: isOverdue ? colors.error : colors.muted }
              ]}>
                Target: {item.timing.target} min
                {isOverdue && ' (OVERDUE)'}
              </Text>
            </View>
          )}
        </View>
        
        {/* Expand button if has sub-items */}
        {item.subItems && item.subItems.length > 0 && (
          <TouchableOpacity
            onPress={() => setExpanded(!expanded)}
            style={styles.expandButton}
            accessibilityLabel={expanded ? 'Collapse details' : 'Expand details'}
          >
            <IconSymbol 
              name={expanded ? 'chevron.left' : 'chevron.right'} 
              size={16} 
              color={colors.muted} 
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
      
      {/* Expanded sub-items */}
      {expanded && item.subItems && (
        <View style={[styles.subItemsContainer, { borderTopColor: colors.border }]}>
          {item.subItems.map((subItem, idx) => (
            <View key={idx} style={styles.subItem}>
              <Text style={[styles.subItemBullet, { color: categoryMeta.color }]}>•</Text>
              <Text style={[styles.subItemText, { color: colors.foreground }]}>{subItem}</Text>
            </View>
          ))}
          {item.protocolRef && (
            <Text style={[styles.protocolRef, { color: colors.muted }]}>
              📋 {item.protocolRef}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

/**
 * Category section header
 */
function CategoryHeader({ 
  category, 
  completedCount, 
  totalCount,
  colors,
}: { 
  category: ChecklistItemCategory;
  completedCount: number;
  totalCount: number;
  colors: ReturnType<typeof useColors>;
}) {
  const meta = getCategoryMeta(category);
  const isComplete = completedCount === totalCount;
  
  return (
    <View style={[styles.categoryHeader, { backgroundColor: `${meta.color}15` }]}>
      <View style={[styles.categoryIcon, { backgroundColor: `${meta.color}25` }]}>
        <IconSymbol name={meta.icon as any} size={20} color={meta.color} />
      </View>
      <Text style={[styles.categoryLabel, { color: colors.foreground }]}>
        {meta.label}
      </Text>
      <View style={[
        styles.progressBadge, 
        { backgroundColor: isComplete ? colors.success : `${colors.muted}20` }
      ]}>
        <Text style={[
          styles.progressText, 
          { color: isComplete ? '#FFF' : colors.foreground }
        ]}>
          {completedCount}/{totalCount}
        </Text>
      </View>
    </View>
  );
}

export function RoscChecklist({ initialRoscTime }: RoscChecklistProps) {
  const colors = useColors();
  
  // State
  const [roscTime, setRoscTime] = useState<number | null>(initialRoscTime ?? null);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [vitalValues, setVitalValues] = useState<Record<string, number | null>>({
    sbp: null,
    map: null,
    spo2: null,
    etco2: null,
    hr: null,
    rr: null,
    temp: null,
    glucose: null,
  });
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  
  // Update elapsed minutes
  useEffect(() => {
    if (!roscTime) return;
    
    const updateElapsed = () => {
      setElapsedMinutes(Math.floor((Date.now() - roscTime) / 60000));
    };
    
    updateElapsed();
    const interval = setInterval(updateElapsed, 10000);
    return () => clearInterval(interval);
  }, [roscTime]);
  
  // Group items by category
  const itemsByCategory = useMemo(() => {
    const grouped = new Map<ChecklistItemCategory, ChecklistItem[]>();
    CATEGORY_META.forEach(cat => grouped.set(cat.id, []));
    ROSC_CHECKLIST_ITEMS.forEach(item => {
      grouped.get(item.category)?.push(item);
    });
    return grouped;
  }, []);
  
  // Progress stats
  const totalItems = ROSC_CHECKLIST_ITEMS.length;
  const completedCount = completedItems.size;
  const criticalRemaining = ROSC_CHECKLIST_ITEMS.filter(
    item => item.critical && !completedItems.has(item.id)
  ).length;
  
  // Handlers
  const handleStartTimer = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setRoscTime(Date.now());
  }, []);
  
  const handleResetTimer = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    setRoscTime(null);
    setCompletedItems(new Set());
    setElapsedMinutes(0);
  }, []);
  
  const handleToggleItem = useCallback((itemId: string) => {
    setCompletedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);
  
  const handleVitalChange = useCallback((key: string, value: number | null) => {
    setVitalValues(prev => ({ ...prev, [key]: value }));
  }, []);

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <IconSymbol name="heart.fill" size={28} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Post-ROSC Bundle
          </Text>
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
          2025 AHA Guidelines • LA County 1210
        </Text>
      </View>
      
      {/* ROSC Timer */}
      <RoscTimer
        roscTime={roscTime}
        onStart={handleStartTimer}
        onReset={handleResetTimer}
        colors={colors}
      />
      
      {/* Progress Bar */}
      <View style={[styles.progressSection, { backgroundColor: colors.surface }]}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: colors.foreground }]}>
            Bundle Progress
          </Text>
          <Text style={[styles.progressValue, { color: colors.primary }]}>
            {completedCount}/{totalItems}
          </Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: `${colors.muted}20` }]}>
          <View 
            style={[
              styles.progressFill, 
              { 
                backgroundColor: colors.success,
                width: `${(completedCount / totalItems) * 100}%`,
              }
            ]} 
          />
        </View>
        {criticalRemaining > 0 && (
          <Text style={[styles.criticalWarning, { color: colors.error }]}>
            ⚠️ {criticalRemaining} critical {criticalRemaining === 1 ? 'item' : 'items'} remaining
          </Text>
        )}
      </View>
      
      {/* Quick Vital Entry */}
      <View style={[styles.vitalsSection, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Quick Vital Signs Entry
        </Text>
        <Text style={[styles.vitalsSubtitle, { color: colors.muted }]}>
          Enter values to see target status (green = on target)
        </Text>
        <View style={styles.vitalsGrid}>
          <VitalInput
            vitalKey="sbp"
            value={vitalValues.sbp}
            onChange={(v) => handleVitalChange('sbp', v)}
            colors={colors}
          />
          <VitalInput
            vitalKey="map"
            value={vitalValues.map}
            onChange={(v) => handleVitalChange('map', v)}
            colors={colors}
          />
          <VitalInput
            vitalKey="spo2"
            value={vitalValues.spo2}
            onChange={(v) => handleVitalChange('spo2', v)}
            colors={colors}
          />
          <VitalInput
            vitalKey="etco2"
            value={vitalValues.etco2}
            onChange={(v) => handleVitalChange('etco2', v)}
            colors={colors}
          />
          <VitalInput
            vitalKey="hr"
            value={vitalValues.hr}
            onChange={(v) => handleVitalChange('hr', v)}
            colors={colors}
          />
          <VitalInput
            vitalKey="rr"
            value={vitalValues.rr}
            onChange={(v) => handleVitalChange('rr', v)}
            colors={colors}
          />
        </View>
      </View>
      
      {/* Checklist by Category */}
      {CATEGORY_META.map(category => {
        const items = itemsByCategory.get(category.id) ?? [];
        const catCompleted = items.filter(i => completedItems.has(i.id)).length;
        
        return (
          <View key={category.id} style={styles.categorySection}>
            <CategoryHeader
              category={category.id}
              completedCount={catCompleted}
              totalCount={items.length}
              colors={colors}
            />
            {items.map(item => (
              <ChecklistItemRow
                key={item.id}
                item={item}
                isCompleted={completedItems.has(item.id)}
                onToggle={() => handleToggleItem(item.id)}
                elapsedMinutes={elapsedMinutes}
                colors={colors}
              />
            ))}
          </View>
        );
      })}
      
      {/* Key Targets Reference */}
      <View style={[styles.targetsRef, { backgroundColor: `${colors.primary}10` }]}>
        <Text style={[styles.targetsTitle, { color: colors.foreground }]}>
          📊 2025 AHA Key Targets
        </Text>
        <View style={styles.targetsList}>
          <Text style={[styles.targetItem, { color: colors.foreground }]}>
            • MAP ≥65 mmHg (avoid hypotension)
          </Text>
          <Text style={[styles.targetItem, { color: colors.foreground }]}>
            • SBP 90-100 mmHg initially
          </Text>
          <Text style={[styles.targetItem, { color: colors.foreground }]}>
            • SpO₂ 94-98% (avoid hyperoxia)
          </Text>
          <Text style={[styles.targetItem, { color: colors.foreground }]}>
            • ETCO₂ 35-45 mmHg (avoid hyperventilation)
          </Text>
          <Text style={[styles.targetItem, { color: colors.foreground }]}>
            • Temp 32-36°C (prevent fever)
          </Text>
          <Text style={[styles.targetItem, { color: colors.foreground }]}>
            • Glucose 140-180 mg/dL
          </Text>
        </View>
      </View>
      
      {/* Disclaimer */}
      <View style={[styles.disclaimer, { backgroundColor: `${colors.warning}15` }]}>
        <IconSymbol name="exclamationmark.triangle.fill" size={20} color={colors.warning} />
        <View style={styles.disclaimerContent}>
          <Text style={[styles.disclaimerTitle, { color: colors.foreground }]}>
            Clinical Reference Only
          </Text>
          <Text style={[styles.disclaimerText, { color: colors.muted }]}>
            Follow local protocols and medical direction. This checklist supplements but does not replace clinical judgment.
          </Text>
        </View>
      </View>
      
      {/* Bottom padding */}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.base,
  },
  
  // Header
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
  
  // Timer
  timerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radii.xl,
    marginBottom: spacing.lg,
    gap: spacing.md,
    ...shadows.md,
  },
  timerButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 1,
  },
  timerContainer: {
    marginBottom: spacing.lg,
  },
  timerDisplay: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    borderRadius: radii.xl,
    ...shadows.md,
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  timerValue: {
    fontSize: 56,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  timerPulse: {
    marginTop: spacing.sm,
  },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  resetText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Progress
  progressSection: {
    padding: spacing.lg,
    borderRadius: radii.xl,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  criticalWarning: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  
  // Vitals
  vitalsSection: {
    padding: spacing.lg,
    borderRadius: radii.xl,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  vitalsSubtitle: {
    fontSize: 13,
    marginBottom: spacing.md,
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  vitalInputContainer: {
    width: '30%',
    borderWidth: 2,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  vitalInputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  vitalAbbrev: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  vitalInput: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderRadius: radii.sm,
    minHeight: 36,
  },
  vitalUnit: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  
  // Category
  categorySection: {
    marginBottom: spacing.lg,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    marginBottom: spacing.sm,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  categoryLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  progressBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
  },
  
  // Checklist Item
  checklistItem: {
    borderRadius: radii.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  checklistItemMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    minHeight: touchTargets.minimum,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: radii.md,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    marginTop: 2,
  },
  checklistItemContent: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  criticalBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  criticalText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  itemDescription: {
    fontSize: 14,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  timingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  timingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  expandButton: {
    width: touchTargets.minimum,
    height: touchTargets.minimum,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subItemsContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    marginLeft: 44,
  },
  subItem: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  subItemBullet: {
    width: 16,
    fontSize: 14,
    fontWeight: '600',
  },
  subItemText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  protocolRef: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  
  // Targets Reference
  targetsRef: {
    padding: spacing.lg,
    borderRadius: radii.xl,
    marginBottom: spacing.lg,
  },
  targetsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  targetsList: {
    gap: spacing.xs,
  },
  targetItem: {
    fontSize: 14,
    lineHeight: 22,
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
