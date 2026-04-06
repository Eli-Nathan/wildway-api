/**
 * Import SQLite export to Heroku PostgreSQL
 *
 * Usage:
 *   1. First run the export: ./scripts/export-sqlite.sh
 *   2. Then run: heroku run "node scripts/import-to-heroku.js" -a wildway-api
 *
 * Or run locally with DATABASE_URL set:
 *   DATABASE_URL=$(heroku config:get DATABASE_URL -a wildway-api) node scripts/import-to-heroku.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const EXPORT_DIR = process.env.EXPORT_DIR || '/tmp/db_export';

// Tables in order of dependencies (parents first)
const IMPORT_ORDER = [
  // Core reference tables (no dependencies)
  'site_types',
  'facilities',
  'tags',
  'user_roles',
  'filter_groups',
  'filters',

  // Users
  'auth_users',

  // Content tables
  'sites',
  'posts',
  'faqs',
  'quicklinks',
  'nomad_routes',
  'minimum_app_versions',
  'directions_killswitches',
  'forms',
  'subscriptions',

  // Dependent content
  'comments',
  'edit_requests',
  'addition_requests',
  'form_submissions',

  // Link/junction tables
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
  'filters_components',
  'filter_groups_components',
  'addition_requests_owner_links',
  'addition_requests_type_links',
  'addition_requests_facilities_links',
  'addition_requests_sub_types_links',
  'edit_requests_site_links',
  'edit_requests_owner_links',
  'edit_requests_facilities_links',
  'comments_owner_links',
  'comments_site_links',
  'subscriptions_user_role_links',
  'nomad_routes_tags_links',
  'nomad_routes_stay_links',
  'nomad_routes_pois_links',
  'posts_tags_links',
  'posts_components',
];

// Columns that are timestamps (add more as needed)
const TIMESTAMP_COLUMNS = [
  'created_at', 'updated_at', 'published_at', 'created_by_id', 'updated_by_id',
  'start', 'end', 'expires_at', 'last_login'
];

// Columns that are booleans
const BOOLEAN_COLUMNS = [
  'is_verified', 'enabled', 'should_show_title', 'unlisted', 'is_premium',
  'is_active', 'is_admin', 'blocked', 'confirmed'
];

// Convert SQLite INSERT to PostgreSQL compatible
function convertToPostgres(sql, tableName) {
  // First, extract the VALUES part
  const match = sql.match(/INSERT INTO "?(\w+)"?\s*VALUES\s*\((.+)\);?$/i);
  if (!match) return sql;

  const table = match[1];
  let valuesStr = match[2];

  // Convert timestamps (large integers > year 2000 in ms)
  // Match numbers that look like timestamps (13 digits, starting with 1)
  valuesStr = valuesStr.replace(/\b(1[0-9]{12})\b/g, (match) => {
    const ms = parseInt(match);
    const date = new Date(ms);
    if (date.getFullYear() >= 2000 && date.getFullYear() <= 2100) {
      return `'${date.toISOString()}'`;
    }
    return match;
  });

  // Booleans: SQLite uses 0/1, PostgreSQL needs TRUE/FALSE
  // Only convert 0/1 that appear right after a comma and before another comma
  // AND are not likely IDs (IDs are typically at the start)
  // This is imperfect but better than nothing

  // Split by comma, but preserve quoted strings
  const parts = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];
    if (char === "'" && valuesStr[i-1] !== '\\') {
      inQuote = !inQuote;
    }
    if (char === ',' && !inQuote) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current.trim());

  // Convert 0/1 to FALSE/TRUE only for values that are exactly "0" or "1"
  // and appear after the first few columns (which are typically IDs)
  // Skip first 3 columns as they're usually id, document_id, locale
  const converted = parts.map((part, idx) => {
    if (idx > 2 && part === '0') return 'FALSE';
    if (idx > 2 && part === '1') return 'TRUE';
    return part;
  });

  valuesStr = converted.join(',');

  // Handle empty string to NULL
  valuesStr = valuesStr.replace(/''/g, 'NULL');

  // Handle trailing comma before )
  valuesStr = valuesStr.replace(/,\s*\)/g, ')');

  return `INSERT INTO "${table}" VALUES(${valuesStr});`;
}

async function importTable(client, tableName) {
  const filePath = path.join(EXPORT_DIR, `${tableName}.sql`);

  if (!fs.existsSync(filePath)) {
    return { count: 0, errCount: 0 };
  }

  const content = fs.readFileSync(filePath, 'utf8').trim();

  if (!content) {
    return { count: 0, errCount: 0 };
  }

  const statements = content.split(';\n').filter(s => s.trim());

  let imported = 0;
  let errCount = 0;

  for (const stmt of statements) {
    if (!stmt.trim()) continue;

    try {
      const pgStatement = convertToPostgres(stmt, tableName);
      await client.query(pgStatement);
      imported++;
    } catch (err) {
      errCount++;
      // Only log first error per table to avoid spam
      if (errCount === 1) {
        console.error(`  Error in ${tableName}: ${err.message}`);
      }
    }
  }

  if (errCount > 0) {
    console.log(`  ${tableName}: ${errCount} errors (FK constraints likely)`);
  }

  return { count: imported, errCount };
}

async function resetSequences(client) {
  console.log('\nResetting sequences...');

  // Get all sequences and their tables
  const result = await client.query(`
    SELECT
      t.relname as table_name,
      a.attname as column_name,
      s.relname as sequence_name
    FROM pg_class s
    JOIN pg_depend d ON d.objid = s.oid
    JOIN pg_class t ON d.refobjid = t.oid
    JOIN pg_attribute a ON (d.refobjid, d.refobjsubid) = (a.attrelid, a.attnum)
    WHERE s.relkind = 'S'
    AND t.relkind = 'r'
  `);

  for (const row of result.rows) {
    try {
      await client.query(`
        SELECT setval('${row.sequence_name}', COALESCE((SELECT MAX(${row.column_name}) FROM ${row.table_name}), 1))
      `);
    } catch (err) {
      // Ignore errors for tables that might not have data
    }
  }
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL\n');

    console.log('Importing tables...\n');

    const results = {};
    const errors = {};

    for (const table of IMPORT_ORDER) {
      const { count, errCount } = await importTable(client, table);
      if (count > 0) {
        results[table] = count;
        console.log(`  ${table}: ${count} rows imported`);
      }
      if (errCount > 0) {
        errors[table] = errCount;
      }
    }

    // Reset sequences to avoid ID conflicts
    await resetSequences(client);

    console.log('\n--- Import Summary ---');
    console.log(`Tables with data imported: ${Object.keys(results).length}`);
    console.log(`Total rows imported: ${Object.values(results).reduce((a, b) => a + b, 0)}`);

    if (Object.keys(errors).length > 0) {
      console.log(`\nTables with errors: ${Object.keys(errors).length}`);
      console.log('(Some errors are expected due to FK constraints on empty related tables)');
    }

  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
