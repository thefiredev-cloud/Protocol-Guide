/**
 * Cardiac Arrest Timer Route
 * 
 * Public route: /tools/arrest-timer
 * No authentication required.
 * 
 * Real-time cardiac arrest management assistant per LA County Protocol 1210.
 * Designed for one-hand, gloved operation in emergency situations.
 * 
 * Features:
 * - Large touch targets for gloved use
 * - Dark mode optimized for low-light environments
 * - Audio/vibration alerts for medication timing
 * - Works fully offline
 */

import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { ArrestTimer } from '@/components/arrest-timer';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { spacing, radii, touchTargets } from '@/lib/design-tokens';

export default function ArrestTimerScreen() {
  const colors = useColors();
  const router = useRouter();
  
  return (
    <ScreenContainer 
      edges={['top', 'left', 'right', 'bottom']}
      containerClassName="bg-background"
    >
      {/* Compact header - minimize screen real estate usage */}
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.push('/')}
          style={[styles.backButton, { backgroundColor: `${colors.muted}15` }]}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <IconSymbol name="chevron.left" size={20} color={colors.foreground} />
          <Text style={[styles.backText, { color: colors.foreground }]}>Back</Text>
        </TouchableOpacity>
        
        <Text style={[styles.navTitle, { color: colors.muted }]}>
          Protocol 1210
        </Text>
        
        {/* Alert settings could go here */}
        <View style={styles.navSpacer} />
      </View>
      
      <ErrorBoundary
        section="general"
        errorTitle="Timer Error"
        errorMessage="The cardiac arrest timer encountered an issue. Please refresh the page."
      >
        <ArrestTimer />
      </ErrorBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    minHeight: touchTargets.minimum,
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  navTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  navSpacer: {
    width: touchTargets.minimum,
  },
});
