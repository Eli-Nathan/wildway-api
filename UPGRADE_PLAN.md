# Nomad API Upgrade Plan

## CRITICAL LESSONS LEARNED (January 2026 Incident)

### What Happened
During a schema change deployment, the `dist/` folder was removed from git tracking. This caused Strapi to start without a properly built dist folder, which triggered a **destructive schema sync that wiped all production data**.

### Root Cause
- The `dist/` folder was committed to git with stale content
- Heroku was deploying the committed dist instead of building fresh
- When dist was removed from git, Strapi started in a broken state
- Strapi's schema sync dropped/recreated all content tables
- **No database backups were configured**

### Key Takeaways

1. **ALWAYS have automatic backups enabled BEFORE making any changes**
   ```bash
   heroku pg:backups:schedule DATABASE_URL --at '02:00 Europe/London' -a nomadapp-api
   ```

2. **The `dist/` folder situation**
   - Option A (Current): Keep dist in git, always rebuild before committing schema changes
   - Option B (Better but risky): Remove dist from git, but ONLY after verifying build works perfectly

3. **ALWAYS create a manual backup before deployments**
   ```bash
   heroku pg:backups:capture -a nomadapp-api
   ```

4. **Test schema changes locally first**
   - Verify dist has the changes: `grep "new_field" dist/src/api/*/content-types/*/schema.json`
   - Test Strapi starts correctly: `npm run develop`

5. **Strapi can be destructive**
   - Schema mismatches can cause data loss
   - Always have a rollback plan
   - Never deploy schema changes on Friday

### Files Created From This Incident
- `DISASTER_PREVENTION.md` - Detailed prevention checklist
- `scripts/export-sqlite.sh` - Export local SQLite data
- `scripts/import-to-heroku.js` - Import to Heroku Postgres (needs work for type conversion)
- `scripts/import-to-heroku-v2.js` - Schema-aware import (improved type handling)

---

## Current State

| Component | Current Version | Target Version |
|-----------|-----------------|----------------|
| Node.js | 18.x | 22.x LTS (or 20.x LTS) |
| Strapi | 4.9.2 | 5.x |
| TypeScript | 5.0.0 | 5.x (keep) |

## Overview

This is a significant upgrade that should be done in phases:
1. **Phase 1**: Node.js 18 → 20 LTS (preparation)
2. **Phase 2**: Strapi 4.9.2 → 4.25.x (latest v4)
3. **Phase 3**: Strapi 4.25.x → 5.x (major upgrade)

**Recommendation**: Do NOT upgrade Node and Strapi 5 simultaneously. Strapi 5 is a breaking change that requires careful migration.

---

## Phase 1: Node.js Upgrade (18 → 20 LTS)

### Why Node 20?
- Node 18 EOL: April 2025
- Node 20 LTS: Active until April 2026, Maintenance until April 2027
- Node 22 LTS: Too new, some packages may not support it yet
- Strapi 5 requires Node 18.x, 20.x, or 22.x

### Steps

1. **Update .nvmrc**
   ```bash
   echo "20" > .nvmrc
   ```

2. **Update package.json engines**
   ```json
   "engines": {
     "node": "20.x",
     "npm": ">=10.0.0"
   }
   ```

3. **Test locally**
   ```bash
   nvm install 20
   nvm use 20
   rm -rf node_modules
   npm install
   npm run develop
   ```

4. **Check for deprecation warnings**
   - Run test suite
   - Check all API endpoints
   - Monitor console for Node.js deprecation warnings

5. **Update Heroku**
   - Heroku will automatically use the version in package.json engines

### Potential Issues
- `better-sqlite3` and `sqlite3` native modules (already using noop workaround)
- `firebase-admin` - verify compatibility with Node 20
- `knex` 0.21.18 is very old - may need upgrade

### Dependencies to Check
```bash
npm outdated
```

Key packages to verify:
- firebase-admin (currently ^10.0.2) - may need update for Node 20
- knex (currently 0.21.18) - VERY outdated, upgrade to 2.x+
- axios (currently ^0.27.2) - upgrade to 1.x

---

## Phase 2: Strapi 4.9.2 → 4.25.x (Latest v4)

### Why Upgrade Within v4 First?
- Reduces migration complexity
- Gets you latest v4 features and bug fixes
- Easier to troubleshoot issues
- Official migration to v5 assumes latest v4

### Steps

1. **Backup database** (CRITICAL)
   ```bash
   heroku pg:backups:capture -a nomadapp-api
   ```

