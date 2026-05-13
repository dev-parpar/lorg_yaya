import { type NextRequest, NextResponse } from "next/server";
import { oauthAuthorizeSchema } from "@/lib/validations/voice";
import { logger } from "@/lib/logger";

/**
 * GET /api/alexa/auth/authorize
 *
 * OAuth 2.0 authorization endpoint for Alexa account linking.
 * Alexa redirects the user here during the account linking flow
 * in the Alexa companion app. We validate the params, then
 * redirect to the consent page where the user logs in and approves.
 */
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());

  const result = oauthAuthorizeSchema.safeParse(params);
  if (!result.success) {
    logger.warn("[alexa/auth/authorize] Invalid params", {
      errors: result.error.flatten(),
    });
    return NextResponse.json(
      { error: "Invalid authorization request", details: result.error.flatten() },
      { status: 400 },
    );
  }

  const { client_id, redirect_uri, state } = result.data;

  const expectedClientId = process.env.ALEXA_CLIENT_ID;
  if (expectedClientId && client_id !== expectedClientId) {
    logger.warn("[alexa/auth/authorize] Client ID mismatch", { client_id });
    return NextResponse.json({ error: "Invalid client_id" }, { status: 400 });
  }

  // Forward OAuth params to the consent page
  const consentUrl = new URL("/alexa/consent", request.nextUrl.origin);
  consentUrl.searchParams.set("client_id", client_id);
  consentUrl.searchParams.set("redirect_uri", redirect_uri);
  consentUrl.searchParams.set("state", state);

  logger.info("[alexa/auth/authorize] Redirecting to consent page");
  return NextResponse.redirect(consentUrl.toString());
}
