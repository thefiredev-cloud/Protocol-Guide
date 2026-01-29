/**
 * Tools Layout
 * 
 * Public tools that don't require authentication.
 * These are standalone utilities for EMS professionals.
 */

import { Stack } from 'expo-router';

export default function ToolsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Prevent gesture-based navigation on calculator for better slider UX
        gestureEnabled: false,
      }}
    >
      <Stack.Screen 
        name="dosing-calculator" 
        options={{
          title: 'Pediatric Dosing Calculator',
        }}
      />
      <Stack.Screen 
        name="rosc-checklist" 
        options={{
          title: 'Post-ROSC Bundle Checklist',
        }}
      />
      <Stack.Screen 
        name="arrest-timer" 
        options={{
          title: 'Cardiac Arrest Timer',
        }}
      />
      <Stack.Screen 
        name="quick-reference" 
        options={{
          title: 'Quick Reference Cards',
        }}
      />
      <Stack.Screen 
        name="compare" 
        options={{
          title: 'Protocol Comparison',
        }}
      />
    </Stack>
  );
}
