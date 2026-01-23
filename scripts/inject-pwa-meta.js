#!/usr/bin/env node
/**
 * Inject PWA meta tags into the built index.html
 * This script runs after `expo export --platform web` to add PWA metadata
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const distPath = join(process.cwd(), 'dist', 'index.html');

console.log('[PWA] Injecting PWA meta tags into index.html...');

try {
  let html = readFileSync(distPath, 'utf-8');

  // PWA meta tags to inject
  const pwaMeta = `
    <!-- PWA Manifest -->
    <link rel="manifest" href="/manifest.json" />

    <!-- Favicons -->
    <link rel="icon" href="/favicon.ico" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
    <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
    <link rel="apple-touch-icon" href="/icon-192.png" />

    <!-- iOS Safari PWA Support -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="ProtocolGuide" />
    <meta name="description" content="EMS Protocol Retrieval - AI-powered protocol search for EMS professionals" />
    <meta name="theme-color" content="#C41E3A" />

    <!-- iOS Splash Screens -->
    <link rel="apple-touch-startup-image" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" href="/icon-512.png" />
    <link rel="apple-touch-startup-image" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)" href="/icon-512.png" />
    <link rel="apple-touch-startup-image" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)" href="/icon-512.png" />
    <link rel="apple-touch-startup-image" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" href="/icon-512.png" />
    <link rel="apple-touch-startup-image" media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" href="/icon-512.png" />
    <link rel="apple-touch-startup-image" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)" href="/icon-512.png" />
    <link rel="apple-touch-startup-image" media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)" href="/icon-512.png" />
    <link rel="apple-touch-startup-image" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)" href="/icon-512.png" />

    <!-- Android/Chrome PWA -->
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="application-name" content="ProtocolGuide" />

    <!-- Microsoft Tiles -->
    <meta name="msapplication-TileColor" content="#C41E3A" />
    <meta name="msapplication-TileImage" content="/icon-512.png" />
    <meta name="msapplication-config" content="none" />
`;

  // Inject before the closing </head> tag
  html = html.replace('</head>', `${pwaMeta}\n  </head>`);

  // Update noscript message
  html = html.replace(
    /You need to enable JavaScript to run this app\./g,
    'Protocol Guide requires JavaScript to run. Please enable JavaScript in your browser settings.'
  );

  writeFileSync(distPath, html, 'utf-8');
  console.log('[PWA] ✅ PWA meta tags injected successfully');
} catch (error) {
  console.error('[PWA] ❌ Failed to inject PWA meta tags:', error);
  process.exit(1);
}
