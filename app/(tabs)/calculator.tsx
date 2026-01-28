/**
 * Calculator Tab Screen
 *
 * Provides access to the dose/weight calculator for medication dosing.
 * Essential tool for EMS professionals, especially for pediatric patients.
 * 
 * SEO/AEO optimized for queries like:
 * - "pediatric medication dosing calculator"
 * - "EMS drug dosing by weight"
 * - "prehospital medication calculator"
 */

import { ScreenContainer } from "@/components/screen-container";
import { DoseWeightCalculator } from "@/components/dose-weight-calculator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SEOHead, HowToSchema, type HowToStep } from "@/components/seo";

// Steps for pediatric dosing (for HowTo schema)
const DOSING_STEPS: HowToStep[] = [
  {
    name: "Determine patient weight",
    text: "Weigh the patient or use length-based tape (Broselow) for pediatric patients. For unknown weight, use age-based estimation: Weight (kg) = (Age + 4) × 2",
  },
  {
    name: "Select medication",
    text: "Choose the medication you need to administer from the calculator. Common EMS medications include Epinephrine, Amiodarone, Adenosine, and Atropine.",
  },
  {
    name: "Review weight-based dose",
    text: "The calculator displays the appropriate dose based on patient weight. Pediatric doses are typically mg/kg or mcg/kg.",
  },
  {
    name: "Verify maximum dose",
    text: "Check that the calculated dose does not exceed the maximum single dose for the medication. The calculator will alert you if dose exceeds limits.",
  },
  {
    name: "Calculate volume to administer",
    text: "The calculator shows the volume (mL) to draw up based on the medication concentration available in your kit.",
  },
];

export default function CalculatorScreen() {
  return (
    <ScreenContainer>
      {/* SEO Meta Tags */}
      <SEOHead
        title="Pediatric & Adult Medication Dosing Calculator"
        description="Weight-based medication dosing calculator for EMS. Calculate pediatric epinephrine, amiodarone, adenosine, and other prehospital drug doses. Essential tool for paramedics and EMTs."
        path="/calculator"
        keywords={[
          "pediatric medication calculator",
          "EMS drug dosing calculator",
          "weight-based dosing",
          "paramedic drug calculator",
          "prehospital medication dosing",
          "pediatric epinephrine dose calculator",
        ]}
      />
      
      {/* HowTo Schema for "how to calculate pediatric medication dose" queries */}
      <HowToSchema
        name="How to Calculate Pediatric Medication Doses in EMS"
        description="Step-by-step guide to calculating weight-based medication doses for pediatric patients in the prehospital setting."
        url="/calculator"
        steps={DOSING_STEPS}
        totalTime="PT2M"
        tool={["Broselow tape or scale", "Protocol Guide calculator", "EMS medication reference"]}
      />
      
      <ErrorBoundary
        section="general"
        errorTitle="Calculator Error"
        errorMessage="The medication calculator encountered an issue. Please try again or restart the app."
      >
        <DoseWeightCalculator />
      </ErrorBoundary>
    </ScreenContainer>
  );
}
