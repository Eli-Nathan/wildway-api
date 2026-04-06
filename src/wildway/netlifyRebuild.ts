/**
 * Triggers a Netlify rebuild when content changes
 * Set NETLIFY_BUILD_HOOK_URL in your environment variables
 */

const NETLIFY_BUILD_HOOK_URL = process.env.NETLIFY_BUILD_HOOK_URL;

// Debounce rebuilds - don't trigger more than once per minute
let lastRebuildTime = 0;
const DEBOUNCE_MS = 60000; // 1 minute

export async function triggerNetlifyRebuild(contentType: string) {
  if (!NETLIFY_BUILD_HOOK_URL) {
    strapi.log.warn("NETLIFY_BUILD_HOOK_URL not set, skipping rebuild trigger");
    return;
  }

  const now = Date.now();
  if (now - lastRebuildTime < DEBOUNCE_MS) {
    strapi.log.info(`Netlify rebuild skipped (debounced) for ${contentType}`);
    return;
  }

  try {
    lastRebuildTime = now;
    const response = await fetch(NETLIFY_BUILD_HOOK_URL, {
      method: "POST",
      body: JSON.stringify({ trigger: contentType }),
    });

    if (response.ok) {
      strapi.log.info(`Netlify rebuild triggered by ${contentType} change`);
    } else {
      strapi.log.error(`Netlify rebuild failed: ${response.status}`);
    }
  } catch (error) {
    strapi.log.error("Failed to trigger Netlify rebuild:", error);
  }
}
