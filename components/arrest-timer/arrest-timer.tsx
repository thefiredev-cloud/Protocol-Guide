/**
 * Cardiac Arrest Assistant
 * 
 * Real-time guidance for cardiac arrest management per LA County Protocol 1210.
 * Designed for one-hand, gloved operation in the field.
 * 
 * Features:
 * - Large touch targets (56px minimum)
 * - High contrast dark mode
 * - Shock counter with timestamps
 * - Epinephrine timer with audio/vibration alerts
 * - Vector change prompts after 3rd shock
 * - eCPR transport criteria evaluation
 * - Complete event log for documentation
 * - Works fully offline
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
  Modal,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/use-colors';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { touchTargets, radii, spacing, shadows } from '@/lib/design-tokens';
import { useArrestTimer } from './use-arrest-timer';
import { RHYTHMS, type CardiacRhythm } from './types';
import {
  getContextualPrompts,
  REVERSIBLE_CAUSES,
} from './protocol-steps';

// Format milliseconds to MM:SS
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(Math.abs(ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const sign = ms < 0 ? '-' : '';
  return `${sign}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Format milliseconds to M:SS for compact display
function formatTimeCompact(ms: number): string {
  const totalSeconds = Math.floor(Math.abs(ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function ArrestTimer() {
  const colors = useColors();
  const timer = useArrestTimer();
  
  // Modal states
  const [showRhythmPicker, setShowRhythmPicker] = useState(false);
  const [showEventLog, setShowEventLog] = useState(false);
  const [showHsTs, setShowHsTs] = useState(false);
  const [showECPR, setShowECPR] = useState(false);

  // Computed values
  const currentRhythmInfo = timer.state.currentRhythm 
    ? RHYTHMS[timer.state.currentRhythm] 
    : null;
  
  const contextualPrompts = useMemo(
    () => getContextualPrompts(
      timer.state.shocks.count,
      timer.state.medications.epinephrine.doses,
      timer.state.medications.amiodarone.doses,
      timer.state.currentRhythm,
      timer.state.shocks.vectorChanged
    ),
    [timer.state]
  );

  // Haptic helper
  const haptic = useCallback((style: 'light' | 'medium' | 'heavy') => {
    if (Platform.OS !== 'web') {
      const map = {
        light: Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy: Haptics.ImpactFeedbackStyle.Heavy,
      };
      Haptics.impactAsync(map[style]);
    }
  }, []);

  // === NOT STARTED VIEW ===
  if (!timer.state.isActive) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.startContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.startHeader}>
            <View style={[styles.iconCircle, { backgroundColor: `${colors.error}20` }]}>
              <IconSymbol name="heart.fill" size={48} color={colors.error} />
            </View>
            <Text style={[styles.startTitle, { color: colors.foreground }]}>
              Cardiac Arrest Assistant
            </Text>
            <Text style={[styles.startSubtitle, { color: colors.muted }]}>
              LA County Protocol 1210
            </Text>
          </View>

          {/* Start Button */}
          <TouchableOpacity
            onPress={() => {
              haptic('heavy');
              timer.startArrest();
            }}
            style={[styles.startButton, { backgroundColor: colors.error }]}
            activeOpacity={0.8}
            accessibilityLabel="Start cardiac arrest timer"
            accessibilityRole="button"
          >
            <IconSymbol name="clock.fill" size={32} color="#FFF" />
            <Text style={styles.startButtonText}>START ARREST TIMER</Text>
          </TouchableOpacity>

          {/* Info */}
          <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.infoTitle, { color: colors.foreground }]}>
              This tool helps you:
            </Text>
            <View style={styles.infoList}>
              {[
                'Track shock count and timing',
                'Time epinephrine doses (every 3-5 min)',
                'Prompt for vector change after 3rd shock',
                'Evaluate eCPR transport criteria',
                'Log all interventions for documentation',
              ].map((item, i) => (
                <View key={i} style={styles.infoItem}>
                  <View style={[styles.infoBullet, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.infoText, { color: colors.muted }]}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Disclaimer */}
          <View style={[styles.disclaimer, { backgroundColor: `${colors.warning}15` }]}>
            <IconSymbol name="exclamationmark.triangle.fill" size={20} color={colors.warning} />
            <Text style={[styles.disclaimerText, { color: colors.muted }]}>
              Clinical decision support only. Always follow local protocols and medical direction.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // === ACTIVE ARREST VIEW ===
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.activeContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* === MAIN TIMER === */}
        <View style={[styles.timerSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.timerLabel, { color: colors.muted }]}>ARREST TIME</Text>
          <Text style={[styles.timerValue, { color: colors.foreground }]}>
            {formatTime(timer.timerDisplay.totalElapsed)}
          </Text>
          
          {/* Rhythm Badge */}
          {currentRhythmInfo && (
            <TouchableOpacity
              onPress={() => setShowRhythmPicker(true)}
              style={[styles.rhythmBadge, { backgroundColor: currentRhythmInfo.color }]}
              activeOpacity={0.8}
            >
              <Text style={styles.rhythmBadgeText}>{currentRhythmInfo.shortLabel}</Text>
              <IconSymbol name="chevron.right" size={16} color="#FFF" />
            </TouchableOpacity>
          )}
          
          {!currentRhythmInfo && (
            <TouchableOpacity
              onPress={() => setShowRhythmPicker(true)}
              style={[styles.selectRhythmBtn, { borderColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.selectRhythmText, { color: colors.primary }]}>
                SELECT RHYTHM
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* === EPINEPHRINE TIMER === */}
        {timer.state.isActive && (
          <View style={[
            styles.epiSection,
            { 
              backgroundColor: timer.timerDisplay.isEpiDue 
                ? timer.timerDisplay.isEpiOverdue ? colors.error : colors.warning
                : colors.surface,
            }
          ]}>
            <View style={styles.epiHeader}>
              <Text style={[
                styles.epiLabel,
                { color: timer.timerDisplay.isEpiDue ? '#FFF' : colors.muted }
              ]}>
                EPINEPHRINE
              </Text>
              <Text style={[
                styles.epiCount,
                { color: timer.timerDisplay.isEpiDue ? '#FFF' : colors.foreground }
              ]}>
                Doses: {timer.state.medications.epinephrine.doses}
              </Text>
            </View>
            
            {timer.timerDisplay.epiTimeRemaining !== null ? (
              <Text style={[
                styles.epiTimer,
                { color: timer.timerDisplay.isEpiDue ? '#FFF' : colors.foreground }
              ]}>
                {timer.timerDisplay.isEpiDue 
                  ? `OVERDUE ${formatTimeCompact(Math.abs(timer.timerDisplay.epiTimeRemaining))}`
                  : `Next in ${formatTimeCompact(timer.timerDisplay.epiTimeRemaining)}`
                }
              </Text>
            ) : (
              <Text style={[
                styles.epiTimer,
                { color: timer.timerDisplay.isEpiDue ? '#FFF' : colors.foreground }
              ]}>
                {timer.state.medications.epinephrine.doses === 0 
                  ? (timer.state.currentRhythm === 'vf-pvt' 
                      ? 'Due after 2nd shock' 
                      : 'Due now for non-shockable')
                  : 'Awaiting dose'
                }
              </Text>
            )}

            <TouchableOpacity
              onPress={() => {
                haptic('medium');
                timer.recordEpinephrine();
              }}
              style={[
                styles.epiButton,
                { 
                  backgroundColor: timer.timerDisplay.isEpiDue 
                    ? '#FFF' 
                    : colors.primary 
                }
              ]}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.epiButtonText,
                { 
                  color: timer.timerDisplay.isEpiDue 
                    ? timer.timerDisplay.isEpiOverdue ? colors.error : colors.warning
                    : '#FFF'
                }
              ]}>
                💉 GIVE EPI 1mg
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* === SHOCK COUNTER (for shockable rhythms) === */}
        {(timer.state.currentRhythm === 'vf-pvt' || timer.state.shocks.count > 0) && (
          <View style={[styles.shockSection, { backgroundColor: colors.surface }]}>
            <View style={styles.shockHeader}>
              <Text style={[styles.shockLabel, { color: colors.muted }]}>SHOCKS</Text>
              <Text style={[styles.shockCount, { color: colors.error }]}>
                {timer.state.shocks.count}
              </Text>
            </View>
            
            <TouchableOpacity
              onPress={() => {
                haptic('heavy');
                timer.recordShock();
              }}
              style={[styles.shockButton, { backgroundColor: colors.error }]}
              activeOpacity={0.8}
            >
              <Text style={styles.shockButtonText}>⚡ SHOCK DELIVERED</Text>
            </TouchableOpacity>

            {/* Vector Change Prompt */}
            {timer.shouldShowVectorPrompt && (
              <TouchableOpacity
                onPress={() => {
                  haptic('medium');
                  timer.recordVectorChange();
                }}
                style={[styles.vectorButton, { backgroundColor: colors.warning }]}
                activeOpacity={0.8}
              >
                <Text style={styles.vectorButtonText}>🔄 VECTOR CHANGED (A-L → A-P)</Text>
              </TouchableOpacity>
            )}
            
            {timer.state.shocks.vectorChanged && (
              <View style={[styles.vectorDone, { backgroundColor: `${colors.success}20` }]}>
                <IconSymbol name="checkmark" size={16} color={colors.success} />
                <Text style={[styles.vectorDoneText, { color: colors.success }]}>
                  Vector changed
                </Text>
              </View>
            )}
          </View>
        )}

        {/* === AMIODARONE (for VF/pVT after 3rd shock) === */}
        {timer.state.currentRhythm === 'vf-pvt' && timer.state.shocks.count >= 3 && (
          <View style={[styles.amioSection, { backgroundColor: colors.surface }]}>
            <View style={styles.amioHeader}>
              <Text style={[styles.amioLabel, { color: colors.muted }]}>AMIODARONE</Text>
              <Text style={[styles.amioCount, { color: colors.foreground }]}>
                {timer.state.medications.amiodarone.totalMg}mg given
              </Text>
            </View>
            
            {timer.state.medications.amiodarone.doses < 2 && (
              <TouchableOpacity
                onPress={() => {
                  haptic('medium');
                  timer.recordAmiodarone();
                }}
                style={[styles.amioButton, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
              >
                <Text style={styles.amioButtonText}>
                  💊 GIVE AMIO {timer.state.medications.amiodarone.doses === 0 ? '300mg' : '150mg'}
                </Text>
              </TouchableOpacity>
            )}
            
            {timer.state.medications.amiodarone.doses >= 2 && (
              <View style={[styles.amioDone, { backgroundColor: `${colors.success}20` }]}>
                <IconSymbol name="checkmark" size={16} color={colors.success} />
                <Text style={[styles.amioDoneText, { color: colors.success }]}>
                  Max amiodarone given (450mg)
                </Text>
              </View>
            )}
          </View>
        )}

        {/* === CONTEXTUAL PROMPTS === */}
        {contextualPrompts.length > 0 && (
          <View style={[styles.promptsSection, { backgroundColor: `${colors.warning}15` }]}>
            <Text style={[styles.promptsTitle, { color: colors.warning }]}>
              ⚠️ CONSIDER
            </Text>
            {contextualPrompts.map((prompt, i) => (
              <Text key={i} style={[styles.promptText, { color: colors.foreground }]}>
                {prompt}
              </Text>
            ))}
          </View>
        )}

        {/* === eCPR TRANSPORT PROMPT === */}
        {timer.shouldShowECPRPrompt && (
          <TouchableOpacity
            onPress={() => setShowECPR(true)}
            style={[styles.ecprBanner, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Text style={styles.ecprBannerText}>
              🏥 EVALUATE eCPR TRANSPORT CRITERIA
            </Text>
            <IconSymbol name="chevron.right" size={20} color="#FFF" />
          </TouchableOpacity>
        )}

        {/* === QUICK ACTIONS === */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            onPress={() => setShowHsTs(true)}
            style={[styles.quickAction, { backgroundColor: colors.surface }]}
            activeOpacity={0.8}
          >
            <IconSymbol name="magnifyingglass" size={24} color={colors.primary} />
            <Text style={[styles.quickActionText, { color: colors.foreground }]}>H&apos;s &amp; T&apos;s</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setShowRhythmPicker(true)}
            style={[styles.quickAction, { backgroundColor: colors.surface }]}
            activeOpacity={0.8}
          >
            <IconSymbol name="heart.fill" size={24} color={colors.error} />
            <Text style={[styles.quickActionText, { color: colors.foreground }]}>Rhythm</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setShowEventLog(true)}
            style={[styles.quickAction, { backgroundColor: colors.surface }]}
            activeOpacity={0.8}
          >
            <IconSymbol name="doc.text.fill" size={24} color={colors.primary} />
            <Text style={[styles.quickActionText, { color: colors.foreground }]}>Log</Text>
          </TouchableOpacity>
        </View>

        {/* === SECONDARY ACTIONS === */}
        <View style={styles.secondaryActions}>
          {!timer.state.ivIoAccess && (
            <TouchableOpacity
              onPress={() => {
                haptic('light');
                timer.recordIvIoAccess();
              }}
              style={[styles.secondaryButton, { backgroundColor: colors.surface }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
                💉 IV/IO Access
              </Text>
            </TouchableOpacity>
          )}
          
          {!timer.state.airwaySecured && (
            <TouchableOpacity
              onPress={() => {
                haptic('light');
                timer.recordAirwaySecured();
              }}
              style={[styles.secondaryButton, { backgroundColor: colors.surface }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
                🫁 Airway Secured
              </Text>
            </TouchableOpacity>
          )}
          
          {timer.state.currentRhythm !== 'rosc' && (
            <TouchableOpacity
              onPress={() => {
                haptic('heavy');
                timer.recordROSC();
              }}
              style={[styles.roscButton, { backgroundColor: colors.success }]}
              activeOpacity={0.8}
            >
              <Text style={styles.roscButtonText}>✓ ROSC ACHIEVED</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* === STATUS INDICATORS === */}
        <View style={[styles.statusRow, { backgroundColor: colors.surface }]}>
          <View style={styles.statusItem}>
            <View style={[
              styles.statusDot,
              { backgroundColor: timer.state.ivIoAccess ? colors.success : colors.muted }
            ]} />
            <Text style={[styles.statusText, { color: colors.foreground }]}>IV/IO</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[
              styles.statusDot,
              { backgroundColor: timer.state.airwaySecured ? colors.success : colors.muted }
            ]} />
            <Text style={[styles.statusText, { color: colors.foreground }]}>Airway</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[
              styles.statusDot,
              { backgroundColor: timer.state.shocks.vectorChanged ? colors.success : colors.muted }
            ]} />
            <Text style={[styles.statusText, { color: colors.foreground }]}>Vector</Text>
          </View>
        </View>

        {/* === END ARREST === */}
        <TouchableOpacity
          onPress={() => {
            haptic('medium');
            timer.endArrest();
          }}
          style={[styles.endButton, { borderColor: colors.error }]}
          activeOpacity={0.8}
        >
          <Text style={[styles.endButtonText, { color: colors.error }]}>END ARREST</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* === RHYTHM PICKER MODAL === */}
      <Modal
        visible={showRhythmPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRhythmPicker(false)}
      >
        <Pressable 
          style={styles.modalBackdrop}
          onPress={() => setShowRhythmPicker(false)}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Select Rhythm
            </Text>
            
            {(Object.values(RHYTHMS) as typeof RHYTHMS[CardiacRhythm][]).map((rhythm) => (
              <TouchableOpacity
                key={rhythm.id}
                onPress={() => {
                  haptic('medium');
                  timer.setRhythm(rhythm.id);
                  setShowRhythmPicker(false);
                }}
                style={[
                  styles.rhythmOption,
                  { 
                    backgroundColor: timer.state.currentRhythm === rhythm.id 
                      ? `${rhythm.color}20` 
                      : 'transparent',
                    borderColor: rhythm.color,
                  }
                ]}
                activeOpacity={0.8}
              >
                <View style={[styles.rhythmDot, { backgroundColor: rhythm.color }]} />
                <View style={styles.rhythmInfo}>
                  <Text style={[styles.rhythmLabel, { color: colors.foreground }]}>
                    {rhythm.label}
                  </Text>
                  <Text style={[styles.rhythmDesc, { color: colors.muted }]}>
                    {rhythm.description}
                  </Text>
                </View>
                {rhythm.shockable && (
                  <View style={[styles.shockableBadge, { backgroundColor: rhythm.color }]}>
                    <Text style={styles.shockableBadgeText}>⚡</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              onPress={() => setShowRhythmPicker(false)}
              style={[styles.modalClose, { backgroundColor: colors.muted }]}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* === H's & T's MODAL === */}
      <Modal
        visible={showHsTs}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHsTs(false)}
      >
        <Pressable 
          style={styles.modalBackdrop}
          onPress={() => setShowHsTs(false)}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Reversible Causes
            </Text>
            
            <Text style={[styles.hstsSection, { color: colors.error }]}>H&apos;s</Text>
            {REVERSIBLE_CAUSES.hs.map((item) => (
              <View key={item.id} style={styles.hstsItem}>
                <Text style={[styles.hstsLabel, { color: colors.foreground }]}>
                  {item.label}
                </Text>
                <Text style={[styles.hstsHint, { color: colors.muted }]}>
                  {item.hint}
                </Text>
              </View>
            ))}
            
            <Text style={[styles.hstsSection, { color: colors.error, marginTop: spacing.lg }]}>T&apos;s</Text>
            {REVERSIBLE_CAUSES.ts.map((item) => (
              <View key={item.id} style={styles.hstsItem}>
                <Text style={[styles.hstsLabel, { color: colors.foreground }]}>
                  {item.label}
                </Text>
                <Text style={[styles.hstsHint, { color: colors.muted }]}>
                  {item.hint}
                </Text>
              </View>
            ))}
            
            <TouchableOpacity
              onPress={() => setShowHsTs(false)}
              style={[styles.modalClose, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* === EVENT LOG MODAL === */}
      <Modal
        visible={showEventLog}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEventLog(false)}
      >
        <Pressable 
          style={styles.modalBackdrop}
          onPress={() => setShowEventLog(false)}
        >
          <Pressable style={[styles.modalContent, styles.logModal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Event Log
            </Text>
            
            <ScrollView style={styles.logScroll}>
              {timer.state.events.length === 0 ? (
                <Text style={[styles.logEmpty, { color: colors.muted }]}>
                  No events recorded yet
                </Text>
              ) : (
                [...timer.state.events].reverse().map((event) => (
                  <View key={event.id} style={[styles.logItem, { borderColor: colors.border }]}>
                    <Text style={[styles.logTime, { color: colors.primary }]}>
                      {timer.state.startTime 
                        ? formatTimeCompact(event.timestamp - timer.state.startTime)
                        : '--:--'
                      }
                    </Text>
                    <View style={styles.logContent}>
                      <Text style={[styles.logType, { color: colors.foreground }]}>
                        {event.type.replace(/_/g, ' ').toUpperCase()}
                      </Text>
                      {event.notes && (
                        <Text style={[styles.logNotes, { color: colors.muted }]}>
                          {event.notes}
                        </Text>
                      )}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
            
            <TouchableOpacity
              onPress={() => setShowEventLog(false)}
              style={[styles.modalClose, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* === eCPR CRITERIA MODAL === */}
      <Modal
        visible={showECPR}
        transparent
        animationType="slide"
        onRequestClose={() => setShowECPR(false)}
      >
        <Pressable 
          style={styles.modalBackdrop}
          onPress={() => setShowECPR(false)}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              eCPR Transport Criteria
            </Text>
            
            <Text style={[styles.ecprScore, { color: colors.primary }]}>
              Score: {timer.ecprScore}/100
            </Text>
            
            {[
              { key: 'witnessed', label: 'Witnessed arrest?', weight: 30 },
              { key: 'bystanderCPR', label: 'Bystander CPR?', weight: 20 },
              { key: 'initialShockable', label: 'Initial shockable rhythm?', weight: 20 },
              { key: 'ageUnder65', label: 'Age < 65 years?', weight: 10 },
              { key: 'noMajorComorbid', label: 'No major comorbidities?', weight: 10 },
              { key: 'downTimeLessThan60', label: 'Down time < 60 min?', weight: 10 },
            ].map((item) => (
              <View key={item.key} style={styles.ecprItem}>
                <Text style={[styles.ecprLabel, { color: colors.foreground }]}>
                  {item.label}
                </Text>
                <View style={styles.ecprButtons}>
                  <TouchableOpacity
                    onPress={() => timer.updateECPRCriteria({ [item.key]: true })}
                    style={[
                      styles.ecprYesNo,
                      { 
                        backgroundColor: timer.state.ecprCriteria[item.key as keyof typeof timer.state.ecprCriteria] === true 
                          ? colors.success 
                          : `${colors.success}20` 
                      }
                    ]}
                  >
                    <Text style={[
                      styles.ecprYesNoText,
                      { color: timer.state.ecprCriteria[item.key as keyof typeof timer.state.ecprCriteria] === true ? '#FFF' : colors.success }
                    ]}>Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => timer.updateECPRCriteria({ [item.key]: false })}
                    style={[
                      styles.ecprYesNo,
                      { 
                        backgroundColor: timer.state.ecprCriteria[item.key as keyof typeof timer.state.ecprCriteria] === false 
                          ? colors.error 
                          : `${colors.error}20` 
                      }
                    ]}
                  >
                    <Text style={[
                      styles.ecprYesNoText,
                      { color: timer.state.ecprCriteria[item.key as keyof typeof timer.state.ecprCriteria] === false ? '#FFF' : colors.error }
                    ]}>No</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            
            <View style={[styles.ecprResult, { backgroundColor: timer.ecprScore >= 70 ? `${colors.success}20` : `${colors.warning}20` }]}>
              <Text style={[styles.ecprResultText, { color: timer.ecprScore >= 70 ? colors.success : colors.warning }]}>
                {timer.ecprScore >= 70 
                  ? '✓ Consider eCPR transport'
                  : timer.ecprScore >= 40 
                    ? '? Discuss with medical control'
                    : '✗ eCPR criteria not met'
                }
              </Text>
            </View>
            
            <TouchableOpacity
              onPress={() => setShowECPR(false)}
              style={[styles.modalClose, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  
  // === START SCREEN ===
  startContainer: {
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  startHeader: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  startTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  startSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['2xl'],
    borderRadius: radii.xl,
    width: '100%',
    maxWidth: 320,
    marginBottom: spacing['2xl'],
    ...shadows.lg,
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    marginLeft: spacing.md,
  },
  infoCard: {
    padding: spacing.lg,
    borderRadius: radii.xl,
    width: '100%',
    maxWidth: 400,
    marginBottom: spacing.lg,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  infoList: {
    gap: spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    marginRight: spacing.sm,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.lg,
    width: '100%',
    maxWidth: 400,
  },
  disclaimerText: {
    fontSize: 12,
    flex: 1,
    marginLeft: spacing.sm,
    lineHeight: 18,
  },

  // === ACTIVE SCREEN ===
  activeContainer: {
    padding: spacing.base,
  },
  
  // Timer
  timerSection: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: radii.xl,
    marginBottom: spacing.base,
  },
  timerLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  timerValue: {
    fontSize: 64,
    fontWeight: '700',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  rhythmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    marginTop: spacing.md,
  },
  rhythmBadgeText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: spacing.xs,
  },
  selectRhythmBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    borderWidth: 2,
    marginTop: spacing.md,
  },
  selectRhythmText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Epinephrine
  epiSection: {
    padding: spacing.lg,
    borderRadius: radii.xl,
    marginBottom: spacing.base,
  },
  epiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  epiLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  epiCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  epiTimer: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  epiButton: {
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
  },
  epiButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Shock
  shockSection: {
    padding: spacing.lg,
    borderRadius: radii.xl,
    marginBottom: spacing.base,
  },
  shockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  shockLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  shockCount: {
    fontSize: 48,
    fontWeight: '700',
  },
  shockButton: {
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
    minHeight: touchTargets.large,
    justifyContent: 'center',
  },
  shockButtonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  vectorButton: {
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  vectorButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  vectorDone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    marginTop: spacing.md,
  },
  vectorDoneText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },

  // Amiodarone
  amioSection: {
    padding: spacing.lg,
    borderRadius: radii.xl,
    marginBottom: spacing.base,
  },
  amioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  amioLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  amioCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  amioButton: {
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    alignItems: 'center',
  },
  amioButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  amioDone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  amioDoneText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },

  // Prompts
  promptsSection: {
    padding: spacing.lg,
    borderRadius: radii.xl,
    marginBottom: spacing.base,
  },
  promptsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  promptText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },

  // eCPR Banner
  ecprBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: radii.xl,
    marginBottom: spacing.base,
  },
  ecprBannerText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    minHeight: touchTargets.large,
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: spacing.xs,
  },

  // Secondary Actions
  secondaryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  secondaryButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    minHeight: touchTargets.minimum,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  roscButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
    minHeight: touchTargets.minimum,
    justifyContent: 'center',
  },
  roscButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Status Row
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: spacing.md,
    borderRadius: radii.lg,
    marginBottom: spacing.base,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.xs,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // End Button
  endButton: {
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 2,
    alignItems: 'center',
  },
  endButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  bottomPadding: {
    height: spacing['3xl'],
  },

  // === MODALS ===
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    padding: spacing.xl,
    maxHeight: '80%',
  },
  logModal: {
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalClose: {
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  modalCloseText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Rhythm Picker
  rhythmOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 2,
    marginBottom: spacing.sm,
  },
  rhythmDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: spacing.md,
  },
  rhythmInfo: {
    flex: 1,
  },
  rhythmLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  rhythmDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  shockableBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shockableBadgeText: {
    fontSize: 16,
  },

  // H's & T's
  hstsSection: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  hstsItem: {
    marginBottom: spacing.md,
  },
  hstsLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  hstsHint: {
    fontSize: 12,
    marginTop: 2,
  },

  // Event Log
  logScroll: {
    maxHeight: 300,
  },
  logEmpty: {
    textAlign: 'center',
    padding: spacing.xl,
  },
  logItem: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  logTime: {
    fontSize: 14,
    fontWeight: '600',
    width: 50,
    fontVariant: ['tabular-nums'],
  },
  logContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  logType: {
    fontSize: 14,
    fontWeight: '500',
  },
  logNotes: {
    fontSize: 12,
    marginTop: 2,
  },

  // eCPR
  ecprScore: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  ecprItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  ecprLabel: {
    fontSize: 14,
    flex: 1,
  },
  ecprButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ecprYesNo: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    minWidth: 50,
    alignItems: 'center',
  },
  ecprYesNoText: {
    fontSize: 14,
    fontWeight: '600',
  },
  ecprResult: {
    padding: spacing.md,
    borderRadius: radii.lg,
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  ecprResultText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ArrestTimer;
