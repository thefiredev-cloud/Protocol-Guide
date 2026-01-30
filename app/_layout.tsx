import "@/global.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
// Platform-specific wrapper - uses plain View on web, GestureHandler on native
import { GestureHandlerRootView } from "@/components/gesture-handler-wrapper";
// NOTE: react-native-reanimated is imported by lazy-loaded components that need it
// Removing eager import here reduces initial bundle by ~300KB
import { Platform } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Rect } from "react-native-safe-area-context";

import { trpc, createTRPCClient } from "@/lib/trpc";
import { AppProvider } from "@/lib/app-context";
import { AuthProvider } from "@/lib/auth-context";
import { registerServiceWorker } from "@/lib/register-sw";
import { ErrorBoundary, NavigationErrorBoundary } from "@/components/ErrorBoundary";
import { InstallPrompt } from "@/components/InstallPrompt";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { createOptimizedQueryClient } from "@/lib/query-client";

// Wrapper component to initialize push notifications inside provider context
function PushNotificationInitializer({ children }: { children: React.ReactNode }) {
  // Initialize push notifications for authenticated users
  usePushNotifications();
  return <>{children}</>;
}

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  // Landing page is the initial route; auth redirects to (tabs)
  initialRouteName: "index",
};

export default function RootLayout() {
  const insets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const frame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  // Register service worker for PWA
  useEffect(() => {
    if (Platform.OS === "web") {
      const cleanup = registerServiceWorker();
      return cleanup;
    }
  }, []);

  // Create optimized query client for EMS field use
  // Features: aggressive caching, smart retries, offline-first
  const [queryClient] = useState(() => createOptimizedQueryClient());
  const [trpcClient] = useState(() => createTRPCClient());

  // Ensure minimum padding for top and bottom on mobile
  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets, frame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [insets, frame]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary
          section="general"
          errorTitle="Application Error"
          errorMessage="Something went wrong. Please restart the app."
        >
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            {/* Default to hiding native headers so raw route segments don't appear (e.g. "(tabs)", "products/[id]"). */}
            {/* If a screen needs the native header, explicitly enable it and set a human title via Stack.Screen options. */}
            <AuthProvider>
              <AppProvider>
                <PushNotificationInitializer>
                  <NavigationErrorBoundary>
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="index" options={{ headerShown: false }} />
                      <Stack.Screen name="(tabs)" />
                      <Stack.Screen name="tools" />
                      <Stack.Screen name="oauth/callback" />
                    </Stack>
                  </NavigationErrorBoundary>
                  <InstallPrompt />
                </PushNotificationInitializer>
              </AppProvider>
            </AuthProvider>
            <StatusBar style="auto" />
          </QueryClientProvider>
        </trpc.Provider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>
              {content}
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}
