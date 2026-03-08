import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "@/lib/logger";
import { HTTP_STATUS } from "@/lib/constants";

// ── Operational errors (expected, user-facing) ───────────────────────────────

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, HTTP_STATUS.NOT_FOUND);
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super("Unauthorized", HTTP_STATUS.UNAUTHORIZED);
  }
}

export class ForbiddenError extends AppError {
  constructor() {
    super("Forbidden", HTTP_STATUS.FORBIDDEN);
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown) {
    super("Validation failed", HTTP_STATUS.UNPROCESSABLE, details);
  }
}

// ── API route error handler ──────────────────────────────────────────────────

export function handleRouteError(
  error: unknown,
  context: string,
): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", details: error.flatten() },
      { status: HTTP_STATUS.UNPROCESSABLE },
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, details: error.details },
      { status: error.statusCode },
    );
  }

  // Programmer errors — log verbosely, respond vaguely
  logger.error(`Unhandled error in ${context}`, {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });

  return NextResponse.json(
    { error: "An unexpected error occurred" },
    { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
  );
}
