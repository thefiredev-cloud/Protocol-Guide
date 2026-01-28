/**
 * FAQ Section Component with Schema.org Markup
 * 
 * Displays FAQ content with proper accessibility and
 * automatically injects FAQPage schema for SEO/AEO.
 * 
 * Optimized for Answer Engine Optimization (AEO):
 * - Direct, factual answers (no marketing fluff)
 * - Specific medical information AI can extract
 * - Question-answer format that matches search queries
 */

import React, { useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FAQPageSchema, type FAQItem } from "./StructuredData";

interface FAQSectionProps {
  /** FAQ items to display */
  faqs: FAQItem[];
  /** Section title */
  title?: string;
  /** Section subtitle */
  subtitle?: string;
  /** Additional class names */
  className?: string;
}

function FAQItemComponent({ faq, index }: { faq: FAQItem; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View className="border-b border-slate-200 dark:border-slate-700">
      <Pressable
        onPress={() => setExpanded(!expanded)}
        className="flex-row items-center justify-between py-4 px-2"
        accessibilityRole="button"
        accessibilityLabel={faq.question}
        accessibilityState={{ expanded }}
        accessibilityHint={expanded ? "Tap to collapse answer" : "Tap to expand answer"}
      >
        <Text 
          className="flex-1 text-base font-semibold text-slate-900 dark:text-white pr-4"
          accessibilityRole="header"
        >
          {faq.question}
        </Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color="#64748B"
        />
      </Pressable>
      
      {expanded && (
        <View className="pb-4 px-2">
          <Text 
            className="text-base text-slate-600 dark:text-slate-300 leading-relaxed"
            accessibilityRole="text"
          >
            {faq.answer}
          </Text>
        </View>
      )}
    </View>
  );
}

export function FAQSection({
  faqs,
  title = "Frequently Asked Questions",
  subtitle,
  className = "",
}: FAQSectionProps) {
  if (faqs.length === 0) return null;

  return (
    <View className={`py-8 ${className}`}>
      {/* Schema.org structured data */}
      <FAQPageSchema faqs={faqs} />

      {/* Section Header */}
      <View className="mb-6">
        <Text 
          className="text-2xl font-bold text-slate-900 dark:text-white mb-2"
          accessibilityRole="header"
        >
          {title}
        </Text>
        {subtitle && (
          <Text className="text-base text-slate-600 dark:text-slate-400">
            {subtitle}
          </Text>
        )}
      </View>

      {/* FAQ Items */}
      <View className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden">
        {faqs.map((faq, index) => (
          <FAQItemComponent key={index} faq={faq} index={index} />
        ))}
      </View>
    </View>
  );
}

/**
 * Pre-built FAQ content for common EMS protocol questions
 * 
 * Optimized for AEO - direct answers to common queries:
 * - "LA County cardiac arrest protocol"
 * - "Pediatric epinephrine dose EMS"
 * - "California paramedic protocols"
 */
