// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

// Bundle ID format: space.manus.<project_name_dots>.<timestamp>
// e.g., "my-app" created at 2024-01-15 10:30:45 -> "space.manus.my.app.t20240115103045"
const bundleId = "space.manus.protocol.guide.t20260110193545";
// Extract timestamp from bundle ID and prefix with "manus" for deep link scheme
// e.g., "space.manus.my.app.t20240115103045" -> "manus20240115103045"
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

const env = {
  // App branding - update these values directly (do not use env vars)
  appName: "Protocol Guide",
  appSlug: "protocol-guide",
  // S3 URL of the app logo - set this to the URL returned by generate_image when creating custom logo
  // Leave empty to use the default icon from assets/images/icon.png
  logoUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663070935654/tyHhHsYndGPqjhQD.jpeg",
  scheme: schemeFromBundleId,
  iosBundleId: bundleId,
  androidPackage: bundleId,
};

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "light",  // Light theme only for field use
  newArchEnabled: true,

  // EAS Project Configuration
  owner: "tannero19",  // Expo account username
  extra: {
    eas: {
      projectId: "9ab928c4-ba00-4c6e-affc-0a827b869942"
    }
  },

  // Update configuration for OTA updates
  updates: {
    enabled: true,
    url: "",  // Will be set after eas project:init
    fallbackToCacheTimeout: 30000,
    checkAutomatically: "ON_LOAD",
  },

  // Runtime version for updates compatibility
  runtimeVersion: {
    policy: "appVersion"
  },

  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
    buildNumber: "1",

    // iOS Permissions - Required for App Store approval
    infoPlist: {
      // Microphone for voice search
      NSMicrophoneUsageDescription: "Protocol Guide uses the microphone for voice-activated protocol search, allowing hands-free lookup during emergencies.",

      // Speech recognition for voice commands
      NSSpeechRecognitionUsageDescription: "Protocol Guide uses speech recognition for hands-free protocol lookup, enabling voice commands while your hands are occupied with patient care.",

      // Camera (if scanning QR codes or documents)
      NSCameraUsageDescription: "Protocol Guide uses the camera to scan QR codes for quick protocol access and to capture images for documentation.",

      // Photo library access
      NSPhotoLibraryUsageDescription: "Protocol Guide accesses your photos to attach images to patient documentation and reports.",

      // Location for regional protocols (optional)
      NSLocationWhenInUseUsageDescription: "Protocol Guide uses your location to automatically select regional protocols and provide location-specific emergency procedures.",

      // Face ID for secure access (optional)
      NSFaceIDUsageDescription: "Protocol Guide uses Face ID for secure, quick access to the app and protected patient information.",

      // Background audio for voice guidance
      UIBackgroundModes: ["audio", "fetch"],

      // App Transport Security - Allow connections to your API
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: false,
        NSExceptionDomains: {
          "protocol-guide.com": {
            NSIncludesSubdomains: true,
            NSExceptionAllowsInsecureHTTPLoads: false,
            NSExceptionRequiresForwardSecrecy: true,
            NSExceptionMinimumTLSVersion: "TLSv1.2"
          }
        }
      },

      // Siri integration for quick access
      NSSiriUsageDescription: "Protocol Guide integrates with Siri for quick voice-activated protocol searches.",

      // iTunes file sharing (for protocol exports)
      UIFileSharingEnabled: false,
      LSSupportsOpeningDocumentsInPlace: true,

      // Privacy manifest requirements (iOS 17+)
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
          NSPrivacyAccessedAPITypeReasons: ["CA92.1"]  // App functionality
        }
      ]
    },

    // Associated domains for universal links
    associatedDomains: [
      "applinks:protocol-guide.com",
      "applinks:*.protocol-guide.com"
    ],

    // Entitlements
    entitlements: {
      "com.apple.developer.siri": true,
      "aps-environment": "production"
    },

    // Privacy manifest
    privacyManifests: {
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
          NSPrivacyAccessedAPITypeReasons: ["CA92.1"]
        }
      ]
    }
  },

  android: {
    adaptiveIcon: {
      backgroundColor: "#C41E3A",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    package: env.androidPackage,
    versionCode: 1,

    // Android Permissions
    permissions: [
      "android.permission.RECORD_AUDIO",           // Voice search
      "android.permission.INTERNET",               // Network access
      "android.permission.ACCESS_NETWORK_STATE",   // Network status
      "android.permission.CAMERA",                 // QR scanning, photos
      "android.permission.READ_EXTERNAL_STORAGE",  // File access
      "android.permission.WRITE_EXTERNAL_STORAGE", // Save files
      "android.permission.VIBRATE",                // Haptic feedback
      "android.permission.WAKE_LOCK",              // Keep screen on
      "android.permission.FOREGROUND_SERVICE",     // Background tasks
      "android.permission.RECEIVE_BOOT_COMPLETED", // Auto-start
      "android.permission.USE_BIOMETRIC",          // Biometric auth
      "android.permission.ACCESS_FINE_LOCATION",   // Location (optional)
      "android.permission.ACCESS_COARSE_LOCATION"  // Approximate location
    ],

    // Intent filters for deep linking
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: "https",
            host: "protocol-guide.com",
            pathPrefix: "/protocol"
          },
          {
            scheme: "https",
            host: "*.protocol-guide.com",
            pathPrefix: "/protocol"
          }
        ],
        category: ["BROWSABLE", "DEFAULT"]
      }
    ]
  },

  web: {
    bundler: "metro",
    output: "single",  // Changed from "static" to fix JSX runtime error
    favicon: "./public/favicon.ico",
    // PWA Configuration
    template: "./web/index.html",
    manifest: {
      name: "Protocol Guide",
      short_name: "ProtocolGuide",
      description: "EMS Protocol Retrieval - AI-powered protocol search for EMS professionals",
      start_url: "/",
      display: "standalone",
      orientation: "portrait",
      theme_color: "#C41E3A",
      background_color: "#ffffff",
      scope: "/",
      icons: [
        {
          src: "/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable",
        },
        {
          src: "/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
        },
      ],
      categories: ["medical", "health", "productivity"],
    },
  },

  plugins: [
    "expo-router",

    // Build properties for native configuration
    [
      "expo-build-properties",
      {
        ios: {
          deploymentTarget: "15.1",
          useFrameworks: "static",
          // Enable microphone and speech recognition capabilities
          newArchEnabled: true,
          flipper: false  // Disable Flipper for production builds
        },
        android: {
          compileSdkVersion: 34,
          targetSdkVersion: 34,
          minSdkVersion: 24,
          buildToolsVersion: "34.0.0",
          kotlinVersion: "1.9.22",
          newArchEnabled: true,
          // Enable Proguard for release builds
          enableProguardInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true
        }
      }
    ],

    // Video player with background support
    [
      "expo-video",
      {
        supportsBackgroundPlayback: true,
        supportsPictureInPicture: true,
      },
    ],

    // Splash screen configuration
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: false,  // Disabled - causes JSX runtime issues with NativeWind
  },
};

export default config;
