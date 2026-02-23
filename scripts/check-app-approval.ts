/**
 * App Store Approval Checker
 *
 * This script checks if any app versions with active review flags have been approved.
 * Run via Heroku Scheduler every 30-60 minutes.
 *
 * Required environment variables:
 * - APPSTORE_ISSUER_ID: App Store Connect API Issuer ID
 * - APPSTORE_KEY_ID: App Store Connect API Key ID (e.g., M2C6N73CP5)
 * - APPSTORE_PRIVATE_KEY: Contents of the .p8 file (with \n for newlines)
 * - ADMIN_SECRET: Admin key for the remote-config API
 * - FIREBASE_SERVICE_ACCOUNT: Firebase service account JSON (already set)
 *
 * Usage:
 *   npx ts-node scripts/check-app-approval.ts
 *   # or after build:
 *   node dist/scripts/check-app-approval.js
 */

import * as crypto from "crypto";
import * as https from "https";

// App Store Connect config
const ISSUER_ID = process.env.APPSTORE_ISSUER_ID;
const KEY_ID = process.env.APPSTORE_KEY_ID || "M2C6N73CP5";
const PRIVATE_KEY = process.env.APPSTORE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const BUNDLE_ID = "app.wildway";

// API config
const API_URL = process.env.NOMAD_API_URL || "https://nomadapp-api.herokuapp.com";
const ADMIN_SECRET = process.env.ADMIN_SECRET;

// Statuses that indicate approval
const APPROVED_STATUSES = [
  "READY_FOR_DISTRIBUTION",
  "READY_FOR_SALE",
  "PENDING_DEVELOPER_RELEASE",
  "PROCESSING_FOR_DISTRIBUTION",
];

interface ReviewFlag {
  version: string;
  flag: string;
  condition: string;
}

interface StatusResponse {
  activeFlags: ReviewFlag[];
}

/**
 * Generate a JWT for App Store Connect API
 */
function generateJWT(): string {
  if (!ISSUER_ID || !PRIVATE_KEY) {
    throw new Error("Missing APPSTORE_ISSUER_ID or APPSTORE_PRIVATE_KEY");
  }

  const header = {
    alg: "ES256",
    kid: KEY_ID,
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: ISSUER_ID,
    iat: now,
    exp: now + 20 * 60, // 20 minutes
    aud: "appstoreconnect-v1",
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const sign = crypto.createSign("SHA256");
  sign.update(signatureInput);
  const signature = sign.sign(PRIVATE_KEY);

  // Convert DER signature to raw r||s format for ES256
  const derSignature = signature;
  let offset = 3;
  const rLength = derSignature[offset];
  offset += 1;
  let r = derSignature.subarray(offset, offset + rLength);
  offset += rLength + 1;
  const sLength = derSignature[offset];
  offset += 1;
  let s = derSignature.subarray(offset, offset + sLength);

  // Remove leading zeros and pad to 32 bytes
  if (r.length > 32) r = r.subarray(r.length - 32);
  if (s.length > 32) s = s.subarray(s.length - 32);
  const rawSignature = Buffer.concat([
    Buffer.alloc(32 - r.length),
    r,
    Buffer.alloc(32 - s.length),
    s,
  ]);

  const encodedSignature = rawSignature.toString("base64url");
  return `${signatureInput}.${encodedSignature}`;
}

/**
 * Make an HTTPS request
 */
function request(
  url: string,
  options: https.RequestOptions = {}
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({
            status: res.statusCode || 0,
            data: data ? JSON.parse(data) : null,
          });
        } catch {
          resolve({ status: res.statusCode || 0, data });
        }
      });
    });
    req.on("error", reject);
    if (options.method === "POST" && (options as any).body) {
      req.write((options as any).body);
    }
    req.end();
  });
}

/**
 * Get active review flags from our API
 */
async function getActiveReviewFlags(): Promise<ReviewFlag[]> {
  const url = `${API_URL}/api/remote-config/status`;
  const { status, data } = await request(url, {
    method: "GET",
    headers: {
      "x-admin-key": ADMIN_SECRET,
    },
  });

  if (status !== 200) {
    throw new Error(`Failed to get status: ${status}`);
  }

  return (data as StatusResponse).activeFlags || [];
}

