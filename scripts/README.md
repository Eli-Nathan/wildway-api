# Site Data Import Pipeline

Scripts for importing site data from various sources into Strapi.

## Overview

```
┌──────────────┐     ┌───────────────────┐     ┌────────────────┐     ┌─────────┐
│ Data Sources │────▶│ transform-sites.js│────▶│ import-sites.js│────▶│ Strapi  │
└──────────────┘     └───────────────────┘     └────────────────┘     └─────────┘
     │                        │
     │                        ▼
     │               ┌────────────────┐
     │               │ mappings.json  │
     │               └────────────────┘
     │                        ▲
     │               ┌────────────────┐
     └──────────────▶│fetch-mappings.js│ (auto-populate)
                     └────────────────┘
```

### Supported Input Formats
- **CamperContact CSV** - Export from CamperContact website
- **Scraper JSON** - Output from `scraper.py`
- **Generic JSON** - Any JSON matching the expected schema

---

## Prerequisites

### Node.js Scripts
```bash
npm install   # From nomad-api root
```

### Python Scraper
```bash
cd scripts
pip install -r requirements.txt
```

---

## Scripts

### 1. fetch-mappings.js

Fetches site-type and facility IDs from a running Strapi instance and updates `mappings.json`.

```bash
# Strapi must be running locally
node scripts/fetch-mappings.js

# Or specify a different Strapi URL
node scripts/fetch-mappings.js --url http://localhost:1337
```

**Output:** Updates `mappings.json` with current Strapi IDs.

---

### 2. transform-sites.js

Transforms data from various formats into Strapi-compatible JSON.

```bash
# Transform CamperContact CSV
node scripts/transform-sites.js scripts/site-data.csv -o transformed.json

# Transform scraper output
node scripts/transform-sites.js scotland_pois.json -o transformed.json

# Specify a default site type (by ID)
node scripts/transform-sites.js input.csv -o output.json --type-id 1

# Verbose output
node scripts/transform-sites.js input.csv -o output.json --verbose
```

**Options:**
| Flag | Description |
|------|-------------|
| `-o, --output <file>` | Output file path (required) |
| `--type-id <id>` | Default site type ID |
| `--verbose` | Show detailed processing info |

**Input auto-detection:**
- `.csv` files → CamperContact format
- `.json` with `source: "scraper"` → Scraper format
- Other `.json` → Generic format

**Notes:**
- CamperContact records with "parking" in the title are automatically assigned type ID 19 (overnight parking)
- Slugs are auto-generated from titles
- Coordinates are validated (lat: -90 to 90, lng: -180 to 180)

---

### 3. import-sites.js

Imports transformed data into Strapi via REST API. Checks for duplicates before importing.

```bash
# Dry run (no actual imports)
node scripts/import-sites.js transformed.json --dry-run

# Import with API token
node scripts/import-sites.js transformed.json --api-token YOUR_STRAPI_TOKEN

# Skip duplicate checking (faster, but may create duplicates)
node scripts/import-sites.js transformed.json --api-token YOUR_TOKEN --skip-dupes

# Specify Strapi URL
node scripts/import-sites.js transformed.json --api-token YOUR_TOKEN --url http://localhost:1337
```

