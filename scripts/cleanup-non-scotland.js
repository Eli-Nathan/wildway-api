#!/usr/bin/env node

/**
 * Cleanup script to remove sites that are not in Scotland.
 * Uses OpenStreetMap Nominatim reverse geocoding to verify location.
 *
 * Usage:
 *   node cleanup-non-scotland.js --dry-run    # Preview what would be deleted
 *   node cleanup-non-scotland.js              # Actually delete
 *   node cleanup-non-scotland.js --local      # Run against localhost instead of Heroku
 *
 * Required environment variables:
 *   ADMIN_SECRET - The admin secret for the delete endpoint
 *                  Set this in Heroku: heroku config:set ADMIN_SECRET=xxx -a wildway-api
 */

const https = require("https");
const http = require("http");

// Configuration
const HEROKU_API_URL = "https://api.wildway.app";
const LOCAL_API_URL = "http://localhost:1337";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";
const RATE_LIMIT_MS = 1100; // Nominatim requires 1 request per second

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const useLocal = args.includes("--local");
const API_URL = useLocal ? LOCAL_API_URL : HEROKU_API_URL;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

// Rough Scotland bounding box for pre-filtering
// Sites outside this are definitely not in Scotland
const SCOTLAND_BBOX = {
  south: 54.5,
  north: 61.0,
  west: -8.0,
  east: 0.0,
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith("https");
    const lib = isHttps ? https : http;
    const urlObj = new URL(url);

    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || "GET",
      headers: {
        "User-Agent": "NomadCleanupScript/1.0",
        ...options.headers,
      },
    };

    const req = lib.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on("error", reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function fetchAllSites() {
  console.log(`Fetching all sites from ${API_URL}...`);

  // Fetch with a large limit to get all sites
  const url = `${API_URL}/api/sites?pagination[limit]=10000`;
  const response = await makeRequest(url);

  if (response.status !== 200) {
    throw new Error(`Failed to fetch sites: ${response.status}`);
  }

  const sites = response.data.data || [];
  console.log(`Found ${sites.length} sites total`);
  return sites;
}

function isObviouslyOutsideBounds(lat, lng) {
  return (
    lat < SCOTLAND_BBOX.south ||
    lat > SCOTLAND_BBOX.north ||
    lng < SCOTLAND_BBOX.west ||
    lng > SCOTLAND_BBOX.east
  );
}

async function checkIfInScotland(lat, lng) {
  const url = `${NOMINATIM_URL}?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;

  try {
    const response = await makeRequest(url, {
      headers: {
        "User-Agent": "NomadCleanupScript/1.0 (cleanup-non-scotland)",
      },
    });

    if (response.status !== 200) {
      console.warn(`  Nominatim returned ${response.status}`);
      return { isScotland: null, location: "API error" };
    }

    const data = response.data;
    const address = data.address || {};

    // Check various address fields for Scotland
    const country = address.country;
    const state = address.state;
    const region = address.region;
    const county = address.county;

    // In the UK, Scotland is identified by state="Scotland"
    const isScotland =
      country === "United Kingdom" &&
      (state === "Scotland" || region === "Scotland");

    // Build location string for display
    let location = "";
    if (state) location = state;
    else if (region) location = region;
    else if (county) location = county;
    if (country && country !== "United Kingdom") {
      location = location ? `${location}, ${country}` : country;
    } else if (country) {
      location = location || country;
    }

    return { isScotland, location: location || "Unknown" };
  } catch (error) {
    console.warn(`  Error: ${error.message}`);
    return { isScotland: null, location: "Error" };
  }
}

async function deleteSite(siteId) {
  const url = `${API_URL}/api/sites/${siteId}`;

  const response = await makeRequest(url, {
    method: "DELETE",
    headers: {
      "X-Admin-Secret": ADMIN_SECRET,
      "Content-Type": "application/json",
    },
  });

  return response;
}

async function main() {
  console.log("=== Scotland Sites Cleanup Script ===\n");

  if (!ADMIN_SECRET && !dryRun) {
    console.error("Error: ADMIN_SECRET environment variable is required");
    console.error("");
    console.error("Set it locally:  export ADMIN_SECRET=your_secret");
    console.error("Set on Heroku:   heroku config:set ADMIN_SECRET=your_secret -a wildway-api");
    process.exit(1);
  }

  if (dryRun) {
    console.log("*** DRY RUN MODE - No sites will be deleted ***\n");
  }

  console.log(`API URL: ${API_URL}`);
  console.log(`Mode: ${useLocal ? "Local" : "Heroku"}`);
  console.log("");

  // Fetch all sites
  const sites = await fetchAllSites();

  // Separate into sites that need checking
  const sitesWithCoords = [];
  const sitesWithoutCoords = [];

  for (const site of sites) {
    const lat = site.attributes?.lat;
    const lng = site.attributes?.lng;

    if (!lat || !lng) {
      sitesWithoutCoords.push(site);
    } else {
      sitesWithCoords.push(site);
    }
  }

  if (sitesWithoutCoords.length > 0) {
    console.log(`${sitesWithoutCoords.length} sites have no coordinates (skipping)`);
  }

  console.log(`\nChecking ${sitesWithCoords.length} sites with Nominatim...\n`);

  const sitesToDelete = [];
  const sitesInScotland = [];
  const sitesUncertain = [];

  for (let i = 0; i < sitesWithCoords.length; i++) {
    const site = sitesWithCoords[i];
    const lat = site.attributes.lat;
    const lng = site.attributes.lng;
    const title = site.attributes.title || "Untitled";

    process.stdout.write(
      `[${i + 1}/${sitesWithCoords.length}] "${title.substring(0, 40)}" (${lat.toFixed(3)}, ${lng.toFixed(3)})... `
    );

    // Quick bounds check first
    if (isObviouslyOutsideBounds(lat, lng)) {
      console.log("OUTSIDE BOUNDS - will delete");
      sitesToDelete.push({ site, reason: "Outside Scotland bounds" });
      continue;
    }

    // Check with Nominatim
    const result = await checkIfInScotland(lat, lng);

    if (result.isScotland === true) {
      console.log(`OK (${result.location})`);
      sitesInScotland.push(site);
    } else if (result.isScotland === false) {
      console.log(`NOT SCOTLAND (${result.location}) - will delete`);
      sitesToDelete.push({ site, reason: result.location });
    } else {
      console.log(`UNCERTAIN (${result.location}) - skipping`);
      sitesUncertain.push(site);
    }

    // Rate limiting for Nominatim
    if (i < sitesWithCoords.length - 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  // Summary
  console.log("\n=== Summary ===");
  console.log(`Total sites checked: ${sitesWithCoords.length}`);
  console.log(`In Scotland: ${sitesInScotland.length}`);
  console.log(`Not in Scotland (to delete): ${sitesToDelete.length}`);
  console.log(`Uncertain (skipped): ${sitesUncertain.length}`);

  if (sitesToDelete.length === 0) {
    console.log("\nNo sites to delete!");
    return;
  }

  console.log("\n--- Sites to be deleted ---");
  for (const { site, reason } of sitesToDelete) {
    const title = site.attributes?.title || "Untitled";
    const lat = site.attributes?.lat?.toFixed(4) || "?";
    const lng = site.attributes?.lng?.toFixed(4) || "?";
    console.log(`  [${site.id}] ${title}`);
    console.log(`      Location: ${lat}, ${lng} | Reason: ${reason}`);
  }

  if (dryRun) {
    console.log("\n*** DRY RUN - No sites were deleted ***");
    console.log("Run without --dry-run to actually delete these sites.");
    return;
  }

  // Confirm before deleting
  console.log(`\nAbout to delete ${sitesToDelete.length} sites.`);
  console.log("Press Ctrl+C within 5 seconds to cancel...");
  await sleep(5000);

  // Actually delete
  console.log("\nDeleting sites...\n");

  let deleted = 0;
  let failed = 0;

  for (const { site } of sitesToDelete) {
    const title = site.attributes?.title || "Untitled";
    process.stdout.write(`Deleting [${site.id}] ${title.substring(0, 50)}... `);

    try {
      const response = await deleteSite(site.id);

      if (response.status === 200) {
        console.log("OK");
        deleted++;
      } else {
        console.log(`FAILED (${response.status}: ${JSON.stringify(response.data)})`);
        failed++;
      }
    } catch (error) {
      console.log(`ERROR: ${error.message}`);
      failed++;
    }

    await sleep(100);
  }

  console.log(`\n=== Complete ===`);
  console.log(`Deleted: ${deleted}`);
  console.log(`Failed: ${failed}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
