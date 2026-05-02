import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { getAccessibleLocation } from "@/lib/db/access";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { HTTP_STATUS } from "@/lib/constants";

type Params = { params: Promise<{ locationId: string }> };

// ── Op payload types ──────────────────────────────────────────────────────────
// These mirror the local-first op log format consumed by the mobile app.

interface BaseOp {
  seq: number;
  deviceId: string;
  userId: string;
  timestamp: string;
}

interface AddCabinetOp extends BaseOp {
  type: "add_cabinet";
  payload: {
    cabinetId: string;
    locationId: string;
    name: string;
    description: string | null;
    imagePath: string | null;
    signedImageUrl: string | null;
  };
}

interface AddShelfOp extends BaseOp {
  type: "add_shelf";
  payload: {
    shelfId: string;
    cabinetId: string;
    name: string;
    position: number;
    imagePath: string | null;
    signedImageUrl: string | null;
  };
}

interface AddItemOp extends BaseOp {
  type: "add_item";
  payload: {
    itemId: string;
    cabinetId: string;
    shelfId: string | null;
    name: string;
    description: string | null;
    quantity: number;
    itemType: string;
    imagePath: string | null;
    signedImageUrl: string | null;
    tags: string[];
  };
}

type SyncOp = AddCabinetOp | AddShelfOp | AddItemOp;

/**
 * GET /api/sync/[locationId]/export
 *
 * Generates a bootstrap op log for a location from its current PostgreSQL state.
 * Each active cabinet, shelf, and item is converted into an `add_*` operation
 * so that a fresh local-first client can replay the log to build its local DB.
 *
 * The `deviceId` sentinel "migration" distinguishes these synthetic ops from
 * real device-originated ops in any downstream processing.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { locationId } = await params;
    await getAccessibleLocation(locationId, userId);

    const cabinets = await prisma.cabinet.findMany({
      where: { locationId, deletedAt: null },
      include: {
        shelves: {
          where: { deletedAt: null },
        },
        items: {
          where: { deletedAt: null },
        },
      },
    });

    const ops: SyncOp[] = [];
    let seq = 1;
    const timestamp = new Date().toISOString();
    const deviceId = "migration";

    for (const cabinet of cabinets) {
      ops.push({
        seq: seq++,
        deviceId,
        userId,
        timestamp,
        type: "add_cabinet",
        payload: {
          cabinetId: cabinet.id,
          locationId: cabinet.locationId,
          name: cabinet.name,
          description: cabinet.description,
          imagePath: cabinet.imagePath,
          signedImageUrl: cabinet.signedImageUrl,
        },
      });

      for (const shelf of cabinet.shelves) {
        ops.push({
          seq: seq++,
          deviceId,
          userId,
          timestamp,
          type: "add_shelf",
          payload: {
            shelfId: shelf.id,
            cabinetId: shelf.cabinetId,
            name: shelf.name,
            position: shelf.position,
            imagePath: shelf.imagePath,
            signedImageUrl: shelf.signedImageUrl,
          },
        });
      }

      for (const item of cabinet.items) {
        ops.push({
          seq: seq++,
          deviceId,
          userId,
          timestamp,
          type: "add_item",
          payload: {
            itemId: item.id,
            cabinetId: item.cabinetId,
            shelfId: item.shelfId,
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            itemType: item.itemType,
            imagePath: item.imagePath,
            signedImageUrl: item.signedImageUrl,
            tags: item.tags,
          },
        });
      }
    }

    return NextResponse.json(
      { data: { locationId, ops } },
      { status: HTTP_STATUS.OK },
    );
  } catch (error) {
    return handleRouteError(error, "GET /api/sync/[locationId]/export");
  }
}