2. **Update Strapi packages**
   ```json
   "@strapi/plugin-i18n": "4.25.x",
   "@strapi/plugin-users-permissions": "4.25.x",
   "@strapi/provider-email-nodemailer": "4.25.x",
   "@strapi/provider-upload-cloudinary": "4.25.x",
   "@strapi/strapi": "4.25.x",
   "@strapi/utils": "4.25.x"
   ```

3. **Run Strapi upgrade command**
   ```bash
   npx @strapi/upgrade minor
   ```

4. **Test all custom code**
   - All 25 API collections
   - All 4 custom plugins
   - All 9 middlewares
   - All 4 policies
   - Firebase authentication
   - Email system
   - Search endpoints

### Known Breaking Changes (4.9 → 4.25)
- Check Strapi release notes for each minor version
- Database migrations may run automatically
- Plugin API changes

---

## Phase 3: Strapi 4.25.x → 5.x (Major Upgrade)

### Strapi 5 Breaking Changes

#### 1. **Document Service API** (CRITICAL)
Strapi 5 replaces Entity Service with Document Service:

**Before (v4):**
```typescript
strapi.entityService.findMany('api::site.site', { filters })
```

**After (v5):**
```typescript
strapi.documents('api::site.site').findMany({ filters })
```

#### 2. **Content Types Structure**
- `id` is now a document ID (string), not database ID
- New `documentId` field for referencing documents
- Relations use `documentId` instead of `id`

#### 3. **Plugin API Changes**
- New plugin structure
- Admin panel uses different component APIs
- Server plugins have new lifecycle hooks

#### 4. **Authentication Changes**
- New authentication strategy API
- Firebase integration will need updates

#### 5. **Database Changes**
- Automatic migration runs on first start
- Backup BEFORE upgrading

### Migration Steps

1. **Prerequisites**
   - Complete Phase 1 (Node 20)
   - Complete Phase 2 (Strapi 4.25.x)
   - Full database backup
   - Local SQLite copy for testing

2. **Use Official Migration Tool**
   ```bash
   npx @strapi/upgrade major
   ```

3. **Manual Code Updates Required**

#### A. Custom Controllers (8 collections)
Update all Entity Service calls to Document Service:

**Files to update:**
- `src/api/search/controllers/search.ts` (CRITICAL - 4 endpoints)
- `src/api/auth-user/controllers/auth-user.ts` (8 methods)
- `src/api/addition-request/controllers/addition-request.ts`
- `src/api/comment/controllers/comment.ts`
- `src/api/edit-request/controllers/edit-request.ts`

**Pattern:**
```typescript
// v4
const sites = await strapi.entityService.findMany('api::site.site', {
  filters: { title: { $containsi: query } }
});

// v5
const sites = await strapi.documents('api::site.site').findMany({
  filters: { title: { $containsi: query } }
});
```

#### B. Custom Middlewares (9 files)
May need syntax updates for populate injection:

**Files:**
- `src/api/*/middlewares/populate-*.ts`

#### C. Custom Policies (4 files)
Update context types and authentication access:

**Files:**
- `src/policies/is-owner.ts`
- `src/policies/set-owner.ts`
- `src/api/auth-user/policies/is-user.ts`
- `src/api/auth-user/policies/set-user.ts`

#### D. Firebase Authentication (CRITICAL)
**File:** `src/index.ts`

The authentication registration API has changed:
```typescript
// v4
strapi.container.get("auth").register("content-api", { ... })

// v5 - TBD, check Strapi 5 docs for new auth strategy API
```

**File:** `src/extensions/users-permissions/strapi-server.ts`
- Plugin extension API may have changed

#### E. Custom Plugins (4 plugins)

**moderator plugin** (COMPLEX):
- Update all database queries to Document Service
- Update admin panel components for Strapi 5 Design System
- Test approval/rejection flows

**content-export-import plugin**:
- Update for new content structure
- Handle documentId vs id changes

**verify-user-email plugin**:
- Update database queries
- Update admin components

**bulk-update-field plugin**:
- Update for Document Service API

#### F. Type Definitions
**File:** `src/types/strapi.d.ts` (242 LOC)
- Complete rewrite likely needed
- Strapi 5 has different type exports

#### G. Third-Party Plugins
- `strapi-stripe` - Check for v5 compatible version
- `@strapi/provider-upload-cloudinary` - Update to v5 version
- `@strapi/provider-email-nodemailer` - Update to v5 version

4. **Database Migration**
   - Strapi 5 runs automatic migration
   - Creates new `documents` table
   - Adds `document_id` columns
   - May take time on large datasets

