# Lorg Yaya — Architecture

Lorg Yaya is a home inventory management application that lets users organize their belongings across locations, cabinets, and shelves. It uses a **local-first architecture** — all inventory data lives in an on-device SQLite database and syncs to the cloud via encrypted operation logs stored in Supabase Storage. It supports multi-user collaboration via location sharing, AI-powered item identification from photos, and a conversational assistant that understands the user's full inventory.

---

## High-Level Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                      Mobile App (Expo)                           │
│    React Native 0.83 · Expo 55 · Expo Router · NativeWind       │
│    Zustand (auth + local-db) · expo-sqlite (inventory data)     │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ SQLite       │  │ Sync Engine  │  │ React Query            │ │
│  │ (local-first │  │ (encrypted   │  │ (locations, profiles,  │ │
│  │  inventory)  │  │  op logs)    │  │  invites only)         │ │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬───────────┘ │
└─────────┼─────────────────┼────────────────────────┼────────────┘
          │                 │  Supabase Storage       │  HTTPS
          │                 │  (NDJSON blobs)         │  (Bearer)
          │                 ▼                         ▼
          │  ┌──────────────────────────────────────────────────┐
          │  │               Supabase                          │
          │  │  ┌───────────┐  ┌───────────┐  ┌─────────────┐ │
          │  │  │ Auth      │  │ Storage   │  │ PostgreSQL  │ │
          │  │  │ (sessions)│  │ (op logs, │  │ (locations, │ │
          │  │  │           │  │  photos)  │  │  profiles)  │ │
          │  │  └───────────┘  └───────────┘  └──────┬──────┘ │
          │  └───────────────────────────────────────┼────────┘
          │                                          │
          │         ┌────────────────────────────────┘
          │         ▼
          │  ┌─────────────────────────────────────────────────┐
          │  │               Backend API (Next.js 16)          │
          │  │   App Router · Prisma 7 · Zod · Vitest          │
          │  │                                                  │
          │  │  Locations/profiles/invites · AI chat + vision   │
          │  └─────────────────────────────────────────────────┘
          │
          ▼
    On-device only
    (reads & writes
     hit SQLite)
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Mobile app | React Native 0.83 + Expo 55 | Cross-platform iOS/Android |
| Navigation | Expo Router (file-based) | Tab + stack navigation |
| Mobile styling | NativeWind 4 (Tailwind for RN) | Utility-first styling |
| Local database | expo-sqlite | On-device inventory (cabinets, shelves, items) |
| Mobile state | Zustand 5 (auth + local-db versioning) | Auth state + SQLite reactivity |
| Server state | TanStack React Query 5 | Locations, profiles, invites only |
| Sync | Encrypted NDJSON op logs in Supabase Storage | Local-first sync across devices |
| Encryption | expo-crypto (AES-GCM) | Per-location key, end-to-end encrypted ops |
| Backend framework | Next.js 16 (App Router) | Serverless API routes |
| ORM | Prisma 7 with PostgreSQL adapter | Type-safe database access |
| Database | PostgreSQL (hosted on Supabase) | Locations, profiles, members, key shares |
| Authentication | Supabase Auth | Email/password, sessions |
| File storage | Supabase Storage | Photos + encrypted sync blobs |
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
│   │   └── api/                 # Next.js API routes
│   │       ├── account/         #   DELETE account
│   │       ├── ai/              #   POST chat, POST identify-items
│   │       ├── cabinets/        #   CRUD (legacy — mobile uses local SQLite)
│   │       ├── health/          #   GET health check
│   │       ├── inventory/       #   GET full flat inventory (legacy)
│   │       ├── invites/         #   GET pending, PATCH accept/decline
│   │       ├── items/           #   CRUD + batch create (legacy)
│   │       ├── locations/       #   CRUD + cabinets/invites/members
│   │       ├── profiles/        #   GET me, POST create, PATCH update
│   │       ├── search/          #   GET full-text search (legacy)
│   │       └── shelves/         #   CRUD + shelf items (legacy)
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
│   │       ├── _layout.tsx      # Tab bar config + useSyncManager()
│   │       ├── locations/       # Location list → cabinets → shelves/items
│   │       ├── search/          # Local SQLite full-text search
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
│   │   ├── api/                 # Typed API modules (server-managed entities)
│   │   │   ├── client.ts        #   Fetch wrapper with Bearer auth
│   │   │   ├── locations.ts     #   Locations (still server-managed)
│   │   │   ├── profiles.ts      #   Profiles (still server-managed)
│   │   │   ├── invites.ts       #   Invites (still server-managed)
│   │   │   ├── key-shares.ts    #   Encryption key exchange
│   │   │   └── sync.ts          #   Sync metadata helpers
│   │   ├── local-db/            # ── Local-first SQLite layer ──
│   │   │   ├── database.ts      #   expo-sqlite singleton + init
│   │   │   ├── schema.ts        #   CREATE TABLE statements + migrations
│   │   │   ├── types.ts         #   Op types, row types
│   │   │   ├── operations.ts    #   writeOp() — append op + materialize + bump version
│   │   │   ├── materializer.ts  #   Replay ops → latest state per entity
│   │   │   ├── queries/         #   Read queries per entity
│   │   │   │   ├── cabinets.ts
│   │   │   │   ├── shelves.ts
│   │   │   │   ├── items.ts
│   │   │   │   └── inventory.ts #   Flat inventory for AI context
│   │   │   └── index.ts         #   Re-exports
│   │   ├── sync/                # ── Sync engine ──
│   │   │   ├── sync-engine.ts   #   Per-location push/pull engine with timer
│   │   │   ├── sync-api.ts      #   Supabase Storage read/write for op blobs
│   │   │   ├── crypto.ts        #   AES-GCM encrypt/decrypt ops
│   │   │   ├── key-manager.ts   #   Per-location key generation + storage
│   │   │   ├── migration.ts     #   PostgreSQL → SQLite initial data pull
│   │   │   ├── compaction.ts    #   Op log compaction (merge old blobs)
│   │   │   ├── ndjson.ts        #   NDJSON serialization helpers
│   │   │   ├── device-id.ts     #   Stable device identifier
│   │   │   ├── app-state-listener.ts  # Foreground/background sync triggers
│   │   │   └── index.ts
│   │   ├── auth/
│   │   │   └── supabase.ts      # Supabase client (SecureStore adapter)
│   │   ├── hooks/
│   │   │   ├── useLocalCabinets.ts  # Reactive cabinet CRUD via SQLite
│   │   │   ├── useLocalShelves.ts   # Reactive shelf CRUD via SQLite
│   │   │   ├── useLocalItems.ts     # Reactive item CRUD via SQLite
│   │   │   ├── useLocalSearch.ts    # Full-text search against SQLite
│   │   │   ├── useLocalInventory.ts # Flat inventory for AI context
│   │   │   ├── useSyncManager.ts    # Lifecycle: init engines, wire push/pull
│   │   │   ├── useSyncStatus.ts     # Per-location pending/error indicators
│   │   │   ├── useAiChat.ts         # Streaming chat via XHR
│   │   │   ├── useImageUpload.ts    # Camera/library → compress → upload + signed URL
│   │   │   └── useItemIdentifier.ts # Vision API item detection
│   │   ├── store/
│   │   │   ├── auth-store.ts        # Zustand auth state
│   │   │   └── local-db-store.ts    # Zustand table version counters + schedulePush
│   │   └── theme/
│   │       └── tokens.ts        # Design tokens (colors, fonts, shadows)
│   └── types/                   # Domain + API TypeScript types
```

---

## Data Model

**PostgreSQL** (via Prisma) stores user accounts, profiles, locations, location members, invites, and encryption key shares. **SQLite** (on-device) stores inventory data — cabinets, shelves, and items — as materialized views of an operation log.

All PostgreSQL UUIDs are generated by `gen_random_uuid()`. All entities except Profile use soft-delete (`deletedAt` timestamp). The Profile model uses a status enum (`ACTIVE`/`DELETED`) for audit trails.

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

### Cabinets (legacy — mobile uses local SQLite)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/cabinets` | Yes | Create cabinet |
| `GET` | `/api/cabinets/[id]` | Yes | Get cabinet detail |
| `PATCH` | `/api/cabinets/[id]` | Yes | Update cabinet |
| `DELETE` | `/api/cabinets/[id]` | Yes | Soft-delete cabinet |

