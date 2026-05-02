import type Anthropic from "@anthropic-ai/sdk";

/**
 * Tool definition for Claude to execute inventory actions.
 * Claude invokes this tool when the user asks to add, remove, update,
 * or move items — never for read-only questions.
 */
export const inventoryTool: Anthropic.Tool = {
  name: "manage_inventory",
  description:
    "Execute inventory changes requested by the user. Use this tool ONLY when the user explicitly asks to add, remove, update, or move items. Do NOT use this tool for questions about inventory (e.g., 'where are my scissors?', 'what food do I have?').",
  input_schema: {
    type: "object" as const,
    properties: {
      summary: {
        type: "string",
        description:
          "A brief human-readable summary of what actions will be performed, written as confirmation for the user. Keep it to 1-2 sentences.",
      },
      actions: {
        type: "array",
        description: "The list of inventory mutations to perform.",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["add_item", "update_item", "remove_item", "move_item"],
              description: "The type of inventory action.",
            },
            // add_item fields
            locationId: {
              type: "string",
              description: "The location ID. Required for add_item, update_item, remove_item, move_item.",
            },
            cabinetId: {
              type: "string",
              description: "Target cabinet ID. Required for add_item and move_item.",
            },
            shelfId: {
              type: ["string", "null"],
              description: "Target shelf ID, or null if directly in cabinet. Used by add_item and move_item.",
            },
            item: {
              type: "object",
              description: "Item details for add_item.",
              properties: {
                name: { type: "string" },
                quantity: { type: "integer", minimum: 1 },
                itemType: {
                  type: "string",
                  enum: [
                    "FOOD", "GAME", "SPORTS", "ELECTRONICS", "UTENSILS",
                    "CUTLERY", "FIRST_AID", "CLOTHES", "ACCESSORIES", "SHOES", "OTHER",
                  ],
                },
                description: { type: ["string", "null"] },
                tags: { type: "array", items: { type: "string" } },
              },
              required: ["name", "quantity", "itemType"],
            },
            // update_item / remove_item / move_item fields
            itemId: {
              type: "string",
              description: "The existing item's ID. Required for update_item, remove_item, move_item.",
            },
            changes: {
              type: "object",
              description: "Fields to update for update_item.",
              properties: {
                name: { type: "string" },
                quantity: { type: "integer", minimum: 0 },
                itemType: {
                  type: "string",
                  enum: [
                    "FOOD", "GAME", "SPORTS", "ELECTRONICS", "UTENSILS",
                    "CUTLERY", "FIRST_AID", "CLOTHES", "ACCESSORIES", "SHOES", "OTHER",
                  ],
                },
                description: { type: ["string", "null"] },
                tags: { type: "array", items: { type: "string" } },
              },
            },
            // move_item fields (cabinetId and shelfId above serve as target)
            toCabinetId: {
              type: "string",
              description: "Destination cabinet ID for move_item.",
            },
            toShelfId: {
              type: ["string", "null"],
              description: "Destination shelf ID for move_item, or null.",
            },
          },
          required: ["type", "locationId"],
        },
      },
    },
    required: ["summary", "actions"],
  },
};
