import { Tabs, Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

  // Allow E2E tests to bypass authentication
  const isE2ETest = Platform.OS === "web" && typeof window !== "undefined" &&
    (window.location.search.includes("e2e=true") || process.env.NODE_ENV === "test");

  // Show loading while checking auth
  if (!isE2ETest && loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Redirect to landing if not authenticated
  // Using Redirect component instead of router.replace() to avoid race conditions
  if (!isE2ETest && !isAuthenticated) {
    return <Redirect href="/" />;
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
