#!/usr/bin/env node

/**
 * Fetch type and facility mappings from Strapi
 *
 * Usage:
 *   node scripts/fetch-mappings.js [options]
 *
 * Options:
 *   --api-url <url>    Strapi URL (default: http://localhost:1337)
 *   --output <file>    Output file (default: ./mappings.json)
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    apiUrl: process.env.STRAPI_URL || 'http://localhost:1337',
    output: path.join(__dirname, 'mappings.json'),
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--api-url' && args[i + 1]) {
      options.apiUrl = args[++i];
    } else if (args[i] === '--output' && args[i + 1]) {
      options.output = args[++i];
    }
  }

  return options;
}

async function request(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    protocol.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error(`Invalid JSON from ${url}`));
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const options = parseArgs();

  console.log('');
  console.log('Fetching mappings from Strapi...');
  console.log(`API URL: ${options.apiUrl}`);
  console.log('');

  const mappings = {
    _comment: 'Auto-generated mappings from Strapi. Do not edit manually.',
    _generatedAt: new Date().toISOString(),
    siteTypes: {},
    facilities: {},
    defaultTypeId: 1,
    defaultPriority: 0,
    defaultPricerange: '---',
  };

  try {
    // Fetch site types
    console.log('Fetching site types...');
    const typesResponse = await request(`${options.apiUrl}/api/site-types?pagination[limit]=100`);
    const types = typesResponse.data || [];

    for (const type of types) {
      const attrs = type.attributes || type;
      const name = (attrs.name || attrs.slug || '').toLowerCase();
      const slug = (attrs.slug || '').toLowerCase();

      if (name) mappings.siteTypes[name] = type.id;
      if (slug && slug !== name) mappings.siteTypes[slug] = type.id;
    }

    console.log(`  Found ${types.length} site types`);

    // Fetch facilities
    console.log('Fetching facilities...');
    const facilitiesResponse = await request(`${options.apiUrl}/api/facilities?pagination[limit]=100`);
    const facilities = facilitiesResponse.data || [];

    for (const facility of facilities) {
      const attrs = facility.attributes || facility;
      const name = (attrs.name || '').toLowerCase().replace(/\s+/g, '_');

      if (name) mappings.facilities[name] = facility.id;
    }

    console.log(`  Found ${facilities.length} facilities`);

    // Add common aliases
    addAliases(mappings);

    // Write output
    fs.writeFileSync(options.output, JSON.stringify(mappings, null, 2));
    console.log(`\nMappings saved to: ${options.output}`);

    // Print summary
    console.log('\nSite Types:');
    for (const [name, id] of Object.entries(mappings.siteTypes).slice(0, 10)) {
      console.log(`  ${name}: ${id}`);
    }
    if (Object.keys(mappings.siteTypes).length > 10) {
      console.log(`  ... and ${Object.keys(mappings.siteTypes).length - 10} more`);
    }

    console.log('\nFacilities:');
    for (const [name, id] of Object.entries(mappings.facilities).slice(0, 10)) {
      console.log(`  ${name}: ${id}`);
    }
    if (Object.keys(mappings.facilities).length > 10) {
      console.log(`  ... and ${Object.keys(mappings.facilities).length - 10} more`);
    }

  } catch (err) {
    console.error(`Error: ${err.message}`);
    console.error('\nMake sure Strapi is running at the specified URL.');
    process.exit(1);
  }
}

function addAliases(mappings) {
  // Add common aliases for site types
  const typeAliases = {
    'camp_site': 'camping',
    'campsites': 'camping',
    'caravan_site': 'camping',
    'campervans': 'camping',
    'peak': 'mountains',
    'munro': 'mountains',
    'beaches': 'beach',
    'lochs': 'loch',
    'lake': 'loch',
    'charging_station': 'ev_charging',
    'viewpoints': 'viewpoint',
    'castle': 'historic',
    'monument': 'historic',
    'ruins': 'historic',
  };

  for (const [alias, target] of Object.entries(typeAliases)) {
    if (mappings.siteTypes[target] && !mappings.siteTypes[alias]) {
      mappings.siteTypes[alias] = mappings.siteTypes[target];
    }
  }

  // Add common aliases for facilities
  const facilityAliases = {
    'water': 'drinking_water',
    'wc': 'toilets',
    'toilet': 'toilets',
    'shower': 'showers',
  };

  for (const [alias, target] of Object.entries(facilityAliases)) {
    if (mappings.facilities[target] && !mappings.facilities[alias]) {
      mappings.facilities[alias] = mappings.facilities[target];
    }
  }
}

main();
