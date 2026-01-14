# Strapi 5 Migration Status

## Summary
Upgrading nomad-api from Strapi 4 + Node 18 to Strapi 5 + Node 20+.

## Completed

### 1. Core Upgrade
- Updated all `@strapi/*` packages to ^5.10.0
- Node.js upgraded to 20+
- Build succeeds, server starts

### 2. Firebase Authentication Migration
- **Old**: Used `strapi.container.get("auth").register()` (removed in Strapi 5)
- **New**: Global middleware at `src/middlewares/firebase-auth.ts`
- Middleware verifies Firebase tokens and sets `ctx.state.user`
- Fixed Firebase uid vs sub mismatch (Firebase uses `uid`, not `sub`)

### 3. Entity Service to db.query() Migration
- Strapi 5 deprecated Entity Service
- Converted calls to `strapi.db.query()` pattern
- Example: `strapi.db.query("api::auth-user.auth-user").findOne({...})`

### 4. Query Parameter Compatibility
- **Issue**: Strapi 5 changed sort format from `sort=field:DESC` to object `{ field: "DESC" }`
- **Fix**: Created `src/middlewares/strapi4-query-params.ts` to transform incoming queries

### 5. Response Format Compatibility
- Created `src/middlewares/strapi4-response-format.ts` for frontend compatibility
- Transforms Strapi 5 flat responses to Strapi 4 `{ data: { id, attributes } }` format

### 6. Route Authentication
- **Issue**: Strapi 5's default auth layer blocked requests before custom policies ran
- **Fix**: Added `auth: false` to all auth-user routes in `src/api/auth-user/routes/auth-user.ts`
- Custom `global::firebase-authed` policy handles auth instead

### 7. User Registration
- **Issue**: `super.create()` rejected `firstName`, `lastName`, `role` keys
- **Fix 1**: Updated `src/api/auth-user/policies/set-user.ts` to only pass valid fields
- **Fix 2**: Changed controller to use `strapi.db.query().create()` directly instead of `super.create()`
- Role relation now uses direct ID with db.query (not connect syntax)

### 8. is-user Policy
- **Issue**: Policy checked for `state.route` which doesn't exist in Strapi 5
- **Fix**: Removed `state.route` check in `src/api/auth-user/policies/is-user.ts`

### 9. Bootstrap Seeding
- Added bootstrap in `src/index.ts` to create base user role (level 0) if missing

## Current Status
- User registration: **WORKING** (user created in DB)
- User login (GET /auth-users/me): **WORKING** (200 response)
- User profile page: **WORKING** (after manual email verification)
- User routes API: **WORKING** - updated to use Firebase auth
- Email sending: Failing (Gmail credentials issue - not blocking)
- verifyEmail endpoint: **Fixed** - converted to db.query

### Needs Re-Testing
- **Full registration flow**: Test with fresh user to verify:
  - Registration creates user
  - Email verification flow works (verifyEmail endpoint)
  - Login works after registration

### Routes Updated to Firebase Auth
All routes that use authentication need:
1. `auth: false` in config
2. `global::firebase-authed` instead of `plugin::users-permissions.isAuthed`

Updated so far:
- `src/api/auth-user/routes/auth-user.ts` ✓
- `src/api/user-route/routes/user-route.ts` ✓

May still need updating:
- Other API routes that use `plugin::users-permissions.isAuthed`

## Files Modified
```
src/index.ts                                    # Firebase init + bootstrap seeding
src/middlewares/firebase-auth.ts                # Firebase token verification
src/middlewares/strapi4-query-params.ts         # Query param transformation
src/middlewares/strapi4-response-format.ts      # Response format transformation
src/policies/firebase-authed.ts                 # Global Firebase auth policy
src/api/auth-user/routes/auth-user.ts           # Added auth: false to routes
src/api/auth-user/controllers/auth-user.ts      # Fixed create() to use db.query
src/api/auth-user/policies/set-user.ts          # Only pass valid fields
src/api/auth-user/policies/is-user.ts           # Removed state.route check
config/middlewares.ts                           # Added custom middlewares
```

