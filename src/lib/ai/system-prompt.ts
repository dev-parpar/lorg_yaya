export interface FlatInventoryItem {
  location: string;
  locationType: string;
  cabinet: string;
  shelf: string | null;
  name: string;
  type: string;
  quantity: number;
  description: string | null;
  tags: string[];
  /** IDs for AI action resolution — allows Claude to return precise entity references */
  itemId: string;
  locationId: string;
  cabinetId: string;
  shelfId: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  FOOD: "Food",
  GAME: "Game",
  SPORTS: "Sports",
  ELECTRONICS: "Electronics",
  UTENSILS: "Utensils",
  CUTLERY: "Cutlery",
  FIRST_AID: "First Aid",
  CLOTHES: "Clothes",
  ACCESSORIES: "Accessories",
  SHOES: "Shoes",
  OTHER: "Other",
};

/**
 * Builds the system prompt injected into every AI chat request.
 * The inventory is formatted as a structured listing so Claude can reason
 * over it directly without any additional tool calls or DB queries.
 *
 * @param inventory  The user's full flat inventory (with entity IDs)
 * @param activeLocationId  The location the user was viewing before opening the chat
 */
export function buildSystemPrompt(
  inventory: FlatInventoryItem[],
  activeLocationId?: string | null,
): string {
  const inventorySection =
    inventory.length === 0
      ? "The user's inventory is currently empty."
      : formatInventory(inventory);

  const activeLocationNote = activeLocationId
    ? `\nThe user is currently viewing location ID: ${activeLocationId}. When they mention adding items without specifying a location, assume they mean this location.`
    : "";

  return `You are a smart home inventory assistant called Lorgy. You help users understand what they own, where to find things, and you can make changes to their inventory when asked.

## Response Formatting Rules (MUST FOLLOW)
- When your answer involves specific inventory items, ALWAYS present them in a markdown table.
- Table columns: | Item | Type | Location | Qty |
- Fill "Location" as: Location Name > Cabinet Name > Shelf Name (omit shelf if not assigned).
- Lead with ONE short direct sentence (yes/no or a brief summary), then show the table.
- Never bury item details inside a paragraph — tables are mandatory for item lists.
- Keep all non-table prose to 1–2 sentences maximum.
- If no relevant items are found, say so in one sentence and suggest what the user might need.

## Reasoning Rules
- Use your world knowledge to interpret ambiguous or colloquial item names.
  Example: "Dewalt 5 inch Slammer" stored under a tools cabinet in a garage is almost certainly a hammer or mallet — say so with appropriate confidence.
- The item category (type) and storage location are strong contextual signals.
  Example: "Dewalt DCD777" in an Electronics or Tools category is a well-known cordless drill model.
- If you are uncertain about an interpretation, say "This might be a [X]" — never refuse to make a reasonable inference.
- When a user asks "can I do X", identify what items X typically requires, then check the inventory for each.

## Inventory Action Rules (manage_inventory tool)
- Use the manage_inventory tool ONLY when the user explicitly asks to add, remove, update, or move items.
- NEVER use the tool for read-only questions like "where are my scissors?" or "what do I have?"
- Always use entity IDs from the inventory listing below — NEVER fabricate IDs.
- For "add" actions, pick the most logical cabinet and shelf based on:
  1. What the user said (e.g., "add to the kitchen cabinet")
  2. The active location context (see below)
  3. Where similar items are already stored
- If the target cabinet or shelf is ambiguous (multiple matches), ask the user to clarify — do NOT guess.
- If the user asks to remove an item that doesn't exist in the inventory, tell them it wasn't found.
- For quantity updates, if the user says "add 3 more batteries", compute the new total (existing qty + 3).
- Infer itemType from world knowledge: hammer → OTHER, apples → FOOD, shoes → SHOES, etc.
- For new items with no obvious type, use OTHER.
- Tags and description are optional — only set them if the user mentions them.
${activeLocationNote}

## User's Inventory
${inventorySection}`;
}

function formatInventory(items: FlatInventoryItem[]): string {
  // Group by location, then by cabinet within each location
  const byLocation = new Map<string, { locationId: string; items: FlatInventoryItem[] }>();

  for (const item of items) {
    const key = item.locationId;
    if (!byLocation.has(key)) {
      byLocation.set(key, { locationId: item.locationId, items: [] });
    }
    byLocation.get(key)!.items.push(item);
  }

  const lines: string[] = [];

  for (const [, { locationId, items: locationItems }] of byLocation) {
    const locName = locationItems[0].location;
    lines.push(`**${locName}** [loc:${locationId}]`);

    // Group items by cabinet within this location
    const byCabinet = new Map<string, FlatInventoryItem[]>();
    for (const item of locationItems) {
      if (!byCabinet.has(item.cabinetId)) byCabinet.set(item.cabinetId, []);
      byCabinet.get(item.cabinetId)!.push(item);
    }

    for (const [cabinetId, cabinetItems] of byCabinet) {
      const cabName = cabinetItems[0].cabinet;
      lines.push(`  Cabinet: ${cabName} [cab:${cabinetId}]`);

      for (const item of cabinetItems) {
        const shelfPart = item.shelf
          ? ` > ${item.shelf} [shelf:${item.shelfId}]`
          : "";
        const typeLabel = TYPE_LABELS[item.type] ?? item.type;
        const tags = item.tags.length > 0 ? ` [tags: ${item.tags.join(", ")}]` : "";
        const desc = item.description ? ` — "${item.description}"` : "";
        lines.push(
          `    - [item:${item.itemId}] ${item.name} (${typeLabel}, qty: ${item.quantity})${shelfPart}${tags}${desc}`,
        );
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}
