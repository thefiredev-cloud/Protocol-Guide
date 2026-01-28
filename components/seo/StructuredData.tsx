/**
 * Structured Data Components (Schema.org JSON-LD)
 * 
 * For SEO and AEO (Answer Engine Optimization):
 * - MedicalWebPage for protocol pages
 * - HowTo for procedures
 * - FAQPage for common questions
 * - Organization for Protocol Guide
 * - BreadcrumbList for navigation
 * 
 * These help Google and AI assistants understand our content structure.
 */

import Head from "expo-router/head";
import { Platform } from "react-native";

const SITE_URL = "https://protocol.guide";
const SITE_NAME = "Protocol Guide";

// Helper to inject JSON-LD script
function JsonLd({ data }: { data: Record<string, unknown> }) {
  if (Platform.OS !== "web") return null;
  
  return (
    <Head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
      />
    </Head>
  );
}

/**
 * Organization Schema - Protocol Guide company info
 */
export function OrganizationSchema() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    description: "AI-powered EMS protocol search for paramedics and EMTs. Access critical medical protocols instantly.",
    sameAs: [
      // Add social media links when available
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: `${SITE_URL}/contact`,
    },
  };

  return <JsonLd data={data} />;
}

/**
 * WebSite Schema - For sitelinks search box in Google
 */
export function WebSiteSchema() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: "EMS Protocol Retrieval - AI-powered protocol search for paramedics and EMTs",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return <JsonLd data={data} />;
}

/**
 * MedicalWebPage Schema - For protocol content pages
 */
export interface MedicalWebPageSchemaProps {
  name: string;
  description: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
  medicalAudience?: string[];
  specialty?: string;
  keywords?: string[];
}

export function MedicalWebPageSchema({
  name,
  description,
  url,
  datePublished,
  dateModified,
  medicalAudience = ["Paramedics", "EMTs", "Emergency Medical Technicians"],
  specialty = "Emergency Medicine",
  keywords = [],
}: MedicalWebPageSchemaProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name,
    description,
    url: `${SITE_URL}${url}`,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
    ...(datePublished && { datePublished }),
    ...(dateModified && { dateModified }),
    medicalAudience: medicalAudience.map((audience) => ({
      "@type": "MedicalAudience",
      audienceType: audience,
    })),
    specialty: {
      "@type": "MedicalSpecialty",
      name: specialty,
    },
    ...(keywords.length > 0 && { keywords: keywords.join(", ") }),
    inLanguage: "en-US",
    isAccessibleForFree: true,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };

  return <JsonLd data={data} />;
}

/**
 * HowTo Schema - For procedural protocols (intubation, IV access, etc.)
 */
export interface HowToStep {
  name: string;
  text: string;
  image?: string;
}

export interface HowToSchemaProps {
  name: string;
  description: string;
  url: string;
  steps: HowToStep[];
  totalTime?: string; // ISO 8601 duration (e.g., "PT5M" for 5 minutes)
  supply?: string[];
  tool?: string[];
}

export function HowToSchema({
  name,
  description,
  url,
  steps,
  totalTime,
  supply = [],
  tool = [],
}: HowToSchemaProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    url: `${SITE_URL}${url}`,
    ...(totalTime && { totalTime }),
    ...(supply.length > 0 && {
      supply: supply.map((s) => ({ "@type": "HowToSupply", name: s })),
    }),
    ...(tool.length > 0 && {
      tool: tool.map((t) => ({ "@type": "HowToTool", name: t })),
    }),
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.image && { image: step.image }),
    })),
  };

  return <JsonLd data={data} />;
}

/**
 * FAQPage Schema - For FAQ sections
 */
export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQPageSchemaProps {
  faqs: FAQItem[];
}

export function FAQPageSchema({ faqs }: FAQPageSchemaProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return <JsonLd data={data} />;
}

/**
 * BreadcrumbList Schema - For navigation
 */
export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface BreadcrumbSchemaProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };

  return <JsonLd data={data} />;
}

/**
 * MedicalCondition Schema - For condition-specific protocols
 */
export interface MedicalConditionSchemaProps {
  name: string;
  description: string;
  url: string;
  signOrSymptom?: string[];
  possibleTreatment?: string[];
  riskFactor?: string[];
}

export function MedicalConditionSchema({
  name,
  description,
  url,
  signOrSymptom = [],
  possibleTreatment = [],
  riskFactor = [],
}: MedicalConditionSchemaProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "MedicalCondition",
    name,
    description,
    url: `${SITE_URL}${url}`,
    ...(signOrSymptom.length > 0 && {
      signOrSymptom: signOrSymptom.map((s) => ({
        "@type": "MedicalSignOrSymptom",
        name: s,
      })),
    }),
    ...(possibleTreatment.length > 0 && {
      possibleTreatment: possibleTreatment.map((t) => ({
        "@type": "MedicalTherapy",
        name: t,
      })),
    }),
    ...(riskFactor.length > 0 && {
      riskFactor: riskFactor.map((r) => ({
        "@type": "MedicalRiskFactor",
        name: r,
      })),
    }),
    medicineSystem: "WesternConventional",
  };

  return <JsonLd data={data} />;
}

/**
 * Drug/Medication Schema - For medication dosing protocols
 */
export interface MedicationSchemaProps {
  name: string;
  description: string;
  url: string;
  dosageForm?: string;
  administrationRoute?: string[];
  warnings?: string[];
  contraindication?: string[];
}

export function MedicationSchema({
  name,
  description,
  url,
  dosageForm,
  administrationRoute = [],
  warnings = [],
  contraindication = [],
}: MedicationSchemaProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Drug",
    name,
    description,
    url: `${SITE_URL}${url}`,
    ...(dosageForm && { dosageForm }),
    ...(administrationRoute.length > 0 && {
      administrationRoute: administrationRoute.join(", "),
    }),
    ...(warnings.length > 0 && { warning: warnings.join("; ") }),
    ...(contraindication.length > 0 && {
      contraindication: contraindication.map((c) => ({
        "@type": "MedicalContraindication",
        name: c,
      })),
    }),
    isAvailableGenerically: true,
    isProprietary: false,
  };

  return <JsonLd data={data} />;
}

export default {
  OrganizationSchema,
  WebSiteSchema,
  MedicalWebPageSchema,
  HowToSchema,
  FAQPageSchema,
  BreadcrumbSchema,
  MedicalConditionSchema,
  MedicationSchema,
};
