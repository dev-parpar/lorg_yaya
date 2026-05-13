import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { createAccountLink } from "@/lib/voice/tokens";
import { HTTP_STATUS } from "@/lib/constants";

const linkSchema = z.object({
  clientId: z.string().min(1),
  platform: z.literal("alexa"),
});

/**
 * POST /api/alexa/auth/link
 *
 * Called by the Alexa consent page after the user authenticates and approves.
 * Creates a VoiceAccountLink with a short-lived auth code, which the consent
 * page then passes back to Alexa via the redirect_uri.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const body = linkSchema.parse(await request.json());

    const expectedClientId = process.env.ALEXA_CLIENT_ID;
    if (expectedClientId && body.clientId !== expectedClientId) {
      return NextResponse.json(
        { error: "Invalid client_id" },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const { authCode } = await createAccountLink(userId, "alexa");

    return NextResponse.json({ authCode }, { status: HTTP_STATUS.CREATED });
  } catch (error) {
    return handleRouteError(error, "POST /api/alexa/auth/link");
  }
}