### Shelves (legacy — mobile uses local SQLite)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/shelves` | Yes | Create shelf |
| `GET` | `/api/shelves/[id]` | Yes | Get shelf detail |
| `PATCH` | `/api/shelves/[id]` | Yes | Update shelf |
| `DELETE` | `/api/shelves/[id]` | Yes | Soft-delete shelf |
| `GET` | `/api/shelves/[id]/items` | Yes | List items on shelf |

### Items (legacy — mobile uses local SQLite)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/items` | Yes | Create single item |
| `GET` | `/api/items/[id]` | Yes | Get item detail |
| `PATCH` | `/api/items/[id]` | Yes | Update item |
| `DELETE` | `/api/items/[id]` | Yes | Soft-delete item |
| `POST` | `/api/items/batch` | Yes | Batch create (up to 50 items) |

### Search & Inventory (legacy — mobile uses local SQLite)

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

1. Mobile app builds the full flat inventory from local SQLite via `useLocalInventory()`, enriched with location metadata from the server.
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

- **Zustand — auth** (`lib/store/auth-store.ts`): Minimal store holding `session`, `user`, and `isLoading`. Synced with Supabase's `onAuthStateChange` listener in the root layout.
- **Zustand — local-db** (`lib/store/local-db-store.ts`): Holds per-table version counters that increment on every write, driving reactive re-renders in `useLocal*` hooks. Also holds the `schedulePush` callback wired by `useSyncManager`.
- **TanStack React Query**: Used only for server-managed entities — locations, profiles, and invites. Not used for inventory data (cabinets, shelves, items), which is read directly from SQLite.
- **Local SQLite** (expo-sqlite): All inventory reads and writes go through SQLite. Screens use `useLocalCabinets`, `useLocalShelves`, `useLocalItems`, and `useLocalSearch` hooks that re-query when the relevant Zustand version counter bumps.
- **Local state**: Form fields, modal visibility, chat messages, and pagination/filtering are component-local.

