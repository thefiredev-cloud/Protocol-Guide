/**
 * SEOHead Component - Dynamic Meta Tags for Protocol Guide
 * 
 * Provides SEO metadata for all pages including:
 * - Title and description
 * - Open Graph tags for social sharing
 * - Twitter card meta tags
 * - Canonical URLs
 * 
 * Usage:
 * <SEOHead 
 *   title="Cardiac Arrest Protocol"
 *   description="LA County EMS protocol for adult cardiac arrest..."
 *   path="/protocols/la-county/cardiac-arrest"
 * />
 */

import Head from "expo-router/head";
import { Platform } from "react-native";

export interface SEOHeadProps {
  /** Page title - will be appended with site name */
  title?: string;
  /** Meta description (max 160 chars recommended) */
  description?: string;
  /** Canonical URL path (e.g., /protocols/cardiac-arrest) */
  path?: string;
  /** Open Graph image URL */
  image?: string;
  /** Page type for Open Graph */
  type?: "website" | "article" | "profile";
  /** Article published time (ISO 8601) */
  publishedTime?: string;
  /** Article modified time (ISO 8601) */
  modifiedTime?: string;
  /** Keywords for the page */
  keywords?: string[];
  /** Disable indexing for this page */
  noIndex?: boolean;
}

const SITE_NAME = "Protocol Guide";
const SITE_URL = "https://protocol.guide";
const DEFAULT_DESCRIPTION = "EMS Protocol Retrieval - AI-powered protocol search for paramedics and EMTs. Access LA County, California, and nationwide EMS protocols instantly.";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

export function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "",
  image = DEFAULT_IMAGE,
  type = "website",
  publishedTime,
  modifiedTime,
  keywords = [],
  noIndex = false,
}: SEOHeadProps) {
  // Only render on web
  if (Platform.OS !== "web") {
    return null;
  }

  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - EMS Protocols for Paramedics & EMTs`;
  const canonicalUrl = `${SITE_URL}${path}`;
  
  // Truncate description to 160 chars for SEO
  const metaDescription = description.length > 160 
    ? description.substring(0, 157) + "..." 
    : description;

  // Default keywords for EMS protocols
  const defaultKeywords = [
    "EMS protocols",
    "paramedic protocols",
    "EMT protocols",
    "LA County EMS",
    "California EMS protocols",
    "prehospital protocols",
    "emergency medical services",
    "field protocol guide",
  ];

  const allKeywords = [...new Set([...keywords, ...defaultKeywords])];

  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={allKeywords.join(", ")} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Robots */}
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />

      {/* Article-specific Open Graph */}
      {type === "article" && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === "article" && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={image} />

      {/* Additional SEO tags */}
      <meta name="author" content="Protocol Guide" />
      <meta name="application-name" content={SITE_NAME} />
      
      {/* Geographic targeting for California/LA County */}
      <meta name="geo.region" content="US-CA" />
      <meta name="geo.placename" content="Los Angeles County" />
      
      {/* Google Search Console Verification - Set GOOGLE_SITE_VERIFICATION env var */}
      {process.env.EXPO_PUBLIC_GOOGLE_SITE_VERIFICATION && (
        <meta 
          name="google-site-verification" 
          content={process.env.EXPO_PUBLIC_GOOGLE_SITE_VERIFICATION} 
        />
      )}
      
      {/* Bing Webmaster Tools - Set BING_SITE_VERIFICATION env var */}
      {process.env.EXPO_PUBLIC_BING_SITE_VERIFICATION && (
        <meta 
          name="msvalidate.01" 
          content={process.env.EXPO_PUBLIC_BING_SITE_VERIFICATION} 
        />
      )}
    </Head>
  );
}

export default SEOHead;
