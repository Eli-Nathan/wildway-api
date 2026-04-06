# Disaster Prevention Plan

## What Happened (2026-01-13)

1. The `dist/` folder was committed to git with stale schema
2. Attempted to remove `dist/` from git to fix deployment
3. Strapi started without proper `dist/` folder
4. Strapi ran destructive schema sync, wiping all content tables
5. No backups were configured

## Immediate Actions Required

### 1. Enable Automatic Backups (DO THIS NOW)

```bash
# Schedule daily backups at 2 AM
heroku pg:backups:schedule DATABASE_URL --at '02:00 Europe/London' -a wildway-api

# Verify schedule
heroku pg:backups:schedules -a wildway-api
```

### 2. Create Manual Backup Before Any Deployment

```bash
# Always run before deploying schema changes
heroku pg:backups:capture -a wildway-api
```

### 3. Fix the dist/ Situation

**Option A (Recommended): Keep dist in git, always rebuild before commit**

```bash
# Before any schema change deployment:
npm run build
git add dist/
git commit -m "Rebuild dist with schema changes"
git push heroku main
```

**Option B: Remove dist from git with proper safeguards**

Only do this if you're confident the build process works:
1. Test build locally: `npm run build`
2. Test the app starts: `npm run start`
3. Create a backup first
4. Then remove dist from git

## Deployment Checklist

Before ANY deployment that touches schema:

- [ ] Create manual backup: `heroku pg:backups:capture -a wildway-api`
- [ ] Rebuild dist locally: `npm run build`
- [ ] Test locally: `npm run develop`
- [ ] Commit dist changes: `git add dist/ && git commit -m "Rebuild dist"`
- [ ] Push to heroku: `git push heroku main`
- [ ] Verify in admin panel that schema updated
- [ ] Verify data still exists

## Schema Change Process

1. Make changes to `src/api/*/content-types/*/schema.json`
2. Run `npm run build` locally
3. Verify `dist/` has the changes: `grep "your_new_field" dist/src/api/*/content-types/*/schema.json`
4. Create backup on Heroku
5. Commit both src and dist changes
6. Deploy

## Recovery Options

If disaster strikes:

1. **Heroku backups**: `heroku pg:backups:restore <backup-id> DATABASE_URL -a wildway-api`
2. **Contact Heroku support**: They may have short-term disaster recovery
3. **Local SQLite**: Can export and import to Postgres (see export script)

## Monitoring

Set up alerts for:
- Failed deployments
- Database connection errors
- Strapi startup failures