### API Communication

The API client (`lib/api/client.ts`) wraps `fetch` with automatic Supabase Bearer token injection. It expects the backend's `{ data }` envelope and unwraps it, returning typed data directly. API modules (`lib/api/locations.ts`, `profiles.ts`, `invites.ts`) provide typed methods for server-managed entities. Inventory CRUD no longer goes through the API client — it writes directly to local SQLite.

### Key Hooks

| Hook | File | Purpose |
|---|---|---|
| `useLocalCabinets` | `lib/hooks/useLocalCabinets.ts` | Reactive cabinet list + CRUD via SQLite |
| `useLocalShelves` | `lib/hooks/useLocalShelves.ts` | Reactive shelf list + CRUD via SQLite |
| `useLocalItems` | `lib/hooks/useLocalItems.ts` | Reactive item list + CRUD/batch/move via SQLite |
| `useLocalSearch` | `lib/hooks/useLocalSearch.ts` | Full-text search across local SQLite items |
| `useLocalInventory` | `lib/hooks/useLocalInventory.ts` | Flat inventory for AI chat context |
| `useSyncManager` | `lib/hooks/useSyncManager.ts` | Init sync engines, wire push/pull lifecycle |
| `useSyncStatus` | `lib/hooks/useSyncStatus.ts` | Per-location pending count + error state |
| `useAiChat` | `lib/hooks/useAiChat.ts` | Streaming chat with XHR, manages message history |
| `useImageUpload` | `lib/hooks/useImageUpload.ts` | Camera/library → compress → upload + generate signed URL |
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

- **Inventory screens** (cabinets, shelves, items, search): Read from local SQLite — no network errors possible. Write failures surface via `Alert.alert`.
- **Server-managed screens** (locations, profiles, invites): The API client throws on non-2xx responses. React Query handles retries (1 retry). Screens display `ErrorView` components with retry buttons.
- **Sync errors**: Tracked per-location in `useSyncStatus`. Displayed as a colored dot on location cards (green = synced, amber = pending, red = error).

---

## Image Handling

All photos are stored in Supabase Storage, organized into buckets by entity type (avatars, locations, cabinets, shelves, items).

1. **Upload**: Mobile picks from camera/library → compresses via `expo-image-manipulator` → reads as `ArrayBuffer` via `expo-file-system` → uploads to Supabase Storage.
2. **URL generation**: For inventory entities (cabinets, shelves, items), the mobile app generates 10-year signed URLs client-side immediately after upload, passing both `imagePath` and `signedUrl` to the local write operation. For server-managed entities (locations, profiles), the backend generates signed URLs via `src/lib/storage/sign.ts`.
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

## Local-First Sync Architecture

Inventory data (cabinets, shelves, items) uses a local-first architecture. All reads and writes happen against an on-device SQLite database. Changes sync to the cloud via encrypted operation logs stored in Supabase Storage.