## Gotchas / Migration Patterns

### 1. Routes Must Disable Default Auth
Strapi 5's default auth layer runs BEFORE custom policies. Any route using Firebase auth needs:
```typescript
config: {
  auth: false,  // <-- REQUIRED: Disables Strapi's built-in auth
  policies: ["global::firebase-authed", ...],
}
```
Without `auth: false`, requests get 401 before your policies even run.

### 2. Replace users-permissions Policy
All instances of `plugin::users-permissions.isAuthed` must be replaced with `global::firebase-authed`.

### 3. Use db.query() Instead of super.create/update/findOne
The core controller methods (`super.create()`, `super.update()`, `super.findOne()`) have issues with:
- Invalid key errors for relations (e.g., `Invalid key role`)
- Invalid key errors for fields not in schema (e.g., `firstName`)

**Solution**: Use `strapi.db.query()` directly:
```typescript
// Instead of: await super.create(ctx)
await strapi.db.query("api::auth-user.auth-user").create({
  data: { field1, field2, role: roleId }  // Direct ID for relations
});

// Instead of: await super.findOne(ctx)
await strapi.db.query("api::auth-user.auth-user").findOne({
  where: { id: ctx.params.id },
  populate: { relation1: true }
});
```

### 4. Return Strapi 4 Format for Frontend
Frontend expects `{ data: { id, attributes }, meta: {} }` format:
```typescript
return {
  data: {
    id: user.id,
    attributes: user,
  },
  meta: {},
};
```

### 5. Policy Changes
- `state.route` doesn't exist in Strapi 5 - remove any checks for it
- Policies must set `ctx.params.id` for routes like `/me` that don't have `:id` in path

### 6. Firebase Uses uid Not sub
Firebase Admin SDK returns `uid`, not `sub`. Normalize in middleware:
```typescript
const userSub = userData.uid || userData.sub;
```

## Next Steps
1. **Test login flow** - Verify GET /auth-users/me now works after is-user policy fix
2. **Test other endpoints** - Sites, user-routes, etc.
3. **Fix other routes** - May need `auth: false` + `global::firebase-authed` on other API routes
4. **Update remaining policies** - Check other policies for Strapi 5 compatibility
5. **Email config** - Fix Gmail credentials if email notifications needed

## Production Deployment Checklist

### Database
- Production already uses Postgres (`config/env/production/database.ts`)
- Strapi 5 will auto-migrate the schema on first start
- **IMPORTANT**: Backup your production database before deploying!
- The `document_id` column will be added automatically by Strapi 5

### Code Changes to Commit
All changes are in `src/` - the `dist/` folder is regenerated on build:
```bash
git add src/ config/ .nvmrc package.json STRAPI5_MIGRATION_STATUS.md
git commit -m "Upgrade to Strapi 5 with Firebase auth migration"
```

### Environment Variables
Ensure production has:
- `GOOGLE_APPLICATION_CREDENTIALS` or `GOOGLE_CREDENTIALS` for Firebase
- `DATABASE_URL` for Postgres (already set if using Heroku)
- Node.js 20+ (check `.nvmrc` or Heroku buildpack)

### Pre-Deployment Testing
1. Test locally with production DB copy if possible
2. Verify all API routes work (especially authenticated ones)
3. Test full registration flow with fresh user

### Deployment Steps
1. Commit and push changes
2. Deploy to staging first if available
3. Strapi will run migrations automatically
4. Monitor logs for any errors on first startup
5. Test critical flows: login, registration, sites API

### Rollback Plan
- Keep previous release tagged
- Have database backup ready
- If issues: revert to previous release + restore DB backup

## How to Test
1. Start server: `yarn develop` (background task running)
2. Use nomad frontend app to register/login
3. Check server logs: `tail -f /tmp/claude/-Users-eli-nathan-repos-nomad-api/tasks/b6b9d07.output`

## Known Issues
- Email sending fails (Gmail auth) - non-blocking
- Some routes may still need `auth: false` configuration
