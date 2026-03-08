import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { HTTP_STATUS } from "@/lib/constants";

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;

const createProfileSchema = z.object({
  username: z
    .string()
    .toLowerCase()
    .trim()
    .regex(USERNAME_REGEX, "Username must be 3–30 characters: lowercase letters, numbers, and underscores only."),
});

/**
 * GET /api/profiles/me — returns the current user's profile.
 */
export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const profile = await prisma.profile.findUnique({ where: { userId } });

    return NextResponse.json({ data: profile ?? null });
  } catch (error) {
    return handleRouteError(error, "GET /api/profiles/me");
  }
}

/**
 * POST /api/profiles — creates a profile for the authenticated user.
 * Idempotent: returns existing profile if already created.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    // Return existing profile rather than erroring on duplicate
    const existing = await prisma.profile.findUnique({ where: { userId } });
    if (existing) {
      return NextResponse.json({ data: existing });
    }

    const body = await request.json();
    const { username } = createProfileSchema.parse(body);

    // Check uniqueness (race-condition safe — DB unique constraint is the source of truth)
    const profile = await prisma.profile.create({
      data: { userId, username },
    });

    return NextResponse.json({ data: profile }, { status: HTTP_STATUS.CREATED });
  } catch (error) {
    // Prisma unique constraint violation
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "That username is already taken. Please choose another." },
        { status: 409 },
      );
    }
    return handleRouteError(error, "POST /api/profiles");
  }
}
