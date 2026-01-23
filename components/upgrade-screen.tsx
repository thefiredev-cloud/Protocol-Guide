import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet , Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "@/lib/haptics";

interface UpgradeScreenProps {
  onClose: () => void;
  onSelectPlan: (plan: "monthly" | "annual") => void;
  remainingQueries?: number;
  isLimitReached?: boolean;
}

const FEATURES = {
  free: [
    { text: "5 queries per day", included: true },
    { text: "1 county", included: true },
    { text: "Basic pediatric dosing", included: true },
    { text: "5 bookmarks", included: true },
    { text: "Offline access", included: false },
    { text: "Unlimited counties", included: false },
    { text: "Priority support", included: false },
  ],
  pro: [
    { text: "Unlimited queries", included: true },
    { text: "All available counties", included: true },
    { text: "Advanced pediatric dosing", included: true },
    { text: "Unlimited bookmarks", included: true },
    { text: "Offline access", included: true },
    { text: "Priority support", included: true },
  ],
};

export function UpgradeScreen({ 
  onClose, 
  onSelectPlan, 
  remainingQueries = 0,
  isLimitReached = false 
}: UpgradeScreenProps) {
  const colors = useColors();
  const [selectedPlan, setSelectedPlan] = React.useState<"monthly" | "annual">("annual");

  const handleSelectPlan = (plan: "monthly" | "annual") => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedPlan(plan);
  };

  const handleUpgrade = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onSelectPlan(selectedPlan);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable 
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && { opacity: 0.7 }
            ]}
          >
            <IconSymbol name="xmark" size={24} color={colors.muted} />
          </Pressable>
        </View>

        {/* Limit Reached Message */}
        {isLimitReached && (
          <View style={[styles.limitBanner, { backgroundColor: colors.primary + "15" }]}>
            <IconSymbol name="exclamationmark.triangle.fill" size={24} color={colors.primary} />
            <Text style={[styles.limitText, { color: colors.foreground }]}>
              You{"'"}ve used your 5 free lookups today.{"\n"}
              <Text style={{ fontWeight: "700" }}>
                Upgrade to Pro for unlimited queries—$89/year, less than two shift meals.
              </Text>
            </Text>
          </View>
        )}

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Upgrade to Pro
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Unlimited protocol access for EMS professionals
          </Text>
        </View>

        {/* Pricing Cards */}
        <View style={styles.pricingSection}>
          {/* Monthly Plan */}
          <Pressable
            onPress={() => handleSelectPlan("monthly")}
            style={({ pressed }) => [
              styles.pricingCard,
              { 
                borderColor: selectedPlan === "monthly" ? colors.primary : colors.border,
                backgroundColor: selectedPlan === "monthly" ? colors.primary + "08" : colors.surface,
              },
              pressed && { opacity: 0.9 }
            ]}
          >
            <View style={styles.pricingHeader}>
              <Text style={[styles.planName, { color: colors.foreground }]}>Monthly</Text>
              <View style={[
                styles.radioOuter, 
                { borderColor: selectedPlan === "monthly" ? colors.primary : colors.border }
              ]}>
                {selectedPlan === "monthly" && (
                  <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                )}
              </View>
            </View>
            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: colors.foreground }]}>$9.99</Text>
              <Text style={[styles.period, { color: colors.muted }]}>/month</Text>
            </View>
            <Text style={[styles.priceNote, { color: colors.muted }]}>
              Cancel anytime
            </Text>
          </Pressable>

          {/* Annual Plan */}
          <Pressable
            onPress={() => handleSelectPlan("annual")}
            style={({ pressed }) => [
              styles.pricingCard,
              { 
                borderColor: selectedPlan === "annual" ? colors.primary : colors.border,
                backgroundColor: selectedPlan === "annual" ? colors.primary + "08" : colors.surface,
              },
              pressed && { opacity: 0.9 }
            ]}
          >
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>SAVE 25%</Text>
            </View>
            <View style={styles.pricingHeader}>
              <Text style={[styles.planName, { color: colors.foreground }]}>Annual</Text>
              <View style={[
                styles.radioOuter,
                { borderColor: selectedPlan === "annual" ? colors.primary : colors.border }
              ]}>
                {selectedPlan === "annual" && (
                  <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                )}
              </View>
            </View>
            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: colors.foreground }]}>$89</Text>
              <Text style={[styles.period, { color: colors.muted }]}>/year</Text>
            </View>
            <Text style={[styles.priceNote, { color: colors.muted }]}>
              Just $7.42/month • Best value
            </Text>
          </Pressable>
        </View>

        {/* Feature Comparison */}
        <View style={styles.featuresSection}>
          <Text style={[styles.featuresTitle, { color: colors.foreground }]}>
            What you get with Pro
          </Text>
          
          {FEATURES.pro.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <IconSymbol 
                name="checkmark.circle.fill" 
                size={20} 
                color={colors.success} 
              />
              <Text style={[styles.featureText, { color: colors.foreground }]}>
                {feature.text}
              </Text>
            </View>
          ))}
        </View>

        {/* CTA Button */}
        <Pressable
          onPress={handleUpgrade}
          style={({ pressed }) => [
            styles.ctaButton,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
          ]}
        >
          <Text style={styles.ctaText}>
            {selectedPlan === "annual" ? "Get Pro for $89/year" : "Get Pro for $9.99/month"}
          </Text>
        </Pressable>

        {/* Trust Signals */}
        <View style={styles.trustSection}>
          <Text style={[styles.trustText, { color: colors.muted }]}>
            🔒 Secure payment via Stripe
          </Text>
          <Text style={[styles.trustText, { color: colors.muted }]}>
            Cancel anytime • No hidden fees
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 8,
    paddingBottom: 16,
  },
  closeButton: {
    padding: 8,
  },
  limitBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  limitText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  pricingSection: {
    gap: 12,
    marginBottom: 32,
  },
  pricingCard: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 20,
    position: "relative",
  },
  savingsBadge: {
    position: "absolute",
    top: -10,
    right: 16,
    backgroundColor: "#22C55E",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  pricingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  planName: {
    fontSize: 18,
    fontWeight: "600",
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  price: {
    fontSize: 36,
    fontWeight: "700",
  },
  period: {
    fontSize: 16,
    marginLeft: 4,
  },
  priceNote: {
    fontSize: 14,
    marginTop: 4,
  },
  featuresSection: {
    marginBottom: 32,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
  },
  ctaButton: {
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  ctaText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  trustSection: {
    alignItems: "center",
    gap: 4,
  },
  trustText: {
    fontSize: 13,
  },
});
