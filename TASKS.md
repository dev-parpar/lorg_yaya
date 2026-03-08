# TASKS.md — Home Inventory Management System
> Maintained by Bazooka (Orchestrator). All agents read this before starting any task.

---

## Project Overview
Full-stack home inventory management system built with Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, Prisma ORM, PostgreSQL, and Supabase Auth.

---

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js 14 App Router | Serverless API routes + SSR = cost-effective, scalable |
| Auth | Supabase Auth | Established, free tier, no custom auth |
| Database | PostgreSQL via Prisma | Battle-tested, free tier via Supabase/Neon |
| Search | PostgreSQL full-text search (tsvector) | Free, sufficient for this scale |
| UI | Tailwind CSS + shadcn/ui | Rapid, accessible, enterprise-grade |
| Validation | Zod | Type-safe, runtime-safe, integrates with Prisma |
| Testing | Vitest + React Testing Library | Fast, modern, co-located |

---

## Domain Model

```
User
 └── Location (Home / Office)
      └── Cabinet
           ├── Shelf (optional)
           │    └── Item
           └── Item (no shelf)
```

---

## Task Breakdown

### Phase 1 — Foundation ✅
- [x] Bootstrap Next.js 14 project
- [x] Configure Tailwind + shadcn/ui
- [x] Configure Prisma schema
- [x] Set up Supabase Auth
- [x] Create lib layer (db, auth, logger, errors, constants, validators)

### Phase 2 — API Layer ✅
- [x] GET /api/health
- [x] CRUD /api/locations
- [x] GET /api/locations/:id/cabinets
- [x] CRUD /api/cabinets
- [x] GET /api/cabinets/:id/shelves
- [x] GET /api/cabinets/:id/items
- [x] CRUD /api/shelves
- [x] GET /api/shelves/:id/items
- [x] CRUD /api/items
- [x] GET /api/search

### Phase 3 — UI Layer ✅
- [x] Auth pages (login / register)
- [x] Dashboard layout with nav
- [x] Locations list + CRUD pages
- [x] Cabinets list + CRUD pages
- [x] Shelves list + CRUD pages
- [x] Items list + CRUD pages
- [x] Search page with location breadcrumb

### Phase 4 — Quality ✅
- [x] Unit tests for all API route handlers
- [x] Unit tests for validators
- [x] Integration smoke tests for critical flows

---

## Handoff Log

### Task: Full Project Bootstrap
**Status**: Done
**What was built**: Complete Next.js 14 project with all layers — schema, API routes, UI pages, auth, search
**Files changed**: All files under `/src`, `prisma/`, `.env.example`, `package.json`
**Tests added**: Vitest unit tests for validators and API handlers
**Known limitations**: Auth middleware uses Supabase; requires NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY env vars
**Follow-up tasks needed**: Wire up production DB (Supabase/Neon), deploy to Vercel
