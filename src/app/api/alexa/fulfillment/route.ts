import { type NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/voice/tokens";
import { handleVoiceFulfillment } from "@/lib/voice/fulfillment";
import {
  parseAlexaRequest,
  formatAlexaResponse,
  formatAlexaError,
  formatAlexaLinkAccount,
  formatAlexaWelcome,
  formatAlexaHelp,
  formatAlexaGoodbye,
  formatAlexaFallback,
} from "@/lib/voice/adapters/alexa";
import { logger } from "@/lib/logger";
import { captureEvent } from "@/lib/analytics/posthog";
import { verifyAlexaRequest } from "./verify";

/**
 * POST /api/alexa/fulfillment
 *
 * Alexa Custom Skill webhook. Alexa sends every user utterance here.
 *
 * Flow:
 * 1. Verify the request came from Amazon (signature check)
 * 2. Parse the Alexa JSON into a normalised shape
 * 3. If no account token → prompt to link account
 * 4. Route by request/intent type
 * 5. For query/mutation intents → run voice fulfillment (Claude + action execution)
 * 6. Return Alexa-formatted JSON response
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify the request signature (Amazon requires this for published skills)
    const rawBody = await request.text();
    const signatureValid = await verifyAlexaRequest(request.headers, rawBody);
    if (!signatureValid) {
      logger.warn("[alexa/fulfillment] Signature verification failed");
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = JSON.parse(rawBody) as Record<string, unknown>;
    const parsed = parseAlexaRequest(body);

    logger.info("[alexa/fulfillment] Request received", {
      requestType: parsed.requestType,
      intentName: parsed.intentName,
      sessionId: parsed.sessionId,
      hasToken: !!parsed.accessToken,
    });

    // 2. Handle SessionEndedRequest — must return empty 200
    if (parsed.requestType === "SessionEndedRequest") {
      return NextResponse.json({ version: "1.0", response: {} });
    }

    // 3. LaunchRequest — welcome message, no query yet
    if (parsed.requestType === "LaunchRequest") {
      if (!parsed.accessToken) {
        return NextResponse.json(formatAlexaLinkAccount());
      }
      return NextResponse.json(formatAlexaWelcome());
    }

    // 4. IntentRequest routing
    const intentName = parsed.intentName ?? "";

    if (intentName === "AMAZON.HelpIntent") {
      return NextResponse.json(formatAlexaHelp());
    }

    if (intentName === "AMAZON.StopIntent" || intentName === "AMAZON.CancelIntent") {
      return NextResponse.json(formatAlexaGoodbye());
    }

    if (intentName === "AMAZON.FallbackIntent" || intentName === "AMAZON.NavigateHomeIntent") {
      return NextResponse.json(formatAlexaFallback());
    }

    // 5. Main query intent (QueryIntent / any unrecognised intent treated as a query)
    if (!parsed.accessToken) {
      return NextResponse.json(formatAlexaLinkAccount());
    }

    const userId = await resolveUserId(parsed.accessToken);
    if (!userId) {
      logger.warn("[alexa/fulfillment] Token not found or revoked");
      return NextResponse.json(formatAlexaLinkAccount());
    }

    const query = parsed.query;
    if (!query) {
      return NextResponse.json(
        formatAlexaError(
          "I didn't catch your question. Try asking something like: where are my batteries?",
        ),
      );
    }

    logger.info("[alexa/fulfillment] Running fulfillment", {
      userId,
      query: query.slice(0, 80),
    });

    const result = await handleVoiceFulfillment(userId, query);
    const response = formatAlexaResponse(result.ssml, result.displayText);

    captureEvent(userId, "voice_assistant_query", {
      platform: "alexa",
      query,
      speechLength: result.speech.length,
      actionsTaken: result.actionsTaken,
    });

    return NextResponse.json(response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("[alexa/fulfillment] Unhandled error", { error: msg });

    return NextResponse.json(
      formatAlexaError("Sorry, something went wrong with Lorgy. Please try again."),
    );
  }
}
