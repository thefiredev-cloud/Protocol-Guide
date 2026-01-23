# Protocol Guide Bundle Optimization Report

## Current State
- **Bundle Size**: 3.0 MB (entry-68aa6cf05693a048bf79e61aba87bf95.js)
- **Target**: Reduce by at least 20% (to ~2.4 MB or less)

## Issues Identified

### 1. Unused Dependencies (Can Remove)
- `@react-navigation/native` - Not used (expo-router handles navigation)
- `axios` - Not used (using fetch API)
- `cookie` - Server-side only, shouldn't be in web bundle
- `expo-image` - Not used
- `expo-splash-screen` - Not used
- `expo-video` - Not used
- `express-timeout-handler` - Server-side only
- `pino-pretty` - Server-side only (dev dependency)
- `react-native-css-interop` - Not used
- `uuid` - Not used
- `@expo/ngrok` - Dev dependency, not needed

### 2. Server-Side Code Risk
- Stripe SDK (20.1.2) - Server-side only, should NOT be in web bundle
- @anthropic-ai/sdk - Not used anywhere, can be removed
- Server directory imports - Need to ensure proper exclusion

### 3. Missing Optimizations
- No code splitting for routes
- No lazy loading for heavy components
- Large dependencies not tree-shaken
- No bundle analyzer configured

### 4. Large Dependencies
- @tanstack/react-query (necessary, but could optimize usage)
- react-native-reanimated (necessary for animations)
- expo-router (necessary)

## Optimization Plan

### Phase 1: Remove Unused Dependencies (Immediate - 10-15% reduction)
1. Remove unused npm packages
2. Update package.json
3. Clean node_modules

### Phase 2: Optimize Metro Config (5-10% reduction)
1. Exclude server-side code from web builds
2. Configure proper module resolution
3. Enable tree-shaking optimizations

### Phase 3: Implement Code Splitting (5-10% reduction)
1. Lazy load admin routes
2. Lazy load heavy components (modals, dropdowns)
3. Dynamic imports for conditional features

### Phase 4: Optimize Imports (2-5% reduction)
1. Replace barrel imports with direct imports
2. Tree-shake icon libraries
3. Optimize @expo/vector-icons usage

### Phase 5: Monitor & Measure
1. Install bundle analyzer
2. Set up bundle size tracking
3. Create CI check for bundle size regressions

## Expected Results
- **Conservative**: 20-25% reduction (2.25-2.4 MB)
- **Optimistic**: 30-35% reduction (1.95-2.1 MB)
