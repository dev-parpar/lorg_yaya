import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

const AUTH_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getGoogleCredentials() {
  const clientId = process.env.GOOGLE_ACTIONS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ACTIONS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_ACTIONS_CLIENT_ID and GOOGLE_ACTIONS_CLIENT_SECRET must be set");
  }
  return { clientId, clientSecret };
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Creates a new voice account link with a short-lived auth code.
 * Called after the user grants consent on the consent page.
 */
export async function createAccountLink(
  userId: string,
  platform: string,
): Promise<{ authCode: string }> {
  const authCode = generateToken();

  // Revoke any existing active links for this user + platform
  await prisma.voiceAccountLink.updateMany({
    where: { userId, platform, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await prisma.voiceAccountLink.create({
    data: {
      userId,
      platform,
      accessToken: generateToken(),
      refreshToken: generateToken(),
      authCode,
      authCodeExpiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
    },
  });

  logger.info("[voice/tokens] Account link created", { userId, platform });
  return { authCode };
}

/**
 * Exchanges an auth code for access + refresh tokens (authorization_code grant).
 * Validates client credentials. The auth code is single-use and time-limited.
 */
export async function exchangeAuthCode(
  code: string,
  clientId: string,
  clientSecret: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const creds = getGoogleCredentials();
  if (clientId !== creds.clientId || clientSecret !== creds.clientSecret) {
    logger.warn("[voice/tokens] Invalid client credentials on code exchange");
    return null;
  }

  const link = await prisma.voiceAccountLink.findFirst({
    where: {
      authCode: code,
      revokedAt: null,
    },
  });

  if (!link) {
    logger.warn("[voice/tokens] Auth code not found or already revoked");
    return null;
  }

  if (!link.authCodeExpiresAt || link.authCodeExpiresAt < new Date()) {
    logger.warn("[voice/tokens] Auth code expired");
    return null;
  }

  // Clear the auth code so it can't be reused
  await prisma.voiceAccountLink.update({
    where: { id: link.id },
    data: { authCode: null, authCodeExpiresAt: null },
  });

  return { accessToken: link.accessToken, refreshToken: link.refreshToken };
}

/**
 * Exchanges a refresh token for a new access token (refresh_token grant).
 * The old access token is invalidated.
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<{ accessToken: string } | null> {
  const creds = getGoogleCredentials();
  if (clientId !== creds.clientId || clientSecret !== creds.clientSecret) {
    logger.warn("[voice/tokens] Invalid client credentials on refresh");
    return null;
  }

  const link = await prisma.voiceAccountLink.findFirst({
    where: { refreshToken, revokedAt: null },
  });

  if (!link) {
    logger.warn("[voice/tokens] Refresh token not found or revoked");
    return null;
  }

  const newAccessToken = generateToken();
  await prisma.voiceAccountLink.update({
    where: { id: link.id },
    data: { accessToken: newAccessToken },
  });

  return { accessToken: newAccessToken };
}

/**
 * Resolves an access token to a userId. Returns null if the token
 * is not found or has been revoked.
 */
export async function resolveUserId(accessToken: string): Promise<string | null> {
  const link = await prisma.voiceAccountLink.findFirst({
    where: { accessToken, revokedAt: null },
  });
  return link?.userId ?? null;
}

/**
 * Soft-revokes all active voice account links for a user.
 * Optionally filter by platform.
 */
export async function revokeLinks(userId: string, platform?: string): Promise<number> {
  const result = await prisma.voiceAccountLink.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(platform ? { platform } : {}),
    },
    data: { revokedAt: new Date() },
  });

  if (result.count > 0) {
    logger.info("[voice/tokens] Revoked voice links", {
      userId,
      platform: platform ?? "all",
      count: result.count,
    });
  }

  return result.count;
}
