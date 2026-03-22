/**
 * Shared authorization helpers for resource access checks.
 *
 * The ownership chain for all inventory resources is:
 *   Location.userId  ← owned directly
 *   Cabinet          ← authorized via Cabinet → Location
 *   Shelf            ← authorized via Shelf → Cabinet → Location
 *   Item             ← authorized via Item → Cabinet → Location
 *
 * A user may access a Location (and everything inside it) if they are:
 *   1. The owner (Location.userId === userId), OR
 *   2. An ACCEPTED member (LocationMember with userId + status=ACCEPTED)
 *
 * Only the owner may delete the location or manage membership.
 */

import { InviteStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

// ── Prisma filter fragment ─────────────────────────────────────────────────
// Reused in every findFirst/findMany that needs to respect membership.
export function locationAccessFilter(userId: string) {
  return {
    OR: [
      { userId },
      { members: { some: { userId, status: InviteStatus.ACCEPTED } } },
    ],
  };
}

// ── Location ──────────────────────────────────────────────────────────────

/**
 * Returns the location if the user is the owner OR an accepted member.
 * Throws NotFoundError if the location does not exist (or is soft-deleted).
 * Throws ForbiddenError if the user has no access.
 */
export async function getAccessibleLocation(locationId: string, userId: string) {
  const location = await prisma.location.findFirst({
    where: { id: locationId, deletedAt: null },
    include: {
      members: {
        where: { userId, status: InviteStatus.ACCEPTED },
        take: 1,
      },
    },
  });
  if (!location) throw new NotFoundError("Location");
  const isOwner = location.userId === userId;
  const isMember = location.members.length > 0;
  if (!isOwner && !isMember) throw new ForbiddenError();
  return { ...location, role: isOwner ? ("OWNER" as const) : ("EDITOR" as const) };
}

/**
 * Asserts that the user is the owner of the location.
 * Used for privileged operations: delete location, manage members.
 */
export async function assertLocationOwner(locationId: string, userId: string) {
  const location = await prisma.location.findFirst({
    where: { id: locationId, userId, deletedAt: null },
  });
  if (!location) throw new ForbiddenError();
  return location;
}

// ── Cabinet ───────────────────────────────────────────────────────────────

export async function getAccessibleCabinet(cabinetId: string, userId: string) {
  const cabinet = await prisma.cabinet.findFirst({
    where: { id: cabinetId, deletedAt: null },
    include: {
      location: {
        include: {
          members: {
            where: { userId, status: InviteStatus.ACCEPTED },
            take: 1,
          },
        },
      },
    },
  });
  if (!cabinet) throw new NotFoundError("Cabinet");
  const isOwner = cabinet.location.userId === userId;
  const isMember = cabinet.location.members.length > 0;
  if (!isOwner && !isMember) throw new ForbiddenError();
  return cabinet;
}

// ── Shelf ─────────────────────────────────────────────────────────────────

export async function getAccessibleShelf(shelfId: string, userId: string) {
  const shelf = await prisma.shelf.findFirst({
    where: { id: shelfId, deletedAt: null },
    include: {
      cabinet: {
        include: {
          location: {
            include: {
              members: {
                where: { userId, status: InviteStatus.ACCEPTED },
                take: 1,
              },
            },
          },
        },
      },
    },
  });
  if (!shelf) throw new NotFoundError("Shelf");
  const isOwner = shelf.cabinet.location.userId === userId;
  const isMember = shelf.cabinet.location.members.length > 0;
  if (!isOwner && !isMember) throw new ForbiddenError();
  return shelf;
}

// ── Item ──────────────────────────────────────────────────────────────────

export async function getAccessibleItem(itemId: string, userId: string) {
  const item = await prisma.item.findFirst({
    where: { id: itemId, deletedAt: null },
    include: {
      cabinet: {
        include: {
          location: {
            include: {
              members: {
                where: { userId, status: InviteStatus.ACCEPTED },
                take: 1,
              },
            },
          },
        },
      },
      shelf: true,
    },
  });
  if (!item) throw new NotFoundError("Item");
  const isOwner = item.cabinet.location.userId === userId;
  const isMember = item.cabinet.location.members.length > 0;
  if (!isOwner && !isMember) throw new ForbiddenError();
  return item;
}

// ── Inline access check (for POST routes that verify by locationId) ────────

/**
 * Verifies a user can access the given locationId without returning the full
 * location object. Used in POST /cabinets, POST /shelves, POST /items.
 */
export async function assertLocationAccess(locationId: string, userId: string) {
  const location = await prisma.location.findFirst({
    where: {
      id: locationId,
      deletedAt: null,
      OR: [
        { userId },
        { members: { some: { userId, status: InviteStatus.ACCEPTED } } },
      ],
    },
  });
  if (!location) throw new ForbiddenError();
  return location;
}

/**
 * Same as assertLocationAccess but resolved via a cabinetId.
 */
export async function assertCabinetAccess(cabinetId: string, userId: string) {
  const cabinet = await prisma.cabinet.findFirst({
    where: {
      id: cabinetId,
      deletedAt: null,
      location: {
        deletedAt: null,
        OR: [
          { userId },
          { members: { some: { userId, status: InviteStatus.ACCEPTED } } },
        ],
      },
    },
    include: { location: true },
  });
  if (!cabinet) throw new ForbiddenError();
  return cabinet;
}
