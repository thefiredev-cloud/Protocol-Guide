/**
 * Agency Billing Screen
 * Manage subscription and billing
 */

import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";

const AGENCY_TIERS = {
  starter: {
    name: "Starter",
    price: "$99/mo",
    features: ["10 team seats", "50 protocols", "1GB storage", "Email support"],
  },
  professional: {
    name: "Professional",
    price: "$299/mo",
    features: ["50 team seats", "200 protocols", "10GB storage", "Priority support", "Custom branding"],
  },
  enterprise: {
    name: "Enterprise",
    price: "Custom",
    features: ["Unlimited seats", "Unlimited protocols", "100GB storage", "Dedicated support", "SSO", "API access"],
  },
};

export default function BillingScreen() {
  const colors = useColors();
  const router = useRouter();

  const { data: agencies } = trpc.agencyAdmin.myAgencies.useQuery();
  const agency = agencies?.[0];

  const currentTier = agency?.subscriptionTier || "starter";
  const tierInfo = AGENCY_TIERS[currentTier as keyof typeof AGENCY_TIERS] || AGENCY_TIERS.starter;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Billing</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Current Plan */}
      <View style={[styles.currentPlan, { backgroundColor: colors.primary + "10", borderColor: colors.primary }]}>
        <View style={styles.planHeader}>
          <View>
            <Text style={[styles.planLabel, { color: colors.muted }]}>Current Plan</Text>
            <Text style={[styles.planName, { color: colors.foreground }]}>{tierInfo.name}</Text>
          </View>
          <View style={[styles.priceBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.priceText}>{tierInfo.price}</Text>
          </View>
        </View>

        <View style={styles.featuresList}>
          {tierInfo.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <IconSymbol name="checkmark" size={14} color={colors.success} />
              <Text style={[styles.featureText, { color: colors.foreground }]}>{feature}</Text>
            </View>
          ))}
        </View>

        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: colors.muted }]}>Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: colors.success + "20" }]}>
            <Text style={[styles.statusText, { color: colors.success }]}>
              {agency?.subscriptionStatus || "Active"}
            </Text>
          </View>
        </View>
      </View>

      {/* Available Plans */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Available Plans</Text>

      {Object.entries(AGENCY_TIERS).map(([key, tier]) => {
        const isCurrent = key === currentTier;

        return (
          <View
            key={key}
            style={[
              styles.planCard,
              {
                backgroundColor: colors.card,
                borderColor: isCurrent ? colors.primary : colors.border,
              },
            ]}
          >
            <View style={styles.planCardHeader}>
              <View>
                <Text style={[styles.planCardName, { color: colors.foreground }]}>{tier.name}</Text>
                <Text style={[styles.planCardPrice, { color: colors.primary }]}>{tier.price}</Text>
              </View>
              {isCurrent && (
                <View style={[styles.currentBadge, { backgroundColor: colors.primary + "20" }]}>
                  <Text style={[styles.currentBadgeText, { color: colors.primary }]}>Current</Text>
                </View>
              )}
            </View>

            <View style={styles.planCardFeatures}>
              {tier.features.slice(0, 3).map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <IconSymbol name="checkmark" size={12} color={colors.muted} />
                  <Text style={[styles.planCardFeatureText, { color: colors.muted }]}>{feature}</Text>
                </View>
              ))}
            </View>

            {!isCurrent && (
              <TouchableOpacity style={[styles.upgradeButton, { borderColor: colors.primary }]}>
                <Text style={[styles.upgradeButtonText, { color: colors.primary }]}>
                  {key === "enterprise" ? "Contact Sales" : "Upgrade"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {/* Billing Info */}
      <View style={[styles.billingInfo, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.billingInfoTitle, { color: colors.foreground }]}>Billing Information</Text>

        <TouchableOpacity style={[styles.billingLink, { borderBottomColor: colors.border }]}>
          <View style={styles.billingLinkLeft}>
            <IconSymbol name="creditcard" size={18} color={colors.muted} />
            <Text style={[styles.billingLinkText, { color: colors.foreground }]}>Payment Method</Text>
          </View>
          <IconSymbol name="chevron.right" size={14} color={colors.muted} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.billingLink, { borderBottomColor: colors.border }]}>
          <View style={styles.billingLinkLeft}>
            <IconSymbol name="doc.text" size={18} color={colors.muted} />
            <Text style={[styles.billingLinkText, { color: colors.foreground }]}>Invoices</Text>
          </View>
          <IconSymbol name="chevron.right" size={14} color={colors.muted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.billingLink}>
          <View style={styles.billingLinkLeft}>
            <IconSymbol name="envelope" size={18} color={colors.muted} />
            <Text style={[styles.billingLinkText, { color: colors.foreground }]}>Billing Email</Text>
          </View>
          <IconSymbol name="chevron.right" size={14} color={colors.muted} />
        </TouchableOpacity>
      </View>

      {/* Help Text */}
      <Text style={[styles.helpText, { color: colors.muted }]}>
        Questions about billing? Contact support@protocol-guide.com
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  currentPlan: {
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 24,
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  planLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  planName: {
    fontSize: 24,
    fontWeight: "700",
  },
  priceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  priceText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  featuresList: {
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  featureText: {
    fontSize: 14,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  statusLabel: {
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginHorizontal: 24,
    marginBottom: 12,
  },
  planCard: {
    marginHorizontal: 24,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  planCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  planCardName: {
    fontSize: 16,
    fontWeight: "600",
  },
  planCardPrice: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 2,
  },
  currentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  planCardFeatures: {
    marginBottom: 12,
  },
  planCardFeatureText: {
    fontSize: 13,
  },
  upgradeButton: {
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  billingInfo: {
    marginHorizontal: 24,
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  billingInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
    padding: 16,
    paddingBottom: 12,
  },
  billingLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  billingLinkLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  billingLinkText: {
    fontSize: 14,
  },
  helpText: {
    fontSize: 13,
    textAlign: "center",
    marginHorizontal: 24,
    marginBottom: 32,
  },
});
