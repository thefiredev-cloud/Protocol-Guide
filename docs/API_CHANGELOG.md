# Protocol Guide API Changelog

All notable changes to the Protocol Guide tRPC API will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-01-23

### Added - Initial Release

#### System Router
- `system.health` - Health check endpoint
- `system.notifyOwner` - Admin notification system

#### Auth Router
- `auth.me` - Get current user information
- `auth.logout` - Clear session cookie

#### Counties Router
- `counties.list` - List all counties with state grouping
- `counties.get` - Get specific county by ID

#### User Router
- `user.usage` - Get query usage statistics
- `user.acknowledgeDisclaimer` - Record disclaimer acknowledgment (P0 CRITICAL)
- `user.hasAcknowledgedDisclaimer` - Check disclaimer status
- `user.selectCounty` - Set selected county
- `user.queries` - Get query history
- `user.savedCounties` - Get saved counties with tier limits
- `user.addCounty` - Add county to saved list
- `user.removeCounty` - Remove county from saved list
- `user.setPrimaryCounty` - Set primary county
- `user.primaryCounty` - Get primary county

#### Search Router
- `search.semantic` - Semantic protocol search with Voyage AI + pgvector
- `search.getProtocol` - Get protocol by ID
- `search.stats` - Get protocol statistics
- `search.coverageByState` - Get protocol coverage by state
- `search.totalStats` - Get total protocol statistics
- `search.agenciesByState` - Get agencies by state
- `search.agenciesWithProtocols` - Get all agencies with protocols
- `search.searchByAgency` - Search within specific agency

#### Query Router
- `query.submit` - Submit protocol query with Claude RAG
- `query.history` - Get query history
- `query.searchHistory` - Get search history for cloud sync (Pro)
- `query.syncHistory` - Sync local history to cloud (Pro)
- `query.clearHistory` - Clear search history
- `query.deleteHistoryEntry` - Delete single history entry

#### Voice Router
- `voice.transcribe` - Transcribe audio with OpenAI Whisper
- `voice.uploadAudio` - Upload audio file for transcription

#### Feedback Router
- `feedback.submit` - Submit user feedback
- `feedback.myFeedback` - Get user's feedback submissions

#### Contact Router
- `contact.submit` - Submit public contact form

#### Subscription Router
- `subscription.createCheckout` - Create Stripe checkout session
- `subscription.createPortal` - Create customer portal session
- `subscription.status` - Get subscription status
- `subscription.createDepartmentCheckout` - Create B2B department checkout

#### Admin Router
- `admin.listFeedback` - List all feedback with filters
- `admin.updateFeedback` - Update feedback status and notes
- `admin.listUsers` - List all users with filters
- `admin.updateUserRole` - Update user role
- `admin.listContactSubmissions` - List contact form submissions
- `admin.updateContactStatus` - Update contact submission status
- `admin.getAuditLogs` - Get admin audit logs

#### Agency Admin Router
- `agencyAdmin.myAgencies` - Get user's agencies
- `agencyAdmin.getAgency` - Get agency details
- `agencyAdmin.updateAgency` - Update agency settings
- `agencyAdmin.listMembers` - List agency members
- `agencyAdmin.inviteMember` - Invite member to agency
- `agencyAdmin.updateMemberRole` - Update member role
- `agencyAdmin.removeMember` - Remove member from agency
- `agencyAdmin.listProtocols` - List agency protocols
- `agencyAdmin.uploadProtocol` - Upload protocol PDF
- `agencyAdmin.getUploadStatus` - Get upload processing status
- `agencyAdmin.updateProtocolStatus` - Update protocol workflow status
- `agencyAdmin.publishProtocol` - Publish protocol to search
- `agencyAdmin.archiveProtocol` - Archive protocol
- `agencyAdmin.listVersions` - List protocol versions
- `agencyAdmin.createVersion` - Create new protocol version

#### Integration Router
- `integration.logAccess` - Log integration partner access (HIPAA compliant)
- `integration.getStats` - Get integration statistics (admin)
- `integration.getRecentLogs` - Get recent integration logs (admin)
- `integration.getDailyUsage` - Get daily usage for charts (admin)

