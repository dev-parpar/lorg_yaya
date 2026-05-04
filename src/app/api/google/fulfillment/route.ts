import { type NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/voice/tokens";
import { handleVoiceFulfillment } from "@/lib/voice/fulfillment";
import {
  parseGoogleRequest,
  formatGoogleResponse,
  formatGoogleError,
} from "@/lib/voice/adapters/google";
import { logger } from "@/lib/logger";
import { captureEvent } from "@/lib/analytics/posthog";
import { HTTP_STATUS } from "@/lib/constants";

/**
 * POST /api/google/fulfillment
 *
 * Google Actions webhook endpoint. Google sends each user utterance here
 * after account linking. We:
 * 1. Extract the Bearer token from the Authorization header
 * 2. Resolve it to a userId via our VoiceAccountLink table
 * 3. Parse the Google request to get the user's query
 * 4. Run the platform-agnostic voice fulfillment (Claude + actions)
 * 5. Format the response back in Google's expected schema
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Extract Bearer token
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;

    if (!token) {
      logger.warn("[google/fulfillment] Missing or invalid Authorization header");
      return NextResponse.json(
        formatGoogleError("Please link your Lorgy account first."),
        { status: HTTP_STATUS.UNAUTHORIZED },
      );
    }

    // 2. Resolve userId
    const userId = await resolveUserId(token);
    if (!userId) {
      logger.warn("[google/fulfillment] Token not found or revoked");
      return NextResponse.json(
        formatGoogleError("Your account link has expired. Please re-link in the Lorgy app."),
        { status: HTTP_STATUS.UNAUTHORIZED },
      );
    }

    // 3. Parse Google request
    const body = (await request.json()) as Record<string, unknown>;
    const { query, sessionId } = parseGoogleRequest(body);

    if (!query) {
      return NextResponse.json(
        formatGoogleResponse(
          "I didn't catch that. Try asking something like 'where are my batteries?'",
          "I didn't catch that. Try asking something like 'where are my batteries?'",
          "<speak>I didn't catch that. Try asking something like, where are my batteries?</speak>",
        ),
      );
    }

    logger.info("[google/fulfillment] Processing", {
      userId,
      sessionId,
      query: query.slice(0, 80),
    });

    // 4. Voice fulfillment
    const result = await handleVoiceFulfillment(userId, query);

    // 5. Format response
    const response = formatGoogleResponse(result.speech, result.displayText, result.ssml);

    captureEvent(userId, "voice_assistant_query", {
      platform: "google",
      query,
      speechLength: result.speech.length,
      actionsTaken: result.actionsTaken,
    });

    return NextResponse.json(response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("[google/fulfillment] Unhandled error", { error: msg });

    return NextResponse.json(
      formatGoogleError("Sorry, something went wrong. Please try again."),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
}
