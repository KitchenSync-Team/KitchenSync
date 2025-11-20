# KitchenSync

KitchenSync helps households and shared kitchens stay on top of pantry inventory, expirations, receipts, and user preferences. Authenticated users land inside a protected workspace anchored by the sidebar shell; unauthenticated visitors stay on the marketing landing page.

## Highlights

 - **Supabase-first auth & data** – Edge middleware plus `lib/domain/kitchen.ts` keep every protected route in sync with Supabase sessions and row-level security.
 - **Onboarding guardrails** – New members confirm profile details, dietary styles, allergens, communication prefs, and storage locations before reaching the dashboard.
 - **User & Preferences hub** – The `/protected/profile` route lets users update identity, communication, dietary/cuisine settings, measurement units, and avatars (cropped + uploaded to S3/Supabase Storage).
 - **Composable UI** – shadcn/ui primitives live under `components/ui`, while feature bundles (`components/profile`, `components/onboarding`, etc.) own their specific UX.

## Recipes experience

- `/protected/recipes` uses a two-column layout: filters on the left; search bar + “Search” and “I’m feeling hungry” on top of results.
- Filters: diet, allergens, cuisine likes/dislikes, pantry toggle, ready-in minutes, sort. “Reset to profile” restores saved prefs, “Clear filters” empties them, and “Skip my profile” ignores saved prefs.
- “Search” posts to `/api/recipes/search`. “I’m feeling hungry” hits `/api/recipes/random` (12 recipes; respects filters and falls back to unfiltered if empty).
- Results use `components/recipes/recipe-card` with Details and “Open recipe” (sourceUrl) actions; the details dialog shows ingredients used/missing and tags.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Server Components, Turbopack dev server)
- **Styling**: Tailwind CSS + shadcn/ui wrappers
- **Data/Auth**: Supabase (Auth, Postgres, Storage)
- **Storage**: Supabase S3-compatible bucket for avatars (signed URLs generated server-side)
- **Tooling**: TypeScript, ESLint, npm
- **Hosting**: Vercel (preview per PR, production on `main`)

## Repository Structure

### Components philosophy
- Shared atoms live in `components/ui`. They wrap Radix/shadcn primitives with Tailwind styling and export PascalCase components.
- Feature bundles (`components/profile`, `components/onboarding`, etc.) own their larger composite pieces and export only what their route segments need.
- Root-level helpers were reorganized into themed folders (`auth`, `navigation`, `modals`, `theme`) to keep usage discoverable.

### lib/ philosophy
- `lib/domain/` contains data loaders/aggregators (currently `kitchen.ts`).
- `lib/supabase/` houses client factories, middleware helpers, and shared utilities.
- `lib/storage/` and `lib/image/` encapsulate S3 + canvas logic so routes/components stay lean.

## Development Setup

1. **Prerequisites**
   - Node.js 20 (`nvm install 20 && nvm use 20` recommended)
   - npm (bundled with Node)
   - Supabase + Vercel access for environment variables

2. **Clone & install**
   ```bash
   git clone https://github.com/KitchenSync-Team/KitchenSync.git
   cd KitchenSync
   npm install
   ```

3. **Environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Fill in at least:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (match anon key)
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only usage)
   - `S3_AVATARS_*` variables if you plan to test avatar uploads locally
   The middleware also accepts `SUPABASE_URL` / `SUPABASE_ANON_KEY` as fallbacks.

4. **Run & lint**
   ```bash
   npm run dev    # http://localhost:3000
   npm run lint   # static analysis
   npm run build  # optional production check
   ```

5. **Supabase database**
   - Link the repo to your Supabase project (or request access to the shared instance).
   - Apply migrations from `supabase/migrations/` if/when they exist (`supabase db push` or run the SQL via the dashboard).

## Scripts

| Command         | Purpose                              |
|-----------------|--------------------------------------|
| `npm run dev`   | Start Next.js dev server (Turbopack) |
| `npm run build` | Production build / type check        |
| `npm run lint`  | ESLint (Next.js config)              |

## Testing Avatars Locally

1. Set the `S3_AVATARS_*` env vars (`*_REGION`, `*_ENDPOINT`, `*_ACCESS_KEY`, `*_SECRET_KEY`, `*_BUCKET`).
2. Ensure the bucket allows the project credentials to `PutObject`/`DeleteObject`.
3. Run `npm run dev` and navigate to `/protected/profile` → Change avatar.
4. On upload, the API stores only the object key; `lib/domain/kitchen` signs a URL for display.

## Contributing & Deployment

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for:
- Branch naming conventions and PR expectations
- Vercel preview & production deployment flow
- Hotfix protocol
- Supabase migration workflow

Every PR automatically receives a Vercel preview URL; merging to `main` deploys production. Keep `main` deployable at all times.

## Questions?

Open an issue, start a GitHub discussion, or drop a note in team chat. Contributions are welcome—just follow the branching & PR process documented in `CONTRIBUTING.md`.
