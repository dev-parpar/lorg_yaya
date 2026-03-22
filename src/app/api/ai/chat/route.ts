import { type NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError } from "@/lib/errors";
import { aiConfig } from "@/lib/ai/config";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";

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
});

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  inventory: z.array(flatInventoryItemSchema),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .max(40),
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

  const { message, inventory, history } = body;

  console.log("[ai/chat] Request received —", {
    model: aiConfig.model,
    inventoryItems: inventory.length,
    historyLength: history.length,
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

  const systemPrompt = buildSystemPrompt(inventory);

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      console.log("[ai/chat] ReadableStream start — calling Anthropic");

      try {
        const stream = client.messages.stream({
          model: aiConfig.model,
          max_tokens: aiConfig.maxTokens,
          system: systemPrompt,
          messages: conversationMessages,
        });

        let chunkCount = 0;

        stream.on("text", (text) => {
          controller.enqueue(encoder.encode(text));
          chunkCount++;
        });

        stream.on("error", (err) => {
          console.error("[ai/chat] stream error event:", err.message);
        });

        await stream.finalMessage();

        console.log("[ai/chat] Stream complete — chunks sent:", chunkCount);
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[ai/chat] Caught error in stream:", msg);

        const isCredits = msg.toLowerCase().includes("credit");
        const userFacing = isCredits
          ? "Lorgy is temporarily unavailable — the AI service account needs a top-up. Please try again later."
          : `Sorry, I ran into an error: ${msg}`;

        controller.enqueue(encoder.encode(userFacing));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
