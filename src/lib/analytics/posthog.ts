import { PostHog } from "posthog-node";

const globalForPosthog = globalThis as unknown as {
  posthog: PostHog | undefined;
};

function createPostHogClient(): PostHog | null {
  const apiKey = process.env.POSTHOG_API_KEY;
  if (!apiKey) return null;

  return new PostHog(apiKey, {
    host: process.env.POSTHOG_HOST ?? "https://us.i.posthog.com",
    flushAt: 20,
    flushInterval: 10000,
  });
}

export const posthog: PostHog | null =
  globalForPosthog.posthog ?? createPostHogClient();

if (process.env.NODE_ENV !== "production" && posthog) {
  globalForPosthog.posthog = posthog;
}

/**
 * Capture an analytics event. No-ops gracefully when PostHog is not configured.
 */
export function captureEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
) {
  posthog?.capture({ distinctId, event, properties });
}
