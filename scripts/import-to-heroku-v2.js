/**
 * Import SQLite export to Heroku PostgreSQL - V2
 * Uses schema introspection to properly convert types
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const EXPORT_DIR = process.env.EXPORT_DIR || '/tmp/db_export';

// Tables in dependency order
const IMPORT_ORDER = [
  'site_types', 'facilities', 'tags', 'user_roles', 'filter_groups', 'filters',
  'auth_users', 'sites', 'posts', 'faqs', 'quicklinks', 'nomad_routes',
  'minimum_app_versions', 'directions_killswitches', 'forms', 'subscriptions',
  'comments', 'edit_requests', 'addition_requests', 'form_submissions',
  // Link tables
  'sites_type_links', 'sites_facilities_links', 'sites_owners_links',
  'sites_added_by_links', 'sites_contributors_links', 'sites_sub_types_links',
  'sites_tags_links', 'site_types_facilities_links', 'auth_users_role_links',
  'auth_users_favourites_links', 'filters_components', 'filter_groups_components',
  'addition_requests_owner_links', 'addition_requests_type_links',
  'addition_requests_facilities_links', 'addition_requests_sub_types_links',
  'edit_requests_site_links', 'edit_requests_owner_links',
  'edit_requests_facilities_links', 'comments_owner_links', 'comments_site_links',
  'subscriptions_user_role_links', 'nomad_routes_tags_links',
  'nomad_routes_stay_links', 'nomad_routes_pois_links', 'posts_tags_links',
];

let schemaCache = {};

async function getTableSchema(client, tableName) {
  if (schemaCache[tableName]) return schemaCache[tableName];

  const result = await client.query(`
    SELECT column_name, data_type, ordinal_position
    FROM information_schema.columns
    WHERE table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);

  const schema = {};
  result.rows.forEach(row => {
    schema[row.ordinal_position] = {
      name: row.column_name,
      type: row.data_type
    };
  });

  schemaCache[tableName] = schema;
  return schema;
}

function parseValues(valuesStr) {
  const values = [];
  let current = '';
  let inQuote = false;
  let depth = 0;

  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];

    if (char === "'" && valuesStr[i - 1] !== '\\') {
      inQuote = !inQuote;
      current += char;
    } else if (char === '(' && !inQuote) {
      depth++;
      current += char;
    } else if (char === ')' && !inQuote) {
      depth--;
      current += char;
    } else if (char === ',' && !inQuote && depth === 0) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    values.push(current.trim());
  }

  return values;
}

function convertValue(value, dataType) {
  // Handle NULL
  if (value === 'NULL' || value === "''") {
    return 'NULL';
  }

  // Handle boolean
  if (dataType === 'boolean') {
    if (value === '0' || value === 'false' || value === 'FALSE') return 'FALSE';
    if (value === '1' || value === 'true' || value === 'TRUE') return 'TRUE';
    return value;
  }

  // Handle timestamps
  if (dataType.includes('timestamp')) {
    // If it's a large number (milliseconds since epoch)
    const num = parseInt(value);
    if (!isNaN(num) && num > 1000000000000 && num < 2000000000000) {
      const date = new Date(num);
      return `'${date.toISOString()}'`;
    }
    // If it's already a string timestamp, keep it
    if (value.startsWith("'")) return value;
    return value;
  }

  // Handle integers - make sure we don't have timestamps in integer fields
  if (dataType === 'integer' || dataType === 'bigint') {
    // Don't convert timestamps that were accidentally converted
    if (value.startsWith("'") && value.includes('T')) {
      // This is a timestamp string in an integer field - it's probably an ID, return NULL
      return 'NULL';
    }
    return value;
  }

  return value;
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

  // Get schema for this table
  const schema = await getTableSchema(client, tableName);
  const columnCount = Object.keys(schema).length;

  if (columnCount === 0) {
    console.log(`  Warning: No schema found for ${tableName}`);
    return { count: 0, errCount: 0 };
  }

  const statements = content.split(';\n').filter(s => s.trim());

  let imported = 0;
  let errCount = 0;

  for (const stmt of statements) {
    if (!stmt.trim()) continue;

    try {
      // Extract VALUES part
      const match = stmt.match(/INSERT INTO "?(\w+)"?\s*VALUES\s*\((.+)\)$/i);
      if (!match) {
        errCount++;
        continue;
      }

      const valuesStr = match[2];
      const values = parseValues(valuesStr);

      // Convert each value based on column type
      const convertedValues = values.map((val, idx) => {
        const colInfo = schema[idx + 1]; // ordinal_position is 1-based
        if (!colInfo) return val;
        return convertValue(val, colInfo.type);
      });

      const sql = `INSERT INTO "${tableName}" VALUES(${convertedValues.join(',')});`;
      await client.query(sql);
      imported++;
    } catch (err) {
      errCount++;
      if (errCount === 1) {
        console.error(`  Error in ${tableName}: ${err.message}`);
      }
    }
  }

  if (errCount > 0 && imported === 0) {
    console.log(`  ${tableName}: ${errCount} errors`);
  } else if (errCount > 0) {
    console.log(`  ${tableName}: ${imported} imported, ${errCount} errors`);
  }

  return { count: imported, errCount };
}

async function resetSequences(client) {
  console.log('\nResetting sequences...');

  const result = await client.query(`
    SELECT
      t.relname as table_name,
      a.attname as column_name,
      s.relname as sequence_name
    FROM pg_class s
    JOIN pg_depend d ON d.objid = s.oid
    JOIN pg_class t ON d.refobjid = t.oid
    JOIN pg_attribute a ON (d.refobjid, d.refobjsubid) = (a.attrelid, a.attnum)
    WHERE s.relkind = 'S' AND t.relkind = 'r'
  `);

  for (const row of result.rows) {
    try {
      await client.query(`
        SELECT setval('${row.sequence_name}',
          COALESCE((SELECT MAX(${row.column_name}) FROM ${row.table_name}), 1))
      `);
    } catch (err) {
      // Ignore
    }
  }
  console.log('Sequences reset.');
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

    await resetSequences(client);

    console.log('\n--- Import Summary ---');
    console.log(`Tables with data: ${Object.keys(results).length}`);
    console.log(`Total rows: ${Object.values(results).reduce((a, b) => a + b, 0)}`);

    if (Object.keys(errors).length > 0) {
      console.log(`\nTables with errors: ${Object.keys(errors).length}`);
    }

  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
