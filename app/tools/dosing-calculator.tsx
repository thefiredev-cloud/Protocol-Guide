/**
 * Pediatric Dosing Calculator Route
 * 
 * Public route: /tools/dosing-calculator
 * No authentication required.
 * 
 * Supports deep linking with query params:
 * - ?weight=X (weight in kg)
 * - ?med=epinephrine-cardiac (medication ID)
 * 
 * Used by:
 * - Direct access
 * - ImageTrend integration
 * - Protocol search linking
 */

import { useLocalSearchParams } from 'expo-router';
import { Platform, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { PediatricDosingCalculator } from '@/components/pediatric-dosing-calculator';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { spacing, radii, touchTargets } from '@/lib/design-tokens';

export default function DosingCalculatorScreen() {
  const colors = useColors();
  const router = useRouter();
  
  // Get query params for deep linking
  const { weight, med } = useLocalSearchParams<{
    weight?: string;
    med?: string;
  }>();
  
  // Parse initial weight from query param
  const initialWeight = weight ? parseFloat(weight) : undefined;
  const validWeight = initialWeight && !isNaN(initialWeight) && initialWeight > 0 && initialWeight <= 150
    ? initialWeight
    : undefined;
  
  return (
    <ScreenContainer 
      edges={['top', 'left', 'right', 'bottom']}
      containerClassName="bg-background"
    >
      {/* Back button for web/navigation */}
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
        
        {/* Share/bookmark action */}
        <TouchableOpacity
          onPress={() => {
            // Could implement share functionality here
            if (Platform.OS === 'web') {
              navigator.clipboard?.writeText(window.location.href);
            }
          }}
          style={[styles.actionButton, { backgroundColor: `${colors.muted}15` }]}
          activeOpacity={0.7}
          accessibilityLabel="Share calculator"
        >
          <IconSymbol name="square.and.arrow.up" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>
      
      <ErrorBoundary
        section="general"
        errorTitle="Calculator Error"
        errorMessage="The pediatric dosing calculator encountered an issue. Please refresh the page."
      >
        <PediatricDosingCalculator
          initialWeightKg={validWeight}
          initialMedicationId={med as string | undefined}
        />
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