**Options:**
| Flag | Description |
|------|-------------|
| `--api-token <token>` | Strapi API token (required for actual import) |
| `--url <url>` | Strapi base URL (default: http://localhost:1337) |
| `--dry-run` | Validate without importing |
| `--skip-dupes` | Skip duplicate checking |

**Output files:**
- `import-results.json` - Successfully imported sites
- `import-duplicates.json` - Potential duplicates (for manual review)
- `import-errors.json` - Failed imports

**Duplicate detection:**
Uses the `/api/search/check-similar` endpoint to find existing sites within ~500m with similar names.

---

### 4. scraper.py

Scrapes POI data from OpenStreetMap, Walkhighlands, and other sources for Scotland.

```bash
# Full scrape (all categories, with images)
python scripts/scraper.py

# Lite mode for testing (~30 POIs, no images)
python scripts/scraper.py --lite

# Specific categories only
python scripts/scraper.py --categories campsites,beaches

# Limit results per category
python scripts/scraper.py --limit 50

# Skip image enrichment (faster)
python scripts/scraper.py --no-images

# Custom output file
python scripts/scraper.py --output my_pois.json
```

**Options:**
| Flag | Description |
|------|-------------|
| `--lite` | Quick test mode (limit 10, select categories, no images) |
| `--categories <list>` | Comma-separated category list |
| `--limit <n>` | Max POIs per category |
| `--no-images` | Skip Wikimedia image lookup |
| `--output <file>` | Output filename (default: scotland_pois.json) |
| `--zapmap-key <key>` | Zap-Map API key for EV charger data |

**Available categories:**
| Category | Description |
|----------|-------------|
| `campsites` | Camp sites and caravan sites |
| `parking` | Overnight-friendly parking |
| `mountains` | Mountain peaks (DoBIH data) |
| `lochs` | Lochs and lakes |
| `beaches` | Beaches |
| `fuel` | Fuel stations |
| `ev_charging` | EV charging stations (requires `--zapmap-key`) |
| `historic` | Castles, monuments, ruins |
| `viewpoints` | Scenic viewpoints |
| `walks` | Hiking routes with distance, elevation, loop type, difficulty |

---

## Complete Workflow Example

### Import CamperContact data

```bash
# 1. Make sure Strapi is running and fetch current mappings
node scripts/fetch-mappings.js

# 2. Transform the CSV
node scripts/transform-sites.js scripts/site-data.csv -o transformed.json --verbose

# 3. Dry run to check for issues
node scripts/import-sites.js transformed.json --dry-run

# 4. Import for real
node scripts/import-sites.js transformed.json --api-token YOUR_TOKEN
```

### Scrape and import Scotland POIs

```bash
# 1. Test with lite mode first
python scripts/scraper.py --lite --output test_pois.json

# 2. Transform scraper output
node scripts/transform-sites.js test_pois.json -o transformed.json

# 3. Dry run
node scripts/import-sites.js transformed.json --dry-run

# 4. If all looks good, run full scrape
python scripts/scraper.py --output scotland_pois.json

# 5. Transform and import
node scripts/transform-sites.js scotland_pois.json -o transformed.json
node scripts/import-sites.js transformed.json --api-token YOUR_TOKEN
```

---

## Configuration

### mappings.json

Maps string type/facility names to Strapi entity IDs:

```json
{
  "siteTypes": {
    "campsites": 1,
    "camping": 1,
    "overnight_parking": 19,
    "parking": 19,
    "mountains": 3,
    ...
  },
  "facilities": {
    "toilets": 1,
    "showers": 2,
    ...
  },
  "defaultTypeId": 1
}
```

Run `fetch-mappings.js` to auto-populate from Strapi, then add any additional aliases as needed.

---

## Quick Commands

### Full pipeline (single command)

```bash
# Scrape, transform, and import in one go (dry-run first!)
python scripts/scraper.py --output scotland_pois.json && \
  node scripts/transform-sites.js scotland_pois.json -o transformed.json && \
  node scripts/import-sites.js transformed.json --dry-run

# When dry-run looks good, run with API token:
python scripts/scraper.py --output scotland_pois.json && \
  node scripts/transform-sites.js scotland_pois.json -o transformed.json && \
  node scripts/import-sites.js transformed.json --api-token YOUR_TOKEN
```

### Quick test pipeline

```bash
# Test with limited data first
python scripts/scraper.py --lite --output test.json && \
  node scripts/transform-sites.js test.json -o test-transformed.json && \
  node scripts/import-sites.js test-transformed.json --dry-run
```

### Specific categories only

```bash
# Just walks and mountains
python scripts/scraper.py --categories walks,mountains --output walks.json && \
  node scripts/transform-sites.js walks.json -o walks-transformed.json && \
  node scripts/import-sites.js walks-transformed.json --api-token YOUR_TOKEN
```

---

## Troubleshooting

### "Type not found in mappings"
Run `fetch-mappings.js` to update mappings, or manually add the type to `mappings.json`.

### "Duplicate found" for everything
The duplicate checker uses fuzzy matching. If you're re-importing the same data, use `--skip-dupes`.

### Rate limiting errors
The scraper includes delays between requests. If you still hit rate limits, try:
- Using `--limit` to reduce volume
- Running specific categories separately
- Waiting and retrying

### Missing images
Not all POIs have Wikimedia Commons images. The scraper searches within 100m of each POI's coordinates. Roughly 20% coverage is expected.
