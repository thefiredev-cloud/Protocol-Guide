/**
 * Email Capture Section - Early access signup form
 * Features: Enhanced focus glow, loading spinner, celebration animation, rich validation feedback
 */

import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  FadeIn,
  FadeInDown,
  interpolate,
} from "react-native-reanimated";

const COLORS = {
  bgDark: "#0F172A",
  textWhite: "#F1F5F9",
  textMuted: "#94A3B8",
  primaryRed: "#EF4444",
  primaryRedHover: "#DC2626",
  primaryRedActive: "#B91C1C",
  border: "#334155",
  borderFocus: "#EF4444",
  bgSurface: "#1E293B",
  errorRed: "#EF4444",
  errorBg: "#451a1a",
  successGreen: "#10B981",
  successBg: "#064e3b",
  successBorder: "#10B981",
  focusGlow: "rgba(239, 68, 68, 0.35)",
  errorGlow: "rgba(239, 68, 68, 0.3)",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type ValidationState = "idle" | "invalid" | "valid";

function validateEmail(email: string): ValidationState {
  if (!email) return "idle";
  return EMAIL_REGEX.test(email) ? "valid" : "invalid";
}

// Animated Checkmark with Celebration Effect
function AnimatedCheckmark() {
  const scale = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    // Initial pop-in with bounce
    scale.value = withSequence(
      withSpring(1.2, { damping: 8, stiffness: 150 }),
      withSpring(1, { damping: 12, stiffness: 200 })
    );
    // Continuous subtle pulse
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * pulseScale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: "#10B981",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
          shadowColor: "#10B981",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 8,
        },
        animatedStyle,
      ]}
    >
      <Text style={{ fontSize: 32, color: "#FFFFFF", fontWeight: "bold" }}>✓</Text>
    </Animated.View>
  );
}

// Web Email Input with Enhanced Focus Glow
function WebEmailInput({
  email,
  setEmail,
  onSubmit,
  validationState,
  isFocused,
  setIsFocused,
  isLoading,
}: {
  email: string;
  setEmail: (value: string) => void;
  onSubmit: () => void;
  validationState: ValidationState;
  isFocused: boolean;
  setIsFocused: (value: boolean) => void;
  isLoading: boolean;
}) {
  const getBorderColor = () => {
    if (validationState === "invalid" && !isFocused) return COLORS.errorRed;
    if (isFocused) return COLORS.borderFocus;
    return COLORS.border;
  };

  const getBoxShadow = () => {
    if (isFocused) {
      return validationState === "invalid"
        ? `0 0 0 4px ${COLORS.errorGlow}, 0 4px 12px rgba(220, 38, 38, 0.1)`
        : `0 0 0 4px ${COLORS.focusGlow}, 0 4px 16px rgba(155, 35, 53, 0.15), 0 0 24px rgba(155, 35, 53, 0.1)`;
    }
    return "0 1px 3px rgba(0, 0, 0, 0.05)";
  };

  return (
    <input
      type="email"
      placeholder="Enter your work email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && !isLoading && onSubmit()}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      disabled={isLoading}
      aria-invalid={validationState === "invalid"}
      aria-describedby={validationState === "invalid" ? "email-error" : undefined}
      style={{
        width: "100%",
        height: 52,
        paddingLeft: 16,
        paddingRight: 16,
        fontSize: 16,
        borderRadius: 8,
        border: `2px solid ${getBorderColor()}`,
        backgroundColor: validationState === "invalid" && !isFocused ? COLORS.errorBg : COLORS.bgSurface,
        outline: "none",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: getBoxShadow(),
        opacity: isLoading ? 0.7 : 1,
        cursor: isLoading ? "not-allowed" : "text",
      }}
    />
  );
}

