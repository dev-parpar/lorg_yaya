import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

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

  const existing = await prisma.profile.findUnique({ where: { username } });

  return NextResponse.json({ available: !existing });
}
