# KitchenSync

KitchenSync is a capstone project focused on helping households reduce food waste, organize pantry inventory, and plan meals more efficiently. Users can scan receipts or barcodes, track expiration dates, receive reminders, and get personalized recipe suggestions based on dietary preferences captured during onboarding.

- **Domain:** https://kitchen-sync.org
- **Timeline:** Two-semester build (MVP by end of Fall semester, full rollout by Spring)
- **Deployment:** Next.js (App Router) on Vercel with Supabase for backend services

The original Next.js + Supabase starter documentation is archived in [`docs/reference/nextjs-supabase-starter.md`](docs/reference/nextjs-supabase-starter.md) for quick reference.

## Why It Matters

Households routinely forget what they already own, let groceries expire, and struggle to build meals around on-hand ingredients. KitchenSync tackles food waste by giving users a clear view of their kitchen, nudging them about expiring items, and suggesting smarter ways to use what they have before it goes bad. Sustainability, usability, and practical value are the guiding principles behind every feature.

## Product Scope

### Kitchen Zones

Inventory is organized into four intuitive sections to match real-world storage patterns:

- **Fridge** — fast-moving perishables.
- **Freezer** — long-term frozen goods.
- **Pantry** — shelf-stable staples.
- **Spice Rack** — seasonings and long-lasting flavor essentials.

These zones power tailored reminders, recommendations, and future analytics.

### Core MVP Features

- **Auth & Profiles:** Supabase-powered registration, login, and user profiles.
- **Inventory Management:** Manual entry or scanning into sections (fridge, freezer, pantry, spices).
- **Expiration Tracking:** Alerts at five days remaining and on expiration.
- **Notification System:** Supabase cron/edge functions for scheduled reminders.
- **Preferences Quiz:** Optional onboarding to tailor recipes and suggestions.
- **Responsive UI:** Desktop/mobile-friendly layouts using TailwindCSS.

### Stretch Goals (Phase 2)

- AI-powered OCR for automated receipt/barcode ingestion.
- Recipe engine that cross-references preferences and inventory.
- Social features for sharing recipes or following creators.
- Mobile companion app (React Native or PWA exploration).

## Team

University of Cincinnati — Senior Design Team 14 (2025–2026)

| Member | Focus Area | Current Priorities |
| --- | --- | --- |
| Brendan Swartz | Project coordination & documentation | Organize team materials, drive README/docs updates, coordinate faculty touchpoints |
| Prashansa Dhakal | Database research & development | Finalize Supabase schema (items, expirations, profiles), plan migrations/seed scripts |
| Somyani Ghimire | UI/UX design | Wireframe scanning, inventory, alerts, and preferences experiences |
| Drake Damron | Backend & integrations | Evaluate OCR/product APIs (OpenFoodFacts, OpenAI Vision), prototype ingestion pipeline |
| Adama Ba | Platform engineering (TBD) | Support auth flows, notifications, recipe dataset integration as scope solidifies |

## Current Status

- ✅ Domain verified (`kitchen-sync.org`) and routed through Vercel.
- ✅ Next.js + Supabase starter deployed with authentication working end-to-end.
- ✅ Supabase, Vercel, and GitHub org access granted to the full team.
- 🚧 Transitioning from planning into schema design and page scaffolding (inventory, settings, preferences).
- 🚧 Replacing starter UI copy and components with KitchenSync-branded experiences.

## Tech Stack

**Frontend**
- Next.js (React 18+, App Router) with TailwindCSS.
- Mix of Server Components for data fetching and Client Components for interactivity.
- Server Actions and Route Handlers for secure server-side logic.

**Backend & Data**
- Supabase (PostgreSQL) for the relational database, auth, and storage.
- Supabase Auth for session management with Row-Level Security (RLS) so users only access their own data.
- Supabase Storage for receipt/barcode images with signed URL access control.

**Hosting & Tooling**
- Hosted on Vercel; every push to `main` triggers an automated build.
- Environment variables managed in Vercel and mirrored locally via `.env.local`.
- GitHub repo: `KitchenSync-Team/KitchenSync` (connected to Vercel + Supabase).

**AI / OCR (Planned)**
- Integrate OpenAI Vision models for receipt and barcode OCR.
- Parsed data will auto-populate the user’s pantry inventory.

## Development Workflow

- Two-week sprint cadence tracked through GitHub Projects with milestones leading to March 2026.
- Tasks live as GitHub Issues labeled by component (`frontend`, `backend`, `database`, `automation`, `docs`, etc.).
- Developers use forks or feature branches and open PRs against `main`; Vercel deploys previews for review.
- Environments (local, preview, production) stay aligned via Vercel-managed environment variables.

## Team Onboarding Guide

### 1. Accounts & prerequisites

- Confirm invites to the GitHub org (`KitchenSync-Team`), the shared Vercel project, and the Supabase instance. Ping Brendan if anything is missing.
- Install Node.js 20 LTS (18.18+ also works). We recommend using [`nvm`](https://github.com/nvm-sh/nvm) so you can run `nvm install 20 && nvm use 20`.
- Verify tooling with `node --version` and `npm --version`. Everything in this repo uses npm; no need for Yarn or pnpm.
- Optional but helpful: install the Supabase CLI (`npm install -g supabase`) for future migrations.

### 2. Clone the repository

```bash
# via SSH (preferred once your key is added in GitHub)
git clone git@github.com:KitchenSync-Team/KitchenSync.git

# or use HTTPS if you have not configured SSH yet
git clone https://github.com/KitchenSync-Team/KitchenSync.git

cd KitchenSync
```

If you are on a university-managed computer, ensure the repo path stays under your user directory to avoid permission issues.

### 3. Configure local environment variables

1. Copy the template file: `cp .env.example .env.local`.
2. Visit the Supabase dashboard → **Project Settings → API**.
3. Copy the **Project URL** into `NEXT_PUBLIC_SUPABASE_URL`.
4. Copy the **anon/public key** into both `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
5. Never commit `.env.local`. Git already ignores it.

If your Supabase access is pending, ask a teammate to generate a single-use anon key so you can get moving, then swap it once your invite arrives.

### 4. Install dependencies & run the app

```bash
npm install
npm run dev
```

- The dev server runs at http://localhost:3000 by default.
- First launch may take ~30s while Tailwind caches styles. Subsequent restarts are quick.
- Supabase Auth works end-to-end locally; use email/password sign-up (magic links also work if you set the site URL in Supabase).

### 5. Validate your setup

- Load the app locally, create a test account, and confirm you can sign in and land on the dashboard.
- Run `npm run lint` before your first commit to ensure ESLint matches your editor settings.
- Skim [`docs/ROADMAP.md`](docs/ROADMAP.md) to understand current sprint goals.
- When ready for your first contribution, follow the branching workflow in [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Contributing & Planning

- Collaboration guide: [`CONTRIBUTING.md`](CONTRIBUTING.md)
- Roadmap & milestones: [`docs/ROADMAP.md`](docs/ROADMAP.md)
- Starter kit reference: [`docs/reference/nextjs-supabase-starter.md`](docs/reference/nextjs-supabase-starter.md)
- Additional docs live under the `docs/` directory; the archived Next.js + Supabase starter materials now reside in `docs/reference/`.

See the [Team Onboarding Guide](#team-onboarding-guide) for cloning, environment setup, and local development steps.
