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
 */
export function buildSystemPrompt(inventory: FlatInventoryItem[]): string {
  const inventorySection =
    inventory.length === 0
      ? "The user's inventory is currently empty."
      : formatInventory(inventory);

  return `You are a smart home inventory assistant. You help users understand what they own and where to find it.

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

## User's Inventory
${inventorySection}`;
}

function formatInventory(items: FlatInventoryItem[]): string {
  const byLocation = new Map<string, FlatInventoryItem[]>();

  for (const item of items) {
    if (!byLocation.has(item.location)) byLocation.set(item.location, []);
    byLocation.get(item.location)!.push(item);
  }

  const lines: string[] = [];

  for (const [location, locationItems] of byLocation) {
    lines.push(`**${location}**`);
    for (const item of locationItems) {
      const shelf = item.shelf ? ` > ${item.shelf}` : "";
      const typeLabel = TYPE_LABELS[item.type] ?? item.type;
      const tags = item.tags.length > 0 ? ` [tags: ${item.tags.join(", ")}]` : "";
      const desc = item.description ? ` — "${item.description}"` : "";
      lines.push(
        `- ${item.name} (${typeLabel}, qty: ${item.quantity}) in ${item.cabinet}${shelf}${tags}${desc}`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}
