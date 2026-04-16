# Lorg Yaya

Home inventory management app. Two parts: backend (Next.js API at root) and frontend (React Native/Expo in `mobile/`).

## Quick Reference

- Architecture details: @ARCHITECTURE.md
- Data model: @prisma/schema.prisma
- Design tokens: @mobile/lib/theme/tokens.ts

## Build & Run

### Backend

```bash
npm install                  # also runs prisma generate via postinstall
npm run dev                  # Next.js dev server (localhost:3000)
npm run build                # production build
npm run typecheck             # tsc --noEmit
npm run test                 # vitest run (all tests)
npm run test:watch           # vitest in watch mode
npm run db:migrate           # prisma migrate dev
npm run db:push              # prisma db push (no migration file)
npm run db:studio            # prisma studio (DB browser)
```

### Mobile

```bash
cd mobile
npm install
npm run start                # expo dev server
npm run ios                  # iOS simulator
npm run android              # Android emulator
npm run typecheck            # tsc --noEmit
```

## Project Structure

```
/                            Backend (Next.js 16 + Prisma 7)
├── src/app/api/             API routes (22 route files)
├── src/lib/                 Shared libs (auth, db, ai, validations, errors)
├── prisma/schema.prisma     Database schema
│
mobile/                      Frontend (React Native 0.83 + Expo 55)
├── app/                     Screens (Expo Router, file-based)
├── components/ui/           Reusable themed components
├── lib/                     API client, hooks, auth, store, theme
```

## Domain Model

```
User → Profile → Location (HOME|OFFICE) → Cabinet → Shelf → Item
                     └── LocationMember (collaboration)
```

## Git Workflow

- **Always create a new branch** before starting any feature or bug fix. Never work directly on `main`.
- Branch naming: `feature/<short-description>` for features, `fix/<short-description>` for bugs (e.g., `feature/item-tags`, `fix/invite-access-check`)
- Commit often with clear messages describing the "why"
- Keep branches focused — one feature or fix per branch

## Code Conventions

- **TypeScript everywhere** — strict mode, no `any`
- **Path alias** — `@/` maps to `./src/` (backend) and root (mobile)
- **Validation** — Zod schemas for all API inputs, co-located in `src/lib/validations/`
- **Errors** — use `AppError` hierarchy (`NotFoundError`, `ForbiddenError`, `UnauthorizedError`, `ValidationError`), never throw raw strings
- **Responses** — API routes return `{ data, meta? }` envelope on success, `{ error, details? }` on failure
- **Soft-deletes** — all inventory entities use `deletedAt` timestamp, always filter `deletedAt: null`
- **Auth** — every API route starts with `getAuthenticatedUserId()` check, then access control via `src/lib/db/access.ts`
- **Constants** — use `HTTP_STATUS` from `src/lib/constants.ts`, not magic numbers
- **Logging** — use `logger` from `src/lib/logger.ts`, not raw `console.log`
