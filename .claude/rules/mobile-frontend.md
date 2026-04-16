---
paths:
  - "mobile/**/*.ts"
  - "mobile/**/*.tsx"
---

# Mobile Frontend Conventions

## Tech Stack

- React Native 0.83 + Expo 55 (managed workflow)
- Expo Router (file-based navigation)
- NativeWind 4 (Tailwind CSS for React Native)
- Zustand 5 (auth state only)
- TanStack React Query 5 (all server state)
- Supabase JS (auth, storage)

## Navigation Structure

```
app/
├── _layout.tsx              Root (fonts, auth listener, QueryClient)
├── (auth)/                  Unauthenticated stack
│   ├── login.tsx
│   ├── register.tsx
│   └── verify-email.tsx
└── (tabs)/                  4-tab layout
    ├── locations/            Stack: list → cabinets → items
    ├── search/
    ├── assistant.tsx
    └── profile/
```

- New screens go under the appropriate tab stack
- Use `[paramName]` for dynamic routes (e.g., `[locationId]/index.tsx`)
- Modals use `pageSheet` presentation — one modal per CRUD operation

## State Management

- **Zustand** (`lib/store/auth-store.ts`): Only for `session`, `user`, `isLoading`. Do not add server data here.
- **React Query**: All server data (locations, cabinets, items, profiles, invites, search). Use query keys like `["locations"]`, `["cabinets", locationId]`, `["items", cabinetId]`. Invalidate on mutations.
- **Local state**: Form fields, modal visibility, pagination/filtering — keep in the component.

## API Layer

- All API calls go through `lib/api/client.ts` — never call `fetch()` directly in screens
- API modules (`lib/api/locations.ts`, etc.) provide typed methods per entity
- The client auto-attaches the Supabase Bearer token and unwraps the `{ data }` envelope
- Add new API methods in the appropriate module, not inline in screens

## Screen Pattern

Screens follow this structure:

```typescript
export default function ScreenName() {
  // 1. Auth / route params
  // 2. React Query hooks (useQuery, useMutation)
  // 3. Local state (modals, forms)
  // 4. Handlers
  // 5. Loading/error states
  // 6. Main render with <Screen> wrapper
}
```

Always wrap screens in the `<Screen>` component from `components/ui/screen.tsx` — it provides the cork background, safe area handling, and optional scroll/keyboard-avoiding behavior.

## Components

- Reusable UI components live in `components/ui/`
- Always import design tokens from `lib/theme/tokens.ts` — never hardcode colors, fonts, or shadows
- Use `StyleSheet.create()` for styles, not inline style objects (performance)
- Use the existing component library: `Button`, `Card`, `Text`, `Input`, `Screen`, `PageHeader`, `EntityPhoto`, `EmptyState`, `ErrorView`

## Image Upload

Use the `useImageUpload` hook from `lib/hooks/useImageUpload.ts` for all photo operations. It handles:
- Platform-specific action sheet (iOS) / alert (Android)
- Camera/library permissions
- Compression (JPEG 80%, max 1200px)
- Supabase Storage upload
- Cache busting via timestamp path suffix

## Platform Differences

- iOS: Use `ActionSheetIOS` for action sheets
- Android: Fall back to `Alert.alert` with button options
- Always test both platforms when adding interactive elements

## Imports

- Use `@/` path alias (maps to mobile root)
- Import order: React/RN → Expo → third-party → `@/lib` → `@/components` → local
