import { describe, it, expect } from "vitest";
import { parsePagination } from "./pagination";

describe("parsePagination", () => {
  it("returns defaults when params are empty", () => {
    const result = parsePagination(new URLSearchParams());
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it("parses explicit page and pageSize", () => {
    const result = parsePagination(new URLSearchParams("page=3&pageSize=50"));
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(50);
  });

  it("throws when pageSize exceeds 100", () => {
    expect(() => parsePagination(new URLSearchParams("pageSize=999"))).toThrow();
  });

  it("floors page to 1 when given 0", () => {
    expect(() => parsePagination(new URLSearchParams("page=0"))).toThrow();
  });
});
