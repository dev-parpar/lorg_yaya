import { type NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
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
  // Cap conversation history to keep token usage predictable
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
      try {
        const stream = client.messages.stream({
          model: aiConfig.model,
          max_tokens: aiConfig.maxTokens,
          system: systemPrompt,
          messages: conversationMessages,
        });

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }

        controller.close();
      } catch (err) {
        controller.error(err);
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
