#!/usr/bin/env node

/**
 * Migrate production PostgreSQL data to local SQLite
 *
 * Usage:
 *   node scripts/migrate-prod-to-local.js              # Full replace (wipes local, copies prod)
 *   node scripts/migrate-prod-to-local.js --additive   # Additive (upsert - adds new, updates existing)
 *
 * Options:
 *   --additive    Only add new records and update existing ones (preserves local-only data)
 *
 * Environment:
 *   DATABASE_URL  Override the production database connection string
 */

const knex = require('knex');
const path = require('path');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
const ADDITIVE_MODE = args.includes('--additive');

// Production PostgreSQL connection
const PROD_DATABASE_URL = process.env.DATABASE_URL

// Local SQLite path
const LOCAL_DB_PATH = path.join(process.cwd(), '.tmp', 'data.db');

// Content tables in dependency order (independent tables first)
const CONTENT_TABLES = [
  'strapi_core_store_settings',
  'strapi_webhooks',
  'admin_users',
  'admin_roles',
  'admin_permissions',
  'strapi_api_tokens',
  'strapi_api_token_permissions',
  'strapi_transfer_tokens',
  'strapi_transfer_token_permissions',
  'strapi_releases',
  'strapi_release_actions',
  'strapi_workflows',
  'strapi_workflows_stages',
  'strapi_history_versions',
  'up_permissions',
  'up_roles',
  'up_users',
  'files',
  'upload_folders',
  // App content tables
  'site_types',
  'facilities',
  'tags',
  'user_roles',
  'filter_groups',
  'filters',
  'auth_users',
  'sites',
  'posts',
  'faqs',
  'quicklinks',
  'nomad_routes',
  'minimum_app_versions',
  'directions_killswitches',
  'forms',
  'subscriptions',
  'comments',
  'edit_requests',
  'addition_requests',
  'form_submissions',
  'user_routes',
  // Component tables
  'components_filter_filters',
  'components_filter_filter',
  'components_order_sites',
  'components_seo_seo_blocks',
];

// Link/junction tables (for relationships)
const LINK_TABLES = [
  // Admin link tables
  'admin_users_roles_links',
  'admin_permissions_role_links',
  'strapi_api_token_permissions_token_links',
  'strapi_transfer_token_permissions_token_links',
  'strapi_release_actions_release_links',
  'strapi_workflows_stages_workflow_links',
  'strapi_workflows_stage_required_to_publish_links',
  'strapi_workflows_stages_permissions_links',
  'up_permissions_role_links',
  'up_users_role_links',
  'files_related_morphs',
  'files_folder_links',
  'upload_folders_parent_links',
  // App link tables
  'sites_type_links',
  'sites_facilities_links',
  'sites_owners_links',
  'sites_added_by_links',
  'sites_contributors_links',
  'sites_sub_types_links',
  'sites_tags_links',
  'site_types_facilities_links',
  'auth_users_role_links',
  'auth_users_favourites_links',
  'filters_filter_group_links',
  'filter_groups_components',
  'addition_requests_owner_links',
  'addition_requests_type_links',
  'addition_requests_facilities_links',
  'addition_requests_sub_types_links',
  'addition_requests_potential_duplicates_links',
  'edit_requests_site_links',
  'edit_requests_owner_links',
  'edit_requests_facilities_links',
  'comments_owner_links',
  'comments_site_links',
  'subscriptions_user_role_links',
  'subscriptions_auth_user_links',
  'nomad_routes_tags_links',
  'nomad_routes_stay_links',
  'nomad_routes_pois_links',
  'posts_tags_links',
  'posts_components',
  'user_routes_owner_links',
  'user_routes_saved_by_links',
  'user_routes_tags_links',
  'user_routes_components',
  'home_filterlinks',
  'home_filterlinks_filter_links',
];

