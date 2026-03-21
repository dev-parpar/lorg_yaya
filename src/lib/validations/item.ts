import { z } from "zod";

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

export const createItemSchema = z.object({
  cabinetId: z.string().uuid("cabinetId must be a valid UUID"),
  shelfId: z.string().uuid("shelfId must be a valid UUID").optional(),
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(2000).optional(),
  quantity: z.number().int().min(1).default(1),
  tags: z.array(z.string().max(50)).max(20).default([]),
  itemType: z.enum(ITEM_TYPE_VALUES).default("OTHER"),
});

export const updateItemSchema = createItemSchema
  .omit({ cabinetId: true })
  .partial()
  .extend({ imagePath: z.string().nullable().optional() });

// Single item row inside a batch request — no cabinetId/shelfId (those live on the batch wrapper)
const batchItemRowSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  quantity: z.number().int().min(1).default(1),
  itemType: z.enum(ITEM_TYPE_VALUES).default("OTHER"),
});

export const createItemsBatchSchema = z.object({
  cabinetId: z.string().uuid("cabinetId must be a valid UUID"),
  shelfId: z.string().uuid("shelfId must be a valid UUID").optional(),
  items: z
    .array(batchItemRowSchema)
    .min(1, "At least one item is required")
    .max(50, "Cannot add more than 50 items at once"),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type CreateItemsBatchInput = z.infer<typeof createItemsBatchSchema>;
