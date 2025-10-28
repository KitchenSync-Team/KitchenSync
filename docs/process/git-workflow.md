# Git & Deployment Workflow

Use this guide as the quick reference for cloning the repo, collaborating through branches, and understanding how Vercel deployments are triggered.

## Cloning & Setup

1. Fork or clone the canonical repo `KitchenSync-Team/KitchenSync`.
2. Run `npm install`.
3. Copy `.env.example` → `.env.local` and supply:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (same value as anon key)
4. Start the dev server with `npm run dev`.

## Branch Strategy

- `main` is the protected production branch; every push redeploys `https://kitchen-sync.org`.
- All work happens on feature branches created from `main`:
  - Naming convention: `<initials>/<scope>` (e.g., `dd/ocr-pipeline`).
  - Keep branches focused; split large changes into multiple PRs.
- Rebase or merge `main` into your branch before opening a PR to avoid stale previews.

## Pull Requests

- Push your branch and open a PR early; Vercel provides a preview URL for every PR.
- Checklist before requesting review:
  - `npm run lint` (and relevant tests once available)
  - Update docs/README if behavior changes
  - Note required Supabase migrations in the PR body
- Require at least one teammate review; address feedback promptly.
- Squash merge unless there is a strong reason to retain multiple commits.

## Deployment Flow

| Event | Vercel Action | Notes |
| --- | --- | --- |
| Push to feature branch | Preview deployment | Auto-updates per commit; share link with designers/testers |
| Merge PR to `main` | Production deployment | Redeploys `https://kitchen-sync.org`; verify post-merge |
| Revert/Hotfix PR | Production deployment | Follow the same review/merge procedure |

## Hotfix Protocol

1. Branch from the latest `main` (`<initials>/hotfix-...`).
2. Implement fix, run lint/tests, push, and open a PR marked as **Hotfix**.
3. Request expedited review, merge when approved, and verify production.

## Keeping Environments in Sync

- Environment variables live in Vercel’s dashboard; mirror required values locally in `.env.local`.
- Supabase migrations must be applied both in the hosted project and in any local development instances. Include SQL scripts or references in PRs.
- For shared test data, use Supabase seed scripts checked into the repo (coming soon) and call them out in PR instructions.

## Do / Don’t

- ✅ Do keep `main` deployable and aligned with the current Supabase schema.
- ✅ Do document feature toggles or manual steps in PRs and `docs/ROADMAP.md`.
- ❌ Don’t force-push to `main` or merge without review.
- ❌ Don’t rely on local-only environment variables; ensure Vercel has matching keys.
