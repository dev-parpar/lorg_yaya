import Anthropic from "@anthropic-ai/sdk";
import { aiConfig } from "@/lib/ai/config";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { inventoryTool } from "@/lib/ai/tools";
import { getUserInventory, getUserStructure } from "./inventory-queries";
import { executeVoiceActions, type VoiceAction } from "./execute-actions";
import { markdownToVoice, wrapSSML } from "./voice-response";
import { logger } from "@/lib/logger";

export interface VoiceFulfillmentResult {
  speech: string;
  displayText: string;
  ssml: string;
  actionsTaken: number;
}

const VOICE_SYSTEM_SUFFIX = `

## Voice Assistant Mode
You are responding via a voice assistant (Google Home / Alexa). Follow these extra rules:
- Keep answers to 2-3 sentences maximum — the user is listening, not reading.
- Never use markdown formatting (no tables, bold, headers, links, or code blocks).
- Describe items conversationally: "You have 3 cans of tomato soup in the kitchen pantry cabinet."
- For mutations, confirm what you did in one short sentence: "Done, I've added milk to your kitchen pantry."
- If multiple items match, list up to 3 by name, then say "and X more — check your Lorgy app for the full list."
- Never mention item IDs, cabinet IDs, or shelf IDs — use names only.`;

/**
 * Core voice fulfillment handler — platform-agnostic.
 *
 * Flow:
 * 1. Fetch user's inventory + structure
 * 2. Build system prompt with voice suffix
 * 3. Call Claude with manage_inventory tool
 * 4. If tool_use → execute actions server-side
 * 5. Format response for voice output
 */
export async function handleVoiceFulfillment(
  userId: string,
  query: string,
): Promise<VoiceFulfillmentResult> {
  logger.info("[voice/fulfillment] Processing query", {
    userId,
    query: query.slice(0, 80),
  });

  // 1. Fetch inventory + structure
  const [inventory, structure] = await Promise.all([
    getUserInventory(userId),
    getUserStructure(userId),
  ]);

  logger.info("[voice/fulfillment] Inventory loaded", {
    items: inventory.length,
    locations: structure.length,
  });

  // 2. Build system prompt with voice mode suffix
  const systemPrompt = buildSystemPrompt(inventory, structure) + VOICE_SYSTEM_SUFFIX;

  // 3. Call Claude
  const client = new Anthropic({ apiKey: aiConfig.anthropicApiKey });

  const response = await client.messages.create({
    model: aiConfig.model,
    max_tokens: aiConfig.maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: query }],
    tools: [inventoryTool],
  });

  // 4. Check for tool use
  const toolUseBlock = response.content.find(
    (block): block is Anthropic.ContentBlock & { type: "tool_use" } =>
      block.type === "tool_use" && block.name === "manage_inventory",
  );

  let responseText: string;
  let actionsTaken = 0;

  if (toolUseBlock) {
    const toolInput = toolUseBlock.input as {
      summary: string;
      actions: VoiceAction[];
    };

    logger.info("[voice/fulfillment] Executing actions", {
      count: toolInput.actions.length,
    });

    // Execute actions server-side
    const result = await executeVoiceActions(userId, toolInput.actions);
    actionsTaken = result.succeeded;

    // Extract any text blocks Claude provided alongside the tool call
    const textBlocks = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((b) => b.text)
      .join(" ");

    // Build response: prefer Claude's text, fall back to tool summary + execution result
    if (textBlocks.trim()) {
      responseText = textBlocks.trim();
    } else {
      responseText = toolInput.summary;
    }

    // Append failure info if any actions failed
    if (result.failed > 0) {
      responseText += ` However, ${result.failed} action${result.failed > 1 ? "s" : ""} failed.`;
    }
  } else {
    // No tool use — plain text response
    responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((b) => b.text)
      .join("");
  }

  // 5. Format for voice
  const speech = markdownToVoice(responseText);
  const ssml = wrapSSML(speech);

  logger.info("[voice/fulfillment] Response ready", {
    speechLength: speech.length,
    actionsTaken,
  });

  return {
    speech,
    displayText: responseText,
    ssml,
    actionsTaken,
  };
}
