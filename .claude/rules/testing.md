---
paths:
  - "src/**/*.test.ts"
  - "src/test/**"
---

# Testing Conventions

## Framework

- Vitest with jsdom environment
- React Testing Library for component tests
- Config: `vitest.config.ts` (alias `@` → `./src`, setup file `./src/test/setup.ts`)

## Commands

```bash
npm run test                 # vitest run (single pass, CI)
npm run test:watch           # vitest (watch mode, development)
```

## Test Placement

Tests are **co-located** with their source files:
```
src/lib/validations/item.ts
src/lib/validations/item.test.ts
```

## Test Style

```typescript
import { describe, it, expect } from "vitest";

describe("schemaOrFunction", () => {
  it("describes the expected behavior", () => {
    const result = schema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects invalid input with reason", () => {
    const result = schema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });
});
```

- Use `describe` blocks grouped by schema or function name
- Test names should read as "it [does expected thing]" or "it [rejects bad thing]"
- For Zod schemas, use `.safeParse()` and check `result.success` — not `.parse()` with try/catch
- Test both valid (happy path) and invalid (edge cases, boundary values) inputs

## What to Test

- **Validation schemas**: Valid minimal input, fully populated input, each rejection case (bad UUIDs, out-of-range values, missing required fields)
- **Utility functions**: Pure logic, edge cases
- **Do not mock** Prisma or Supabase in unit tests — those are integration concerns

## Test Quality

- Tests must be deterministic and fast (<100ms each)
- No network calls, no database access in unit tests
- Use static UUIDs for test data: `"550e8400-e29b-41d4-a716-446655440000"`