// Native Email Input with Focus Feedback
function NativeEmailInput({
  email,
  setEmail,
  validationState,
  isFocused,
  setIsFocused,
  isLoading,
}: {
  email: string;
  setEmail: (value: string) => void;
  validationState: ValidationState;
  isFocused: boolean;
  setIsFocused: (value: boolean) => void;
  isLoading: boolean;
}) {
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    glowOpacity.value = withTiming(isFocused ? 1 : 0, { duration: 200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const getBorderColor = () => {
    if (validationState === "invalid" && !isFocused) return COLORS.errorRed;
    if (isFocused) return COLORS.borderFocus;
    return COLORS.border;
  };

  return (
    <View>
      {isFocused && (
        <Animated.View
          style={[
            {
              position: "absolute",
              top: -4,
              left: -4,
              right: -4,
              bottom: -4,
              borderRadius: 12,
              backgroundColor: validationState === "invalid" ? COLORS.errorGlow : COLORS.focusGlow,
            },
            glowStyle,
          ]}
        />
      )}
      <TextInput
        placeholder="Enter your work email"
        placeholderTextColor={COLORS.textMuted}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!isLoading}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{
          height: 52,
          paddingHorizontal: 16,
          fontSize: 16,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: getBorderColor(),
          backgroundColor: validationState === "invalid" && !isFocused ? COLORS.errorBg : COLORS.bgSurface,
          color: COLORS.textWhite,
          opacity: isLoading ? 0.7 : 1,
        }}
      />
    </View>
  );
}

// Enhanced Submit Button with Elevation
function SubmitButton({ onPress, isLoading, disabled }: { onPress: () => void; isLoading: boolean; disabled: boolean }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const scale = useSharedValue(1);
  const elevation = useSharedValue(0);

  const handlePressIn = () => {
    setIsPressed(true);
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
    elevation.value = withTiming(0, { duration: 100 });
  };

  const handlePressOut = () => {
    setIsPressed(false);
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    elevation.value = withTiming(isHovered ? 8 : 4, { duration: 200 });
  };

  useEffect(() => {
    elevation.value = withTiming(isHovered && !disabled ? 8 : 4, { duration: 200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHovered, disabled]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: interpolate(elevation.value, [0, 8], [0.1, 0.3]),
    shadowRadius: elevation.value,
  }));

  const getBackgroundColor = () => {
    if (disabled) return "#CBD5E1";
    if (isPressed) return COLORS.primaryRedActive;
    if (isHovered) return COLORS.primaryRedHover;
    return COLORS.primaryRed;
  };

  const buttonContent = (
    <Animated.View
      style={[
        {
          backgroundColor: getBackgroundColor(),
          paddingHorizontal: 24,
          paddingVertical: 14,
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
          minWidth: 160,
          flexDirection: "row",
          shadowColor: COLORS.primaryRed,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        },
        animatedStyle,
      ]}
    >
      {isLoading && <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />}
      <Text style={{ color: disabled ? "#64748B" : "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
        {isLoading ? "Submitting..." : "Get Early Access"}
      </Text>
    </Animated.View>
  );

  if (Platform.OS === "web") {
    return (
      <View
        // @ts-expect-error - Web-specific mouse events and cursor style
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsPressed(false);
        }}
        style={{ cursor: disabled || isLoading ? "not-allowed" : "pointer" } as any}
      >
        <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={disabled || isLoading}>
          {buttonContent}
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={disabled || isLoading}>
      {buttonContent}
    </Pressable>
  );
}

// Validation Error with Icon
function ValidationError({ message }: { message: string }) {
  return (
    <Animated.View entering={FadeInDown.duration(200)} style={{ marginTop: 8, flexDirection: "row", alignItems: "center" }}>
      <Text style={{ color: COLORS.errorRed, fontSize: 16, marginRight: 4 }}>⚠</Text>
      <Text id="email-error" style={{ color: COLORS.errorRed, fontSize: 13, fontWeight: "500" }}>
        {message}
      </Text>
    </Animated.View>
  );
}

// Success State with Celebration
function SuccessState() {
  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={{
        backgroundColor: COLORS.successBg,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: COLORS.successBorder,
        padding: 32,
        alignItems: "center",
      }}
    >
      <AnimatedCheckmark />

      <Animated.Text
        entering={FadeInDown.delay(200).duration(300)}
        style={{ color: COLORS.successGreen, fontSize: 22, fontWeight: "700", textAlign: "center" }}
      >
        You&apos;re on the list!
      </Animated.Text>

      <Animated.Text
        entering={FadeInDown.delay(350).duration(300)}
        style={{ color: "#047857", fontSize: 15, textAlign: "center", marginTop: 8, lineHeight: 22 }}
      >
        We&apos;ll be in touch when early access opens.{"\n"}Check your inbox for a confirmation email.
      </Animated.Text>
    </Animated.View>
  );
}

