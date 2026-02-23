// @ts-nocheck
import type { Context } from "koa";
import { getRemoteConfig } from "firebase-admin/remote-config";

interface RemoteConfigContext extends Context {
  request: Context["request"] & {
    body?: {
      version?: string;
      flag?: string;
    };
    header: {
      "x-admin-key"?: string;
    };
    query?: {
      key?: string;
      action?: string;
      version?: string;
    };
  };
}

const ADMIN_SECRET = process.env.ADMIN_SECRET;
const DEFAULT_FLAG = "ENABLE_APPLE_AUTH";

/**
 * Validates the admin API key from the x-admin-key header
 */
function validateAdminKey(ctx: RemoteConfigContext): boolean {
  const providedKey = ctx.request.header["x-admin-key"];

  if (!ADMIN_SECRET) {
    console.error("[RemoteConfig] ADMIN_SECRET environment variable not set");
    return false;
  }

  return providedKey === ADMIN_SECRET;
}

/**
 * Creates a condition name from version string
 * e.g., "1.10.9" -> "review_v1_10_9"
 */
function createConditionName(version: string): string {
  const sanitized = version.replace(/\./g, "_");
  return `review_v${sanitized}`;
}

/**
 * Creates the version match expression for Remote Config
 * Uses exact version match for both iOS and Android
 */
function createConditionExpression(version: string): string {
  // Match exact version on both iOS and Android
  return `app.version.==(['${version}'])`;
}

/**
 * Extracts version from condition name
 * e.g., "review_v1_10_9" -> "1.10.9"
 */
function extractVersionFromCondition(conditionName: string): string | null {
  const match = conditionName.match(/^review_v(\d+)_(\d+)_(\d+)$/);
  if (match) {
    return `${match[1]}.${match[2]}.${match[3]}`;
  }
  return null;
}

