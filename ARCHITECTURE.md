# Lorg Yaya — Architecture

Lorg Yaya is a home inventory management application that lets users organize their belongings across locations, cabinets, and shelves. It supports real-time collaboration via location sharing, AI-powered item identification from photos, and a conversational assistant that understands the user's full inventory.

---

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobile App (Expo)                       │
│   React Native 0.83 · Expo 55 · Expo Router · NativeWind   │
│   Zustand (auth) · TanStack React Query (server state)     │
└──────────────────────────┬──────────────────────────────────┘
                           │  HTTPS (Bearer token)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend API (Next.js 16)                   │
│      App Router · Prisma 7 · Zod validation · Vitest       │
│                                                             │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │ API      │  │ Auth         │  │ AI                    │ │
│  │ Routes   │  │ (Supabase)   │  │ (Anthropic Claude)    │ │
│  └────┬─────┘  └──────┬───────┘  └───────────┬───────────┘ │
│       │               │                      │              │
│       ▼               ▼                      ▼              │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │ Prisma   │  │ Supabase     │  │ Anthropic API         │ │
│  │ ORM      │  │ Auth + Store │  │ (Chat + Vision)       │ │
│  └────┬─────┘  └──────────────┘  └───────────────────────┘ │
└───────┼─────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────┐
│  PostgreSQL  │
│  (Supabase)  │
└──────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Mobile app | React Native 0.83 + Expo 55 | Cross-platform iOS/Android |
| Navigation | Expo Router (file-based) | Tab + stack navigation |
| Mobile styling | NativeWind 4 (Tailwind for RN) | Utility-first styling |
| Mobile state | Zustand 5 + TanStack React Query 5 | Auth state + server cache |
| Backend framework | Next.js 16 (App Router) | Serverless API routes |
| ORM | Prisma 7 with PostgreSQL adapter | Type-safe database access |
| Database | PostgreSQL (hosted on Supabase) | Primary data store |
| Authentication | Supabase Auth | Email/password, sessions |
| File storage | Supabase Storage | Photos (avatars, inventory) |
| AI | Anthropic Claude 3.5 | Chat assistant + vision |
| Validation | Zod | Runtime schema validation |
| Testing | Vitest + Testing Library | Unit and integration tests |

---

## Repository Structure

```
lorg_yaya/
├── prisma/
│   └── schema.prisma            # Database schema (all models, enums, relations)
├── src/                         # ── Backend ──
│   ├── app/
│   │   └── api/                 # Next.js API routes (22 route files)
│   │       ├── account/         #   DELETE account
│   │       ├── ai/              #   POST chat, POST identify-items
│   │       ├── cabinets/        #   CRUD + nested shelves/items
│   │       ├── health/          #   GET health check
│   │       ├── inventory/       #   GET full flat inventory
│   │       ├── invites/         #   GET pending, PATCH accept/decline
│   │       ├── items/           #   CRUD + batch create
│   │       ├── locations/       #   CRUD + cabinets/invites/members
│   │       ├── profiles/        #   GET me, POST create, PATCH update
│   │       ├── search/          #   GET full-text search
│   │       └── shelves/         #   CRUD + shelf items
│   ├── lib/
│   │   ├── ai/                  # AI config, system prompt builder
│   │   ├── auth/                # Supabase server client, admin client
│   │   ├── db/                  # Prisma singleton, access control helpers
│   │   ├── storage/             # Signed URL generation
│   │   ├── validations/         # Zod schemas (with co-located tests)
│   │   ├── constants.ts         # HTTP statuses, pagination defaults
│   │   ├── errors.ts            # AppError hierarchy + route error handler
│   │   ├── logger.ts            # Structured logging
│   │   └── utils.ts             # General utilities
│   └── types/                   # Shared TypeScript types
│
├── mobile/                      # ── Frontend ──
│   ├── app/
│   │   ├── _layout.tsx          # Root layout (fonts, auth listener, QueryClient)
│   │   ├── index.tsx            # Entry redirect
│   │   ├── (auth)/              # Auth screens
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   └── verify-email.tsx
│   │   └── (tabs)/              # Main app (4 tabs)
│   │       ├── _layout.tsx      # Tab bar config
│   │       ├── locations/       # Location list → cabinets → shelves/items
│   │       ├── search/          # Full-text item search
│   │       ├── assistant.tsx    # AI chat ("Lorgy")
│   │       └── profile/         # User profile + account
│   ├── components/
│   │   └── ui/                  # Reusable themed components
│   │       ├── backgrounds/     #   CorkBackground, WoodStrip
│   │       ├── button.tsx       #   Primary/outline/destructive/ghost
│   │       ├── card.tsx         #   Cream note card with pushpin
│   │       ├── screen.tsx       #   Screen wrapper (cork bg, safe area)
│   │       ├── page-header.tsx  #   Masking tape header
│   │       ├── input.tsx        #   Themed text input
│   │       ├── text.tsx         #   Typography variants (h1-h3, body)
│   │       ├── entity-photo.tsx #   Photo display with upload
│   │       ├── bulk-item-modal.tsx
│   │       ├── item-review-modal.tsx
│   │       └── ...
│   ├── lib/
│   │   ├── api/                 # Typed API modules per entity
│   │   │   ├── client.ts        #   Fetch wrapper with Bearer auth
│   │   │   ├── locations.ts
│   │   │   ├── cabinets.ts
│   │   │   ├── items.ts
│   │   │   ├── profiles.ts
│   │   │   ├── invites.ts
│   │   │   └── inventory.ts
│   │   ├── auth/
│   │   │   └── supabase.ts      # Supabase client (SecureStore adapter)
│   │   ├── hooks/
│   │   │   ├── useAiChat.ts     # Streaming chat via XHR
│   │   │   ├── useImageUpload.ts# Camera/library → compress → upload
│   │   │   └── useItemIdentifier.ts # Vision API item detection
│   │   ├── store/
│   │   │   └── auth-store.ts    # Zustand auth state
│   │   └── theme/
│   │       └── tokens.ts        # Design tokens (colors, fonts, shadows)
│   └── types/                   # Domain + API TypeScript types
```

