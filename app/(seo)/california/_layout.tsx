/**
 * California Routes Layout
 */

import { Stack } from "expo-router";

export default function CaliforniaLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
      }}
    />
  );
}