export default {
  /**
   * GET /api/remote-config/status
   *
   * Returns the current status of review flags
   */
  getStatus: async (ctx: RemoteConfigContext) => {
    const adminKey = ctx.request.query?.key || ctx.request.header["x-admin-key"];

    if (adminKey !== ADMIN_SECRET) {
      ctx.status = 401;
      ctx.body = { error: "Unauthorized" };
      return;
    }

    try {
      const remoteConfig = getRemoteConfig();
      const template = await remoteConfig.getTemplate();

      // Find all review conditions
      const reviewConditions = template.conditions
        .filter((c) => c.name.startsWith("review_v"))
        .map((c) => ({
          condition: c.name,
          version: extractVersionFromCondition(c.name),
        }));

      // Find which flags are enabled for each condition
      const activeFlags: Array<{
        version: string;
        flag: string;
        condition: string;
      }> = [];

      for (const [flagName, param] of Object.entries(template.parameters)) {
        if (param.conditionalValues) {
          for (const [condName, value] of Object.entries(
            param.conditionalValues
          )) {
            if (
              condName.startsWith("review_v") &&
              (value as any).value === "true"
            ) {
              const version = extractVersionFromCondition(condName);
              if (version) {
                activeFlags.push({
                  version,
                  flag: flagName,
                  condition: condName,
                });
              }
            }
          }
        }
      }

      ctx.body = {
        activeFlags,
        reviewConditions,
      };
    } catch (err) {
      ctx.status = 500;
      ctx.body = {
        error: "Failed to get status",
        details: err instanceof Error ? err.message : String(err),
      };
    }
  },

  /**
   * GET /api/remote-config/admin
   *
   * Serves a simple HTML admin page to manage review flags
   */
  adminPage: async (ctx: RemoteConfigContext) => {
    const adminKey = ctx.request.query?.key;
    const action = ctx.request.query?.action;
    const version = ctx.request.query?.version;

    // Handle enable/disable actions
    if (action && version && adminKey === ADMIN_SECRET) {
      try {
        const remoteConfig = getRemoteConfig();
        const template = await remoteConfig.getTemplate();
        const conditionName = createConditionName(version);
        const flag = DEFAULT_FLAG;

        if (action === "enable") {
          // Add condition if it doesn't exist
          const existingConditionIndex = template.conditions.findIndex(
            (c) => c.name === conditionName
          );
          if (existingConditionIndex === -1) {
            template.conditions.push({
              name: conditionName,
              expression: createConditionExpression(version),
              tagColor: "ORANGE",
            });
          }

          // Set conditional value
          if (!template.parameters[flag]) {
            template.parameters[flag] = {
              defaultValue: { value: "false" },
              conditionalValues: {},
            };
          }
          const param = template.parameters[flag];
          if (param.conditionalValues) {
            param.conditionalValues[conditionName] = { value: "true" };
          }

          await remoteConfig.publishTemplate(template);
          console.log(`[RemoteConfig Admin] Enabled ${flag} for v${version}`);
        } else if (action === "disable") {
          // Remove conditional value
          const param = template.parameters[flag];
          if (param?.conditionalValues?.[conditionName]) {
            delete param.conditionalValues[conditionName];
          }

          // Remove condition if not used
          const conditionInUse = Object.values(template.parameters).some(
            (p) => p.conditionalValues?.[conditionName]
          );
          if (!conditionInUse) {
            const conditionIndex = template.conditions.findIndex(
              (c) => c.name === conditionName
            );
            if (conditionIndex !== -1) {
              template.conditions.splice(conditionIndex, 1);
            }
          }

          await remoteConfig.publishTemplate(template);
          console.log(`[RemoteConfig Admin] Disabled ${flag} for v${version}`);
        }
      } catch (err) {
        console.error("[RemoteConfig Admin] Error:", err);
      }
    }

    // Get current status
    let activeFlags: Array<{ version: string; flag: string }> = [];
    let errorMessage = "";

    if (adminKey === ADMIN_SECRET) {
      try {
        const remoteConfig = getRemoteConfig();
        const template = await remoteConfig.getTemplate();

        for (const [flagName, param] of Object.entries(template.parameters)) {
          if (param.conditionalValues) {
            for (const [condName, value] of Object.entries(
              param.conditionalValues
            )) {
              if (
                condName.startsWith("review_v") &&
                (value as any).value === "true"
              ) {
                const version = extractVersionFromCondition(condName);
                if (version) {
                  activeFlags.push({ version, flag: flagName });
                }
              }
            }
          }
        }
      } catch (err) {
        errorMessage = err instanceof Error ? err.message : String(err);
      }
    }

    const isAuthed = adminKey === ADMIN_SECRET;
    const baseUrl = `/api/remote-config/admin?key=${adminKey || ""}`;

    ctx.type = "text/html";
    ctx.body = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wildway Review Flags</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 500px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 { color: #333; font-size: 24px; margin-bottom: 20px; }
    .card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .flag-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #eee;
    }
    .flag-item:last-child { border-bottom: none; }
    .version { font-weight: 600; font-size: 18px; }
    .flag-name { color: #666; font-size: 12px; }
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
    }
    .btn-danger { background: #ff4757; color: white; }
    .btn-primary { background: #2ecc71; color: white; }
    .btn-secondary { background: #3498db; color: white; }
    input[type="text"], input[type="password"] {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 16px;
      margin-bottom: 12px;
    }
    .empty { color: #999; text-align: center; padding: 20px; }
    .error { background: #ffe6e6; color: #c0392b; padding: 12px; border-radius: 8px; margin-bottom: 16px; }
    .success { background: #e6ffe6; color: #27ae60; padding: 12px; border-radius: 8px; margin-bottom: 16px; }
    label { display: block; margin-bottom: 6px; font-weight: 500; color: #555; }
  </style>
</head>
<body>
  <h1>🏕️ Wildway Review Flags</h1>

  ${!isAuthed ? `
  <div class="card">
    <form method="GET" action="/api/remote-config/admin">
      <label>Admin Key</label>
      <input type="password" name="key" placeholder="Enter admin key" required>
      <button type="submit" class="btn btn-primary" style="width: 100%">Login</button>
    </form>
  </div>
  ` : `
  ${errorMessage ? `<div class="error">${errorMessage}</div>` : ""}
  ${action && version ? `<div class="success">${action === "enable" ? "Enabled" : "Disabled"} flag for v${version}</div>` : ""}

  <div class="card">
    <h2 style="margin-top: 0;">Active Review Flags</h2>
    ${
      activeFlags.length === 0
        ? '<p class="empty">No active review flags</p>'
        : activeFlags
            .map(
              (f) => `
      <div class="flag-item">
        <div>
          <div class="version">v${f.version}</div>
          <div class="flag-name">${f.flag}</div>
        </div>
        <a href="${baseUrl}&action=disable&version=${f.version}" class="btn btn-danger">Clear</a>
      </div>
    `
            )
            .join("")
    }
  </div>

  <div class="card">
    <h2 style="margin-top: 0;">Enable Review Flag</h2>
    <form method="GET" action="/api/remote-config/admin">
      <input type="hidden" name="key" value="${adminKey}">
      <input type="hidden" name="action" value="enable">
      <label>Version</label>
      <input type="text" name="version" placeholder="e.g., 1.11.0" pattern="\\d+\\.\\d+\\.\\d+" required>
      <button type="submit" class="btn btn-secondary" style="width: 100%">Enable ENABLE_APPLE_AUTH</button>
    </form>
  </div>
  `}
</body>
</html>
`;
  },

  /**
   * POST /api/remote-config/enable-review-flag
   *
   * Enables a feature flag for a specific app version (for App Store review).
   * Creates a version-specific condition and sets the flag to true for that version only.
   */
  enableReviewFlag: async (ctx: RemoteConfigContext) => {
    // Validate admin key
    if (!validateAdminKey(ctx)) {
      ctx.status = 401;
      ctx.body = { error: "Unauthorized: Invalid or missing admin key" };
      return;
    }

    const { version, flag = DEFAULT_FLAG } = ctx.request.body || {};

    if (!version) {
      ctx.status = 400;
      ctx.body = { error: "Version is required" };
      return;
    }

    try {
      const remoteConfig = getRemoteConfig();
      const template = await remoteConfig.getTemplate();

      const conditionName = createConditionName(version);
      const conditionExpression = createConditionExpression(version);

      // Check if condition already exists
      const existingConditionIndex = template.conditions.findIndex(
        (c) => c.name === conditionName
      );

      if (existingConditionIndex === -1) {
        // Add new condition
        template.conditions.push({
          name: conditionName,
          expression: conditionExpression,
          tagColor: "ORANGE",
        });
        console.log(`[RemoteConfig] Created condition: ${conditionName}`);
      } else {
        console.log(`[RemoteConfig] Condition already exists: ${conditionName}`);
      }

      // Get or create the parameter
      if (!template.parameters[flag]) {
        template.parameters[flag] = {
          defaultValue: { value: "false" },
          conditionalValues: {},
        };
      }

      // Set the conditional value for the review version
      const param = template.parameters[flag];
      if (param.conditionalValues) {
        param.conditionalValues[conditionName] = { value: "true" };
      }

      // Publish the updated template
      await remoteConfig.publishTemplate(template);

      console.log(
        `[RemoteConfig] Enabled ${flag} for version ${version} (condition: ${conditionName})`
      );

      ctx.body = {
        success: true,
        message: `Enabled ${flag} for version ${version}`,
        condition: conditionName,
        flag,
        version,
      };
    } catch (err) {
      console.error("[RemoteConfig] Error enabling review flag:", err);
      ctx.status = 500;
      ctx.body = {
        error: "Failed to enable review flag",
        details: err instanceof Error ? err.message : String(err),
      };
    }
  },

  /**
   * POST /api/remote-config/disable-review-flag
   *
   * Disables a feature flag for a specific app version (after App Store approval).
   * Removes the version-specific conditional value and optionally the condition.
   */
  disableReviewFlag: async (ctx: RemoteConfigContext) => {
    // Validate admin key
    if (!validateAdminKey(ctx)) {
      ctx.status = 401;
      ctx.body = { error: "Unauthorized: Invalid or missing admin key" };
      return;
    }

    const { version, flag = DEFAULT_FLAG } = ctx.request.body || {};

    if (!version) {
      ctx.status = 400;
      ctx.body = { error: "Version is required" };
      return;
    }

    try {
      const remoteConfig = getRemoteConfig();
      const template = await remoteConfig.getTemplate();

      const conditionName = createConditionName(version);

      // Remove conditional value from the parameter
      const param = template.parameters[flag];
      if (param?.conditionalValues?.[conditionName]) {
        delete param.conditionalValues[conditionName];
        console.log(
          `[RemoteConfig] Removed conditional value for ${conditionName} from ${flag}`
        );
      }

      // Check if condition is used by any other parameters
      const conditionInUse = Object.values(template.parameters).some(
        (p) => p.conditionalValues?.[conditionName]
      );

      // Remove condition if not used elsewhere
      if (!conditionInUse) {
        const conditionIndex = template.conditions.findIndex(
          (c) => c.name === conditionName
        );
        if (conditionIndex !== -1) {
          template.conditions.splice(conditionIndex, 1);
          console.log(`[RemoteConfig] Removed condition: ${conditionName}`);
        }
      }

      // Publish the updated template
      await remoteConfig.publishTemplate(template);

      console.log(
        `[RemoteConfig] Disabled ${flag} for version ${version} (condition: ${conditionName})`
      );

      ctx.body = {
        success: true,
        message: `Disabled ${flag} for version ${version}`,
        condition: conditionName,
        flag,
        version,
        conditionRemoved: !conditionInUse,
      };
    } catch (err) {
      console.error("[RemoteConfig] Error disabling review flag:", err);
      ctx.status = 500;
      ctx.body = {
        error: "Failed to disable review flag",
        details: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
