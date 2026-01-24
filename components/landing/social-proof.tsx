/**
 * Social Proof Components - Trust badges, star ratings, and testimonials
 *
 * Features:
 * - Star rating display with customizable rating and review count
 * - Trusted by badge with green active indicator
 * - Testimonial quote with author info
 * - Department usage indicator
 * - Animated entrance with staggered animations
 * - Full accessibility support
 * - Three-tier responsive design (mobile < 640, tablet 640-1024, desktop >= 1024)
 */

import * as React from "react";
import { View, Text, Animated } from "react-native";

const COLORS = {
  primaryRed: "#EF4444",
  bgSurface: "#1E293B",
  textWhite: "#F1F5F9",
  textMuted: "#94A3B8",
  border: "#334155",
  gold: "#FBBF24",
  green: "#22C55E",
};

/** Star icon component for rating display */
function StarIcon({ filled, size = 16 }: { filled: boolean; size?: number }) {
  return (
    <Text
      style={{
        color: filled ? COLORS.gold : COLORS.border,
        fontSize: size,
        lineHeight: size + 2,
      }}
    >
      {"\u2605"}
    </Text>
  );
}

interface StarRatingProps {
  rating: number;
  reviewCount: number;
}

/** Star rating display component */
export function StarRating({ rating, reviewCount }: StarRatingProps) {
  const fullStars = Math.floor(rating);
  const stars = Array(5).fill(0).map((_, i) => i < fullStars);

  return (
    <View style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 4 }}>
      <View style={{ display: "flex", flexDirection: "row", gap: 2 }}>
        {stars.map((filled, i) => (
          <StarIcon key={i} filled={filled} size={14} />
        ))}
      </View>
      <Text style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: "500" }}>
        {rating.toFixed(1)}
      </Text>
      <Text style={{ color: COLORS.border, fontSize: 13 }}>|</Text>
      <Text style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: "500" }}>
        {reviewCount.toLocaleString()} reviews
      </Text>
    </View>
  );
}

interface TrustedBadgeProps {
  userCount: string;
  rating: number;
  reviewCount: number;
  isMobile: boolean;
  opacity: Animated.Value;
  translateY: Animated.Value;
}

/** Trusted by badge with star rating */
export function TrustedBadge({
  userCount,
  rating,
  reviewCount,
  isMobile,
  opacity,
  translateY,
}: TrustedBadgeProps) {
  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
        marginBottom: isMobile ? 20 : 24,
      }}
    >
      <View
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: "center",
          gap: isMobile ? 8 : 12,
          backgroundColor: "rgba(30, 41, 59, 0.6)",
          paddingVertical: isMobile ? 10 : 12,
          paddingHorizontal: isMobile ? 16 : 20,
          borderRadius: 100,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
        accessibilityRole="text"
        accessibilityLabel={`Trusted by ${userCount} EMS professionals, rated ${rating} out of 5 stars`}
      >
        <View style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: COLORS.green,
            }}
          />
          <Text
            style={{
              color: COLORS.textWhite,
              fontSize: isMobile ? 13 : 14,
              fontWeight: "600",
              letterSpacing: 0.2,
            }}
          >
            Trusted by {userCount} EMS professionals
          </Text>
        </View>
        <StarRating rating={rating} reviewCount={reviewCount} />
      </View>
    </Animated.View>
  );
}

interface TestimonialQuoteProps {
  quote: string;
  authorName: string;
  authorTitle: string;
  authorOrg: string;
  authorInitials: string;
  isMobile: boolean;
  isTablet: boolean;
  opacity: Animated.Value;
  translateY: Animated.Value;
}

/** Testimonial quote with author info */
export function TestimonialQuote({
  quote,
  authorName,
  authorTitle,
  authorOrg,
  authorInitials,
  isMobile,
  isTablet,
  opacity,
  translateY,
}: TestimonialQuoteProps) {
  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
        marginTop: isMobile ? 32 : isTablet ? 40 : 48,
        maxWidth: isMobile ? 340 : isTablet ? 500 : 600,
      }}
    >
      <View
        style={{
          alignItems: "center",
          paddingHorizontal: isMobile ? 16 : 24,
        }}
      >
        <Text
          style={{
            color: COLORS.textMuted,
            fontSize: isMobile ? 15 : isTablet ? 16 : 17,
            fontStyle: "italic",
            textAlign: "center",
            lineHeight: isMobile ? 24 : isTablet ? 26 : 28,
            letterSpacing: 0.1,
          }}
        >
          {"\u201C"}{quote}{"\u201D"}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, gap: 8 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: COLORS.bgSurface,
              borderWidth: 1,
              borderColor: COLORS.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: COLORS.textWhite, fontSize: 12, fontWeight: "600" }}>
              {authorInitials}
            </Text>
          </View>
          <View>
            <Text style={{ color: COLORS.textWhite, fontSize: 13, fontWeight: "600" }}>
              {authorName}, {authorTitle}
            </Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
              {authorOrg}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

interface DepartmentUsageProps {
  stateCount: number;
  isMobile: boolean;
  opacity: Animated.Value;
}

/** Department usage indicator */
export function DepartmentUsage({ stateCount, isMobile, opacity }: DepartmentUsageProps) {
  return (
    <Animated.View
      style={{
        opacity,
        marginTop: isMobile ? 24 : 32,
      }}
    >
      <Text
        style={{
          color: COLORS.textMuted,
          fontSize: isMobile ? 12 : 13,
          fontWeight: "500",
          textAlign: "center",
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}
      >
        Used by departments across {stateCount} states
      </Text>
    </Animated.View>
  );
}

export default {
  StarRating,
  TrustedBadge,
  TestimonialQuote,
  DepartmentUsage,
};
