import { describe, it, expect } from "vitest";
import { createItemSchema, updateItemSchema } from "./item";

describe("createItemSchema", () => {
  it("accepts a minimal valid item", () => {
    const result = createItemSchema.safeParse({
      cabinetId: "550e8400-e29b-41d4-a716-446655440000",
      name: "Cordless Drill",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe(1);
      expect(result.data.tags).toEqual([]);
    }
  });

  it("accepts a fully populated item", () => {
    const result = createItemSchema.safeParse({
      cabinetId: "550e8400-e29b-41d4-a716-446655440000",
      shelfId: "550e8400-e29b-41d4-a716-446655440001",
      name: "Winter Jacket",
      description: "Navy blue, size L",
      quantity: 2,
      tags: ["clothing", "winter"],
      imageUrl: "https://example.com/jacket.jpg",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid UUID for cabinetId", () => {
    const result = createItemSchema.safeParse({
      cabinetId: "not-a-uuid",
      name: "Item",
    });
    expect(result.success).toBe(false);
  });

  it("rejects quantity less than 1", () => {
    const result = createItemSchema.safeParse({
      cabinetId: "550e8400-e29b-41d4-a716-446655440000",
      name: "Item",
      quantity: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid imageUrl", () => {
    const result = createItemSchema.safeParse({
      cabinetId: "550e8400-e29b-41d4-a716-446655440000",
      name: "Item",
      imageUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 20 tags", () => {
    const result = createItemSchema.safeParse({
      cabinetId: "550e8400-e29b-41d4-a716-446655440000",
      name: "Item",
      tags: Array.from({ length: 21 }, (_, i) => `tag${i}`),
    });
    expect(result.success).toBe(false);
  });
});

describe("updateItemSchema", () => {
  it("accepts partial update with only name", () => {
    const result = updateItemSchema.safeParse({ name: "Updated Name" });
    expect(result.success).toBe(true);
  });

  it("accepts moving item to a shelf", () => {
    const result = updateItemSchema.safeParse({
      shelfId: "550e8400-e29b-41d4-a716-446655440001",
    });
    expect(result.success).toBe(true);
  });
});
