# Database Schema Optimization Migration Guide

**Date:** November 24, 2025  
**Purpose:** Apply critical and high-priority schema optimizations

---

## Changes Summary

### Critical Fixes
1. ✅ Added `@unique` constraint to `Profile.email`
2. ✅ Added `onDelete: Cascade` to `NewsletterAuditLog.subscriber`
3. ✅ Removed redundant `lastUpdatedAt` field from `NewsletterSubscriber`

### High Priority Optimizations
4. ✅ Added composite indexes to `NewsletterSend`
5. ✅ Added `createdAt` indexes to BlogPost, Project, Newsletter, NewsletterSubscriber
6. ✅ Added `sentAt` index to Newsletter
7. ✅ Added `replied` index to ContactMessage
8. ✅ Added `actionType` index to FailedAttempt
9. ✅ Added `url` index to PerformanceMetric
10. ✅ Added composite indexes for common query patterns

---

## Migration Steps

### Step 1: Backup Database
```bash
# Create a backup before migration
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Generate Migration
```bash
# Generate migration file
npx prisma migrate dev --name optimize_schema_indexes_and_constraints

# Or for production:
npx prisma migrate deploy
```

### Step 3: Review Generated Migration
Check the generated migration file in `prisma/migrations/` to ensure:
- All indexes are being created
- Unique constraint is being added
- Column is being dropped (lastUpdatedAt)
- Cascade delete is being set

### Step 4: Apply Migration
```bash
# Development
npx prisma migrate dev

# Production (after testing)
npx prisma migrate deploy
```

### Step 5: Regenerate Prisma Client
```bash
npx prisma generate
```

### Step 6: Update Application Code
If any code references `lastUpdatedAt`, update it to use `updatedAt` instead.

### Step 7: Verify
```bash
# Check schema is valid
npx prisma validate

# Test queries
npm run dev
```

---

## Breaking Changes

### ⚠️ Profile.email Unique Constraint
- **Impact:** If duplicate emails exist, migration will fail
- **Action:** Clean up duplicate emails before migration
- **Query to find duplicates:**
```sql
SELECT email, COUNT(*) 
FROM profiles 
GROUP BY email 
HAVING COUNT(*) > 1;
```

### ⚠️ NewsletterSubscriber.lastUpdatedAt Removal
- **Impact:** Any code referencing `lastUpdatedAt` will break
- **Action:** Update code to use `updatedAt` instead
- **Search for:** `lastUpdatedAt` or `last_updated_at`

### ⚠️ NewsletterAuditLog Cascade Delete
- **Impact:** Audit logs will be deleted when subscriber is deleted
- **Action:** Ensure this is desired behavior (usually it is)

---

## Rollback Plan

If migration fails or causes issues:

1. **Restore from backup:**
```bash
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
```

2. **Or revert migration:**
```bash
npx prisma migrate resolve --rolled-back <migration_name>
```

---

## Performance Impact

**Expected Improvements:**
- Query performance: 30-80% faster on indexed fields
- Storage: ~30-50KB additional (negligible)
- Write performance: Slight decrease due to index maintenance (acceptable)

**Monitoring:**
- Monitor query performance after migration
- Check index usage with:
```sql
SELECT * FROM pg_stat_user_indexes;
```

---

## Index Summary

### New Indexes Added: 18

**Profile:**
- email (unique constraint)

**NewsletterSubscriber:**
- createdAt
- isDeleted

**Newsletter:**
- createdAt
- sentAt

**NewsletterSend:**
- newsletterId, status (composite)
- subscriberId, status (composite)
- sentAt

**NewsletterAuditLog:**
- action

**BlogPost:**
- createdAt
- status, publishedAt (composite)

**Project:**
- createdAt
- status, publishedAt (composite)

**ContactMessage:**
- replied
- read, replied (composite)

**FailedAttempt:**
- actionType
- ipAddress, actionType (composite)
- timestamp, actionType (composite)

**PerformanceMetric:**
- url
- url, timestamp (composite)

---

## Validation Checklist

- [ ] Database backup created
- [ ] Migration file reviewed
- [ ] Duplicate emails cleaned (if any)
- [ ] Code updated to remove lastUpdatedAt references
- [ ] Migration applied successfully
- [ ] Prisma client regenerated
- [ ] Application tested
- [ ] Query performance verified
- [ ] Indexes verified in database

---

**Status:** Ready for migration  
**Risk Level:** LOW (with proper backup)

