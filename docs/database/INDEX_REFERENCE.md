# Database Index Quick Reference

**Last Updated:** 2026-01-23

## Table of Contents
- [Overview](#overview)
- [Index by Table](#index-by-table)
- [Common Query Patterns](#common-query-patterns)
- [Index Usage Guidelines](#index-usage-guidelines)

---

## Overview

This document provides a quick reference for all database indexes in Protocol Guide. Use this to:
- Understand which columns are indexed
- Optimize query performance
- Avoid duplicate index creation
- Plan new queries efficiently

---

## Index by Table

### bookmarks (3 indexes)
```sql
idx_bookmarks_user              (userId)
idx_bookmarks_user_created      (userId, createdAt DESC)
idx_bookmarks_protocol          (protocolNumber)
```

**Use cases:**
- User bookmark list
- Recent bookmarks
- Protocol bookmark count

---

### contact_submissions (2 indexes)
```sql
idx_contact_status              (status)
idx_contact_status_created      (status, createdAt DESC)
```

**Use cases:**
- Admin inbox filtering
- Recent pending contacts
- Status-based reports

---

### counties (2 indexes)
```sql
idx_counties_state              (state)
idx_counties_state_protocols    (state, usesStateProtocols)
```

**Use cases:**
- State agency directory
- State vs county protocol filtering
- Geographic analytics

---

### feedback (4 indexes)
```sql
idx_feedback_user               (userId)
idx_feedback_status             (status)
idx_feedback_status_created     (status, createdAt DESC)
idx_feedback_county             (countyId)
```

**Use cases:**
- User feedback history
- Admin feedback management
- Recent feedback by status
- County-specific reports

---

### integration_logs (7 indexes)
```sql
idx_integration_partner                 (partner)
idx_integration_agency                  (agencyId)
idx_integration_partner_created         (partner, createdAt DESC)
idx_integration_search                  (searchTerm)
idx_integration_logs_partner            (partner)          [legacy]
idx_integration_logs_agency_id          (agencyId)         [legacy]
idx_integration_logs_created_at         (createdAt)        [legacy]
```

**Use cases:**
- Partner analytics dashboard
- Agency integration usage
- Recent integration activity
- Search term analysis

---

### protocolChunks (7 indexes)
```sql
idx_protocol_chunks_number              (protocolNumber)
idx_protocol_chunks_county_number       (countyId, protocolNumber)
idx_protocol_chunks_year                (protocolYear)
idx_protocols_county                    (countyId)         [legacy]
idx_protocols_number                    (protocolNumber)   [legacy]
idx_protocols_section                   (section)          [legacy]
idx_protocols_year                      (protocolYear)     [legacy]
```

**Use cases:**
- Protocol detail pages
- RAG retrieval by county
- Cross-protocol references
- Protocol versioning queries
- Section-based searches

---

### queries (2 indexes)
```sql
idx_queries_user_created        (userId, createdAt DESC)
idx_queries_county              (countyId)
```

**Use cases:**
- User query history
- Recent queries
- County-based analytics
- Usage tracking

---

### users (7 indexes)
```sql
idx_users_stripe                (stripeCustomerId)
idx_users_subscription          (subscriptionStatus)
idx_users_tier                  (tier)
idx_users_last_signin           (lastSignedIn DESC)
idx_users_openid                (openId)
users_openId_unique             (openId)               [unique]
users_supabaseId_unique         (supabaseId)           [unique]
```

**Use cases:**
- Stripe webhook lookups
- Subscription management
- Tier-based analytics
- User activity reports
- OAuth authentication

---

## Common Query Patterns

### User Queries

#### Recent user activity
```sql
SELECT * FROM users
WHERE lastSignedIn > DATE_SUB(NOW(), INTERVAL 30 DAY)
ORDER BY lastSignedIn DESC;
-- Uses: idx_users_last_signin
```

#### User subscription lookup
```sql
SELECT * FROM users
WHERE stripeCustomerId = 'cus_xxx';
-- Uses: idx_users_stripe
```

#### Tier-based analytics
```sql
SELECT tier, COUNT(*) FROM users
GROUP BY tier;
-- Uses: idx_users_tier
```

---

### Protocol Queries

#### Protocol detail page
```sql
SELECT * FROM protocolChunks
WHERE protocolNumber = 'P-123';
-- Uses: idx_protocol_chunks_number
```

#### County protocols with number filter
```sql
SELECT * FROM protocolChunks
WHERE countyId = 5 AND protocolNumber = 'P-123';
-- Uses: idx_protocol_chunks_county_number (composite)
```

#### Recent protocols by year
```sql
SELECT * FROM protocolChunks
WHERE protocolYear >= 2024;
-- Uses: idx_protocol_chunks_year
```

---

### User History Queries

#### Recent user queries
```sql
SELECT * FROM queries
WHERE userId = 123
ORDER BY createdAt DESC
LIMIT 10;
-- Uses: idx_queries_user_created
```

#### User bookmarks
```sql
SELECT * FROM bookmarks
WHERE userId = 123
ORDER BY createdAt DESC;
-- Uses: idx_bookmarks_user_created
```

---

### Admin Queries

#### Pending feedback
```sql
SELECT * FROM feedback
WHERE status = 'pending'
ORDER BY createdAt DESC;
-- Uses: idx_feedback_status_created
```

#### Pending contact forms
```sql
SELECT * FROM contact_submissions
WHERE status = 'pending'
ORDER BY createdAt DESC;
-- Uses: idx_contact_status_created
```

#### User's feedback
```sql
SELECT * FROM feedback
WHERE userId = 123
ORDER BY createdAt DESC;
-- Uses: idx_feedback_user
```

---

### Integration Analytics

#### Partner usage
```sql
SELECT partner, COUNT(*) as requests
FROM integration_logs
WHERE createdAt > DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY partner;
-- Uses: idx_integration_partner_created
```

#### Agency integration stats
```sql
SELECT * FROM integration_logs
WHERE agencyId = 'ABC123'
ORDER BY createdAt DESC;
-- Uses: idx_integration_agency
```

---

## Index Usage Guidelines

### When to Use Composite Indexes

**Use composite indexes when:**
1. Queries filter on multiple columns together
2. One column is in WHERE and another in ORDER BY
3. Covering index can eliminate table lookups

**Example:**
```sql
-- Good: Uses idx_queries_user_created (composite)
SELECT * FROM queries
WHERE userId = 123
ORDER BY createdAt DESC;

-- Less optimal: Would need separate indexes
SELECT * FROM queries
WHERE userId = 123 AND countyId = 5;
```

---

### Index Column Order

**Composite index column order matters:**
1. Equality filters first (WHERE col = ?)
2. Range filters second (WHERE col > ?)
3. ORDER BY columns last

**Example:**
```sql
-- Optimal index: (status, createdAt DESC)
SELECT * FROM feedback
WHERE status = 'pending'
ORDER BY createdAt DESC;
```

---

### When NOT to Index

**Avoid indexing when:**
- Table has < 1000 rows (table scan is faster)
- Column has very low cardinality (e.g., boolean with 50/50 split)
- Column is rarely queried
- Too many indexes slow down INSERT/UPDATE

---

### Index Maintenance

**Best practices:**
1. Monitor slow query log weekly
2. Check index usage monthly
3. Remove unused indexes quarterly
4. Update statistics after bulk imports
5. Rebuild fragmented indexes annually

**Check index usage:**
```sql
SELECT
  TABLE_NAME,
  INDEX_NAME,
  CARDINALITY
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME, INDEX_NAME;
```

---

## Performance Tips

### Covering Indexes
Create composite indexes that include all columns in SELECT to avoid table lookups:

```sql
-- Requires table lookup
SELECT userId, createdAt FROM queries WHERE userId = 123;

-- Covered by idx_queries_user_created (userId, createdAt)
-- No table lookup needed!
```

---

### Index Hints
Force index usage when query planner chooses wrong index:

```sql
SELECT * FROM protocolChunks USE INDEX (idx_protocol_chunks_county_number)
WHERE countyId = 5 AND protocolNumber = 'P-123';
```

---

### EXPLAIN Plans
Always verify index usage with EXPLAIN:

```sql
EXPLAIN SELECT * FROM queries
WHERE userId = 123
ORDER BY createdAt DESC
LIMIT 10;

-- Look for:
-- type: ref or range (good)
-- key: idx_queries_user_created (using index)
-- rows: < 100 (index seek)
```

---

## Migration History

| Migration | Date | Description | Indexes Added |
|-----------|------|-------------|---------------|
| 0012 | 2026-01-22 | Initial performance indexes | 4 |
| 0015 | 2026-01-23 | Comprehensive index coverage | 20 |

**Total active indexes:** 34 (including unique constraints)

---

## Resources

- [DATABASE_INDEXES_SUMMARY.md](/DATABASE_INDEXES_SUMMARY.md) - Detailed implementation summary
- [MySQL Index Optimization](https://dev.mysql.com/doc/refman/8.0/en/optimization-indexes.html)
- [TiDB Best Practices](https://docs.pingcap.com/tidb/stable/performance-tuning-practices)

---

**Note:** This reference is automatically synced from database schema. If you add new indexes, update this document and run verification script.
