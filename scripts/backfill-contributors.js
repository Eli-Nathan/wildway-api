#!/usr/bin/env node

/**
 * Migration script to backfill contributors from approved edit requests.
 *
 * This script:
 * 1. Finds all edit requests with moderation_status = 'complete'
 * 2. For each approved edit, adds the owner to the site's contributors if not already present
 *
 * Usage:
 *   node scripts/backfill-contributors.js --dry-run    # Preview changes
 *   node scripts/backfill-contributors.js              # Actually update
 *   node scripts/backfill-contributors.js --local      # Run against localhost
 *
 * For Heroku:
 *   heroku run node scripts/backfill-contributors.js -a nomadapp-api
 *   heroku run node scripts/backfill-contributors.js --dry-run -a nomadapp-api
 */

const https = require("https");
const http = require("http");

// Configuration
const HEROKU_API_URL = "https://api.wildway.app";
const LOCAL_API_URL = "http://localhost:1337";

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const useLocal = args.includes("--local");
const API_URL = useLocal ? LOCAL_API_URL : HEROKU_API_URL;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

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
        "Content-Type": "application/json",
        "X-Admin-Secret": ADMIN_SECRET,
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

async function fetchApprovedEditRequests() {
  console.log(`Fetching approved edit requests from ${API_URL}...`);

  // Fetch edit requests with moderation_status = 'complete'
  const url = `${API_URL}/api/edit-requests?filters[moderation_status][$eq]=complete&populate[owner][fields]=id,name&populate[site][fields]=id,title&pagination[limit]=10000`;
  const response = await makeRequest(url);

  if (response.status !== 200) {
    throw new Error(`Failed to fetch edit requests: ${response.status} - ${JSON.stringify(response.data)}`);
  }

  const editRequests = response.data.data || [];
  console.log(`Found ${editRequests.length} approved edit requests\n`);
  return editRequests;
}

async function getSiteContributors(siteId) {
  const url = `${API_URL}/api/sites/${siteId}?populate[contributors][fields]=id`;
  const response = await makeRequest(url);

  if (response.status !== 200) {
    console.warn(`  Warning: Could not fetch site ${siteId}: ${response.status}`);
    return null;
  }

  const contributors = response.data?.data?.attributes?.contributors?.data || [];
  return contributors.map((c) => c.id);
}

async function addContributorToSite(siteId, userId) {
  const url = `${API_URL}/api/sites/${siteId}`;

  const response = await makeRequest(url, {
    method: "PUT",
    body: JSON.stringify({
      data: {
        contributors: {
          connect: [{ id: userId }],
        },
      },
    }),
  });

  return response;
}

async function main() {
  console.log("=== Backfill Contributors Migration ===\n");

  if (!ADMIN_SECRET) {
    console.error("Error: ADMIN_SECRET environment variable is required");
    console.error("This is needed even in dry-run mode to fetch data from the API.");
    console.error("");
    console.error("Set it locally:  export ADMIN_SECRET=your_secret");
    console.error("On Heroku, it should already be set in config vars.");
    process.exit(1);
  }

  if (dryRun) {
    console.log("*** DRY RUN MODE - No changes will be made ***\n");
  }

  console.log(`API URL: ${API_URL}`);
  console.log(`Mode: ${useLocal ? "Local" : "Heroku"}`);
  console.log("");

  // Fetch all approved edit requests
  const editRequests = await fetchApprovedEditRequests();

  // Group by site to avoid duplicate additions
  const siteContributorMap = new Map(); // siteId -> Set of userIds to add

  for (const editRequest of editRequests) {
    const siteData = editRequest.attributes?.site?.data;
    const ownerData = editRequest.attributes?.owner?.data;

    if (!siteData || !ownerData) {
      continue;
    }

    const siteId = siteData.id;
    const userId = ownerData.id;
    const userName = ownerData.attributes?.name || "Unknown";
    const siteTitle = siteData.attributes?.title || "Unknown";

    if (!siteContributorMap.has(siteId)) {
      siteContributorMap.set(siteId, { title: siteTitle, users: new Map() });
    }

    siteContributorMap.get(siteId).users.set(userId, userName);
  }

  console.log(`Found ${siteContributorMap.size} unique sites with approved edits\n`);

  // Process each site
  let sitesUpdated = 0;
  let contributorsAdded = 0;
  let alreadyPresent = 0;
  let errors = 0;

  const siteIds = Array.from(siteContributorMap.keys());

  for (let i = 0; i < siteIds.length; i++) {
    const siteId = siteIds[i];
    const siteInfo = siteContributorMap.get(siteId);
    const { title, users } = siteInfo;

    process.stdout.write(`[${i + 1}/${siteIds.length}] Site "${title.substring(0, 40)}" (ID: ${siteId})... `);

    // Get current contributors
    const existingContributorIds = await getSiteContributors(siteId);

    if (existingContributorIds === null) {
      console.log("SKIPPED (could not fetch site)");
      errors++;
      continue;
    }

    // Find users to add
    const usersToAdd = [];
    for (const [userId, userName] of users) {
      if (!existingContributorIds.includes(userId)) {
        usersToAdd.push({ id: userId, name: userName });
      } else {
        alreadyPresent++;
      }
    }

    if (usersToAdd.length === 0) {
      console.log("OK (all contributors already present)");
      continue;
    }

    if (dryRun) {
      console.log(`WOULD ADD ${usersToAdd.length} contributor(s): ${usersToAdd.map((u) => u.name).join(", ")}`);
      contributorsAdded += usersToAdd.length;
      sitesUpdated++;
      continue;
    }

    // Add each contributor
    let siteUpdated = false;
    for (const user of usersToAdd) {
      const response = await addContributorToSite(siteId, user.id);

      if (response.status === 200) {
        contributorsAdded++;
        siteUpdated = true;
      } else {
        console.log(`FAILED to add ${user.name}: ${response.status}`);
        errors++;
      }

      await sleep(50); // Small delay between requests
    }

    if (siteUpdated) {
      console.log(`ADDED ${usersToAdd.length} contributor(s): ${usersToAdd.map((u) => u.name).join(", ")}`);
      sitesUpdated++;
    }

    await sleep(100); // Rate limiting
  }

  // Summary
  console.log("\n=== Summary ===");
  console.log(`Sites processed: ${siteIds.length}`);
  console.log(`Sites updated: ${sitesUpdated}`);
  console.log(`Contributors added: ${contributorsAdded}`);
  console.log(`Already present (skipped): ${alreadyPresent}`);
  console.log(`Errors: ${errors}`);

  if (dryRun) {
    console.log("\n*** DRY RUN - No changes were made ***");
    console.log("Run without --dry-run to apply these changes.");
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