---

## Data Model

All UUIDs are generated by PostgreSQL (`gen_random_uuid()`). All entities except Profile use soft-delete (`deletedAt` timestamp). The Profile model uses a status enum (`ACTIVE`/`DELETED`) for audit trails.

```
User (Supabase auth.users)
  │
  └── Profile  (1:1, username, avatar, status)
       │
       └── Location  (1:many, HOME or OFFICE)
            │
            ├── LocationMember  (1:many, collaboration join table)
            │
            └── Cabinet  (1:many, name, description, photo)
                 │
                 ├── Shelf  (1:many, optional subdivision, ordered by position)
                 │    └── Item
                 │
                 └── Item  (directly in cabinet, no shelf)
```

### Enums

| Enum | Values |
|---|---|
| `ProfileStatus` | `ACTIVE`, `DELETED` |
| `LocationType` | `HOME`, `OFFICE` |
| `ItemType` | `FOOD`, `GAME`, `SPORTS`, `ELECTRONICS`, `UTENSILS`, `CUTLERY`, `FIRST_AID`, `CLOTHES`, `ACCESSORIES`, `SHOES`, `OTHER` |
| `MemberRole` | `EDITOR` (VIEWER planned) |
| `InviteStatus` | `PENDING`, `ACCEPTED`, `DECLINED`, `REVOKED` |

### Item Model Details

Items belong to a Cabinet (required) and optionally to a Shelf within that cabinet. They carry a `searchVector` (`tsvector`) column maintained by a database trigger for PostgreSQL full-text search across name, description, and tags.

---

## Authentication

Authentication is handled by Supabase Auth with email/password. The backend supports two strategies, resolved in `src/lib/auth/supabase-server.ts`:

1. **Bearer token** (mobile app) — `Authorization: Bearer <token>` header. The token is validated against Supabase.
2. **Cookie session** (web) — Managed via `@supabase/ssr` with Next.js `cookies()`.

After authentication, a **profile guard** checks that the user's Profile status is `ACTIVE`. Deleted profiles are rejected even if a valid token exists.

### Mobile Session Persistence

The mobile app stores the Supabase session in `expo-secure-store` (encrypted on-device). Token refresh is automatic. The root layout listens to `onAuthStateChange` to route between auth and main screens.

---

## Authorization

Access control follows the ownership chain. A user can access a resource if they own the parent Location or are an `ACCEPTED` member of it.

