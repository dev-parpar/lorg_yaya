import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ProfileStatus } from "@prisma/client";

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;

/**
 * Public endpoint — no auth required.
 * GET /api/profiles/check-username?username=foo
 * Returns { available: boolean, error?: string }
 */
export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")?.toLowerCase().trim();

  if (!username) {
    return NextResponse.json({ available: false, error: "Username is required." }, { status: 400 });
  }

  if (!USERNAME_REGEX.test(username)) {
    return NextResponse.json(
      {
        available: false,
        error: "Username must be 3–30 characters: lowercase letters, numbers, and underscores only.",
      },
      { status: 400 },
    );
  }

  // Only ACTIVE profiles hold usernames. DELETED profiles are audit records —
  // their usernames are free for re-registration.
  const existing = await prisma.profile.findFirst({
    where: { username, status: ProfileStatus.ACTIVE },
  });

  return NextResponse.json({ available: !existing });
}
