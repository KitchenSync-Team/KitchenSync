# Contributing to KitchenSync

Everything you need to clone, run, and ship changes to KitchenSync.

## Prerequisites

- Node.js 20+ (`nvm install 20 && nvm use 20`)
- npm (bundled with Node)
- Access to the shared Supabase and Vercel projects — ask in team chat if you're missing credentials

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/KitchenSync-Team/KitchenSync.git
cd KitchenSync
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local` with your values. Contact the team for shared Supabase and S3 credentials. Key variables:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same value as anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — server-only, never expose to the browser |
| `SPOONACULAR_RAPIDAPI_KEY` | RapidAPI key for Spoonacular (preferred) |
| `SPOONACULAR_API_KEY` | Direct Spoonacular key (fallback) |
| `OPENAI_API_KEY` | OpenAI key for recipe standardization |
| `S3_AVATARS_*` | S3 credentials — only needed for testing avatar uploads locally |

See `.env.example` for the full list.

### 3. Database

**Option A — Shared Supabase instance (recommended)**

Use the credentials from the team. No database setup needed — just fill in `.env.local` and run the app.

**Option B — Local Postgres**

Use the bootstrap scripts to initialise a fresh database:

```bash
# Start a local Postgres instance via Docker
docker compose up -d

# Create the fake auth schema (must run first)
psql -h localhost -p 5433 -U postgres -d postgres -f scripts/db/auth_stub.sql

# Bootstrap the full schema (tables, indexes, functions, triggers, RLS)
psql -h localhost -p 5433 -U postgres -d postgres -f scripts/db/bootstrap.sql
```

To simulate a logged-in user when testing RLS locally:
```sql
SET app.current_user_id = '<your-uuid>';
```

> `scripts/db/bootstrap.sql` is for fresh local instances only. Production schema changes go in `supabase/migrations/` and are applied via the Supabase dashboard.

### 4. Run

```bash
npm run dev     # http://localhost:3000
npm run lint    # ESLint
npm run build   # Production build + type check
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start Next.js dev server (Turbopack) |
| `npm run build` | Production build and type check |
| `npm run lint` | ESLint (Next.js config) |
| `node scripts/fetch-recipe-info.cjs <id>` | Fetch a single Spoonacular recipe by ID or URL |

## Branching Strategy

| Branch | Purpose |
|---|---|
| `main` | Production — every merge deploys to [kitchen-sync.org](https://kitchen-sync.org) |
| `<initials>/<scope>` | Feature, fix, or spike (e.g. `bs/profile-avatar`, `pj/schema-bootstrap`) |
| `<initials>/hotfix-...` | Emergency patch branched from `main` |

- Always pull the latest `main` before branching: `git checkout main && git pull`
- Keep branches focused — split large efforts into multiple PRs
- Sync with `main` before requesting review: `git merge main` or `git rebase main`

## Pull Requests

Each PR automatically gets a Vercel preview URL. Before requesting review:

- ✅ `npm run lint` passes (run `npm run build` too if changes are sweeping)
- ✅ Docs updated if behavior changed
- ✅ Any required Supabase migrations noted in the PR body
- ✅ Vercel preview is green

Review process:
- Open as **Draft** until ready for eyes
- Request at least one teammate review
- Keep discussion on GitHub for traceability
- **Squash and merge** unless multiple commits are intentionally distinct

## Deployment

| Action | Result |
|---|---|
| Push to feature branch | Vercel preview deployment (updates per commit) |
| Merge PR into `main` | Production deployment |

### Hotfix Protocol

1. `git checkout main && git pull`
2. `git checkout -b <initials>/hotfix-<description>`
3. Fix, lint, push, open PR tagged **Hotfix**
4. Request expedited review
5. Squash-merge, verify production, delete branch

## Supabase Migrations

Schema changes belong in `supabase/migrations/`.

1. Write and apply the SQL directly in the Supabase dashboard
2. Save the same SQL as a new file: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
3. Commit the file and describe what it changes in the PR body
4. Never rewrite existing migration files — add a new one instead

When making significant schema changes, also update `scripts/db/bootstrap.sql` so local dev stays in sync with production.

## Environment Variable Hygiene

- Keep `.env.example` updated whenever you add a new variable
- `.env.local` is gitignored — never commit it
- Mirror all variables in Vercel → Project Settings → Environment Variables

## Do / Don't

- ✅ Keep `main` deployable at all times
- ✅ Share the Vercel preview link in PRs for easier QA
- ✅ Document manual steps or feature flags in the PR description
- ❌ Don't force-push to `main`
- ❌ Don't merge without at least one review (except sanctioned hotfixes)

## Questions?

Open a GitHub Discussion or issue, or ping the team chat.
