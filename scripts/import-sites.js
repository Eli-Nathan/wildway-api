#!/usr/bin/env node

/**
 * Import sites from transformed JSON into Strapi via REST API
 *
 * Features:
 * - Duplicate detection via /api/search/check-similar
 * - Image upload support (optional)
 * - Rate limiting to avoid overwhelming the server
 * - Detailed logging and output files
 *
 * Usage:
 *   node scripts/import-sites.js <json-file> [options]
 *
 * Options:
 *   --api-url <url>       Strapi URL (default: http://localhost:1337)
 *   --api-token <token>   API token for authentication
 *   --upload-images       Download and upload images
 *   --dry-run             Check for duplicates only, don't create sites
 *   --skip-dupes          Skip duplicate check (faster, riskier)
 *   --type-id <id>        Site type ID for camping (default: 1)
 *   --delay <ms>          Delay between requests in ms (default: 200)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    inputFile: null,
    apiUrl: process.env.STRAPI_URL || 'http://localhost:1337',
    apiToken: process.env.STRAPI_API_TOKEN || null,
    uploadImages: false,
    dryRun: false,
    skipDupes: false,
    typeId: 1,
    addedBy: 2, // Default user ID for attribution
    delay: 200,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--api-url' && args[i + 1]) {
      options.apiUrl = args[++i];
    } else if (arg === '--api-token' && args[i + 1]) {
      options.apiToken = args[++i];
    } else if (arg === '--upload-images') {
      options.uploadImages = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--skip-dupes') {
      options.skipDupes = true;
    } else if (arg === '--type-id' && args[i + 1]) {
      options.typeId = parseInt(args[++i], 10);
    } else if (arg === '--added-by' && args[i + 1]) {
      options.addedBy = parseInt(args[++i], 10);
    } else if (arg === '--delay' && args[i + 1]) {
      options.delay = parseInt(args[++i], 10);
    } else if (!arg.startsWith('--') && !options.inputFile) {
      options.inputFile = arg;
    }
  }

  return options;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Make HTTP request
 */
async function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = protocol.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

/**
 * Check for similar/duplicate sites
 */
async function checkForDuplicates(site, apiUrl) {
  const params = new URLSearchParams({
    placeName: site.title,
    ...(site.lat && { lat: site.lat }),
    ...(site.lng && { lng: site.lng }),
    radius: 5,
  });

  const url = `${apiUrl}/api/search/check-similar?${params}`;
  const response = await request(url);

  if (response.status !== 200) {
    throw new Error(`Duplicate check failed: ${response.status}`);
  }

  return response.data;
}

/**
 * Create a site via Strapi API
 */
