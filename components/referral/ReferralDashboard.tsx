/**
 * Referral Dashboard Component
 *
 * Shows user's referral code, stats, sharing options,
 * and progress toward reward tiers.
 *
 * Designed for the EMS "crew" culture - emphasizes
 * sharing with partners and department colleagues.
 */

import * as React from "react";
import { View, Text, Pressable } from "react-native";
import { trpc } from "@/lib/trpc";
import {
  ShareButton,
  StatCard,
  TierBadge,
  ProgressBar,
  LoadingSkeleton,
  RewardsInfo,
  COLORS
} from "./index";
import { useShareHandlers } from "@/hooks/use-share-handlers";

const { useState } = React;

// ============ Main Component ============

export function ReferralDashboard() {
  const [copied, setCopied] = useState(false);
  const copyTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  // Fetch referral code
  const {
    data: codeData,
    isLoading: codeLoading,
    error: codeError,
  } = trpc.referral.getMyReferralCode.useQuery();

  // Fetch stats
  const {
    data: statsData,
    isLoading: statsLoading,
  } = trpc.referral.getMyStats.useQuery();

  // Fetch share templates
  const { data: templates } = trpc.referral.getShareTemplates.useQuery();

  // Track viral events
  const trackEvent = trpc.referral.trackViralEvent.useMutation();

  // Handle copy success callback
  const handleCopySuccess = React.useCallback(() => {
    setCopied(true);
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  }, []);

  // Share handlers from custom hook
  const {
    handleCopyCode,
    handleShareSMS,
    handleShareWhatsApp,
    handleShareEmail,
    handleNativeShare,
  } = useShareHandlers({
    referralCode: codeData?.code,
    templates,
    trackEvent,
    onCopySuccess: handleCopySuccess,
  });

  // ============ Loading State ============

  if (codeLoading || statsLoading) {
    return <LoadingSkeleton />;
  }

  // ============ Error State ============

  if (codeError) {
    return (
      <View
        style={{
          backgroundColor: COLORS.bgSurface,
          borderRadius: 12,
          padding: 24,
        }}
      >
        <Text style={{ color: COLORS.primaryRed, textAlign: "center" }}>
          Unable to load referral program. Please try again later.
        </Text>
      </View>
    );
  }

  // ============ Main Render ============

  return (
    <View style={{ gap: 16 }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: COLORS.bgSurface,
          borderRadius: 12,
          padding: 20,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Text style={{ color: COLORS.textWhite, fontSize: 18, fontWeight: "700", flex: 1 }}>
            Share with Your Crew
          </Text>
          {statsData && <TierBadge tier={statsData.currentTier} size="large" />}
        </View>

        <Text style={{ color: COLORS.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 20 }}>
          Invite your partners and department to Protocol Guide. You both get rewards when they sign up.
        </Text>

        {/* Referral Code Display */}
        <View
          style={{
            backgroundColor: COLORS.bgDark,
            borderRadius: 8,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            borderStyle: "dashed",
          }}
        >
          <Text style={{ color: COLORS.textMuted, fontSize: 11, marginBottom: 4 }}>
            YOUR REFERRAL CODE
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text
              style={{
                color: COLORS.textWhite,
                fontSize: 28,
                fontWeight: "700",
                letterSpacing: 2,
                flex: 1,
              }}
            >
              {codeData?.code || "---"}
            </Text>
            <Pressable
              onPress={handleCopyCode}
              style={({ pressed }) => ({
                backgroundColor: pressed ? COLORS.primaryRedLight : COLORS.primaryRed,
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 6,
              })}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 14 }}>
                {copied ? "Copied!" : "Copy"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Share Buttons */}
        <View style={{ flexDirection: "row", marginTop: 16, marginHorizontal: -4 }}>
          <ShareButton icon="💬" label="SMS" onPress={handleShareSMS} />
          <ShareButton icon="📱" label="WhatsApp" onPress={handleShareWhatsApp} color="#25D366" />
          <ShareButton icon="📧" label="Email" onPress={handleShareEmail} />
          <ShareButton icon="📤" label="Share" onPress={handleNativeShare} color={COLORS.primaryRed} />
        </View>
      </View>

      {/* Stats Section */}
      {statsData && (
        <View
          style={{
            backgroundColor: COLORS.bgSurface,
            borderRadius: 12,
            padding: 20,
          }}
        >
          <Text style={{ color: COLORS.textWhite, fontSize: 16, fontWeight: "600", marginBottom: 16 }}>
            Your Referral Stats
          </Text>

          <View style={{ flexDirection: "row", marginHorizontal: -4 }}>
            <StatCard value={statsData.totalReferrals} label="Total Referrals" highlight />
            <StatCard value={statsData.successfulReferrals} label="Converted" />
            <StatCard value={`${statsData.proDaysEarned}d`} label="Pro Earned" />
          </View>

          {/* Tier Progress */}
          {statsData.nextTierName && (
            <ProgressBar
              progress={statsData.nextTierProgress}
              label={`${statsData.referralsToNextTier} more to ${statsData.nextTierName.charAt(0).toUpperCase() + statsData.nextTierName.slice(1)} tier`}
            />
          )}
        </View>
      )}

      {/* Rewards Info */}
      <View
        style={{
          backgroundColor: COLORS.bgSurface,
          borderRadius: 12,
          padding: 20,
        }}
      >
        <Text style={{ color: COLORS.textWhite, fontSize: 16, fontWeight: "600", marginBottom: 12 }}>
          Rewards
        </Text>

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success, marginRight: 10 }} />
            <Text style={{ color: COLORS.textMuted, fontSize: 14, flex: 1 }}>
              Each signup: <Text style={{ color: COLORS.textWhite, fontWeight: "600" }}>7 days Pro free</Text>
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: TIER_COLORS.silver, marginRight: 10 }} />
            <Text style={{ color: COLORS.textMuted, fontSize: 14, flex: 1 }}>
              3 referrals: <Text style={{ color: COLORS.textWhite, fontWeight: "600" }}>+30 days bonus</Text>
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: TIER_COLORS.gold, marginRight: 10 }} />
            <Text style={{ color: COLORS.textMuted, fontSize: 14, flex: 1 }}>
              5 referrals: <Text style={{ color: COLORS.textWhite, fontWeight: "600" }}>6 months Pro free</Text>
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: TIER_COLORS.platinum, marginRight: 10 }} />
            <Text style={{ color: COLORS.textMuted, fontSize: 14, flex: 1 }}>
              10 referrals: <Text style={{ color: COLORS.textWhite, fontWeight: "600" }}>1 year Pro free</Text>
            </Text>
          </View>
        </View>

        <Text style={{ color: COLORS.textDim, fontSize: 12, marginTop: 12, fontStyle: "italic" }}>
          Your crew member also gets a 14-day Pro trial (vs 7-day standard).
        </Text>
      </View>
    </View>
  );
}

export default ReferralDashboard;
