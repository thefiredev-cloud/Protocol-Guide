/**
 * Calculator Tab Screen
 *
 * Provides access to the dose/weight calculator for medication dosing.
 * Essential tool for EMS professionals, especially for pediatric patients.
 */

import { ScreenContainer } from "@/components/screen-container";
import { DoseWeightCalculator } from "@/components/dose-weight-calculator";

export default function CalculatorScreen() {
  return (
    <ScreenContainer>
      <DoseWeightCalculator />
    </ScreenContainer>
  );
}
