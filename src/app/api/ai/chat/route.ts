import { type NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError } from "@/lib/errors";
import { aiConfig } from "@/lib/ai/config";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { inventoryTool } from "@/lib/ai/tools";
import { logger } from "@/lib/logger";

const flatInventoryItemSchema = z.object({
  location: z.string(),
  locationType: z.string(),
  cabinet: z.string(),
  shelf: z.string().nullable().optional(),
  name: z.string(),
  type: z.string(),
  quantity: z.number(),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()),
  itemId: z.string(),
  locationId: z.string(),
  cabinetId: z.string(),
  shelfId: z.string().nullable().optional(),
});

const locationStructureSchema = z.object({
  locationId: z.string(),
  locationName: z.string(),
  locationType: z.string(),
  cabinets: z.array(
    z.object({
      cabinetId: z.string(),
      cabinetName: z.string(),
      description: z.string().nullable(),
      shelves: z.array(
        z.object({
          shelfId: z.string(),
          shelfName: z.string(),
          position: z.number(),
        }),
      ),
    }),
  ),
});

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  inventory: z.array(flatInventoryItemSchema),
  structure: z.array(locationStructureSchema).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .max(40),
  activeLocationId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof chatSchema>;
  try {
    body = chatSchema.parse(await request.json());
  } catch (error) {
    return handleRouteError(error, "POST /api/ai/chat");
  }

  const { message, inventory, structure, history, activeLocationId } = body;

  logger.info("[ai/chat] Request received", {
    model: aiConfig.model,
    inventoryItems: inventory.length,
    historyLength: history.length,
    activeLocationId,
    message: message.slice(0, 80),
  });

  const client = new Anthropic({ apiKey: aiConfig.anthropicApiKey });

  const conversationMessages: Anthropic.MessageParam[] = [
    ...history.map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    { role: "user", content: message },
  ];

  const systemPrompt = buildSystemPrompt(
    inventory.map((item) => ({
      ...item,
      shelf: item.shelf ?? null,
      description: item.description ?? null,
      shelfId: item.shelfId ?? null,
    })),
    structure,
    activeLocationId,
  );

  try {
    // Non-streaming call with tool_use support.
    // We need the complete response to check whether Claude invoked a tool.
    const response = await client.messages.create({
      model: aiConfig.model,
      max_tokens: aiConfig.maxTokens,
      system: systemPrompt,
      messages: conversationMessages,
      tools: [inventoryTool],
    });

    // Check if Claude invoked the manage_inventory tool
    const toolUseBlock = response.content.find(
      (block): block is Anthropic.ContentBlock & { type: "tool_use" } =>
        block.type === "tool_use" && block.name === "manage_inventory",
    );

    if (toolUseBlock) {
      // Extract text blocks (Claude's summary message)
      const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === "text",
      );
      const summaryText = textBlocks.map((b) => b.text).join("\n") || "";

      const toolInput = toolUseBlock.input as {
        summary: string;
        actions: unknown[];
      };

      logger.info("[ai/chat] Tool use response", {
        actionCount: toolInput.actions.length,
        summary: toolInput.summary.slice(0, 100),
      });

      // Return structured JSON response
      return NextResponse.json(
        {
          text: summaryText || toolInput.summary,
          actions: toolInput.actions,
        },
        {
          headers: {
            "Cache-Control": "no-cache, no-store",
            "X-Content-Type-Options": "nosniff",
          },
        },
      );
    }

    // No tool use — stream the text response as before.
    // Since we already have the full response, emit it as a single chunk.
    const textContent = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((b) => b.text)
      .join("");

    logger.info("[ai/chat] Text-only response", {
      length: textContent.length,
    });

    return new Response(textContent, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("[ai/chat] Error calling Claude", { error: msg });

    const isCredits = msg.toLowerCase().includes("credit");
    const userFacing = isCredits
      ? "Lorgy is temporarily unavailable — the AI service account needs a top-up. Please try again later."
      : `Sorry, I ran into an error: ${msg}`;

    return new Response(userFacing, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
}
