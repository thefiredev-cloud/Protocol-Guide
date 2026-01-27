import { Tabs, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useRef } from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Platform, View, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 52 + bottomPadding;
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const hasRedirected = useRef(false);

  // Allow E2E tests to bypass authentication
  const isE2ETest = Platform.OS === "web" && typeof window !== "undefined" &&
    (window.location.search.includes("e2e=true") || process.env.NODE_ENV === "test");

  // Redirect to landing if not authenticated (imperative to avoid render loops)
  useEffect(() => {
    if (!isE2ETest && !loading && !isAuthenticated && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace("/");
    }
  }, [loading, isAuthenticated, router, isE2ETest]);

  // Reset redirect flag when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      hasRedirected.current = false;
    }
  }, [isAuthenticated]);

  // Show loading while checking auth or redirecting (unless E2E test)
  if (!isE2ETest && (loading || (!isAuthenticated && !hasRedirected.current))) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // If not authenticated and already redirected, show loading (navigation in progress)
  if (!isE2ETest && !isAuthenticated) {
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
