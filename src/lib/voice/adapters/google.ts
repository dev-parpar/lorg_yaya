/**
 * Google Actions (Conversational Actions) adapter.
 *
 * Parses the Google webhook request into a platform-agnostic { query, sessionId },
 * and formats the fulfillment result back into Google's expected response schema.
 *
 * When Alexa support is added, a parallel adapters/alexa.ts will be created
 * with the same interface — zero changes to core fulfillment logic.
 */

export interface ParsedVoiceRequest {
  query: string;
  sessionId: string;
}

/**
 * Extracts the user's spoken query and session ID from a Google Actions
 * webhook payload. Falls back gracefully if fields are missing.
 */
export function parseGoogleRequest(body: Record<string, unknown>): ParsedVoiceRequest {
  const intent = body.intent as Record<string, unknown> | undefined;
  const session = body.session as Record<string, unknown> | undefined;

  // Primary: intent.query contains the user's free-form text
  let query = (intent?.query as string) ?? "";

  // Fallback: some Google Actions flows pass the query in intent.params
  if (!query && intent?.params) {
    const params = intent.params as Record<string, unknown>;
    // Google often puts free-form text in a "query" or "text" param
    query = (params.query as string) ?? (params.text as string) ?? "";
  }

  const sessionId = (session?.id as string) ?? "unknown";

  return { query: query.trim(), sessionId };
}

/**
 * Formats a fulfillment result into the Google Actions webhook response format.
 *
 * Supports both simple (voice-only) and rich (with display text) responses.
 */
export function formatGoogleResponse(
  speech: string,
  displayText: string,
  ssml: string,
): Record<string, unknown> {
  return {
    session: {
      id: "",
      params: {},
    },
    prompt: {
      override: false,
      firstSimple: {
        speech: ssml,
        text: displayText.slice(0, 640), // Google display text limit
      },
    },
  };
}

/**
 * Formats an error into a Google Actions response.
 */
export function formatGoogleError(message: string): Record<string, unknown> {
  return {
    session: {
      id: "",
      params: {},
    },
    prompt: {
      override: false,
      firstSimple: {
        speech: `<speak>${message}</speak>`,
        text: message,
      },
    },
  };
}