export const EMS_PROTOCOL_FAQS: FAQItem[] = [
  {
    question: "What is the LA County adult cardiac arrest protocol?",
    answer: "Per LA County EMS Agency protocols: For adult cardiac arrest (age ≥15), begin high-quality CPR immediately. For V-Fib/V-Tach: Defibrillate 200J biphasic, then CPR. Epinephrine 1mg IV/IO every 3-5 minutes. Amiodarone 300mg IV/IO for refractory V-Fib, may repeat 150mg x1. For Asystole/PEA: Epinephrine 1mg IV/IO every 3-5 minutes. Consider H's and T's for reversible causes.",
  },
  {
    question: "What is the pediatric epinephrine dose for cardiac arrest?",
    answer: "Pediatric epinephrine dose for cardiac arrest: 0.01 mg/kg IV/IO (0.1 mL/kg of 1:10,000 concentration). Maximum single dose: 1mg. Repeat every 3-5 minutes. For weight-based dosing: A 10kg child receives 0.1mg (1mL of 1:10,000). Always use length-based tape or weight calculation for accurate pediatric dosing.",
  },
  {
    question: "How do I access California EMS protocols?",
    answer: "California EMS protocols vary by county LEMSA (Local Emergency Medical Services Agency). Protocol Guide provides access to protocols from LA County, Orange County, San Diego, San Francisco, and other California counties. Select your county/agency in the app to view your specific protocols. Each LEMSA has authority to set local treatment protocols within state guidelines.",
  },
  {
    question: "What are the indications for prehospital RSI (Rapid Sequence Intubation)?",
    answer: "RSI indications in the prehospital setting (where authorized): Impending airway compromise, GCS ≤8 with inadequate airway protection, severe head injury requiring hyperventilation, or airway burns with impending obstruction. Contraindications include anticipated difficult airway, lack of equipment/trained personnel, or unstable trauma where BVM ventilation is adequate. RSI requires specific agency authorization and drug availability.",
  },
  {
    question: "When should I activate a STEMI alert?",
    answer: "Activate STEMI alert for: ST-elevation ≥1mm in 2 or more contiguous leads, OR new LBBB with symptoms, OR posterior MI (ST depression V1-V3 with ST elevation in posterior leads). Criteria: Chest pain/equivalent <12 hours, 12-lead ECG showing STEMI criteria, no DNR/comfort care. Transport directly to PCI-capable facility per destination protocol.",
  },
  {
    question: "What is the stroke assessment protocol (BEFAST)?",
    answer: "BEFAST stroke assessment: Balance (sudden loss of balance), Eyes (vision changes/loss), Face (facial droop - ask patient to smile), Arms (arm weakness - hold both arms up), Speech (slurred or confused speech), Time (note symptom onset time). Time is critical: 'Last Known Well' time determines treatment options. Transport to Stroke Center within 4.5 hours for tPA eligibility.",
  },
  {
    question: "What is the pediatric weight estimation method?",
    answer: "Pediatric weight estimation: Use Broselow tape for most accurate weight-based dosing. If unavailable: Age 1-10 years: Weight (kg) = (Age + 4) × 2. Example: 6-year-old ≈ (6+4) × 2 = 20kg. Infants: Birth weight typically doubles by 4-5 months, triples by 1 year. Average newborn: 3.5kg. Always use actual weight if known.",
  },
  {
    question: "What are the criteria for termination of resuscitation in the field?",
    answer: "Field termination criteria (varies by agency): Unwitnessed arrest, no bystander CPR, no ROSC after 20+ minutes of ACLS, asystole for 20+ minutes despite treatment, no shockable rhythm achieved. Contraindications to field termination: Hypothermia, drug overdose, pregnancy, pediatric patient, or any reversible cause suspected. Always follow local protocol and contact base hospital if uncertain.",
  },
];

/**
 * Pre-built FAQ content for Protocol Guide app features
 */
export const APP_FEATURES_FAQS: FAQItem[] = [
  {
    question: "Does Protocol Guide work offline?",
    answer: "Yes, Protocol Guide works offline. Once you've loaded your county's protocols, they're cached on your device for offline access. This is critical for field use where cellular coverage may be unreliable. The app will sync and update protocols automatically when you regain connectivity.",
  },
  {
    question: "Which EMS agencies' protocols are available?",
    answer: "Protocol Guide currently includes protocols from California counties including Los Angeles County, Orange County, San Diego County, San Francisco, Marin County, Ventura County, and more. We're actively adding protocols from other states and agencies. Contact us if you'd like your agency's protocols included.",
  },
  {
    question: "How accurate and current are the protocols?",
    answer: "Protocols are sourced directly from official LEMSA (Local Emergency Medical Services Agency) documents. We update protocols when LEMSAs publish new versions. Always verify critical treatment decisions against your agency's official protocol book. Protocol Guide is a reference tool to supplement, not replace, your training and official resources.",
  },
  {
    question: "Is Protocol Guide HIPAA compliant?",
    answer: "Yes. Protocol Guide does not collect, store, or transmit any patient health information (PHI). Your searches are processed to deliver protocol results but are not linked to patient data. The app is designed for protocol reference only, not patient documentation.",
  },
];

export default FAQSection;
