import type Anthropic from "@anthropic-ai/sdk";

/**
 * Tool definition for Claude to execute inventory actions.
 * Claude invokes this tool when the user asks to add, remove, update,
 * or move items — never for read-only questions.
 */
export const inventoryTool: Anthropic.Tool = {
  name: "manage_inventory",
  description:
    "Execute inventory changes requested by the user. Use this tool ONLY when the user explicitly asks to add, remove, update, or move items, cabinets, or shelves. Do NOT use this tool for questions about inventory (e.g., 'where are my scissors?', 'what food do I have?').",
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
              enum: [
                "add_item", "update_item", "remove_item", "move_item",
                "add_cabinet", "update_cabinet", "remove_cabinet",
                "add_shelf", "update_shelf", "remove_shelf",
              ],
              description: "The type of inventory action.",
            },
            // Common fields
            locationId: {
              type: "string",
              description: "The location ID. Required for all actions.",
            },
            // Item-specific fields
            cabinetId: {
              type: "string",
              description: "Cabinet ID. Required for add_item, move_item, add_shelf, update_cabinet, remove_cabinet.",
            },
            shelfId: {
              type: ["string", "null"],
              description: "Shelf ID. Used by add_item, move_item, update_shelf, remove_shelf.",
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
            itemId: {
              type: "string",
              description: "The existing item's ID. Required for update_item, remove_item, move_item.",
            },
            changes: {
              type: "object",
              description: "Fields to update for update_item, update_cabinet, or update_shelf.",
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
            toCabinetId: {
              type: "string",
              description: "Destination cabinet ID for move_item.",
            },
            toShelfId: {
              type: ["string", "null"],
              description: "Destination shelf ID for move_item, or null.",
            },
            // Cabinet-specific fields
            cabinet: {
              type: "object",
              description: "Cabinet details for add_cabinet.",
              properties: {
                name: { type: "string" },
                description: { type: ["string", "null"] },
              },
              required: ["name"],
            },
            // Shelf-specific fields
            shelf: {
              type: "object",
              description: "Shelf details for add_shelf.",
              properties: {
                name: { type: "string" },
              },
              required: ["name"],
            },
          },
          required: ["type", "locationId"],
        },
      },
    },
    required: ["summary", "actions"],
  },
};
