#!/usr/bin/env node

/**
 * Migration script to add handles to existing users
 *
 * Usage (local):
 *   node scripts/migrate-add-handles.js
 *
 * Usage (production):
 *   heroku run "node scripts/migrate-add-handles.js" -a wildway-api
 */

const { Client } = require("pg");
const { RegExpMatcher, englishDataset, englishRecommendedTransformers } = require("obscenity");

const profanityMatcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

// Reserved handles that cannot be used
const RESERVED_HANDLES = [
  "admin", "wildway", "support", "api", "www", "app",
  "help", "info", "team", "official", "staff", "moderator",
  "system", "root", "account", "settings", "profile", "user", "users",
  "login", "logout", "signup", "register", "password", "reset",
  "verify", "delete", "edit", "create", "update", "remove",
  "null", "undefined", "test",
];

/**
 * Generate base handle from name
 */
function generateHandle(name) {
  if (!name || typeof name !== "string") {
    return "user";
  }

  let handle = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .substring(0, 20);

  // Ensure minimum length
  if (handle.length < 3) {
    handle = "user_" + handle;
  }

  // Check reserved words
  if (RESERVED_HANDLES.includes(handle)) {
    handle = "u_" + handle;
  }

  // Check profanity
  if (profanityMatcher.hasMatch(handle)) {
    handle = "user_" + Math.random().toString(36).substring(2, 8);
  }

  return handle;
}

/**
 * Ensure handle is unique by adding numeric suffix if needed
 */
function ensureUniqueHandle(baseHandle, existingHandles) {
  let handle = baseHandle;
  let suffix = 1;

  while (existingHandles.has(handle) && suffix < 10000) {
    const maxBaseLength = 20 - String(suffix).length;
    const truncatedBase = baseHandle.substring(0, maxBaseLength);
    handle = `${truncatedBase}${suffix}`;
    suffix++;
  }

  if (existingHandles.has(handle)) {
    handle = "user_" + Math.random().toString(36).substring(2, 8);
  }

  return handle;
}

async function main() {
  console.log("Starting handle migration...");
  console.log("Database URL:", process.env.DATABASE_URL ? "Set (hidden)" : "Not set");

  if (!process.env.DATABASE_URL) {
    console.error("ERROR: DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Connected to database");

    // Get all existing handles to track uniqueness
    const existingHandlesResult = await client.query(
      "SELECT handle FROM auth_users WHERE handle IS NOT NULL"
    );
    const existingHandles = new Set(existingHandlesResult.rows.map(row => row.handle));
    console.log(`Found ${existingHandles.size} existing handles`);

    // Get all users without handles
    const usersResult = await client.query(
      "SELECT id, name, email FROM auth_users WHERE handle IS NULL ORDER BY id"
    );
    const users = usersResult.rows;
    console.log(`Found ${users.length} users without handles`);

    if (users.length === 0) {
      console.log("All users already have handles. Nothing to do.");
      return;
    }

    // Process users
    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        // Generate handle from name, fallback to email prefix
        const nameForHandle = user.name || (user.email ? user.email.split("@")[0] : `user${user.id}`);
        const baseHandle = generateHandle(nameForHandle);
        const uniqueHandle = ensureUniqueHandle(baseHandle, existingHandles);

        // Update user
        await client.query(
          "UPDATE auth_users SET handle = $1 WHERE id = $2",
          [uniqueHandle, user.id]
        );

        // Track handle to prevent future collisions in this run
        existingHandles.add(uniqueHandle);

        console.log(`  User ${user.id}: "${user.name || user.email}" -> @${uniqueHandle}`);
        successCount++;
      } catch (error) {
        console.error(`  ERROR User ${user.id}:`, error.message);
        errorCount++;
      }
    }

    console.log("\nMigration complete:");
    console.log(`  Success: ${successCount}`);
    console.log(`  Errors: ${errorCount}`);
    console.log(`  Total handles now: ${existingHandles.size}`);

  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
    console.log("Database connection closed");
  }
}

main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