```
Location.userId === currentUser       → owner (full access)
LocationMember(userId, ACCEPTED)      → editor (CRUD on contents)

Cabinet  → authorized via Cabinet.location
Shelf    → authorized via Shelf.cabinet.location
Item     → authorized via Item.cabinet.location
```

Owner-only operations: delete location, manage members/invites.

All access checks are centralized in `src/lib/db/access.ts`, which provides:
- `getAccessibleLocation()` — returns location if user is owner or accepted member
- `assertLocationOwner()` — owner-only gate
- `getAccessibleCabinet/Shelf/Item()` — follows the ownership chain
- `assertLocationAccess()` / `assertCabinetAccess()` — fast existence checks for POST routes

---

## API Routes

All routes are under `src/app/api/`. Responses use a `{ data, meta? }` envelope. Errors use `{ error, details? }`.

### Profiles & Account

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/profiles/me` | Yes | Current user's profile |
| `POST` | `/api/profiles` | Yes | Create profile (idempotent) |
| `PATCH` | `/api/profiles` | Yes | Update username or avatar |
| `GET` | `/api/profiles/check-username` | No | Username availability check |
| `DELETE` | `/api/account` | Yes | Hard-delete auth user, mark profile DELETED |

### Locations

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/locations` | Yes | List owned + shared locations (paginated) |
| `POST` | `/api/locations` | Yes | Create location |
| `GET` | `/api/locations/[id]` | Yes | Get location detail |
| `PATCH` | `/api/locations/[id]` | Yes | Update location |
| `DELETE` | `/api/locations/[id]` | Yes | Soft-delete (owner only) |
| `GET` | `/api/locations/[id]/cabinets` | Yes | List cabinets in location |
| `POST` | `/api/locations/[id]/invites` | Yes | Invite user by username (owner only) |
| `GET` | `/api/locations/[id]/members` | Yes | List members with statuses |

### Invites

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/invites` | Yes | User's pending invites |
| `PATCH` | `/api/invites/[id]` | Yes | Accept or decline invite |

### Cabinets

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/cabinets` | Yes | Create cabinet |
| `GET` | `/api/cabinets/[id]` | Yes | Get cabinet detail |
| `PATCH` | `/api/cabinets/[id]` | Yes | Update cabinet |
| `DELETE` | `/api/cabinets/[id]` | Yes | Soft-delete cabinet |

### Shelves

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/shelves` | Yes | Create shelf |
| `GET` | `/api/shelves/[id]` | Yes | Get shelf detail |
| `PATCH` | `/api/shelves/[id]` | Yes | Update shelf |
| `DELETE` | `/api/shelves/[id]` | Yes | Soft-delete shelf |
| `GET` | `/api/shelves/[id]/items` | Yes | List items on shelf |

### Items

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/items` | Yes | Create single item |
| `GET` | `/api/items/[id]` | Yes | Get item detail |
| `PATCH` | `/api/items/[id]` | Yes | Update item |
| `DELETE` | `/api/items/[id]` | Yes | Soft-delete item |
| `POST` | `/api/items/batch` | Yes | Batch create (up to 50 items) |

### Search & Inventory

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/search?q=...` | Yes | Full-text search across items, scoped to user's locations |
| `GET` | `/api/inventory/full` | Yes | Flat list of all items (used for AI context) |

### AI

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/ai/chat` | Yes | Streaming chat with inventory context |
| `POST` | `/api/ai/identify-items` | Yes | Photo → detected items with duplicate detection |

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | Database connectivity + version |

---

## AI Integration

AI features are powered by Anthropic Claude, configured via environment variables in `src/lib/ai/config.ts`. No code changes are needed to swap models.

| Variable | Default | Purpose |
|---|---|---|
| `AI_PROVIDER` | `anthropic` | Provider selection |
| `AI_MODEL` | `claude-3-5-sonnet-20241022` | Chat model |
| `AI_VISION_MODEL` | `claude-3-5-haiku-20241022` | Vision/identification model |
| `AI_MAX_TOKENS` | `1024` | Max response tokens |

### Chat Assistant ("Lorgy")