5. **Testing Checklist**
   - [ ] Firebase authentication works
   - [ ] All 25 API collections accessible
   - [ ] Search endpoints (globalSearch, fuzzySearch, checkSimilarSites)
   - [ ] Moderator plugin approvals/rejections
   - [ ] Email notifications send correctly
   - [ ] Stripe integration works
   - [ ] Image uploads to Cloudinary work
   - [ ] Admin panel customization (logo, colors) appears
   - [ ] All policies enforce correctly
   - [ ] Google Maps polyline generation works

---

## Recommended Timeline

### Week 1: Preparation
- [ ] Set up automatic backups on Heroku
- [ ] Create staging environment on Heroku
- [ ] Document all current functionality (API tests)

### Week 2: Node.js Upgrade
- [ ] Upgrade Node to 20 locally
- [ ] Fix any compatibility issues
- [ ] Deploy to staging
- [ ] Test thoroughly
- [ ] Deploy to production

### Week 3-4: Strapi 4.25 Upgrade
- [ ] Upgrade Strapi to latest 4.x
- [ ] Fix any breaking changes
- [ ] Deploy to staging
- [ ] Test all features
- [ ] Deploy to production

### Week 5-8: Strapi 5 Migration (Major Effort)
- [ ] Create fresh branch for v5 migration
- [ ] Run upgrade tool
- [ ] Manually fix all breaking changes
- [ ] Update all custom code
- [ ] Update all plugins
- [ ] Extensive testing on staging
- [ ] Performance testing
- [ ] Deploy to production (with rollback plan)

---

## Risk Mitigation

### ⚠️ CRITICAL: The dist/ Folder Problem

The `dist/` folder is currently committed to git. This is non-standard but necessary because:
- Heroku's build was using stale committed dist instead of building fresh
- Removing dist from git without proper build verification caused **complete data loss**

**Safe approach for schema changes:**
```bash
# 1. Make schema change in src/
# 2. Rebuild dist locally
npm run build

# 3. Verify change is in dist
grep "your_new_field" dist/src/api/*/content-types/*/schema.json

# 4. Commit BOTH src and dist
git add src/ dist/
git commit -m "Add new_field with rebuilt dist"

# 5. Deploy
git push heroku main
```

**DO NOT remove dist from git** until you have:
- Verified Heroku build process works correctly
- Created a full database backup
- Tested on staging first

### Before ANY Upgrade
```bash
# 1. Enable scheduled backups (DO THIS NOW IF NOT DONE)
heroku pg:backups:schedule DATABASE_URL --at '02:00 Europe/London' -a nomadapp-api

# 2. Verify backups are scheduled
heroku pg:backups:schedules -a nomadapp-api

# 3. Create manual backup
heroku pg:backups:capture -a nomadapp-api

# 4. Export current database locally
heroku pg:pull DATABASE_URL nomad_local -a nomadapp-api
```

### Rollback Plan
1. Keep previous version in a git tag
2. Database backup before each phase
3. Heroku rollback: `heroku releases:rollback -a nomadapp-api`

### Staging Environment
Create a staging app on Heroku:
```bash
heroku create nomadapp-api-staging
heroku addons:create heroku-postgresql:essential-0 -a nomadapp-api-staging
# Copy production data to staging for testing
```

---

## Dependencies to Update

### Critical Updates (Do with Strapi upgrade)
| Package | Current | Target | Notes |
|---------|---------|--------|-------|
| @strapi/* | 4.9.2 | 5.x | All Strapi packages |
| knex | 0.21.18 | 3.x | Very outdated |
| axios | 0.27.2 | 1.x | Security updates |
| firebase-admin | 10.0.2 | 12.x | Node 20 compatibility |

### Optional Updates
| Package | Current | Target | Notes |
|---------|---------|--------|-------|
| winston | 3.5.1 | 3.x | Minor update |
| lodash | 4.17.21 | 4.x | Keep current |
| pg | 8.7.1 | 8.x | Minor update |

---

## Resources

- [Strapi v4 to v5 Migration Guide](https://docs.strapi.io/dev-docs/migration/v4-to-v5/introduction-and-faq)
- [Strapi 5 Document Service API](https://docs.strapi.io/dev-docs/api/document-service)
- [Strapi Upgrade Tool](https://docs.strapi.io/dev-docs/upgrades)
- [Node.js Release Schedule](https://nodejs.org/en/about/releases/)

---

## Questions to Resolve Before Starting

1. **Staging environment** - Do you have one? Need to create?
2. **Test coverage** - Any automated tests for API endpoints?
3. **Downtime tolerance** - How long can the API be down during migration?
4. **Stripe plugin** - Is `strapi-stripe` essential? May need replacement in v5
5. **Timeline pressure** - Any deadlines driving this upgrade?