/**
 * Get app version status from App Store Connect
 */
async function getAppVersionStatus(version: string): Promise<string | null> {
  const jwt = generateJWT();

  // First, get the app ID
  const appsUrl = `https://api.appstoreconnect.apple.com/v1/apps?filter[bundleId]=${BUNDLE_ID}`;
  const appsResponse = await request(appsUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  });

  if (appsResponse.status !== 200 || !appsResponse.data?.data?.[0]) {
    console.error("Failed to get app:", appsResponse.data);
    return null;
  }

  const appId = appsResponse.data.data[0].id;

  // Get app store versions
  const versionsUrl = `https://api.appstoreconnect.apple.com/v1/apps/${appId}/appStoreVersions?filter[versionString]=${version}&filter[platform]=IOS`;
  const versionsResponse = await request(versionsUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  });

  if (versionsResponse.status !== 200) {
    console.error("Failed to get versions:", versionsResponse.data);
    return null;
  }

  const versionData = versionsResponse.data?.data?.[0];
  if (!versionData) {
    console.log(`Version ${version} not found in App Store Connect`);
    return null;
  }

  return versionData.attributes?.appStoreState || null;
}

/**
 * Disable review flag for a version
 */
async function disableReviewFlag(version: string): Promise<boolean> {
  const url = `${API_URL}/api/remote-config/disable-review-flag`;
  const { status } = await request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": ADMIN_SECRET,
    },
    body: JSON.stringify({ version }),
  } as any);

  return status === 200;
}

/**
 * Main function
 */
async function main() {
  console.log("[AppApprovalChecker] Starting check...");

  // Validate required env vars
  if (!ADMIN_SECRET) {
    console.error("[AppApprovalChecker] Missing ADMIN_SECRET");
    process.exit(1);
  }

  // Step 1: Check for active review flags
  let activeFlags: ReviewFlag[];
  try {
    activeFlags = await getActiveReviewFlags();
  } catch (err) {
    console.error("[AppApprovalChecker] Failed to get active flags:", err);
    process.exit(1);
  }

  if (activeFlags.length === 0) {
    console.log("[AppApprovalChecker] No active review flags. Exiting.");
    process.exit(0);
  }

  console.log(
    `[AppApprovalChecker] Found ${activeFlags.length} active flag(s):`,
    activeFlags.map((f) => f.version).join(", ")
  );

  // Step 2: Check if we have App Store Connect credentials
  if (!ISSUER_ID || !PRIVATE_KEY) {
    console.log(
      "[AppApprovalChecker] App Store Connect credentials not configured. Skipping approval check."
    );
    console.log("Set APPSTORE_ISSUER_ID and APPSTORE_PRIVATE_KEY to enable auto-clear.");
    process.exit(0);
  }

  // Step 3: Check each version's status
  for (const flag of activeFlags) {
    console.log(`[AppApprovalChecker] Checking status for v${flag.version}...`);

    try {
      const status = await getAppVersionStatus(flag.version);

      if (!status) {
        console.log(`[AppApprovalChecker] Could not get status for v${flag.version}`);
        continue;
      }

      console.log(`[AppApprovalChecker] v${flag.version} status: ${status}`);

      if (APPROVED_STATUSES.includes(status)) {
        console.log(`[AppApprovalChecker] v${flag.version} is approved! Clearing flag...`);

        const success = await disableReviewFlag(flag.version);
        if (success) {
          console.log(`[AppApprovalChecker] Successfully cleared flag for v${flag.version}`);
        } else {
          console.error(`[AppApprovalChecker] Failed to clear flag for v${flag.version}`);
        }
      } else {
        console.log(`[AppApprovalChecker] v${flag.version} not yet approved (${status})`);
      }
    } catch (err) {
      console.error(`[AppApprovalChecker] Error checking v${flag.version}:`, err);
    }
  }

  console.log("[AppApprovalChecker] Done.");
}

main().catch((err) => {
  console.error("[AppApprovalChecker] Fatal error:", err);
  process.exit(1);
});