1. Mobile app fetches the user's full flat inventory via `GET /api/inventory/full` (cached for 5 minutes).
2. On each message, the app sends `{ message, inventory, history }` to `POST /api/ai/chat`.
3. The backend builds a system prompt (`src/lib/ai/system-prompt.ts`) that formats the inventory by location > cabinet > shelf, with instructions to use markdown tables for item lists.
4. The response streams token-by-token via a `ReadableStream`.
5. The mobile app reads the stream via `XMLHttpRequest.onprogress` for live character-by-character rendering with markdown support.

### Vision Item Identification

1. User takes a photo (camera or library). The image is compressed to max 1024px, JPEG 65%.
2. The base64 image is sent to `POST /api/ai/identify-items` along with the cabinet ID.
3. **Vision pass**: Claude analyzes the image and returns a JSON array of detected items (name, type, quantity, confidence).
4. **Dedup pass**: If the cabinet already has items, Claude compares detections against existing items for fuzzy name matching.
5. The response includes `isDuplicate`, `existingItemId`, and `existingQty` flags for each detection.
6. The mobile app shows an `ItemReviewModal` where the user can edit detections, accept/reject duplicates, and batch-save.

---

## Mobile App Architecture

### Navigation Structure

```
_layout.tsx                    Root (font loading, auth listener, QueryClient)
├── (auth)/                    Unauthenticated stack
│   ├── login.tsx
│   ├── register.tsx
│   └── verify-email.tsx
└── (tabs)/                    Authenticated tab navigator (4 tabs)
    ├── locations/             Stack: list → cabinets → shelves/items
    │   ├── index.tsx          Location list with create/edit/delete
    │   ├── invites.tsx        Pending invite cards (accept/decline)
    │   └── [locationId]/
    │       ├── index.tsx      Cabinet list with create/edit/delete
    │       ├── members.tsx    Member management + invite by username
    │       └── [cabinetId]/
    │           └── index.tsx  Shelves + items (most complex screen)
    ├── search/
    │   └── index.tsx          Full-text item search with breadcrumbs
    ├── assistant.tsx          Streaming AI chat
    └── profile/
        └── index.tsx          Avatar, username, account, sign out
```

### State Management

- **Zustand** (`lib/store/auth-store.ts`): Minimal store holding `session`, `user`, and `isLoading`. Synced with Supabase's `onAuthStateChange` listener in the root layout.
- **TanStack React Query**: All server data (locations, cabinets, items, profiles, invites, search results) is managed through React Query with query key-based caching and mutation-driven invalidation. Stale time is 1 minute, single retry on failure.
- **Local state**: Form fields, modal visibility, chat messages, and pagination/filtering are component-local.

### API Communication

The API client (`lib/api/client.ts`) wraps `fetch` with automatic Supabase Bearer token injection. It expects the backend's `{ data }` envelope and unwraps it, returning typed data directly. Per-entity API modules (`lib/api/locations.ts`, etc.) provide typed methods that map to backend routes.

### Key Hooks

| Hook | File | Purpose |
|---|---|---|
| `useAiChat` | `lib/hooks/useAiChat.ts` | Streaming chat with XHR, manages message history |
| `useImageUpload` | `lib/hooks/useImageUpload.ts` | Camera/library picker → compress → Supabase upload |
| `useItemIdentifier` | `lib/hooks/useItemIdentifier.ts` | Photo → vision API → detected items |

---

## Design System

The app uses a **skeuomorphic cork board** metaphor. All design tokens live in `mobile/lib/theme/tokens.ts`.

### Visual Language

| Element | Treatment |
|---|---|
| Background | Cork texture (SVG-generated, no raster images) |
| Cards | Cream paper (`#FFFDE7`) with red pushpin dot, dark bottom border for depth |
| Buttons | Gradient fills with physical depth (primary=red, outline=cream, destructive=dark red) |
| Inputs | Cream field with warm shadow |
| Tab bar | Dark walnut wood strip (`#1A0E06`) with brass (`#D4A853`) active indicator |
| Headers | Masking tape effect |

### Typography

- **Headings** (h1/h2/h3): Special Elite (typewriter font)
- **Body/caption**: System font (SF Pro on iOS, Roboto on Android)

### Color Palette

| Token | Hex | Usage |
|---|---|---|
| `cork` | `#8B6D47` | Screen backgrounds |
| `card` | `#FFFDE7` | Note card surfaces |
| `foreground` | `#2C1810` | Primary text (ink) |
| `primary` | `#B91C1C` | Buttons, pushpins, accents |
| `muted` | `#C8A77D` | Borders, secondary surfaces |
| `tabWood` | `#1A0E06` | Tab bar background |
| `tabBrass` | `#D4A853` | Active tab indicator |