// Main Component
export function EmailCaptureSection() {
  const { width } = useWindowDimensions();
  // Three-tier responsive breakpoints
  const isMobile = width < 640;
  const isTablet = width >= 640 && width < 1024;

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const sectionProgress = useSharedValue(0);

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !isVisible) {
              setIsVisible(true);
              sectionProgress.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
            }
          });
        },
        { threshold: 0.2 }
      );

      const timer = setTimeout(() => {
        const element = document.getElementById("email-capture-section");
        if (element) observer.observe(element);
      }, 100);

      return () => {
        clearTimeout(timer);
        observer.disconnect();
      };
    } else {
      setIsVisible(true);
      sectionProgress.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    }
  }, [sectionProgress, isVisible]);

  const animatedSectionStyle = useAnimatedStyle(() => ({
    opacity: sectionProgress.value,
    transform: [{ translateY: interpolate(sectionProgress.value, [0, 1], [30, 0]) }],
  }));

  const validationState = validateEmail(email);
  const isValidEmail = validationState === "valid";
  const showError = showValidation && validationState === "invalid" && email.length > 0;

  const handleSubmit = useCallback(async () => {
    setShowValidation(true);
    if (!isValidEmail) return;

    setIsLoading(true);
    try {
      // Simulate API call - replace with actual backend submission
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log("Email submitted:", email);
      setSubmitted(true);
    } catch (error) {
      console.error("Submission failed:", error);
    } finally {
      setIsLoading(false);
    }
  }, [email, isValidEmail]);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (showValidation && validateEmail(value) === "valid") {
      setShowValidation(false);
    }
  };

  return (
    <View style={{ backgroundColor: COLORS.bgDark, paddingVertical: isMobile ? 48 : isTablet ? 56 : 64 }} nativeID="email-capture-section">
      <Animated.View
        style={[{ paddingHorizontal: isMobile ? 16 : isTablet ? 32 : 24, maxWidth: 600, alignSelf: "center", width: "100%" }, animatedSectionStyle]}
      >
        <Text style={{ color: COLORS.textWhite, fontSize: isMobile ? 26 : isTablet ? 28 : 30, fontWeight: "700", textAlign: "center", marginBottom: isMobile ? 14 : 16 }}>
          Ready to upgrade your response?
        </Text>

        <Text style={{ color: COLORS.textMuted, fontSize: isMobile ? 15 : isTablet ? 16 : 17, textAlign: "center", marginBottom: isMobile ? 28 : isTablet ? 32 : 36, lineHeight: isMobile ? 22 : 24 }}>
          Join the medics and departments already switching{"\n"}to the new standard of care.
        </Text>

        {submitted ? (
          <SuccessState />
        ) : (
          <View>
            <View style={{ flexDirection: isMobile ? "column" : "row", gap: 12, alignItems: isMobile ? "stretch" : "flex-start" }}>
              <View style={{ flex: 1, width: "100%" }}>
                {Platform.OS === "web" ? (
                  <WebEmailInput
                    email={email}
                    setEmail={handleEmailChange}
                    onSubmit={handleSubmit}
                    validationState={showValidation ? validationState : "idle"}
                    isFocused={isFocused}
                    setIsFocused={setIsFocused}
                    isLoading={isLoading}
                  />
                ) : (
                  <NativeEmailInput
                    email={email}
                    setEmail={handleEmailChange}
                    validationState={showValidation ? validationState : "idle"}
                    isFocused={isFocused}
                    setIsFocused={setIsFocused}
                    isLoading={isLoading}
                  />
                )}

                {showError && <ValidationError message="Please enter a valid email address" />}
              </View>

              <SubmitButton onPress={handleSubmit} isLoading={isLoading} disabled={!email} />
            </View>

            <Text style={{ color: COLORS.textMuted, fontSize: 12, textAlign: "center", marginTop: 16, opacity: 0.8 }}>
              No spam, ever. Unsubscribe anytime.
            </Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

export default EmailCaptureSection;
