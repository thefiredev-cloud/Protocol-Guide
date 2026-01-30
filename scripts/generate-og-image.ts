/**
 * OG Image Generator for Protocol Guide
 * 
 * Generates Open Graph images for social sharing.
 * Run: npx tsx scripts/generate-og-image.ts
 * 
 * Requirements:
 * - npm install canvas (for Node.js canvas support)
 */

import { createCanvas, registerFont } from "canvas";
import * as fs from "fs";
import * as path from "path";

// OG Image dimensions (recommended: 1200x630)
const WIDTH = 1200;
const HEIGHT = 630;

// Colors matching Protocol Guide branding
const COLORS = {
  bgDark: "#0F172A",
  bgSurface: "#1E293B",
  primaryRed: "#EF4444",
  textWhite: "#F1F5F9",
  textMuted: "#94A3B8",
};

function generateOGImage() {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, COLORS.bgDark);
  gradient.addColorStop(0.5, COLORS.bgSurface);
  gradient.addColorStop(1, COLORS.bgDark);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Red accent bar at top
  ctx.fillStyle = COLORS.primaryRed;
  ctx.fillRect(0, 0, WIDTH, 6);

  // Main headline
  ctx.fillStyle = COLORS.textWhite;
  ctx.font = "bold 72px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Protocol Guide", WIDTH / 2, 220);

  // Subheadline
  ctx.fillStyle = COLORS.primaryRed;
  ctx.font = "bold 48px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("EMS Protocols in Seconds", WIDTH / 2, 290);

  // Description
  ctx.fillStyle = COLORS.textMuted;
  ctx.font = "28px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("AI-powered protocol search for paramedics & EMTs", WIDTH / 2, 370);
  ctx.fillText("55,000+ protocols • Works offline • No signup required", WIDTH / 2, 410);

  // Stats boxes
  const boxY = 480;
  const boxHeight = 80;
  const boxWidth = 200;
  const startX = (WIDTH - (boxWidth * 3 + 40)) / 2;

  const stats = [
    { value: "<2s", label: "Search Time" },
    { value: "55K+", label: "Protocols" },
    { value: "58", label: "CA Counties" },
  ];

  stats.forEach((stat, i) => {
    const x = startX + i * (boxWidth + 20);
    
    // Box background
    ctx.fillStyle = COLORS.bgSurface;
    ctx.beginPath();
    ctx.roundRect(x, boxY, boxWidth, boxHeight, 8);
    ctx.fill();

    // Value
    ctx.fillStyle = COLORS.primaryRed;
    ctx.font = "bold 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(stat.value, x + boxWidth / 2, boxY + 35);

    // Label
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = "16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(stat.label, x + boxWidth / 2, boxY + 60);
  });

  // URL at bottom
  ctx.fillStyle = COLORS.textMuted;
  ctx.font = "20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("protocol-guide.com", WIDTH / 2, HEIGHT - 30);

  // Save the image
  const buffer = canvas.toBuffer("image/png");
  const outputPath = path.join(__dirname, "../public/og-image.png");
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ OG image generated: ${outputPath}`);
}

// Also generate a simpler version without canvas (using SVG)
function generateOGImageSVG() {
  const svg = `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${COLORS.bgDark}"/>
      <stop offset="50%" style="stop-color:${COLORS.bgSurface}"/>
      <stop offset="100%" style="stop-color:${COLORS.bgDark}"/>
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="100%" height="100%" fill="url(#bg)"/>
  
  <!-- Red accent bar -->
  <rect x="0" y="0" width="100%" height="6" fill="${COLORS.primaryRed}"/>
  
  <!-- Main headline -->
  <text x="50%" y="200" text-anchor="middle" fill="${COLORS.textWhite}" 
        font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="72" font-weight="bold">
    Protocol Guide
  </text>
  
  <!-- Subheadline -->
  <text x="50%" y="280" text-anchor="middle" fill="${COLORS.primaryRed}" 
        font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="48" font-weight="bold">
    EMS Protocols in Seconds
  </text>
  
  <!-- Description -->
  <text x="50%" y="360" text-anchor="middle" fill="${COLORS.textMuted}" 
        font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="28">
    AI-powered protocol search for paramedics &amp; EMTs
  </text>
  <text x="50%" y="400" text-anchor="middle" fill="${COLORS.textMuted}" 
        font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="24">
    55,000+ protocols • Works offline • No signup required
  </text>
  
  <!-- Stats boxes -->
  <rect x="290" y="460" width="200" height="80" rx="8" fill="${COLORS.bgSurface}"/>
  <text x="390" y="500" text-anchor="middle" fill="${COLORS.primaryRed}" font-size="32" font-weight="bold">&lt;2s</text>
  <text x="390" y="525" text-anchor="middle" fill="${COLORS.textMuted}" font-size="16">Search Time</text>
  
  <rect x="500" y="460" width="200" height="80" rx="8" fill="${COLORS.bgSurface}"/>
  <text x="600" y="500" text-anchor="middle" fill="${COLORS.primaryRed}" font-size="32" font-weight="bold">55K+</text>
  <text x="600" y="525" text-anchor="middle" fill="${COLORS.textMuted}" font-size="16">Protocols</text>
  
  <rect x="710" y="460" width="200" height="80" rx="8" fill="${COLORS.bgSurface}"/>
  <text x="810" y="500" text-anchor="middle" fill="${COLORS.primaryRed}" font-size="32" font-weight="bold">58</text>
  <text x="810" y="525" text-anchor="middle" fill="${COLORS.textMuted}" font-size="16">CA Counties</text>
  
  <!-- URL -->
  <text x="50%" y="${HEIGHT - 25}" text-anchor="middle" fill="${COLORS.textMuted}" 
        font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="20">
    protocol-guide.com
  </text>
</svg>`;

  const outputPath = path.join(__dirname, "../public/og-image.svg");
  fs.writeFileSync(outputPath, svg.trim());
  console.log(`✅ OG SVG generated: ${outputPath}`);
}

// Run both generators
try {
  generateOGImage();
} catch (e) {
  console.log("⚠️ Canvas not available, generating SVG instead...");
}

generateOGImageSVG();
console.log("\n📝 To convert SVG to PNG, use: npx svg2png public/og-image.svg public/og-image.png");
