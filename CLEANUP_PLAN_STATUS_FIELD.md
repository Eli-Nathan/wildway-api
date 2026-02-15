# Status Field Migration Cleanup Plan

## Background
The `status` field was renamed to `moderation_status` in edit-requests, addition-requests, and reviews to avoid conflicts with Strapi 5's reserved `status` field (used for Draft & Publish document status).

For backwards compatibility, the API returns BOTH fields with the same value:
- `moderation_status` - the new canonical field
- `status` - deprecated, mirrors moderation_status for older app versions

## Current State (Post-Migration)

### Backend (nomad-api)
- Schema uses `moderation_status` as the field name
- API responses include both `moderation_status` AND `status` for backwards compat
- All queries/updates use `moderation_status`

### Frontend (nomad)
- Types include both fields (`moderation_status` required, `status` optional)
- Code uses `moderation_status || status` pattern to support both old and new API responses
- New data dispatched includes both fields

## Cleanup Tasks (After Old App Versions Deprecated)

### Phase 1: Remove Backwards Compat from Backend

**Files to update in nomad-api:**

1. `src/api/auth-user/controllers/auth-user.ts`
   - Remove `addStatusBackwardsCompat` helper function
   - Remove backwards compat transforms in `findMe` response
   - Remove backwards compat in `getActivity` response mappings

2. `src/api/review/controllers/review.ts`
   - Remove `.map((r: any) => ({ ...r, status: r.moderation_status }))` from responses
   - Remove `status: review.moderation_status` from create response

### Phase 2: Remove Backwards Compat from Frontend

**Files to update in nomad:**

1. `src/shared/context/types.ts`
   - Remove `status?: string` from `Edit` interface
   - Remove `status?: string` from `Review` interface
   - Remove `status?: string` from `ApiReview` interface

2. `src/shared/api/methods/user/userMethods.ts`
   - Remove `status?: string` from `PaginatedActivityItem` interface

3. `src/screens/Site/siteContent/SiteContent.tsx`
   - Change `edit.moderation_status || edit.status` to just `edit.moderation_status`
   - Change `review.moderation_status || review.status` to just `review.moderation_status`

4. `src/screens/Site/siteContent/Reviews.tsx`
   - Remove `status: reviewData.moderation_status` from dispatch payload

5. `src/screens/Account/accountView/ActivityContent.tsx`
   - Change `item.moderation_status || item.status` to just `item.moderation_status`

### Phase 3: Database Migration (Optional)

If you want to clean up the database column name (not strictly necessary):

1. Create Strapi migration to rename column in PostgreSQL:
   ```sql
   -- Run on production PostgreSQL
   -- Note: SQLite doesn't support column rename easily

   -- For reviews table (if column exists as 'status')
   ALTER TABLE reviews RENAME COLUMN status TO moderation_status;

   -- For edit_requests table
   ALTER TABLE edit_requests RENAME COLUMN status TO moderation_status;

   -- For addition_requests table
   ALTER TABLE addition_requests RENAME COLUMN status TO moderation_status;
   ```

2. Clear Strapi content-manager cache after migration:
   ```sql
   DELETE FROM strapi_core_store_settings
   WHERE key LIKE '%content_manager_configuration%';
   ```

## Monitoring

Before cleanup, verify old app versions are no longer in use:
- Check analytics for app version distribution
- Set a minimum app version requirement if needed
- Monitor API logs for requests using the old `status` field

## Timeline Recommendation

1. **Now**: Deploy current changes with backwards compat
2. **+2-4 weeks**: Monitor for issues, ensure new app version adoption
3. **+4-8 weeks**: Force update to new app version (if needed)
4. **+8-12 weeks**: Execute cleanup phases 1-2
5. **Optional**: Execute phase 3 database migration
