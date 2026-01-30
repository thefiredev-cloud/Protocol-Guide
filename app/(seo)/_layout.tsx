/**
 * SEO Routes Layout
 * 
 * These routes are optimized for search engines and render
 * full content server-side (not SPA navigation).
 */

import { Stack } from "expo-router";

export default function SEOLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
      }}
    />
  );
}
