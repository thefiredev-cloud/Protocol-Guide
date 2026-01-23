# EAS Build & Submit Setup Guide

This guide covers the complete setup for building and submitting Protocol Guide to the App Store and Google Play Store using Expo Application Services (EAS).

## Prerequisites

1. **Expo Account**: Create an account at [expo.dev](https://expo.dev)
2. **Apple Developer Account**: Required for iOS ($99/year)
3. **Google Play Console Account**: Required for Android ($25 one-time)
4. **EAS CLI**: Install globally with `npm install -g eas-cli`

## Initial Setup

### 1. Login to EAS

```bash
eas login
```

### 2. Initialize EAS Project

```bash
eas project:init
```

This will create a project ID. Update `app.config.ts`:

```typescript
extra: {
  eas: {
    projectId: "your-actual-project-id"
  }
}
```

Also update the `updates.url` in `app.config.ts`:

```typescript
updates: {
  url: "https://u.expo.dev/your-actual-project-id"
}
```

### 3. Configure Credentials

#### iOS Credentials

```bash
# Let EAS manage credentials (recommended)
eas credentials --platform ios

# Or configure manually in eas.json
# Update these values:
# - appleId: Your Apple ID email
# - ascAppId: From App Store Connect (App Information > Apple ID)
# - appleTeamId: From Apple Developer Portal (Membership > Team ID)
```

#### Android Credentials

1. Create a Google Play Service Account:
   - Go to Google Play Console > Setup > API access
   - Create a new service account
   - Download the JSON key file

2. Save as `google-service-account.json` in project root

3. **Important**: Add to `.gitignore`:
   ```
   google-service-account.json
   ```

## Build Commands

### Development Build (Simulator/Emulator)

```bash
# iOS Simulator
eas build --profile development --platform ios

# Android Emulator
eas build --profile development --platform android
```

### Development Build (Physical Device)

```bash
# Requires Apple Developer enrollment
eas build --profile development-device --platform ios
eas build --profile development-device --platform android
```

### Preview Build (Internal Testing)

```bash
# Both platforms
eas build --profile preview --platform all

# iOS TestFlight
eas build --profile preview-testflight --platform ios
```

### Production Build

```bash
# Both platforms
eas build --profile production --platform all

# Single platform
eas build --profile production --platform ios
eas build --profile production --platform android
```

## Submit Commands

### iOS (App Store Connect)

```bash
# Submit latest build
eas submit --platform ios

# Submit specific build
eas submit --platform ios --id BUILD_ID

# Submit to TestFlight only
eas submit --profile preview --platform ios
```

### Android (Google Play)

```bash
# Submit to production track
eas submit --platform android

# Submit to internal testing track
eas submit --profile preview --platform android

# Submit to beta track
eas submit --profile beta --platform android
```

## OTA Updates

Protocol Guide uses EAS Update for over-the-air JavaScript updates.

### Publish Update

```bash
# Development channel
eas update --branch development --message "Description of changes"

# Preview channel
eas update --branch preview --message "Bug fixes for testing"

# Production channel
eas update --branch production --message "v1.0.1 - Performance improvements"
```

### Rollback Update

```bash
# List updates
eas update:list

# Rollback to previous
eas update:republish --group UPDATE_GROUP_ID
```

## App Store Checklist

### iOS App Store

Before submission, ensure:

- [ ] App icons (1024x1024 for App Store)
- [ ] Screenshots for all device sizes:
  - iPhone 6.7" (1290 x 2796)
  - iPhone 6.5" (1242 x 2688)
  - iPhone 5.5" (1242 x 2208)
  - iPad Pro 12.9" (2048 x 2732)
- [ ] App Preview videos (optional but recommended)
- [ ] Privacy Policy URL
- [ ] Support URL
- [ ] App description (max 4000 characters)
- [ ] Keywords (max 100 characters)
- [ ] Categories selected
- [ ] Age rating questionnaire completed
- [ ] App Privacy questions answered
- [ ] Export compliance information

### Google Play Store

Before submission, ensure:

- [ ] App icon (512x512)
- [ ] Feature graphic (1024x500)
- [ ] Screenshots (min 2, max 8):
  - Phone: 16:9 or 9:16 aspect ratio
  - Tablet 7": same ratios
  - Tablet 10": same ratios
- [ ] Privacy Policy URL
- [ ] Short description (max 80 characters)
- [ ] Full description (max 4000 characters)
- [ ] Content rating questionnaire
- [ ] Target audience and content
- [ ] Data safety section completed

## Environment Variables

### Build-time Environment

Set in `eas.json` under each profile's `env` section. These are embedded at build time.

### Secrets (API Keys)

Use EAS Secrets for sensitive values:

```bash
# Set a secret
eas secret:create --scope project --name SUPABASE_URL --value "https://..."
eas secret:create --scope project --name SUPABASE_ANON_KEY --value "..."
eas secret:create --scope project --name SENTRY_DSN --value "..."

# List secrets
eas secret:list

# Delete a secret
eas secret:delete --name SECRET_NAME
```

Access in `app.config.ts`:

```typescript
extra: {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
}
```

## Troubleshooting

### Build Failures

```bash
# View build logs
eas build:view BUILD_ID

# Download build artifacts
eas build:download --platform ios --output ./builds
```

### Credential Issues

```bash
# Reset iOS credentials
eas credentials --platform ios
# Select "Remove current credentials"

# Check credential status
eas credentials --platform ios --profile production
```

### Common Issues

1. **"Bundle identifier not found"**: Ensure `bundleIdentifier` in app.config.ts matches App Store Connect

2. **"Invalid provisioning profile"**: Run `eas credentials --platform ios` and regenerate

3. **"Version code already used"**: Auto-increment is enabled; if you need manual control, remove `autoIncrement` from eas.json

4. **"App signing not configured"**: For Android, ensure Google Play App Signing is enabled

## Version Management

### Semantic Versioning

- `version` in app.config.ts: User-facing version (1.0.0)
- `ios.buildNumber`: iOS-specific build number (auto-incremented)
- `android.versionCode`: Android-specific version code (auto-incremented)

### Manual Version Bump

```bash
# Update version in app.config.ts, then:
eas build --profile production --platform all --auto-submit
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: EAS Build

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - run: pnpm install
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: eas build --profile production --platform all --non-interactive
```

## Support

- [EAS Documentation](https://docs.expo.dev/eas/)
- [App Store Connect Help](https://developer.apple.com/help/app-store-connect/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer/)
