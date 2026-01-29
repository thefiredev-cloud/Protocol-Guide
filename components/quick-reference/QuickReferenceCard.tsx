/**
 * Quick Reference Card Component
 * 
 * Displays a high-frequency protocol in a compact, mobile-optimized format
 * designed for field use with one-handed operation.
 */

import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import Animated, { FadeIn, FadeOut, SlideInRight } from "react-native-reanimated";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

// Types matching the backend
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

export type QuickReferenceCardData = {
  id: string;
  title: string;
  shortTitle: string;
  category: string;
  priority: 'critical' | 'high' | 'standard';
  icon: string;
  color: string;
  summary: string;
  keySteps: QuickStep[];
  medications: QuickMedication[];
  criticalPoints: string[];
  contraindications: string[];
  pediatricNotes?: string;
  lastUpdated: string;
  sources: string[];
};

type Props = {
  card: QuickReferenceCardData;
  isExpanded?: boolean;
  onPress?: () => void;
  onClose?: () => void;
  variant?: 'compact' | 'full';
};

export function QuickReferenceCard({
  card,
  isExpanded = false,
  onPress,
  onClose,
  variant = 'compact',
}: Props) {
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<'steps' | 'meds' | 'critical'>('steps');

  const priorityColors = {
    critical: '#DC2626',
    high: '#EA580C',
    standard: '#0EA5E9',
  };

  const priorityLabel = {
    critical: 'CRITICAL',
    high: 'HIGH PRIORITY',
    standard: 'STANDARD',
  };

  // Compact card view (for grid/list)
  if (variant === 'compact' && !isExpanded) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 16,
          borderLeftWidth: 4,
          borderLeftColor: card.color,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 3,
        }}
        accessibilityRole="button"
        accessibilityLabel={`${card.shortTitle} quick reference card. ${card.priority} priority.`}
        accessibilityHint="Double tap to view full protocol details"
      >
        {/* Priority badge */}
        <View
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            backgroundColor: priorityColors[card.priority] + '20',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: '700',
              color: priorityColors[card.priority],
              letterSpacing: 0.5,
            }}
          >
            {priorityLabel[card.priority]}
          </Text>
        </View>

        {/* Icon and title */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: card.color + '20',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}
          >
            <IconSymbol name={card.icon as any} size={22} color={card.color} />
          </View>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: colors.text,
              flex: 1,
              marginRight: 60,
            }}
            numberOfLines={2}
          >
            {card.shortTitle}
          </Text>
        </View>

        {/* Summary */}
        <Text
          style={{
            fontSize: 13,
            color: colors.muted,
            lineHeight: 18,
          }}
          numberOfLines={2}
        >
          {card.summary}
        </Text>

        {/* View more indicator */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            marginTop: 12,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary, marginRight: 4 }}>
            View Protocol
          </Text>
          <IconSymbol name="chevron.right" size={14} color={colors.primary} />
        </View>
      </TouchableOpacity>
    );
  }

  // Full expanded view
  return (
    <Animated.View
      entering={SlideInRight.duration(300)}
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      {/* Header */}
      <View
        style={{
          backgroundColor: card.color,
          paddingTop: 16,
          paddingBottom: 20,
          paddingHorizontal: 16,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
        }}
      >
        {/* Close button */}
        <TouchableOpacity
          onPress={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.2)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          accessibilityLabel="Close protocol card"
          accessibilityRole="button"
        >
          <IconSymbol name="xmark" size={18} color="#fff" />
        </TouchableOpacity>

        {/* Priority badge */}
        <View
          style={{
            backgroundColor: 'rgba(255,255,255,0.25)',
            alignSelf: 'flex-start',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 6,
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.5 }}>
            {priorityLabel[card.priority]}
          </Text>
        </View>

        {/* Title */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <IconSymbol name={card.icon as any} size={28} color="#fff" />
          <Text
            style={{
              fontSize: 22,
              fontWeight: '800',
              color: '#fff',
              marginLeft: 12,
              flex: 1,
            }}
          >
            {card.title}
          </Text>
        </View>

        {/* Summary */}
        <Text
          style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.9)',
            marginTop: 8,
            lineHeight: 20,
          }}
        >
          {card.summary}
        </Text>
      </View>

      {/* Tab bar */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 8,
          gap: 8,
        }}
      >
        {[
          { key: 'steps', label: 'Steps', icon: 'list.number' },
          { key: 'meds', label: 'Meds', icon: 'pills.fill' },
          { key: 'critical', label: 'Critical', icon: 'exclamationmark.triangle.fill' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key as any)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: activeTab === tab.key ? card.color + '15' : colors.surface,
              borderWidth: 1,
              borderColor: activeTab === tab.key ? card.color : colors.border,
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab.key }}
          >
            <IconSymbol
              name={tab.icon as any}
              size={16}
              color={activeTab === tab.key ? card.color : colors.muted}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: activeTab === tab.key ? card.color : colors.muted,
                marginLeft: 6,
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Steps Tab */}
        {activeTab === 'steps' && (
          <Animated.View entering={FadeIn.duration(200)}>
            {card.keySteps.map((step, index) => (
              <View
                key={index}
                style={{
                  flexDirection: 'row',
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                {/* Step number */}
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: card.color,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
                    {step.step}
                  </Text>
                </View>

                {/* Step content */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                    {step.action}
                  </Text>
                  {step.timing && (
                    <View
                      style={{
                        backgroundColor: card.color + '20',
                        alignSelf: 'flex-start',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 4,
                        marginTop: 4,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: card.color }}>
                        {step.timing}
                      </Text>
                    </View>
                  )}
                  {step.details && (
                    <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 }}>
                      {step.details}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Medications Tab */}
        {activeTab === 'meds' && (
          <Animated.View entering={FadeIn.duration(200)}>
            {card.medications.map((med, index) => (
              <View
                key={index}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                {/* Medication name */}
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                  {med.name}
                </Text>

                {/* Dosing grid */}
                <View style={{ flexDirection: 'row', marginTop: 10, gap: 8 }}>
                  {/* Adult dose */}
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: colors.background,
                      borderRadius: 8,
                      padding: 10,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: colors.muted, marginBottom: 2 }}>
                      ADULT
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                      {med.adultDose}
                    </Text>
                  </View>

                  {/* Pediatric dose */}
                  {med.pediatricDose && (
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: '#EC4899' + '15',
                        borderRadius: 8,
                        padding: 10,
                      }}
                    >
                      <Text style={{ fontSize: 11, color: '#EC4899', marginBottom: 2 }}>
                        PEDS
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                        {med.pediatricDose}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Route and max dose */}
                <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
                  <View
                    style={{
                      backgroundColor: card.color + '20',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: card.color }}>
                      {med.route}
                    </Text>
                  </View>
                  {med.maxDose && (
                    <View
                      style={{
                        backgroundColor: '#F59E0B' + '20',
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#F59E0B' }}>
                        Max: {med.maxDose}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Notes */}
                {med.notes && (
                  <Text style={{ fontSize: 12, color: colors.muted, marginTop: 8, fontStyle: 'italic' }}>
                    {med.notes}
                  </Text>
                )}
              </View>
            ))}
          </Animated.View>
        )}

        {/* Critical Points Tab */}
        {activeTab === 'critical' && (
          <Animated.View entering={FadeIn.duration(200)}>
            {/* Critical Points */}
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 14,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <IconSymbol name="exclamationmark.triangle.fill" size={18} color="#F59E0B" />
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginLeft: 8 }}>
                  Critical Points
                </Text>
              </View>
              {card.criticalPoints.map((point, index) => (
                <View key={index} style={{ flexDirection: 'row', marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, color: '#F59E0B', marginRight: 8 }}>•</Text>
                  <Text style={{ fontSize: 13, color: colors.text, flex: 1, lineHeight: 18 }}>
                    {point}
                  </Text>
                </View>
              ))}
            </View>

            {/* Contraindications */}
            {card.contraindications.length > 0 && (
              <View
                style={{
                  backgroundColor: '#DC2626' + '10',
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: '#DC2626' + '30',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <IconSymbol name="xmark.octagon.fill" size={18} color="#DC2626" />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#DC2626', marginLeft: 8 }}>
                    Contraindications
                  </Text>
                </View>
                {card.contraindications.map((contra, index) => (
                  <View key={index} style={{ flexDirection: 'row', marginBottom: 6 }}>
                    <Text style={{ fontSize: 13, color: '#DC2626', marginRight: 8 }}>⚠</Text>
                    <Text style={{ fontSize: 13, color: colors.text, flex: 1, lineHeight: 18 }}>
                      {contra}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Pediatric Notes */}
            {card.pediatricNotes && (
              <View
                style={{
                  backgroundColor: '#EC4899' + '10',
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <IconSymbol name="figure.child" size={18} color="#EC4899" />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#EC4899', marginLeft: 8 }}>
                    Pediatric Notes
                  </Text>
                </View>
                <Text style={{ fontSize: 13, color: colors.text, lineHeight: 18 }}>
                  {card.pediatricNotes}
                </Text>
              </View>
            )}

            {/* Sources */}
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 14,
                marginBottom: 20,
              }}
            >
              <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 6 }}>
                SOURCES
              </Text>
              {card.sources.map((source, index) => (
                <Text key={index} style={{ fontSize: 12, color: colors.muted, lineHeight: 16 }}>
                  • {source}
                </Text>
              ))}
              <Text style={{ fontSize: 11, color: colors.muted, marginTop: 8 }}>
                Last updated: {card.lastUpdated}
              </Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

export default QuickReferenceCard;
