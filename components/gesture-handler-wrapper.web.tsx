/**
 * Web-specific wrapper - uses plain View instead of GestureHandlerRootView
 * GestureHandler is not needed on web (browser handles gestures natively)
 * This reduces the web bundle by ~150KB
 */
import { View, ViewProps } from "react-native";
import React from "react";

export function GestureHandlerRootView({ 
  children, 
  style,
  ...props 
}: ViewProps & { children: React.ReactNode }) {
  return (
    <View style={[{ flex: 1 }, style]} {...props}>
      {children}
    </View>
  );
}
