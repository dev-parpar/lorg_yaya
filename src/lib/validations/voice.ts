import { z } from "zod";

// ── OAuth Authorize (GET /api/google/auth/authorize) ────────────────────────

export const oauthAuthorizeSchema = z.object({
  client_id: z.string().min(1, "client_id is required"),
  redirect_uri: z.string().url("redirect_uri must be a valid URL"),
  response_type: z.literal("code", { message: "response_type must be 'code'" }),
  state: z.string().min(1, "state is required"),
});

export type OAuthAuthorizeParams = z.infer<typeof oauthAuthorizeSchema>;

// ── OAuth Token Exchange (POST /api/google/auth/token) ──────────────────────

const authorizationCodeGrant = z.object({
  grant_type: z.literal("authorization_code"),
  code: z.string().min(1, "code is required"),
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  redirect_uri: z.string().optional(),
});

const refreshTokenGrant = z.object({
  grant_type: z.literal("refresh_token"),
  refresh_token: z.string().min(1, "refresh_token is required"),
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
});

export const oauthTokenRequestSchema = z.discriminatedUnion("grant_type", [
  authorizationCodeGrant,
  refreshTokenGrant,
]);

export type OAuthTokenRequest = z.infer<typeof oauthTokenRequestSchema>;

// ── Google Actions Fulfillment (POST /api/google/fulfillment) ───────────────

export const googleFulfillmentSchema = z.object({
  handler: z.object({
    name: z.string(),
  }),
  intent: z.object({
    name: z.string(),
    query: z.string().optional(),
    params: z.record(z.string(), z.unknown()).optional(),
  }),
  scene: z
    .object({
      name: z.string().optional(),
    })
    .optional(),
  session: z.object({
    id: z.string(),
    params: z.record(z.string(), z.unknown()).optional(),
    languageCode: z.string().optional(),
  }),
  user: z
    .object({
      locale: z.string().optional(),
      verificationStatus: z.string().optional(),
    })
    .optional(),
});

export type GoogleFulfillmentRequest = z.infer<typeof googleFulfillmentSchema>;
