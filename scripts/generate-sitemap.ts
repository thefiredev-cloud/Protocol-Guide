/**
 * Sitemap Generator for Protocol Guide
 * 
 * Generates sitemap.xml for SEO crawling.
 * Run: npx tsx scripts/generate-sitemap.ts
 * 
 * Includes:
 * - Static pages (landing, privacy, terms, etc.)
 * - State/county coverage pages
 * - Protocol category pages
 */

import * as fs from "fs";
import * as path from "path";

const SITE_URL = "https://protocol.guide";
const OUTPUT_DIR = path.join(process.cwd(), "public");

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

// Static pages with their priorities
const staticPages: SitemapUrl[] = [
  { loc: "/", changefreq: "daily", priority: 1.0 },
  { loc: "/search", changefreq: "daily", priority: 0.9 },
  { loc: "/calculator", changefreq: "weekly", priority: 0.8 },
  { loc: "/coverage", changefreq: "weekly", priority: 0.8 },
  { loc: "/tools/dosing-calculator", changefreq: "monthly", priority: 0.7 },
  { loc: "/privacy", changefreq: "monthly", priority: 0.3 },
  { loc: "/terms", changefreq: "monthly", priority: 0.3 },
  { loc: "/contact", changefreq: "monthly", priority: 0.4 },
  { loc: "/disclaimer", changefreq: "monthly", priority: 0.3 },
];

// California counties with EMS protocols
const californiaCounties = [
  "los-angeles",
  "orange",
  "san-diego",
  "san-francisco",
  "san-bernardino",
  "riverside",
  "alameda",
  "sacramento",
  "contra-costa",
  "fresno",
  "kern",
  "san-joaquin",
  "ventura",
  "santa-clara",
  "marin",
  "solano",
  "sonoma",
  "monterey",
  "santa-cruz",
  "santa-barbara",
  "san-benito",
  "napa",
  "yolo",
];

// Protocol categories for each county
const protocolCategories = [
  "cardiac-arrest",
  "respiratory",
  "trauma",
  "pediatric",
  "obstetric",
  "behavioral",
  "medical",
  "procedures",
  "medications",
];

function generateSitemapXml(urls: SitemapUrl[]): string {
  const today = new Date().toISOString().split("T")[0];
  
  const urlEntries = urls.map((url) => {
    const lastmod = url.lastmod || today;
    const changefreq = url.changefreq || "weekly";
    const priority = url.priority ?? 0.5;
    
    return `  <url>
    <loc>${SITE_URL}${url.loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urlEntries.join("\n")}
</urlset>`;
}

function generateCoverageSitemapXml(): string {
  const urls: SitemapUrl[] = [];
  const today = new Date().toISOString().split("T")[0];

  // State landing page
  urls.push({
    loc: "/california/protocols",
    lastmod: today,
    changefreq: "weekly",
    priority: 0.9,
  });

  // County pages
  for (const county of californiaCounties) {
    urls.push({
      loc: `/california/${county}/protocols`,
      lastmod: today,
      changefreq: "weekly",
      priority: 0.8,
    });

    // Protocol category pages for each county
    for (const category of protocolCategories) {
      urls.push({
        loc: `/california/${county}/protocols/${category}`,
        lastmod: today,
        changefreq: "weekly",
        priority: 0.7,
      });
    }
  }

  return generateSitemapXml(urls);
}

function generateSitemapIndex(): string {
  const today = new Date().toISOString().split("T")[0];
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${SITE_URL}/sitemap-main.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/sitemap-coverage.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;
}

async function main() {
  console.log("🗺️  Generating sitemaps for Protocol Guide...\n");

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Generate main sitemap
  const mainSitemap = generateSitemapXml(staticPages);
  fs.writeFileSync(path.join(OUTPUT_DIR, "sitemap-main.xml"), mainSitemap);
  console.log("✅ Generated sitemap-main.xml");

  // Generate coverage sitemap
  const coverageSitemap = generateCoverageSitemapXml();
  fs.writeFileSync(path.join(OUTPUT_DIR, "sitemap-coverage.xml"), coverageSitemap);
  console.log("✅ Generated sitemap-coverage.xml");

  // Generate sitemap index
  const sitemapIndex = generateSitemapIndex();
  fs.writeFileSync(path.join(OUTPUT_DIR, "sitemap.xml"), sitemapIndex);
  console.log("✅ Generated sitemap.xml (index)");

  // Count URLs
  const mainCount = staticPages.length;
  const coverageCount = 1 + californiaCounties.length + (californiaCounties.length * protocolCategories.length);
  
  console.log(`\n📊 Sitemap Statistics:`);
  console.log(`   Main pages: ${mainCount}`);
  console.log(`   Coverage pages: ${coverageCount}`);
  console.log(`   Total URLs: ${mainCount + coverageCount}`);
  console.log(`\n🎉 Sitemaps generated successfully!`);
}

main().catch(console.error);
