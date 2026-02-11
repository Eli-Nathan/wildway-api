# Cleanup Plan: Remove Comments Backwards Compatibility

## Context

In February 2025, the comments system was replaced with a reviews system that includes star ratings (1-5), image uploads, and improved moderation. A backwards compatibility layer was added to allow the backend to be deployed before the frontend.

## When to Execute This Cleanup

Remove the backwards compatibility layer when **all** of these conditions are met:

- [ ] New frontend app version with reviews is released
- [ ] Minimum app version has been bumped to require the new version
- [ ] Analytics confirm <1% of users on old app versions
- [ ] At least 2 weeks have passed since frontend release

## Cleanup Steps

### 1. Delete Comment API Directory

```bash
rm -rf src/api/comment/
```

This removes:
- `src/api/comment/content-types/comment/schema.json`
- `src/api/comment/controllers/comment.ts`
- `src/api/comment/routes/comment.ts`

### 2. Remove `comments` Field from Site Controller

**File:** `src/api/site/controllers/site.ts`

Find and remove these lines (around line 763):

```typescript
// Backwards compatibility: old apps expect comments field
// TODO: Remove after all users have updated to new app version
comments: [],
```

### 3. Remove `comments` Field from Auth-User Controller

**File:** `src/api/auth-user/controllers/auth-user.ts`

Find and remove in `findMe` method (around line 179):

```typescript
// Backwards compatibility: old apps expect comments field
// TODO: Remove after all users have updated to new app version
comments: [],
```

Find and remove in `findMeFull` method (around line 209):

```typescript
// Backwards compatibility: old apps expect comments field
// TODO: Remove after all users have updated to new app version
comments: [],
```

### 4. Database Cleanup (Optional)

If the old `comments` table still exists with orphaned data:

```sql
-- Check if table exists and has data
SELECT COUNT(*) FROM comments;

-- If safe to delete
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS comments_owner_links;
DROP TABLE IF EXISTS comments_site_links;
```

### 5. Delete This File

```bash
rm CLEANUP_COMMENTS_COMPAT.md
```

## Verification

After cleanup, verify:

1. Backend builds successfully: `npm run build`
2. No TypeScript errors related to comments
3. Site endpoints return data without `comments` field
4. Auth-user endpoints return data without `comments` field
5. Old `/comments` endpoints return 404 (not 410)

## Rollback

If issues arise after cleanup, revert the commits that removed the backwards compatibility layer. The frontend will continue working as it only uses the `reviews` field.

---

**Created:** February 2025
**Author:** Claude Code
**Related PR:** [Add link to PR when merging]
