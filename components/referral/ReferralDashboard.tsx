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
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Share,
  Platform,
  Linking,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/Skeleton";
const { useState, useCallback } = React;

// ============ Constants ============

const COLORS = {
  bgDark: "#0F172A",
  bgSurface: "#1E293B",
  bgCard: "#334155",
  primaryRed: "#EF4444",
  primaryRedLight: "#F87171",
  textWhite: "#F1F5F9",
  textMuted: "#94A3B8",
  textDim: "#64748B",
  success: "#22C55E",
  warning: "#F59E0B",
  border: "#475569",
};

const TIER_COLORS = {
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#FFD700",
  platinum: "#E5E4E2",
  ambassador: "#EF4444",
};

const TIER_ICONS = {
  bronze: "B",
  silver: "S",
  gold: "G",
  platinum: "P",
  ambassador: "A",
};

// ============ Sub-Components ============

interface ShareButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
}

function ShareButton({ icon, label, onPress, color = COLORS.bgCard }: ShareButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? COLORS.border : color,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: "center",
        flex: 1,
        marginHorizontal: 4,
      })}
    >
      <Text style={{ fontSize: 20, marginBottom: 4 }}>{icon}</Text>
      <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: "500" }}>
        {label}
      </Text>
    </Pressable>
  );
}

interface StatCardProps {
  value: string | number;
  label: string;
  highlight?: boolean;
}

