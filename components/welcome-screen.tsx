import { View, Text, TouchableOpacity, Image, Pressable, StyleSheet } from "react-native";
import { ScreenContainer } from "./screen-container";
import { useColors } from "@/hooks/use-colors";
import { signInWithGoogle } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { IconSymbol } from "./ui/icon-symbol";

export function WelcomeScreen() {
  const colors = useColors();
  const router = useRouter();

  const handleLogin = async () => {
    // Use Supabase OAuth - redirects to Google sign-in
    await signInWithGoogle();
  };

  return (
    <ScreenContainer className="px-6" edges={["top", "bottom", "left", "right"]}>
      <View className="flex-1 justify-between py-8">
        {/* Top section with logo and branding */}
        <View className="items-center pt-8">
          {/* Logo with subtle shadow */}
          <View style={styles.logoContainer}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* App name with refined typography */}
          <Text style={styles.appName}>
            Protocol Guide
          </Text>

          {/* Tagline */}
          <Text className="text-base text-muted text-center mt-2 tracking-wide">
            EMS Protocol Retrieval
          </Text>
        </View>

        {/* Middle section - Feature cards */}
        <View className="w-full px-2">
          <FeatureCard
            icon="magnifyingglass"
            title="Instant Search"
            description="Find any protocol in seconds with AI-powered semantic search"
            color={colors.primary}
          />
          <FeatureCard
            icon="doc.text.fill"
            title="Citation-Backed"
            description="Every response includes direct protocol references"
            color={colors.primary}
          />
          <FeatureCard
            icon="mic.fill"
            title="Voice Input"
            description="Hands-free queries designed for field use"
            color={colors.primary}
          />
        </View>

        {/* Bottom section - CTA and legal */}
        <View className="items-center">
          {/* Primary CTA button */}
          <TouchableOpacity
            onPress={handleLogin}
            style={[styles.ctaButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.9}
          >
            <Text style={styles.ctaText}>
              Get Started
            </Text>
            <IconSymbol name="chevron.right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
          </TouchableOpacity>

          {/* Secondary text */}
          <Text className="text-sm text-muted mt-4 mb-2">
            Free • 5 lookups per day
          </Text>

          {/* Legal links */}
          <View className="flex-row flex-wrap justify-center px-4">
            <Pressable onPress={() => router.push("/terms" as any)} hitSlop={8}>
              <Text className="text-xs text-muted underline">Terms</Text>
            </Pressable>
            <Text className="text-xs text-muted mx-2">•</Text>
            <Pressable onPress={() => router.push("/privacy" as any)} hitSlop={8}>
              <Text className="text-xs text-muted underline">Privacy</Text>
            </Pressable>
            <Text className="text-xs text-muted mx-2">•</Text>
            <Pressable onPress={() => router.push("/disclaimer" as any)} hitSlop={8}>
              <Text className="text-xs text-muted underline">Medical Disclaimer</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  color,
}: {
  icon: string;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <View style={styles.featureCard}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}10` }]}>
        <IconSymbol name={icon as any} size={22} color={color} />
      </View>
      <View className="flex-1 ml-4">
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

// Dynamic styles that need colors from hook
function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    logoContainer: {
      width: 100,
      height: 100,
      borderRadius: 24,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 4,
      marginBottom: 20,
    },
    logo: {
      width: 72,
      height: 72,
    },
    appName: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    featureCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 1,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    featureTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 2,
    },
    featureDescription: {
      fontSize: 13,
      color: colors.muted,
      lineHeight: 18,
    },
    ctaButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      maxWidth: 320,
      paddingVertical: 16,
      paddingHorizontal: 32,
      borderRadius: 14,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 4,
    },
    ctaText: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '600',
      letterSpacing: 0.3,
    },
  });
}
