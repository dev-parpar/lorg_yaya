import { type NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { aiConfig } from "@/lib/ai/config";
import { prisma } from "@/lib/db/prisma";
import { assertCabinetAccess } from "@/lib/db/access";

const ITEM_TYPE_VALUES = [
  "FOOD",
  "GAME",
  "SPORTS",
  "ELECTRONICS",
  "UTENSILS",
  "CUTLERY",
  "FIRST_AID",
  "CLOTHES",
  "ACCESSORIES",
  "SHOES",
  "OTHER",
] as const;

const requestSchema = z.object({
  imageBase64: z.string().min(1, "imageBase64 is required"),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  cabinetId: z.string().uuid("cabinetId must be a valid UUID"),
});

interface RawDetection {
  name: string;
  type: string;
  confidence: number;
}

export interface IdentifiedItem {
  name: string;
  type: string;
  confidence: number;
  isDuplicate: boolean;
  existingItemId: string | null;
  existingQty: number | null;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    let body: z.infer<typeof requestSchema>;
    try {
      body = requestSchema.parse(await request.json());
    } catch (error) {
      return handleRouteError(error, "POST /api/ai/identify-items");
    }

    const { imageBase64, mediaType, cabinetId } = body;

    // Verify the user has access to this cabinet before doing any AI work
    await assertCabinetAccess(cabinetId, userId);

    const client = new Anthropic({ apiKey: aiConfig.anthropicApiKey });

    // ── Step 1: Vision pass — photo → structured item list ───────────────
    console.log("[identify-items] Vision pass — model:", aiConfig.visionModel);

    const visionResponse = await client.messages.create({
      model: aiConfig.visionModel,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: imageBase64 },
            },
            {
              type: "text",
              text: `Identify all distinct items visible in this photo.

Return a JSON array of objects. Each object must have exactly these fields:
- "name": string — concise human-readable name (e.g. "Campbell's Tomato Soup", "Claw Hammer", "AAA Batteries x4")
- "type": one of exactly: FOOD, GAME, SPORTS, ELECTRONICS, UTENSILS, CUTLERY, FIRST_AID, CLOTHES, ACCESSORIES, SHOES, OTHER
- "confidence": number 0–1 — your confidence you identified this item correctly

Rules:
- If you see multiple identical items, produce one entry with the count in the name (e.g. "Soup Can x3")
- Use "Unknown Object" for anything you cannot identify, with type OTHER and low confidence
- Return ONLY the raw JSON array — no markdown, no code fences, no explanation
- Return [] if no items are visible

Example: [{"name":"Claw Hammer","type":"OTHER","confidence":0.91},{"name":"WD-40 Spray","type":"OTHER","confidence":0.85}]`,
            },
          ],
        },
      ],
    });

    const visionRaw = visionResponse.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    // Claude sometimes wraps JSON in markdown code fences (```json … ```)
    // even when instructed not to — strip them before parsing.
    const visionText = visionRaw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    console.log("[identify-items] Vision raw (first 200 chars):", visionRaw.slice(0, 200));

    let detections: RawDetection[] = [];
    try {
      const parsed: unknown = JSON.parse(visionText);
      if (Array.isArray(parsed)) {
        detections = parsed as RawDetection[];
      } else {
        console.error("[identify-items] Vision response was not an array:", typeof parsed);
      }
    } catch (err) {
      console.error(
        "[identify-items] Vision JSON parse failed:",
        (err as Error).message,
        "| Cleaned text:",
        visionText.slice(0, 200),
      );
    }

    // Clamp confidence and normalise item types to our enum
    detections = detections.map((d) => ({
      name: d.name ?? "Unknown Item",
      type: ITEM_TYPE_VALUES.includes(d.type as (typeof ITEM_TYPE_VALUES)[number])
        ? d.type
        : "OTHER",
      confidence: Math.min(1, Math.max(0, Number(d.confidence) || 0)),
    }));

    console.log("[identify-items] Detected:", detections.length, "items");

    if (detections.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // ── Step 2: Fetch existing items in this cabinet ─────────────────────
    const existingItems = await prisma.item.findMany({
      where: { cabinetId, deletedAt: null },
      select: { id: true, name: true, quantity: true },
    });

    // ── Step 3: Duplicate detection — one Haiku text call for the whole batch
    const duplicateMap = new Map<
      number,
      { isDuplicate: boolean; matchedItemId: string | null; matchedItemQty: number | null }
    >();

    // Default every item to non-duplicate
    detections.forEach((_, i) =>
      duplicateMap.set(i, { isDuplicate: false, matchedItemId: null, matchedItemQty: null }),
    );

    if (existingItems.length > 0) {
      console.log("[identify-items] Dedup pass against", existingItems.length, "existing items");

      const dedupResponse = await client.messages.create({
        model: aiConfig.visionModel,
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: `You are deduplicating a home inventory. Determine if any newly detected items already exist.

Newly detected items (0-indexed):
${detections.map((d, i) => `${i}. "${d.name}"`).join("\n")}

Existing items already in this cabinet:
${existingItems.map((e) => `- id:${e.id} name:"${e.name}" qty:${e.quantity}`).join("\n")}

Two items match if they refer to the same physical product — ignore minor spelling, brand abbreviations, or capitalisation differences.

Return a JSON array with one entry per detected item, in index order:
[
  { "index": 0, "isDuplicate": true, "matchedItemId": "<uuid>", "matchedItemQty": 2 },
  { "index": 1, "isDuplicate": false, "matchedItemId": null, "matchedItemQty": null }
]

Return ONLY the raw JSON array — no markdown, no explanation.`,
          },
        ],
      });

      const dedupRaw = dedupResponse.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();

      const dedupText = dedupRaw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/, "")
        .trim();

      try {
        const parsed: unknown = JSON.parse(dedupText);
        if (Array.isArray(parsed)) {
          for (const entry of parsed as Array<{
            index: number;
            isDuplicate: boolean;
            matchedItemId: string | null;
            matchedItemQty: number | null;
          }>) {
            if (typeof entry.index === "number" && entry.index >= 0 && entry.index < detections.length) {
              duplicateMap.set(entry.index, {
                isDuplicate: Boolean(entry.isDuplicate),
                matchedItemId: entry.matchedItemId ?? null,
                matchedItemQty: entry.matchedItemQty ?? null,
              });
            }
          }
        }
      } catch {
        console.error("[identify-items] Dedup parse error. Raw:", dedupText.slice(0, 200));
        // Safe fallback — all non-duplicates, no items blocked
      }
    }

    // ── Step 4: Build final response ─────────────────────────────────────
    const result: IdentifiedItem[] = detections.map((d, i) => {
      const dup = duplicateMap.get(i)!;
      return {
        name: d.name,
        type: d.type,
        confidence: d.confidence,
        isDuplicate: dup.isDuplicate,
        existingItemId: dup.matchedItemId,
        existingQty: dup.matchedItemQty,
      };
    });

    console.log(
      "[identify-items] Done — items:",
      result.length,
      "duplicates:",
      result.filter((r) => r.isDuplicate).length,
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleRouteError(error, "POST /api/ai/identify-items");
  }
}
