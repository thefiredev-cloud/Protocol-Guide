/**
 * Post-ROSC Bundle Checklist Route
 * 
 * Public route: /tools/rosc-checklist
 * No authentication required.
 * 
 * Features:
 * - Timer since ROSC
 * - Tap-to-complete checklist items
 * - Visual vital sign status indicators (green/yellow/red)
 * - LA County 1210 protocol cross-reference
 * - Works offline
 * 
 * Based on:
 * - 2025 AHA ACLS Guidelines
 * - LA County DHS Treatment Protocol 1210
 */

import { Platform, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { RoscChecklist } from '@/components/rosc-checklist';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { spacing, radii, touchTargets } from '@/lib/design-tokens';

export default function RoscChecklistScreen() {
  const colors = useColors();
  const router = useRouter();
  
  return (
    <ScreenContainer 
      edges={['top', 'left', 'right', 'bottom']}
      containerClassName="bg-background"
    >
      {/* Navigation Bar */}
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
        
        {/* Share action */}
        <TouchableOpacity
          onPress={() => {
            if (Platform.OS === 'web') {
              navigator.clipboard?.writeText(window.location.href);
            }
          }}
          style={[styles.actionButton, { backgroundColor: `${colors.muted}15` }]}
          activeOpacity={0.7}
          accessibilityLabel="Share checklist"
        >
          <IconSymbol name="square.and.arrow.up" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>
      
      <ErrorBoundary
        section="general"
        errorTitle="Checklist Error"
        errorMessage="The Post-ROSC checklist encountered an issue. Please refresh the page."
      >
        <RoscChecklist />
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
  actionButton: {
    width: touchTargets.minimum,
    height: touchTargets.minimum,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