---

## Error Handling

### Backend

Error classes in `src/lib/errors.ts` form a hierarchy:

```
AppError (base, includes statusCode)
├── NotFoundError    (404)
├── UnauthorizedError (401)
├── ForbiddenError   (403)
└── ValidationError  (422, includes Zod field errors)
```

The `handleRouteError()` function is used in every API route's catch block:
- `ZodError` → 422 with flattened field messages
- `AppError` → returns the user-facing message and status
- Unknown errors → logged verbosely, returns generic 500

### Mobile

The API client throws on non-2xx responses with the server's error message. React Query handles retries (1 retry). Screens display `ErrorView` components with retry buttons on query failures.

---

## Image Handling

All photos are stored in Supabase Storage, organized into buckets by entity type (avatars, locations, cabinets, shelves, items).

1. **Upload**: Mobile picks from camera/library → compresses via `expo-image-manipulator` → reads as `ArrayBuffer` via `expo-file-system` → uploads to Supabase Storage.
2. **URL generation**: The backend generates signed URLs with a 10-year TTL (via `src/lib/storage/sign.ts`) and stores both `imagePath` and `signedImageUrl` on the entity.
3. **Display**: The mobile app uses `expo-image` with disk caching, leveraging the stable signed URLs.
4. **Cleanup**: Images are deleted from storage when the parent entity is deleted or the photo is removed.

---

## Collaboration Model

Locations support multi-user access through an invite system:

1. **Owner** invites another user by username (`POST /api/locations/[id]/invites`).
2. A `LocationMember` record is created with status `PENDING`.
3. The invitee sees pending invites via a notification bell (polled every 60s) and can accept or decline.
4. On `ACCEPTED`, the member gets `EDITOR` access to the location and everything inside it.
5. The owner can revoke access at any time (sets status to `REVOKED`).

Permissions:
- **Owner**: Full CRUD on location + contents, manage members, delete location.
- **Editor**: CRUD on cabinets, shelves, and items within the shared location.

---

## Environment Variables

### Backend (`/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Admin key for user deletion |
| `NODE_ENV` | No | `development` or `production` |
| `AI_PROVIDER` | No | `anthropic` (default) or `openai` |
| `AI_MODEL` | No | Chat model ID |
| `AI_VISION_MODEL` | No | Vision model ID |
| `AI_MAX_TOKENS` | No | Max response tokens (default 1024) |
| `ANTHROPIC_API_KEY` | Yes* | Required if using Anthropic |

### Mobile (`/mobile/.env`)

| Variable | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `EXPO_PUBLIC_API_URL` | Yes | Backend API base URL |

---

## Development

### Backend

```bash
npm install          # Install dependencies (runs prisma generate via postinstall)
npm run dev          # Start Next.js dev server
npm run db:migrate   # Run Prisma migrations
npm run db:studio    # Open Prisma Studio (DB browser)
npm run test         # Run Vitest tests
npm run typecheck    # TypeScript type checking
```

### Mobile

```bash
cd mobile
npm install
npm run start        # Start Expo dev server
npm run ios          # Start on iOS simulator
npm run android      # Start on Android emulator
```

---

## Key Design Decisions

- **Soft-deletes everywhere**: All inventory entities use `deletedAt` timestamps rather than hard-deletes, preserving audit trails and enabling potential recovery.
- **Serverless-first**: Next.js API routes deploy as serverless functions. No persistent server process required.
- **Supabase for auth + storage**: Avoids building custom auth or file storage. Free tier keeps costs low.
- **AI context injection**: The full flat inventory is sent with each chat message rather than giving the AI database access. This keeps the AI stateless and the authorization boundary clean.
- **Signed URLs with long TTL**: 10-year signed URLs for photos avoid repeated signing overhead and work well with mobile disk caching.
- **Zustand only for auth**: Global state is minimized. All server data flows through React Query, which handles caching, background refetching, and cache invalidation.
- **Modal-per-operation pattern**: Each CRUD action opens a dedicated modal rather than navigating to a new screen, keeping navigation shallow and context preserved.
