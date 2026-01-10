#!/usr/bin/env node

/**
 * Import all data from exported JSON files in dependency order
 *
 * Usage: node scripts/import-all.js
 *
 * Make sure Strapi is running on localhost:1337 before running this script.
 */

const fs = require('fs');
const path = require('path');

const STRAPI_URL = 'http://localhost:1337';
const DOWNLOADS_DIR = path.join(require('os').homedir(), 'Downloads');

// Import order based on dependencies
const IMPORT_ORDER = [
  // 1. No dependencies
  { file: 'faq-1767972277020.json', model: 'api::faq.faq', kind: 'collectionType' },
  { file: 'quicklink-1767972312493.json', model: 'api::quicklink.quicklink', kind: 'collectionType' },
  { file: 'directions-killswitch-1767972264759.json', model: 'api::directions-killswitch.directions-killswitch', kind: 'singleType' },
  { file: 'minimum-app-version-1767972294013.json', model: 'api::minimum-app-version.minimum-app-version', kind: 'singleType' },
  { file: 'subscription-1767972318709.json', model: 'api::subscription.subscription', kind: 'collectionType' },
  { file: 'user-role-1767971729845.json', model: 'api::user-role.user-role', kind: 'collectionType' },

  // 2. Basic entities
  { file: 'filter-1767972118902.json', model: 'api::filter.filter', kind: 'collectionType' },
  { file: 'site-type-1767971630951.json', model: 'api::site-type.site-type', kind: 'collectionType' },
  { file: 'facility-1767972049154.json', model: 'api::facility.facility', kind: 'collectionType' },
  { file: 'tag-1767971726235.json', model: 'api::tag.tag', kind: 'collectionType' },

  // 3. Users & forms
  { file: 'auth-user-1767971557629.json', model: 'api::auth-user.auth-user', kind: 'collectionType' },
  { file: 'filter-group-1767972124225.json', model: 'api::filter-group.filter-group', kind: 'collectionType' },
  { file: 'form-1767972283844.json', model: 'api::form.form', kind: 'collectionType' },

  // 4. Main content
  { file: 'site-1767971598532.json', model: 'api::site.site', kind: 'collectionType' },
  { file: 'form-submission-1767972287075.json', model: 'api::form-submission.form-submission', kind: 'collectionType' },
  { file: 'post-1767972308041.json', model: 'api::post.post', kind: 'collectionType' },

  // 5. User content
  { file: 'user-route-1767972434455.json', model: 'api::user-route.user-route', kind: 'collectionType' },
  { file: 'comment-1767972262930.json', model: 'api::comment.comment', kind: 'collectionType' },
  { file: 'addition-request-1767972253375.json', model: 'api::addition-request.addition-request', kind: 'collectionType' },
  { file: 'edit-request-1767972254924.json', model: 'api::edit-request.edit-request', kind: 'collectionType' },

  // 6. Links
  { file: 'home-filterlink-1767972290729.json', model: 'api::home-filterlink.home-filterlink', kind: 'collectionType' },
];

async function importFile(config) {
  const filePath = path.join(DOWNLOADS_DIR, config.file);

  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  File not found: ${config.file}`);
    return { success: false, error: 'File not found' };
  }

  const fileContent = fs.readFileSync(filePath, 'utf8');
  const jsonData = JSON.parse(fileContent);

  // Check if there's data to import
  if (config.kind === 'collectionType') {
    if (!jsonData.data || jsonData.data.length === 0) {
      console.log(`  ⏭️  No data to import: ${config.file}`);
      return { success: true, count: 0 };
    }
  }

  const payload = {
    targetModel: config.model,
    source: jsonData,
    kind: config.kind,
  };

  try {
    const response = await fetch(`${STRAPI_URL}/content-export-import/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    const count = config.kind === 'collectionType' ? jsonData.data.length : 1;
    return { success: true, count };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('           STRAPI DATA IMPORT SCRIPT');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // Check if Strapi is running
  try {
    const healthCheck = await fetch(`${STRAPI_URL}/_health`);
    if (!healthCheck.ok) throw new Error('Not healthy');
    console.log('✅ Strapi is running\n');
  } catch (e) {
    console.error('❌ Strapi is not running at ' + STRAPI_URL);
    console.error('   Please start Strapi first: yarn develop\n');
    process.exit(1);
  }

  let successCount = 0;
  let failCount = 0;
  let totalRecords = 0;

  for (const config of IMPORT_ORDER) {
    const modelName = config.model.split('.')[1];
    process.stdout.write(`Importing ${modelName}...`);

    const result = await importFile(config);

    if (result.success) {
      successCount++;
      totalRecords += result.count || 0;
      console.log(` ✅ (${result.count || 0} records)`);
    } else {
      failCount++;
      console.log(` ❌ ${result.error}`);
    }

    // Small delay between imports to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`           IMPORT COMPLETE`);
  console.log(`           ✅ Success: ${successCount}/${IMPORT_ORDER.length}`);
  console.log(`           ❌ Failed: ${failCount}/${IMPORT_ORDER.length}`);
  console.log(`           📊 Total records: ${totalRecords}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
}

main().catch(console.error);
