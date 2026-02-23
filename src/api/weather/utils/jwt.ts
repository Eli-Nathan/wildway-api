import * as crypto from "crypto";

const TEAM_ID = process.env.WEATHERKIT_TEAM_ID;
const KEY_ID = process.env.WEATHERKIT_KEY_ID;
const SERVICE_ID = process.env.WEATHERKIT_SERVICE_ID || "app.wildway";
const PRIVATE_KEY = process.env.WEATHERKIT_PRIVATE_KEY?.replace(/\\n/g, "\n");

// Cache the token to avoid regenerating on every request
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Generate a JWT for Apple WeatherKit API
 * Token is cached and reused until 5 minutes before expiry
 */
export function generateWeatherKitJWT(): string {
  // Check if we have a valid cached token (with 5 min buffer)
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 300) {
    return cachedToken.token;
  }

  if (!TEAM_ID || !KEY_ID || !PRIVATE_KEY) {
    throw new Error(
      "WeatherKit credentials not configured. Set WEATHERKIT_TEAM_ID, WEATHERKIT_KEY_ID, and WEATHERKIT_PRIVATE_KEY"
    );
  }

  const header = {
    alg: "ES256",
    kid: KEY_ID,
    id: `${TEAM_ID}.${SERVICE_ID}`,
  };

  const payload = {
    iss: TEAM_ID,
    iat: now,
    exp: now + 3600, // 1 hour
    sub: SERVICE_ID,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  // Sign with ES256
  const sign = crypto.createSign("SHA256");
  sign.update(signatureInput);
  const derSignature = sign.sign(PRIVATE_KEY);

  // Convert DER signature to raw r||s format for ES256
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
  const token = `${signatureInput}.${encodedSignature}`;

  // Cache the token
  cachedToken = {
    token,
    expiresAt: now + 3600,
  };

  return token;
}

/**
 * Check if WeatherKit credentials are configured
 */
export function isWeatherKitConfigured(): boolean {
  return Boolean(TEAM_ID && KEY_ID && PRIVATE_KEY);
}