### Data Flow

```
User action
    │
    ▼
writeOp(op)                          ← Append op to local SQLite ops table
    │
    ├── Materialize latest state      ← Replay ops → update entity table
    ├── Bump Zustand version counter  ← Triggers UI re-render
    └── schedulePush(locationId)      ← Debounced (10s / 15s max)
         │
         ▼
    SyncEngine.push()
         │
         ├── Read un-pushed ops from SQLite
         ├── Encrypt with per-location AES-GCM key
         ├── Serialize as NDJSON
         └── Upload to Supabase Storage
              bucket: sync-logs/<locationId>/<seq>.ndjson.enc
```

### Operation Log

Every inventory mutation is recorded as an immutable operation:

| Field | Description |
|---|---|
| `id` | UUID, generated locally |
| `locationId` | Scopes the op to a location's sync channel |
| `entityType` | `cabinet`, `shelf`, or `item` |
| `entityId` | UUID of the target entity |
| `opType` | `CREATE`, `UPDATE`, or `DELETE` |
| `payload` | JSON diff (only changed fields for UPDATE) |
| `deviceId` | Originating device |
| `timestamp` | ISO 8601 |
| `seq` | Monotonic counter per device |

The materializer replays all ops for an entity in timestamp order to derive the current state. Deletes set `deletedAt` rather than removing the row.

### Sync Engine Lifecycle

1. **Init** (`useSyncManager`): Called from `(tabs)/_layout.tsx`. Waits for auth + locations.
2. **Migration**: On first run, pulls existing data from PostgreSQL and converts to local ops.
3. **Pull**: Downloads new op blobs from Supabase Storage, decrypts, and materializes.
4. **Background timer**: Pulls every 3 minutes.
5. **Push**: Debounced — 10 seconds after last write, max 15 seconds.
6. **App state**: Pull on foreground, push on background.

### Encryption

Each location has a unique AES-GCM encryption key generated client-side via `expo-crypto`.

- Keys are stored in `expo-secure-store` on-device.
- When a location is shared, the key is exchanged via `LocationKeyShare` records in PostgreSQL (encrypted with the recipient's public key).
- Op blobs are encrypted before upload and decrypted after download — the server never sees plaintext inventory data.

### Reactivity

Screens subscribe to SQLite data via `useLocal*` hooks. These hooks:

1. Run a SQL query against the materialized entity table.
2. Subscribe to the relevant Zustand version counter (e.g., `cabinets_v`).
3. Re-query whenever the counter bumps (which happens on every `writeOp`).

This gives instant UI updates without network round-trips.

---

## Key Design Decisions

- **Local-first for inventory**: Cabinets, shelves, and items live in on-device SQLite. This gives instant reads/writes, full offline support, and eliminates loading spinners for the core inventory experience. Sync happens asynchronously in the background.
- **Server-side for metadata**: Locations, profiles, invites, and members stay in PostgreSQL via the API. These are collaborative/administrative entities where consistency matters more than offline access.
- **Encrypted op logs**: Inventory operations are encrypted per-location with AES-GCM before syncing to Supabase Storage. The server never sees plaintext inventory data.
- **Soft-deletes everywhere**: All inventory entities use `deletedAt` timestamps rather than hard-deletes, preserving audit trails and enabling potential recovery.
- **Serverless-first**: Next.js API routes deploy as serverless functions. No persistent server process required.
- **Supabase for auth + storage**: Avoids building custom auth or file storage. Free tier keeps costs low. Storage also serves as the sync transport for encrypted op blobs.
- **AI context injection**: The full flat inventory is built from local SQLite and sent with each chat message rather than giving the AI database access. This keeps the AI stateless and the authorization boundary clean.
- **Signed URLs with long TTL**: 10-year signed URLs for photos avoid repeated signing overhead and work well with mobile disk caching. For inventory entities, URLs are generated client-side after upload.
- **Zustand for auth + reactivity**: Auth state and SQLite table version counters live in Zustand. Version counters drive reactive re-renders when local data changes. React Query is used only for server-managed entities.
- **Modal-per-operation pattern**: Each CRUD action opens a dedicated modal rather than navigating to a new screen, keeping navigation shallow and context preserved.
- **Legacy backend routes preserved**: Cabinet, shelf, item, search, and inventory CRUD routes still exist in the backend but are no longer used by the mobile app. They remain available for a potential future web client.