#### Referral Router
- `referral.getMyReferralCode` - Get or create user's referral code
- `referral.getMyStats` - Get referral statistics
- `referral.getMyReferrals` - Get referral history
- `referral.validateCode` - Validate referral code (public)
- `referral.redeemCode` - Redeem referral code
- `referral.getShareTemplates` - Get social share templates
- `referral.getLeaderboard` - Get top referrers leaderboard
- `referral.trackViralEvent` - Track viral events

### Features

#### Search Optimization
- Query normalization (EMS abbreviations, typo correction)
- Redis caching (1-hour TTL)
- Multi-query fusion for complex queries
- Advanced re-ranking for accuracy
- Latency monitoring

#### Claude RAG
- Intelligent model routing (Haiku vs Sonnet)
- Query intent detection
- Protocol reference citations
- Usage tracking and limits

#### Authentication
- Supabase Auth integration
- Bearer token authentication
- Role-based access control (user, admin)
- Tier-based permissions (free, pro, enterprise)
- Agency-level authorization

#### Rate Limiting
- Free tier: 10 queries/day
- Pro tier: Unlimited queries
- Enterprise tier: Unlimited queries + unlimited counties

#### HIPAA Compliance
- Integration router does NOT store PHI
- userAge and impression parameters ignored
- Safe error logging (no PHI in logs)

### Documentation
- Complete API reference documentation
- Quick reference guide
- TypeScript types reference
- Code examples for all procedures
- Authentication guide
- Error handling guide
- Best practices

---

## [Unreleased]

### Planned Features

#### Search Enhancements
- Image search support (protocol diagrams, flowcharts)
- Multi-language search (Spanish, French)
- Protocol comparison tool
- Saved searches
- Search filters (date range, protocol type)

#### Query Improvements
- Streaming responses
- Follow-up questions
- Query suggestions
- Protocol bookmarking
- Export to PDF

#### Voice Features
- Real-time transcription
- Voice commands
- Multi-language support
- Noise reduction improvements

#### Analytics
- User engagement metrics
- Search analytics dashboard
- Protocol usage statistics
- A/B testing framework

#### B2B Features
- Custom protocol upload workflow
- Protocol approval workflows
- Compliance tracking
- Agency analytics dashboard
- SSO integration (SAML, OIDC)

#### Mobile Features
- Offline mode support
- Push notifications
- Biometric authentication
- Dark mode support

---

## Migration Guides

### Migrating to 1.0.0

This is the initial release. No migration required.

---

## Breaking Changes

None yet. First release.

---

## Deprecation Notices

None yet. All endpoints are stable.

---

## Security Updates

### 2026-01-23
- HIPAA-compliant integration logging (PHI explicitly excluded)
- Bearer token authentication with Supabase
- Role-based access control
- Agency-level authorization

---

## Performance Improvements

### 2026-01-23
- Redis caching for search results (1-hour TTL)
- Query normalization for better cache hits
- Batch query support via tRPC
- SuperJSON serialization for efficient data transfer

---

## Bug Fixes

None yet. First release.

---

## Known Issues

### Minor Issues
- None reported

### Limitations
- Voice transcription limited to 10MB files
- PDF uploads limited to 20MB
- Search query length limited to 500 characters
- Query text limited to 1000 characters

---

## Versioning Strategy

Protocol Guide API follows Semantic Versioning:

- **MAJOR** version: Incompatible API changes
- **MINOR** version: New functionality (backwards compatible)
- **PATCH** version: Bug fixes (backwards compatible)

### API Stability Promise

- All public endpoints are considered stable as of 1.0.0
- Breaking changes will be announced 90 days in advance
- Deprecated endpoints will be supported for at least 6 months
- New features will be added with backwards compatibility

---

## Support

For questions about API changes:
- Email: support@protocolguide.app
- Documentation: [docs/API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

---

## Contributing

To suggest API improvements or report issues:
1. Use `trpc.feedback.submit.mutate()` in the app
2. Email support@protocolguide.app
3. Contact your account manager (Enterprise only)

---

## License

Protocol Guide API © 2026 Protocol Guide. All rights reserved.
