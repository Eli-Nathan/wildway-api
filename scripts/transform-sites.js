#!/usr/bin/env node

/**
 * Unified Site Transformer
 *
 * Transforms data from multiple sources into Strapi-compatible format:
 * - CamperContact CSV exports
 * - scraper.py JSON output
 * - Generic JSON with lat/lng/title
 *
 * Usage:
 *   node scripts/transform-sites.js <input-file> [options]
 *
 * Options:
 *   --output <file>       Output file path (default: <input>-transformed.json)
 *   --mappings <file>     Mappings file path (default: ./mappings.json)
 *   --type-id <id>        Override type ID for all sites
 *   --validate-only       Only validate, don't output
 *   --strict              Fail on validation errors instead of skipping
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_MAPPINGS_PATH = path.join(__dirname, 'mappings.json');

// ============================================================================
// Input Format Detection
// ============================================================================

const InputFormat = {
  CAMPERCONTACT_CSV: 'campercontact_csv',
  CAMPERCONTACT_JSON: 'campercontact_json',
  SCRAPER_OUTPUT: 'scraper_output',
  ALREADY_TRANSFORMED: 'already_transformed',
  GENERIC_JSON: 'generic_json',
  UNKNOWN: 'unknown',
};

function detectFormat(data, filePath) {
  // Check if it's a CSV file
  if (filePath.endsWith('.csv')) {
    return InputFormat.CAMPERCONTACT_CSV;
  }

  // Array of objects
  if (Array.isArray(data)) {
    const sample = data[0];
    if (!sample) return InputFormat.UNKNOWN;

    // CamperContact JSON (has ccId)
    if ('ccId' in sample || 'ccLink' in sample) {
      return InputFormat.CAMPERCONTACT_JSON;
    }

    // Scraper output (has sources array)
    if ('sources' in sample && Array.isArray(sample.sources)) {
      return InputFormat.SCRAPER_OUTPUT;
    }

    // Generic JSON with coordinates
    if ('lat' in sample && 'lng' in sample && 'title' in sample) {
      return InputFormat.GENERIC_JSON;
    }
  }

  // Object with data array (Strapi export format)
  if (data.data && Array.isArray(data.data)) {
    const sample = data.data[0];
    if (!sample) return InputFormat.UNKNOWN;

    // Already transformed (has slug)
    if ('slug' in sample && 'latlng' in sample) {
      return InputFormat.ALREADY_TRANSFORMED;
    }

    // Scraper output wrapped
    if ('pois' in data) {
      return InputFormat.SCRAPER_OUTPUT;
    }
  }

  // Scraper output with pois array
  if (data.pois && Array.isArray(data.pois)) {
    return InputFormat.SCRAPER_OUTPUT;
  }

  return InputFormat.UNKNOWN;
}

// ============================================================================
// CSV Parser
// ============================================================================

function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = parseCSVLine(lines[0]);

  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = values[i] || '';
    });
    return obj;
  });
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// ============================================================================
// Transformation Functions
// ============================================================================

function generateSlug(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function extractRegion(subtitle) {
  if (!subtitle) return '';
  const parts = subtitle.split(',');
  return parts[0]?.trim() || '';
}

function resolveTypeId(typeValue, mappings, overrideTypeId) {
  if (overrideTypeId) return overrideTypeId;
  if (!typeValue) return mappings.defaultTypeId;

  const normalizedType = String(typeValue).toLowerCase().trim();
  return mappings.siteTypes[normalizedType] || mappings.defaultTypeId;
}

function resolveFacilityIds(facilities, mappings) {
  if (!facilities || !Array.isArray(facilities)) return [];

  return facilities
    .map(f => {
      const normalized = String(f).toLowerCase().trim();
      return mappings.facilities[normalized];
    })
    .filter(id => id != null);
}

// ============================================================================
// Format-Specific Transformers
// ============================================================================

function transformCamperContactRow(row, mappings, options) {
  const title = row.title?.trim();
  if (!title) return null;

  const lat = parseFloat(row.lat);
  const lng = parseFloat(row.lng);
  if (isNaN(lat) || isNaN(lng)) return null;

  // If title contains "parking", use overnight parking type (ID 19)
  const isParking = title.toLowerCase().includes('parking');
  const typeId = isParking
    ? (mappings.siteTypes['overnight_parking'] || 19)
    : resolveTypeId(row.type, mappings, options.typeId);

  return {
    title,
    slug: generateSlug(title),
    lat,
    lng,
    latlng: `${lat},${lng}`,
    region: extractRegion(row.subtitle),
    description: '',
    type: typeId,
    priority: mappings.defaultPriority,
    pricerange: mappings.defaultPricerange,
    image: row.image || '',
    _source: 'campercontact',
    _originalType: row.type,
  };
}

function transformScraperPOI(poi, mappings, options) {
  const title = poi.title?.trim();
  if (!title) return null;

  const lat = parseFloat(poi.lat);
  const lng = parseFloat(poi.lng);
  if (isNaN(lat) || isNaN(lng)) return null;

  return {
    title,
    slug: generateSlug(title),
    lat,
    lng,
    latlng: `${lat},${lng}`,
    region: '', // Scraper doesn't provide region
    description: poi.description || '',
    type: resolveTypeId(poi.type, mappings, options.typeId),
    facilities: resolveFacilityIds(poi.facilities, mappings),
    priority: mappings.defaultPriority,
    pricerange: mappings.defaultPricerange,
    image: poi.image_url || '',
    _source: poi.sources?.join(',') || 'scraper',
    _originalType: poi.type,
    _attributes: poi.attributes || {},
  };
}

function transformGenericRow(row, mappings, options) {
  const title = (row.title || row.name)?.trim();
  if (!title) return null;

  const lat = parseFloat(row.lat || row.latitude);
  const lng = parseFloat(row.lng || row.lon || row.longitude);
  if (isNaN(lat) || isNaN(lng)) return null;

  return {
    title,
    slug: generateSlug(title),
    lat,
    lng,
    latlng: `${lat},${lng}`,
    region: row.region || '',
    description: row.description || '',
    type: resolveTypeId(row.type, mappings, options.typeId),
    priority: mappings.defaultPriority,
    pricerange: mappings.defaultPricerange,
    image: row.image || row.image_url || '',
    _source: 'generic',
    _originalType: row.type,
  };
}

// ============================================================================
// Main Transform Function
// ============================================================================

function transform(inputData, format, mappings, options) {
  let records = [];

  // Extract records based on format
  switch (format) {
    case InputFormat.CAMPERCONTACT_JSON:
      records = Array.isArray(inputData) ? inputData : inputData.data || [];
      break;
    case InputFormat.SCRAPER_OUTPUT:
      records = inputData.pois || inputData.data || inputData;
      break;
    case InputFormat.ALREADY_TRANSFORMED:
      console.log('Data is already transformed. Passing through with validation.');
      records = inputData.data || inputData;
      break;
    case InputFormat.GENERIC_JSON:
      records = Array.isArray(inputData) ? inputData : inputData.data || [];
      break;
    default:
      records = Array.isArray(inputData) ? inputData : [];
  }

  if (!Array.isArray(records)) {
    throw new Error('Could not extract records array from input');
  }

  const results = {
    transformed: [],
    skipped: [],
    errors: [],
  };

  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    try {
      let site = null;

      switch (format) {
        case InputFormat.CAMPERCONTACT_CSV:
        case InputFormat.CAMPERCONTACT_JSON:
          site = transformCamperContactRow(record, mappings, options);
          break;
        case InputFormat.SCRAPER_OUTPUT:
          site = transformScraperPOI(record, mappings, options);
          break;
        case InputFormat.ALREADY_TRANSFORMED:
          site = record; // Pass through
          break;
        case InputFormat.GENERIC_JSON:
        default:
          site = transformGenericRow(record, mappings, options);
          break;
      }

      if (!site) {
        results.skipped.push({
          index: i,
          record,
          reason: 'Missing required fields (title, lat, or lng)',
        });
        continue;
      }

      // Validate required fields
      const validation = validateSite(site);
      if (!validation.valid) {
        if (options.strict) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
        results.skipped.push({
          index: i,
          record,
          site,
          reason: validation.errors.join(', '),
        });
        continue;
      }

      results.transformed.push(site);

    } catch (err) {
      results.errors.push({
        index: i,
        record,
        error: err.message,
      });

      if (options.strict) {
        throw err;
      }
    }
  }

  return results;
}

// ============================================================================
// Validation
// ============================================================================

function validateSite(site) {
  const errors = [];

  // Required fields
  if (!site.title || typeof site.title !== 'string') {
    errors.push('title is required and must be a string');
  }

  if (!site.slug || typeof site.slug !== 'string') {
    errors.push('slug is required and must be a string');
  }

  if (typeof site.lat !== 'number' || isNaN(site.lat)) {
    errors.push('lat must be a valid number');
  }

  if (typeof site.lng !== 'number' || isNaN(site.lng)) {
    errors.push('lng must be a valid number');
  }

  // Coordinate bounds check (rough world bounds)
  if (site.lat < -90 || site.lat > 90) {
    errors.push('lat must be between -90 and 90');
  }

  if (site.lng < -180 || site.lng > 180) {
    errors.push('lng must be between -180 and 180');
  }

  // Type must be a number (ID)
  if (site.type != null && typeof site.type !== 'number') {
    errors.push('type must be a number (site-type ID)');
  }

  // Slug format check
  if (site.slug && !/^[a-z0-9-]+$/.test(site.slug)) {
    errors.push('slug must only contain lowercase letters, numbers, and hyphens');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Output
// ============================================================================

function createOutput(results) {
  return {
    version: 2,
    generatedAt: new Date().toISOString(),
    stats: {
      total: results.transformed.length + results.skipped.length + results.errors.length,
      transformed: results.transformed.length,
      skipped: results.skipped.length,
      errors: results.errors.length,
    },
    data: results.transformed.map((site, index) => ({
      id: index + 1,
      ...site,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
  };
}

// ============================================================================
// CLI
// ============================================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    inputFile: null,
    outputFile: null,
    mappingsFile: DEFAULT_MAPPINGS_PATH,
    typeId: null,
    validateOnly: false,
    strict: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--output' && args[i + 1]) {
      options.outputFile = args[++i];
    } else if (arg === '--mappings' && args[i + 1]) {
      options.mappingsFile = args[++i];
    } else if (arg === '--type-id' && args[i + 1]) {
      options.typeId = parseInt(args[++i], 10);
    } else if (arg === '--validate-only') {
      options.validateOnly = true;
    } else if (arg === '--strict') {
      options.strict = true;
    } else if (!arg.startsWith('--') && !options.inputFile) {
      options.inputFile = arg;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
Unified Site Transformer

Transforms data from multiple sources into Strapi-compatible format.

Usage:
  node scripts/transform-sites.js <input-file> [options]

Supported input formats:
  - CamperContact CSV exports
  - CamperContact JSON
  - scraper.py JSON output (scotland_pois.json)
  - Generic JSON with lat/lng/title fields

Options:
  --output <file>       Output file path (default: <input>-transformed.json)
  --mappings <file>     Mappings file path (default: ./mappings.json)
  --type-id <id>        Override type ID for all sites
  --validate-only       Only validate, don't write output
  --strict              Fail on validation errors instead of skipping

Examples:
  # Transform CamperContact CSV
  node scripts/transform-sites.js ../nomad/scripts/site-data.csv

  # Transform scraper output
  node scripts/transform-sites.js scotland_pois.json --type-id 3

  # Validate only
  node scripts/transform-sites.js data.json --validate-only
`);
}

async function main() {
  const options = parseArgs();

  if (!options.inputFile) {
    showHelp();
    process.exit(1);
  }

  const inputPath = path.resolve(options.inputFile);
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  // Load mappings
  const mappingsPath = path.resolve(options.mappingsFile);
  if (!fs.existsSync(mappingsPath)) {
    console.error(`Error: Mappings file not found: ${mappingsPath}`);
    console.error('Create one or run: node scripts/fetch-mappings.js');
    process.exit(1);
  }

  const mappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf-8'));

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('              SITE TRANSFORMER');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // Read and parse input
  let inputData;
  const isCSV = inputPath.endsWith('.csv');

  if (isCSV) {
    const content = fs.readFileSync(inputPath, 'utf-8');
    inputData = parseCSV(content);
    console.log(`Input:    ${inputPath} (CSV)`);
  } else {
    inputData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
    console.log(`Input:    ${inputPath} (JSON)`);
  }

  // Detect format
  const format = isCSV ? InputFormat.CAMPERCONTACT_CSV : detectFormat(inputData, inputPath);
  console.log(`Format:   ${format}`);
  console.log(`Mappings: ${mappingsPath}`);

  if (format === InputFormat.UNKNOWN) {
    console.error('\nError: Could not detect input format');
    console.error('Ensure your data has title, lat, lng fields');
    process.exit(1);
  }

  // Transform
  console.log('\nTransforming...');
  const results = transform(inputData, format, mappings, options);

  // Report
  console.log('');
  console.log(`Transformed: ${results.transformed.length}`);
  console.log(`Skipped:     ${results.skipped.length}`);
  console.log(`Errors:      ${results.errors.length}`);

  if (results.skipped.length > 0) {
    console.log('\nSkipped records:');
    results.skipped.slice(0, 5).forEach(s => {
      console.log(`  - [${s.index}] ${s.record?.title || 'Unknown'}: ${s.reason}`);
    });
    if (results.skipped.length > 5) {
      console.log(`  ... and ${results.skipped.length - 5} more`);
    }
  }

  if (results.errors.length > 0) {
    console.log('\nErrors:');
    results.errors.slice(0, 5).forEach(e => {
      console.log(`  - [${e.index}] ${e.error}`);
    });
  }

  // Output
  if (!options.validateOnly && results.transformed.length > 0) {
    const outputPath = options.outputFile || inputPath.replace(/\.(csv|json)$/, '-transformed.json');
    const output = createOutput(results);

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\nOutput: ${outputPath}`);

    // Write skipped to separate file if any
    if (results.skipped.length > 0) {
      const skippedPath = outputPath.replace('.json', '-skipped.json');
      fs.writeFileSync(skippedPath, JSON.stringify(results.skipped, null, 2));
      console.log(`Skipped: ${skippedPath}`);
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');

  if (options.validateOnly) {
    console.log('Validation complete. No output written.');
  } else {
    console.log('Transformation complete.');
    console.log('\nNext step:');
    console.log(`  node scripts/import-sites.js <output-file> --dry-run`);
  }

  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
