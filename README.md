# KitchenSync

KitchenSync helps households stay on top of pantry inventory, expirations, receipts, and shared kitchen activity. Authenticated users land in a protected dashboard that highlights what needs attention so ingredients get used before they go to waste.

The original Next.js + Supabase starter guide is preserved in [`docs/reference/nextjs-supabase-starter.md`](docs/reference/nextjs-supabase-starter.md) if you need it.

## Highlights

- **Households & members** – each user belongs to a kitchen with locations, collaborators, and row-level access controls.
- **Inventory intelligence** – dashboard cards surface total items, upcoming expirations, active alerts, and recent receipts.
- **Onboarding guardrails** – new users are routed through onboarding before they can access the dashboard.
- **Supabase-first auth** – server components verify sessions and redirect unauthenticated visitors to the login flow.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Server Components, Turbopack dev server)
- **Styling**: Tailwind CSS + shadcn/ui primitives
- **Data & Auth**: Supabase (Postgres, Auth, Storage) with helpers in `lib/supabase`
- **Runtime**: TypeScript, ESLint
- **Hosting**: Vercel (preview deploys on PRs, production on `main`)

## Repo Structure

- `app/`
  - `page.tsx` – marketing landing page
  - `auth/` – login, sign-up, password reset routes
  - `protected/`
    - `layout.tsx` – guards auth, fetches dashboard data, wraps children in the dashboard shell
    - `page.tsx` – main dashboard view
    - `profile/`, `kitchen-settings/`, `settings/` – additional authenticated pages
    - `theme.css` – Tailwind tokens specific to the dashboard UI
- `components/`
  - `dashboard/` – dashboard context, shell, and reusable UI pieces under `dashboard/ui`
  - `ui/` – shared shadcn/ui wrappers (`button`, `card`, etc.)
  - Auth helpers and form components (`auth-button.tsx`, `login-form.tsx`, …)
- `lib/` – Supabase client helpers, dashboard data loaders, domain utilities
- `docs/` – supplemental documentation and archival reference material
- `public/` – static assets (icons, Open Graph images, etc.)

## Getting Started

1. **Prerequisites**
   - Node.js 20 (use `nvm install 20 && nvm use 20`)
   - npm (bundled with Node)
   - Supabase + Vercel access for environment variables

2. **Clone & install**
   ```bash
   git clone https://github.com/KitchenSync-Team/KitchenSync.git
   cd KitchenSync
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   ```
   Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only usage)
   - Optional: `NEXT_PUBLIC_SITE_URL` for auth redirects

4. **Run & validate**
   ```bash
   npm run dev    # http://localhost:3000
   npm run lint   # optional: static analysis
   npm run build  # optional: production build check
   ```
   Sign up through the local app to confirm Supabase Auth and the protected dashboard work end-to-end.

## Working in the Repo

- Keep dashboard UI in `components/dashboard/ui` so it can be shared across protected routes.
- Access Supabase via helpers in `lib/supabase` or domain utilities like `lib/dashboard.ts` to stay RLS-safe.
- Tailwind tokens for the protected area are centralized in `app/protected/theme.css`.
- The marketing site and dashboard each have their own route groups under `app/`, but everything shares the global `layout.tsx`.

## Contributing

- Follow the branching guidelines in [`CONTRIBUTING.md`](CONTRIBUTING.md) and keep feature branches rebased on `main`.
- Run `npm run lint` (and ideally `npm run build`) before opening a PR.
- Vercel automatically builds a preview for every PR; production deploys track the `main` branch.

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for upcoming work. Historical starter documentation and additional guides live in the `docs/` directory.
