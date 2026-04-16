---
paths:
  - "prisma/**"
  - "src/lib/db/**/*.ts"
---

# Database & Prisma Conventions

## Schema Location

All models are defined in `prisma/schema.prisma`. Run `npm run db:generate` after schema changes to regenerate the Prisma client.

## Naming

- Models: PascalCase (`LocationMember`)
- Tables: snake_case via `@@map("location_members")`
- Columns: camelCase in Prisma, snake_case in DB via `@map("column_name")`
- Enums: PascalCase names, UPPER_SNAKE_CASE values

## Model Standards

Every entity model must have:
- `id` — UUID primary key with `@default(dbgenerated("gen_random_uuid()"))`
- `createdAt` / `updatedAt` — timestamps with `@default(now())` and `@updatedAt`
- `deletedAt` — nullable `DateTime?` for soft-delete (except Profile, which uses `status`)

## Soft-Delete Rules

- Never use `prisma.*.delete()` or `prisma.*.deleteMany()`
- Set `deletedAt: new Date()` instead
- Every `findFirst`, `findMany`, `count` must include `deletedAt: null` in the where clause
- Index `deletedAt` on all soft-deletable models: `@@index([deletedAt])`

## Relationships

- Always define foreign key fields explicitly (e.g., `locationId String @map("location_id") @db.Uuid`)
- Add `@@index` on foreign key columns
- Use `@relation(fields: [...], references: [...])` for all relations

## Prisma Client

- Use the singleton from `src/lib/db/prisma.ts` — never instantiate `PrismaClient` directly
- The singleton handles hot-reload protection in development

## Access Patterns

- Authorization always resolves through the ownership chain to `Location`
- Use helpers from `src/lib/db/access.ts` — they handle the join to `LocationMember`
- The `locationAccessFilter(userId)` function returns a reusable Prisma `where` fragment for owner-or-member checks

## Migrations

```bash
npm run db:migrate           # Create and apply migration
npm run db:push              # Push schema changes without migration file (dev only)
npm run db:studio            # Open Prisma Studio
```
