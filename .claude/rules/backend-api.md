---
paths:
  - "src/app/api/**/*.ts"
  - "src/lib/**/*.ts"
---

# Backend API Conventions

## Route Structure

Every API route handler follows this pattern:

```typescript
export async function METHOD(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    // Parse & validate input (Zod)
    // Check authorization (access.ts helpers)
    // Business logic (Prisma)
    // Return response

    return NextResponse.json({ data }, { status: HTTP_STATUS.CREATED });
  } catch (error) {
    return handleRouteError(error, "METHOD /api/resource");
  }
}
```

- Always wrap in try/catch with `handleRouteError(error, "METHOD /api/path")`
- Always check auth first with `getAuthenticatedUserId()`
- Validate input with Zod schemas from `src/lib/validations/`
- Check access via helpers in `src/lib/db/access.ts` — never query locations/cabinets/shelves/items without verifying the user has access
- Use `HTTP_STATUS` constants, not magic numbers (200, 201, 404, etc.)
- Return `{ data }` for single resources, `{ data, meta: { total, page, pageSize } }` for lists

## Authorization Chain

Access is always checked through the ownership chain back to Location:

```
Item → Cabinet → Location → userId or LocationMember(ACCEPTED)
Shelf → Cabinet → Location → userId or LocationMember(ACCEPTED)
Cabinet → Location → userId or LocationMember(ACCEPTED)
```

Use the appropriate helper from `src/lib/db/access.ts`:
- `getAccessibleLocation(id, userId)` — returns location with role
- `getAccessibleCabinet/Shelf/Item(id, userId)` — follows chain
- `assertLocationOwner(id, userId)` — owner-only operations (delete, manage members)
- `assertLocationAccess(locationId, userId)` / `assertCabinetAccess(cabinetId, userId)` — fast checks for POST routes

## Validation Schemas

- Define in `src/lib/validations/<entity>.ts`
- Export both the schema and inferred type: `export type CreateItemInput = z.infer<typeof createItemSchema>`
- Use `.partial()` for update schemas, extending with optional `imagePath`
- Always validate UUIDs: `z.string().uuid("field must be a valid UUID")`

## Error Handling

Use the `AppError` hierarchy from `src/lib/errors.ts`:
- `NotFoundError("Resource")` — 404
- `UnauthorizedError()` — 401
- `ForbiddenError()` — 403
- `ValidationError(details)` — 422

Never throw raw `Error` for expected failures. Use `logger.error()` for unexpected errors.

## Soft-Deletes

All queries must filter `deletedAt: null` to exclude soft-deleted records. When deleting, set `deletedAt: new Date()` — never use `prisma.*.delete()`.

## Pagination

Use `parsePagination(request.nextUrl.searchParams)` from `src/lib/validations/pagination.ts`. Defaults: page 1, pageSize 20, max 100. Always return `meta: { total, page, pageSize }`.

## Image Handling

When an entity has a photo:
- Store `imagePath` (Supabase Storage path) and `signedImageUrl` (10-year signed URL)
- Generate signed URL server-side via `src/lib/storage/sign.ts`
- Delete old storage file when replacing or removing photos