function StatCard({ value, label, highlight }: StatCardProps) {
  return (
    <View
      style={{
        backgroundColor: highlight ? COLORS.primaryRed + "20" : COLORS.bgCard,
        borderRadius: 8,
        padding: 12,
        flex: 1,
        marginHorizontal: 4,
        alignItems: "center",
      }}
    >
      <Text
        style={{
          color: highlight ? COLORS.primaryRed : COLORS.textWhite,
          fontSize: 24,
          fontWeight: "700",
        }}
      >
        {value}
      </Text>
      <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

interface TierBadgeProps {
  tier: string;
  size?: "small" | "large";
}

function TierBadge({ tier, size = "small" }: TierBadgeProps) {
  const tierKey = tier.toLowerCase() as keyof typeof TIER_COLORS;
  const color = TIER_COLORS[tierKey] || COLORS.textMuted;
  const icon = TIER_ICONS[tierKey] || "?";
  const dimensions = size === "large" ? 40 : 24;

  return (
    <View
      style={{
        width: dimensions,
        height: dimensions,
        borderRadius: dimensions / 2,
        backgroundColor: color + "30",
        borderWidth: 2,
        borderColor: color,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: color,
          fontSize: size === "large" ? 18 : 12,
          fontWeight: "700",
        }}
      >
        {icon}
      </Text>
    </View>
  );
}

interface ProgressBarProps {
  progress: number;
  label: string;
}

function ProgressBar({ progress, label }: ProgressBarProps) {
  return (
    <View style={{ marginTop: 12 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>{label}</Text>
        <Text style={{ color: COLORS.textWhite, fontSize: 12, fontWeight: "600" }}>
          {progress}%
        </Text>
      </View>
      <View
        style={{
          height: 6,
          backgroundColor: COLORS.bgCard,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${Math.min(progress, 100)}%`,
            height: "100%",
            backgroundColor: COLORS.primaryRed,
            borderRadius: 3,
          }}
        />
      </View>
    </View>
  );
}

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

  // ============ Share Handlers ============

  const handleCopyCode = useCallback(async () => {
    if (!codeData?.code) return;

    await Clipboard.setStringAsync(codeData.code);
    setCopied(true);

    // Clear existing timer before setting new one
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);

    trackEvent.mutate({
      eventType: "referral_code_copied",
      metadata: { referralCode: codeData.code },
    });
  }, [codeData?.code, trackEvent]);

  const handleShareSMS = useCallback(async () => {
    if (!templates?.sms) return;

    trackEvent.mutate({
      eventType: "referral_code_shared",
      metadata: { shareMethod: "sms", referralCode: templates.code },
    });

    const smsUrl = Platform.select({
      ios: `sms:&body=${encodeURIComponent(templates.sms)}`,
      android: `sms:?body=${encodeURIComponent(templates.sms)}`,
      default: `sms:?body=${encodeURIComponent(templates.sms)}`,
    });

    if (Platform.OS === "web") {
      await Share.share({ message: templates.sms });
    } else {
      await Linking.openURL(smsUrl);
    }
  }, [templates, trackEvent]);

  const handleShareWhatsApp = useCallback(async () => {
    if (!templates?.whatsapp) return;

    trackEvent.mutate({
      eventType: "referral_code_shared",
      metadata: { shareMethod: "whatsapp", referralCode: templates.code },
    });

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(templates.whatsapp)}`;

    if (Platform.OS === "web") {
      window.open(whatsappUrl, "_blank");
    } else {
      await Linking.openURL(whatsappUrl);
    }
  }, [templates, trackEvent]);

  const handleShareEmail = useCallback(async () => {
    if (!templates?.email) return;

    trackEvent.mutate({
      eventType: "referral_code_shared",
      metadata: { shareMethod: "email", referralCode: templates.code },
    });

    const emailUrl = `mailto:?subject=${encodeURIComponent(templates.email.subject)}&body=${encodeURIComponent(templates.email.body)}`;
    await Linking.openURL(emailUrl);
  }, [templates, trackEvent]);

  const handleNativeShare = useCallback(async () => {
    if (!templates?.generic) return;

    trackEvent.mutate({
      eventType: "share_button_tapped",
      metadata: { referralCode: templates.code },
    });

    try {
      await Share.share({
        message: templates.generic,
        url: templates.shareUrl,
      });
      trackEvent.mutate({
        eventType: "social_share_completed",
        metadata: { referralCode: templates.code },
      });
    } catch {
      // User cancelled share
    }
  }, [templates, trackEvent]);

  // ============ Loading State ============

  if (codeLoading || statsLoading) {
    return (
      <View style={{ gap: 16 }}>
        {/* Header Skeleton */}
        <View
          style={{
            backgroundColor: COLORS.bgSurface,
            borderRadius: 12,
            padding: 20,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
            <Skeleton width={200} height={20} style={{ marginRight: "auto" }} />
            <Skeleton variant="circle" width={40} height={40} />
          </View>
          <Skeleton width="100%" height={14} style={{ marginBottom: 8 }} />
          <Skeleton width="80%" height={14} style={{ marginBottom: 20 }} />

          {/* Code box skeleton */}
          <View
            style={{
              backgroundColor: COLORS.bgDark,
              borderRadius: 8,
              padding: 16,
            }}
          >
            <Skeleton width={120} height={11} style={{ marginBottom: 8 }} />
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Skeleton width={150} height={28} style={{ marginRight: "auto" }} />
              <Skeleton width={60} height={32} borderRadius={6} />
            </View>
          </View>

          {/* Share buttons skeleton */}
          <View style={{ flexDirection: "row", marginTop: 16, gap: 8 }}>
            <Skeleton width={70} height={50} borderRadius={8} style={{ flex: 1 }} />
            <Skeleton width={70} height={50} borderRadius={8} style={{ flex: 1 }} />
            <Skeleton width={70} height={50} borderRadius={8} style={{ flex: 1 }} />
            <Skeleton width={70} height={50} borderRadius={8} style={{ flex: 1 }} />
          </View>
        </View>

        {/* Stats Skeleton */}
        <View
          style={{
            backgroundColor: COLORS.bgSurface,
            borderRadius: 12,
            padding: 20,
          }}
        >
          <Skeleton width={140} height={16} style={{ marginBottom: 16 }} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1, backgroundColor: COLORS.bgCard, borderRadius: 8, padding: 12, alignItems: "center" }}>
              <Skeleton width={40} height={24} style={{ marginBottom: 4 }} />
              <Skeleton width={60} height={11} />
            </View>
            <View style={{ flex: 1, backgroundColor: COLORS.bgCard, borderRadius: 8, padding: 12, alignItems: "center" }}>
              <Skeleton width={40} height={24} style={{ marginBottom: 4 }} />
              <Skeleton width={60} height={11} />
            </View>
            <View style={{ flex: 1, backgroundColor: COLORS.bgCard, borderRadius: 8, padding: 12, alignItems: "center" }}>
              <Skeleton width={40} height={24} style={{ marginBottom: 4 }} />
              <Skeleton width={60} height={11} />
            </View>
          </View>
        </View>
      </View>
    );
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
