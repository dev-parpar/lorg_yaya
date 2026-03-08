import { describe, it, expect } from "vitest";
import { createLocationSchema, updateLocationSchema } from "./location";

describe("createLocationSchema", () => {
  it("accepts valid HOME location", () => {
    const result = createLocationSchema.safeParse({
      name: "My House",
      type: "HOME",
      address: "123 Main St",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid OFFICE location without address", () => {
    const result = createLocationSchema.safeParse({
      name: "Downtown Office",
      type: "OFFICE",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createLocationSchema.safeParse({ name: "", type: "HOME" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = createLocationSchema.safeParse({ name: "Place", type: "WAREHOUSE" });
    expect(result.success).toBe(false);
  });
});

describe("updateLocationSchema", () => {
  it("accepts partial updates", () => {
    const result = updateLocationSchema.safeParse({ name: "New Name" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (no-op update)", () => {
    const result = updateLocationSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
