# Changelog

All notable changes to Protocol Guide will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

#### County Filter Fix (Critical - ImageTrend Demo Blocker) - 2026-01-29

**Issue**: Generic queries like "pediatric cardiac arrest" returned protocols from other CA counties (Marin, Napa, Sacramento) instead of LA County protocols, breaking the ImageTrend integration demo.

**Root Cause**: LA County protocol chunks in database were missing `agency_id` values (NULL), causing the search filtering to fail.

**Fix**: 
- Added data migration script to properly map LA County chunks to agency_id 
- Updated 401 LA County protocol chunks with correct agency_id linkage
- Verified county filtering now works correctly in search results

**Impact**: 🎯 **CRITICAL** - Unblocks ImageTrend demo and ensures LA County users get relevant results

#### Expo Router Bundling Fix - 2026-01-29

**Issue**: E2E tests and local development failing with Expo Router bundling error:
```
Error: node_modules\expo-router\_ctx.web.js:Invalid call at line 2: process.env.EXPO_ROUTER_APP_ROOT
First argument of `require.context` should be a string denoting the directory to require.
```

**Root Cause**: Missing `EXPO_ROUTER_APP_ROOT` environment variable configuration.

**Fix**: 
- Added `EXPO_ROUTER_APP_ROOT=./app` to `.env.example`
- Updated documentation for future developers

**Impact**: ✅ **HIGH** - Fixes E2E test failures and improves developer experience

### Added

#### Protocol Comparison Tool - 2026-01-29

**Feature**: New protocol comparison functionality for differential diagnosis

**Implementation**:
- Added `/server/routers/comparison.ts` with comprehensive comparison logic
- Medication extraction with dose/route parsing for 25+ common EMS drugs
- Contraindication detection and key point extraction
- Side-by-side protocol comparison with variation analysis
- Related conditions mapping for differential diagnosis

**Benefits**:
- Helps paramedics compare treatment approaches across agencies
- Supports clinical decision-making for similar conditions
- Enhances protocol learning and training capabilities

**Impact**: 🌟 **NEW FEATURE** - Addresses medical director feedback for clinical decision support

#### Quick Reference Cards (In Progress) - 2026-01-29

**Feature**: Quick reference cards for high-frequency protocols

**Status**: Development in progress on `feature/protocol-comparison-and-quick-ref` branch

### Improved

#### Test Coverage & Reliability - 2026-01-29

**Improvements**:
- Optimized E2E test timeouts and configurations
- Fixed visual regression test performance issues
- Improved county-filter test reliability
- Working toward >90% test coverage (from 86%)

**Impact**: 🧪 **QUALITY** - More reliable CI/CD pipeline and better code coverage

---

## Development Notes

### Overnight Work Session - 2026-01-29 01:00-07:00 PST

**Context**: Autonomous overnight development session while primary developer sleeping

**Sub-Agents Deployed**:
1. `overnight-pg-county-filter` - Fixed critical county filter database issue
2. `overnight-pg-test-improvements` - Enhanced test coverage and reliability  
3. `overnight-pg-features` - Implemented protocol comparison tool
4. `overnight-octagon-research` - Market research for swing trading opportunities

**Key Outcomes**:
- ✅ ImageTrend demo unblocked (county filter fix)
- ✅ Developer experience improved (Expo Router fix)
- 🌟 New clinical features added (protocol comparison)
- 📈 Test quality enhanced (coverage improvements)
- 💼 Financial research completed (trading opportunities identified)

---

## Release Process

### Pre-Release Checklist

- [ ] All tests passing (unit, integration, E2E)
- [ ] Visual regression tests pass
- [ ] Performance benchmarks within targets
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Security scan completed
- [ ] Sentry error rates within normal range

### Deployment Targets

- **Production**: https://protocol-guide.com (Netlify + Railway)
- **Staging**: Auto-deploy from `main` branch
- **Development**: Local development environment

### Rollback Procedure

1. Revert problematic commit
2. Trigger manual deployment of previous version
3. Update status page if user-facing impact
4. Post-mortem for critical issues

---

## Support & Contact

- **Issues**: [GitHub Issues](https://github.com/thefiredev-cloud/Protocol-Guide/issues)
- **Discussions**: [GitHub Discussions](https://github.com/thefiredev-cloud/Protocol-Guide/discussions)
- **Email**: support@protocol-guide.com
- **Developer**: Tanner Osterkamp ([GitHub](https://github.com/thefiredev-cloud))