async function migrate() {
  console.log('🚀 Starting production → local migration\n');
  console.log(`   Mode: ${ADDITIVE_MODE ? 'ADDITIVE (upsert)' : 'FULL REPLACE (wipe & copy)'}\n`);

  // Ensure .tmp directory exists
  const tmpDir = path.dirname(LOCAL_DB_PATH);
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  // Backup existing local database
  if (fs.existsSync(LOCAL_DB_PATH)) {
    const backupPath = `${LOCAL_DB_PATH}.backup-${Date.now()}`;
    fs.copyFileSync(LOCAL_DB_PATH, backupPath);
    console.log(`📦 Backed up existing database to ${path.basename(backupPath)}\n`);
  }

  // Connect to production PostgreSQL
  const prodDb = knex({
    client: 'pg',
    connection: {
      connectionString: PROD_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    }
  });

  // Connect to local SQLite
  const localDb = knex({
    client: 'better-sqlite3',
    connection: {
      filename: LOCAL_DB_PATH
    },
    useNullAsDefault: true
  });

  try {
    // Test connections
    console.log('🔌 Testing connections...');
    await prodDb.raw('SELECT 1');
    console.log('   ✓ Production PostgreSQL connected');
    await localDb.raw('SELECT 1');
    console.log('   ✓ Local SQLite connected\n');

    // Get all tables from production
    const { rows: prodTables } = await prodDb.raw(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    const prodTableNames = prodTables.map(t => t.tablename);
    console.log(`📊 Found ${prodTableNames.length} tables in production\n`);

    // Combine and dedupe table lists, prioritizing our order
    const allTables = [...CONTENT_TABLES, ...LINK_TABLES];
    const orderedTables = allTables.filter(t => prodTableNames.includes(t));

    // Add any tables we missed
    const missedTables = prodTableNames.filter(t => !allTables.includes(t) && !t.startsWith('knex_'));
    if (missedTables.length > 0) {
      console.log(`⚠️  Found ${missedTables.length} additional tables: ${missedTables.join(', ')}\n`);
      orderedTables.push(...missedTables);
    }

    // Disable foreign key checks for SQLite
    await localDb.raw('PRAGMA foreign_keys = OFF');

    // Migrate each table
    let totalRows = 0;
    const errors = [];

    for (const tableName of orderedTables) {
      try {
        // Check if table exists in local DB
        const localTableExists = await localDb.schema.hasTable(tableName);

        if (!localTableExists) {
          console.log(`   ⏭️  ${tableName} - table doesn't exist locally, skipping`);
          continue;
        }

        // Get row count from production
        const [{ count }] = await prodDb(tableName).count('* as count');
        const rowCount = parseInt(count);

        if (rowCount === 0) {
          console.log(`   ⏭️  ${tableName} - empty in production`);
          continue;
        }

        // In full replace mode, clear existing local data first
        if (!ADDITIVE_MODE) {
          await localDb(tableName).del();
        }

        // Fetch all data from production
        const rows = await prodDb(tableName).select('*');

        // Get column info for upsert
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

        // Insert in batches to avoid SQLite limits
        const BATCH_SIZE = 100;
        let inserted = 0;
        let updated = 0;

        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          const batch = rows.slice(i, i + BATCH_SIZE);

          // Convert PostgreSQL-specific types to SQLite-compatible
          const convertedBatch = batch.map(row => {
            const converted = {};
            for (const [key, value] of Object.entries(row)) {
              if (value === null || value === undefined) {
                converted[key] = null;
              } else if (typeof value === 'object' && !(value instanceof Date)) {
                // Convert JSON/JSONB objects to strings
                converted[key] = JSON.stringify(value);
              } else if (value instanceof Date) {
                converted[key] = value.toISOString();
              } else if (typeof value === 'boolean') {
                // SQLite uses 0/1 for booleans
                converted[key] = value ? 1 : 0;
              } else {
                converted[key] = value;
              }
            }
            return converted;
          });

          if (ADDITIVE_MODE) {
            // Upsert: insert or replace on conflict
            for (const row of convertedBatch) {
              // Check if row exists (by id)
              const existingRow = row.id ? await localDb(tableName).where('id', row.id).first() : null;

              if (existingRow) {
                await localDb(tableName).where('id', row.id).update(row);
                updated++;
              } else {
                await localDb(tableName).insert(row);
                inserted++;
              }
            }
          } else {
            await localDb(tableName).insert(convertedBatch);
            inserted += convertedBatch.length;
          }
        }

        totalRows += inserted + updated;
        if (ADDITIVE_MODE) {
          console.log(`   ✓ ${tableName} - ${inserted} inserted, ${updated} updated`);
        } else {
          console.log(`   ✓ ${tableName} - ${rowCount} rows`);
        }

      } catch (err) {
        errors.push({ table: tableName, error: err.message });
        console.log(`   ✗ ${tableName} - ERROR: ${err.message}`);
      }
    }

    // Re-enable foreign key checks
    await localDb.raw('PRAGMA foreign_keys = ON');

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Migration complete!`);
    console.log(`   Total rows migrated: ${totalRows}`);
    console.log(`   Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n⚠️  Tables with errors:');
      errors.forEach(({ table, error }) => {
        console.log(`   - ${table}: ${error}`);
      });
    }

    console.log(`\n📁 Local database: ${LOCAL_DB_PATH}`);

  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await prodDb.destroy();
    await localDb.destroy();
  }
}

migrate();
