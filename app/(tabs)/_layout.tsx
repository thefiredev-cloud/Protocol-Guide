import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Platform, View, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useAuthContext } from "@/lib/auth-context";

/**
 * Check if we're in E2E test mode
 * Bypasses auth loading spinner for faster E2E tests
 */
function isE2EMode(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  
  try {
    // Check localStorage flag (set by Playwright fixtures)
    if (localStorage.getItem("e2e-test-mode") === "true") return true;
    if (localStorage.getItem("e2e-authenticated") === "true") return true;
    
    // Check URL query param
    const url = new URL(window.location.href);
    if (url.searchParams.get("e2e") === "true") return true;
  } catch {
    // Ignore errors (SSR, localStorage unavailable)
  }
  
  return false;
}

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 52 + bottomPadding;
  const { loading } = useAuthContext();

  // Allow anonymous browsing - users can search without logging in
  // Authentication is only required for profile/personalization features
  // This enables "Try it now" from landing page without friction

  // Skip loading spinner in E2E mode for faster tests
  // E2E tests mock auth state directly, no need to wait for Supabase
  const skipLoadingSpinner = isE2EMode();

  // Show loading spinner while auth state is being determined (except in E2E)
  if (loading && !skipLoadingSpinner) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 6,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: {
          fontSize: 11,
        },
      }}
    >
      {/* Main search - the core experience */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Search",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="magnifyingglass" color={color} />,
        }}
      />
      
      {/* Calculator - medication dosing tool */}
      <Tabs.Screen
        name="calculator"
        options={{
          title: "Dosing",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="scalemass.fill" color={color} />,
        }}
      />

      {/* Profile - settings, favorites, account */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.fill" color={color} />,
        }}
      />

      {/* Hide non-essential tabs */}
      <Tabs.Screen
        name="coverage"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="history"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="search"
        options={{ href: null }}
      />
    </Tabs>
  );
}
