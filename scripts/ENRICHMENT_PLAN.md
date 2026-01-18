# Site Enrichment Script Plan

## Purpose
Retroactively populate new fields on existing site records when schema changes are made.

## Use Cases
1. Add a new field (e.g., `elevation`) and need to populate existing records
2. Improve data quality (e.g., fetch better images, add missing descriptions)
3. Re-geocode for updated `region` data
4. Sync with external data sources

---

## Proposed Script: `enrich-sites.js`

### Usage
```bash
node scripts/enrich-sites.js --field elevation --source osm
node scripts/enrich-sites.js --field images --source wikimedia --dry-run
node scripts/enrich-sites.js --field region --source reverse-geocode --limit 100
```

### Options
| Flag | Description |
|------|-------------|
| `--field <name>` | Field(s) to enrich (comma-separated) |
| `--source <name>` | Data source to use |
| `--filter <query>` | Only enrich sites matching filter (e.g., `type=3`) |
| `--missing-only` | Only enrich records where field is null/empty |
| `--limit <n>` | Max records to process |
| `--dry-run` | Preview changes without saving |
| `--output <file>` | Write changes to file instead of API |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     enrich-sites.js                         │
├─────────────────────────────────────────────────────────────┤
│  1. Fetch sites from Strapi (with filters)                  │
│  2. For each site:                                          │
│     a. Call enrichment source with site data                │
│     b. Get enriched fields back                             │
│     c. PATCH /api/sites/:id with new data                   │
│  3. Log results                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Enrichment Sources                        │
├─────────────────────────────────────────────────────────────┤
│  sources/                                                   │
│  ├── osm.js          # OpenStreetMap Overpass API          │
│  ├── wikimedia.js    # Wikimedia Commons images            │
│  ├── geocode.js      # Reverse geocoding (Nominatim)       │
│  ├── elevation.js    # Open-Elevation API                  │
│  └── google.js       # Google Places (paid)                │
└─────────────────────────────────────────────────────────────┘
```

---

## Enrichment Sources

### 1. OpenStreetMap (`osm`)
- **Fields**: facilities, description, opening_hours, website
- **How**: Query Overpass API by coordinates, match nearby POIs
- **Rate limit**: 1 req/sec

### 2. Wikimedia Commons (`wikimedia`)
- **Fields**: images (upload to Strapi)
- **How**: Geosearch API within 1km radius
- **Rate limit**: 1 req/sec

### 3. Reverse Geocode (`geocode`)
- **Fields**: region, country, address
- **How**: Nominatim reverse geocode from lat/lng
- **Rate limit**: 1 req/sec (Nominatim policy)

### 4. Elevation (`elevation`)
- **Fields**: elevation_m
- **How**: Open-Elevation API or Open-Topo-Data
- **Rate limit**: Batch requests supported

### 5. Google Places (`google`)
- **Fields**: images, rating, reviews, phone, website
- **How**: Places API nearby search
- **Rate limit**: Paid, check quota

---

## Data Flow

```
GET /api/sites?filters[elevation][$null]=true&pagination[limit]=100
    │
    ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Site 1    │    │   Site 2    │    │   Site 3    │
│ lat: 56.8   │    │ lat: 57.2   │    │ lat: 55.9   │
│ lng: -5.4   │    │ lng: -4.8   │    │ lng: -3.2   │
└─────────────┘    └─────────────┘    └─────────────┘
    │                   │                   │
    ▼                   ▼                   ▼
┌─────────────────────────────────────────────────┐
│           Elevation API (batch)                 │
│  POST [{lat, lng}, {lat, lng}, {lat, lng}]     │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ elevation:  │    │ elevation:  │    │ elevation:  │
│   823m      │    │   156m      │    │   45m       │
└─────────────┘    └─────────────┘    └─────────────┘
    │                   │                   │
    ▼                   ▼                   ▼
PATCH /api/sites/1     PATCH /api/sites/2     PATCH /api/sites/3
{ elevation: 823 }     { elevation: 156 }     { elevation: 45 }
```

---

## Output Files

| File | Purpose |
|------|---------|
| `enrich-results-<timestamp>.json` | Summary of changes made |
| `enrich-errors-<timestamp>.json` | Failed enrichments |
| `enrich-preview-<timestamp>.json` | Dry-run preview |

---

## Implementation Order

1. **Phase 1**: Core script with Strapi read/write
2. **Phase 2**: Elevation enrichment (simplest API)
3. **Phase 3**: Reverse geocoding for region
4. **Phase 4**: Wikimedia images
5. **Phase 5**: OSM facilities/metadata

---

## Example: Adding Elevation Field

### Step 1: Add field to Strapi schema
```json
// src/api/site/content-types/site/schema.json
{
  "elevation": {
    "type": "integer",
    "pluginOptions": {}
  }
}
```

### Step 2: Run enrichment
```bash
node scripts/enrich-sites.js \
  --field elevation \
  --source elevation \
  --missing-only \
  --dry-run

# Review output, then run for real:
node scripts/enrich-sites.js \
  --field elevation \
  --source elevation \
  --missing-only
```

### Step 3: Verify
```bash
# Check how many now have elevation
curl "http://localhost:1337/api/sites?filters[elevation][\$notNull]=true" | jq '.meta.pagination.total'
```

---

## Notes

- Always run `--dry-run` first
- Batch where possible to reduce API calls
- Respect rate limits (built-in delays)
- Log everything for audit trail
- Support resume from failures (track processed IDs)
