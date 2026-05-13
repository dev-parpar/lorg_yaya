import { type NextRequest, NextResponse } from "next/server";
import { oauthTokenRequestSchema } from "@/lib/validations/voice";
import { exchangeAuthCode, refreshAccessToken } from "@/lib/voice/tokens";
import { logger } from "@/lib/logger";
import { HTTP_STATUS } from "@/lib/constants";

/**
 * POST /api/alexa/auth/token
 *
 * OAuth 2.0 token endpoint for Alexa account linking.
 * Handles authorization_code and refresh_token grants.
 * Alexa sends the body as application/x-www-form-urlencoded.
 */
export async function POST(request: NextRequest) {
  let rawBody: Record<string, string>;

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await request.formData();
    rawBody = Object.fromEntries(
      Array.from(formData.entries()).map(([k, v]) => [k, String(v)]),
    );
  } else {
    rawBody = (await request.json()) as Record<string, string>;
  }

  const result = oauthTokenRequestSchema.safeParse(rawBody);
  if (!result.success) {
    logger.warn("[alexa/auth/token] Invalid request", {
      errors: result.error.flatten(),
    });
    return NextResponse.json(
      { error: "invalid_request", error_description: "Invalid token request parameters" },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }

  const body = result.data;

  if (body.grant_type === "authorization_code") {
    const tokens = await exchangeAuthCode(body.code, body.client_id, body.client_secret);
    if (!tokens) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Invalid or expired authorization code" },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    logger.info("[alexa/auth/token] Auth code exchanged successfully");

    return NextResponse.json({
      token_type: "Bearer",
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: 315360000, // 10 years — tokens only expire via revocation
    });
  }

  // refresh_token grant
  const newToken = await refreshAccessToken(
    body.refresh_token,
    body.client_id,
    body.client_secret,
  );
  if (!newToken) {
    return NextResponse.json(
      { error: "invalid_grant", error_description: "Invalid or revoked refresh token" },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }

  logger.info("[alexa/auth/token] Access token refreshed");

  return NextResponse.json({
    token_type: "Bearer",
    access_token: newToken.accessToken,
    expires_in: 315360000,
  });
}
