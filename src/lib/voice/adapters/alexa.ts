/**
 * Amazon Alexa Custom Skills adapter.
 *
 * Parses Alexa webhook requests into a platform-agnostic shape,
 * and formats the fulfillment result back into Alexa's JSON response schema.
 *
 * Reference: https://developer.amazon.com/en-US/docs/alexa/custom-skills/request-and-response-json-reference.html
 */

// ── Alexa request types ──────────────────────────────────────────────────────

export type AlexaRequestType =
  | "LaunchRequest"
  | "IntentRequest"
  | "SessionEndedRequest";

export interface ParsedAlexaRequest {
  requestType: AlexaRequestType;
  intentName: string | null;
  query: string | null;
  sessionId: string;
  /** OAuth access token from account linking. Null if user hasn't linked. */
  accessToken: string | null;
}

/**
 * Extracts the normalised request from an Alexa webhook payload.
 * Access token is in both session.user.accessToken and
 * context.System.user.accessToken — prefer context to handle
 * sessionless requests (AudioPlayer, etc.).
 */
export function parseAlexaRequest(body: Record<string, unknown>): ParsedAlexaRequest {
  const request = (body.request ?? {}) as Record<string, unknown>;
  const session = (body.session ?? {}) as Record<string, unknown>;
  const context = (body.context ?? {}) as Record<string, unknown>;
  const system = (context.System ?? {}) as Record<string, unknown>;

  const requestType = (request.type ?? "LaunchRequest") as AlexaRequestType;

  // Access token: prefer context.System.user (works in all request types)
  const contextUser = (system.user ?? {}) as Record<string, unknown>;
  const sessionUser = (session.user ?? {}) as Record<string, unknown>;
  const accessToken =
    (contextUser.accessToken as string | undefined) ??
    (sessionUser.accessToken as string | undefined) ??
    null;

  const sessionId = (session.sessionId as string | undefined) ?? "unknown";

  // Extract intent name and query slot
  let intentName: string | null = null;
  let query: string | null = null;

  if (requestType === "IntentRequest") {
    const intent = (request.intent ?? {}) as Record<string, unknown>;
    intentName = (intent.name as string | undefined) ?? null;

    // AMAZON.SearchQuery slot — value lives in slots.query.value
    const slots = (intent.slots ?? {}) as Record<string, Record<string, unknown>>;
    const querySlot = slots.query ?? slots.Query ?? null;
    if (querySlot) {
      query = (querySlot.value as string | undefined) ?? null;
    }
  }

  return { requestType, intentName, query, sessionId, accessToken };
}

// ── Alexa response builders ──────────────────────────────────────────────────

interface AlexaResponse {
  version: "1.0";
  sessionAttributes: Record<string, unknown>;
  response: {
    outputSpeech: { type: "SSML"; ssml: string };
    card?: AlexaCard;
    reprompt?: { outputSpeech: { type: "SSML"; ssml: string } };
    shouldEndSession: boolean;
  };
}

type AlexaCard =
  | { type: "Simple"; title: string; content: string }
  | { type: "LinkAccount" };

function buildResponse(
  ssml: string,
  displayText: string,
  card: AlexaCard | null,
  shouldEndSession: boolean,
  repromptSsml?: string,
): AlexaResponse {
  return {
    version: "1.0",
    sessionAttributes: {},
    response: {
      outputSpeech: { type: "SSML", ssml },
      ...(card ? { card } : {}),
      ...(repromptSsml
        ? { reprompt: { outputSpeech: { type: "SSML", ssml: repromptSsml } } }
        : {}),
      shouldEndSession,
    },
  };
}

/**
 * Formats a successful fulfillment result as an Alexa response.
 */
export function formatAlexaResponse(
  ssml: string,
  displayText: string,
): AlexaResponse {
  return buildResponse(
    ssml,
    displayText,
    { type: "Simple", title: "Lorgy", content: displayText.slice(0, 8000) },
    true,
  );
}

/**
 * Formats an error as an Alexa response.
 */
export function formatAlexaError(message: string): AlexaResponse {
  const ssml = `<speak>${message}</speak>`;
  return buildResponse(ssml, message, null, true);
}

/**
 * Prompts the user to link their account via the Alexa app.
 * Returns a LinkAccount card which appears in the companion app.
 */
export function formatAlexaLinkAccount(): AlexaResponse {
  const message =
    "Please link your Lorgy account first. I've sent a link to your Alexa app.";
  return buildResponse(
    `<speak>${message}</speak>`,
    message,
    { type: "LinkAccount" },
    true,
  );
}

/**
 * Welcome message for LaunchRequest (user opened the skill without a query).
 */
export function formatAlexaWelcome(): AlexaResponse {
  const message =
    "Welcome to Lorgy! Ask me about your inventory, or tell me to add, remove, or update items. What would you like to do?";
  return buildResponse(
    `<speak>${message}</speak>`,
    message,
    { type: "Simple", title: "Welcome to Lorgy", content: message },
    false,
    "<speak>What would you like to know about your inventory?</speak>",
  );
}

/**
 * Help intent response.
 */
export function formatAlexaHelp(): AlexaResponse {
  const message =
    "You can ask me things like: where are my batteries, how much milk do I have, " +
    "or tell me to add apples to the kitchen pantry. What would you like to do?";
  return buildResponse(
    `<speak>${message}</speak>`,
    message,
    { type: "Simple", title: "Lorgy Help", content: message },
    false,
    "<speak>What would you like to know?</speak>",
  );
}

/**
 * Goodbye message for Stop/Cancel intents.
 */
export function formatAlexaGoodbye(): AlexaResponse {
  return buildResponse(
    "<speak>Goodbye!</speak>",
    "Goodbye!",
    null,
    true,
  );
}

/**
 * Fallback / unrecognised intent response.
 */
export function formatAlexaFallback(): AlexaResponse {
  const message =
    "Sorry, I didn't understand that. Try asking about your inventory or asking me to add an item.";
  return buildResponse(
    `<speak>${message}</speak>`,
    message,
    null,
    false,
    "<speak>What would you like to know about your inventory?</speak>",
  );
}