async function createSite(site, apiUrl, apiToken, typeId, addedBy) {
  const url = `${apiUrl}/api/sites`;

  const body = {
    data: {
      title: site.title,
      slug: site.slug,
      lat: site.lat,
      lng: site.lng,
      latlng: site.latlng,
      region: site.region,
      description: site.description || '',
      type: typeId,
      priority: site.priority || 0,
      pricerange: site.pricerange || '---',
      // Attribute to user
      added_by: addedBy,
      // Store original image URL in legacy field if not uploading
      ...(site.image && { image: site.image }),
    },
  };

  const headers = {
    'Content-Type': 'application/json',
  };

  if (apiToken) {
    headers['Authorization'] = `Bearer ${apiToken}`;
  }

  const response = await request(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  return response;
}

/**
 * Download image from URL
 */
async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadImage(response.headers.location).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Main import function
 */
async function importSites(options) {
  // Read input file
  const inputPath = path.resolve(options.inputFile);
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: File not found: ${inputPath}`);
    process.exit(1);
  }

  const inputData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const sites = inputData.data || inputData;

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('              STRAPI SITE IMPORT');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log(`Input:        ${inputPath}`);
  console.log(`Sites:        ${sites.length}`);
  console.log(`API URL:      ${options.apiUrl}`);
  console.log(`Type ID:      ${options.typeId}`);
  console.log(`Added by:     User ${options.addedBy}`);
  console.log(`Dry run:      ${options.dryRun ? 'Yes' : 'No'}`);
  console.log(`Skip dupes:   ${options.skipDupes ? 'Yes' : 'No'}`);
  console.log(`Delay:        ${options.delay}ms`);
  console.log('');

  // Check if Strapi is running
  try {
    const health = await request(`${options.apiUrl}/_health`);
    if (health.status !== 204 && health.status !== 200) {
      throw new Error('Not healthy');
    }
    console.log('Strapi is running\n');
  } catch (e) {
    console.error(`Strapi is not running at ${options.apiUrl}`);
    console.error('Please start Strapi first: yarn develop\n');
    process.exit(1);
  }

  // Results tracking
  const results = {
    created: [],
    duplicates: [],
    errors: [],
  };

  // Process each site
  for (let i = 0; i < sites.length; i++) {
    const site = sites[i];
    const progress = `[${i + 1}/${sites.length}]`;

    process.stdout.write(`\r${progress} Processing: ${site.title.substring(0, 40).padEnd(40)}...`);

    try {
      // Step 1: Check for duplicates (unless skipped)
      if (!options.skipDupes) {
        const dupeCheck = await checkForDuplicates(site, options.apiUrl);

        if (dupeCheck.hasPotentialDuplicates) {
          results.duplicates.push({
            site,
            similarSites: dupeCheck.similarSites,
            count: dupeCheck.count,
          });
          process.stdout.write(`\r${progress} DUPLICATE: ${site.title.substring(0, 40).padEnd(40)}   \n`);
          await sleep(options.delay);
          continue;
        }
      }

      // Step 2: Create site (unless dry run)
      if (!options.dryRun) {
        const createResponse = await createSite(site, options.apiUrl, options.apiToken, options.typeId, options.addedBy);

        if (createResponse.status === 200 || createResponse.status === 201) {
          results.created.push({
            site,
            response: createResponse.data,
          });
          process.stdout.write(`\r${progress} CREATED: ${site.title.substring(0, 40).padEnd(40)}     \n`);
        } else {
          results.errors.push({
            site,
            error: createResponse.data,
            status: createResponse.status,
          });
          process.stdout.write(`\r${progress} ERROR: ${site.title.substring(0, 40).padEnd(40)}       \n`);
        }
      } else {
        results.created.push({ site, dryRun: true });
        process.stdout.write(`\r${progress} WOULD CREATE: ${site.title.substring(0, 40).padEnd(40)} \n`);
      }

    } catch (err) {
      results.errors.push({
        site,
        error: err.message,
      });
      process.stdout.write(`\r${progress} ERROR: ${site.title.substring(0, 40).padEnd(40)}       \n`);
    }

    await sleep(options.delay);
  }

  // Write output files
  const outputDir = path.dirname(inputPath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  if (results.created.length > 0) {
    const createdPath = path.join(outputDir, `import-created-${timestamp}.json`);
    fs.writeFileSync(createdPath, JSON.stringify(results.created, null, 2));
    console.log(`\nCreated sites log: ${createdPath}`);
  }

  if (results.duplicates.length > 0) {
    const dupesPath = path.join(outputDir, `import-duplicates-${timestamp}.json`);
    fs.writeFileSync(dupesPath, JSON.stringify(results.duplicates, null, 2));
    console.log(`Duplicates log: ${dupesPath}`);
  }

  if (results.errors.length > 0) {
    const errorsPath = path.join(outputDir, `import-errors-${timestamp}.json`);
    fs.writeFileSync(errorsPath, JSON.stringify(results.errors, null, 2));
    console.log(`Errors log: ${errorsPath}`);
  }

  // Summary
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('              IMPORT COMPLETE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  Created:    ${results.created.length}`);
  console.log(`  Duplicates: ${results.duplicates.length}`);
  console.log(`  Errors:     ${results.errors.length}`);
  console.log('');

  if (results.duplicates.length > 0) {
    console.log('Duplicate sites were written to a separate file for review.');
    console.log('Review them manually and decide whether to import or skip.\n');
  }

  if (options.dryRun) {
    console.log('This was a DRY RUN. No sites were actually created.');
    console.log('Run without --dry-run to import sites.\n');
  }
}

function showHelp() {
  console.log(`
Usage: node scripts/import-sites.js <json-file> [options]

Options:
  --api-url <url>       Strapi URL (default: http://localhost:1337)
  --api-token <token>   API token for authentication
  --upload-images       Download and upload images (not yet implemented)
  --dry-run             Check for duplicates only, don't create sites
  --skip-dupes          Skip duplicate check (faster, riskier)
  --type-id <id>        Site type ID for camping (default: 1)
  --added-by <id>       User ID to attribute sites to (default: 2)
  --delay <ms>          Delay between requests in ms (default: 200)

Environment variables:
  STRAPI_URL            Alternative to --api-url
  STRAPI_API_TOKEN      Alternative to --api-token

Examples:
  # Dry run to check for duplicates
  node scripts/import-sites.js ../nomad/scripts/site-data-transformed.json --dry-run

  # Import with API token
  node scripts/import-sites.js data.json --api-token abc123

  # Import to production
  node scripts/import-sites.js data.json --api-url https://api.example.com --api-token abc123
`);
}

// Main
const options = parseArgs();

if (!options.inputFile) {
  showHelp();
  process.exit(1);
}

importSites(options).catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
