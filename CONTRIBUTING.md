# Contributing to KitchenSync

This file covers **how we work in Git**, **how PRs ship through Vercel**, and **how Supabase migrations roll out**. Treat it as the canonical workflow reference.

## Prerequisites

- Node.js 20 (`nvm install 20 && nvm use 20` recommended)
- `npm install` completed
- `.env.local` populated with Supabase + S3 credentials (see `README.md`)
- Access to the shared Supabase + Vercel projects (ask in team chat if you’re missing keys)

## Branching Strategy

| Branch                  | Purpose                                                                           |
|-------------------------|-----------------------------------------------------------------------------------|
| `main`                  | Production. Every push deploys https://kitchen-sync.org                           |
| `<initials>/<scope>`    | Feature, fix, or spike branch (e.g., `bs/profile-avatar`, `sg/onboarding-step-3`) |
| `<initials>/hotfix-...` | Emergency patch branched from the latest `main`                                   |

Guidelines:
- Pull the latest `main` before branching: `git checkout main && git pull`
- Name branches `<initials>/<short-description>`
- Keep branches focused; split large efforts into multiple PRs
- Rebase or merge `main` into your branch before requesting review (`git merge main` or `git rebase main`)

## Local Workflow

1. **Create branch:** `git checkout -b bs/profile-avatar`
2. **Run dev server:** `npm run dev`
3. **Lint often:** `npm run lint`
4. **Commit early/often:** `git commit -m "feat: add avatar cropper"`
5. **Push & open PR:** `git push -u origin bs/profile-avatar`

## Pull Requests & Reviews

Each PR automatically gets a Vercel preview URL. Before requesting review:

- ✅ `npm run lint` (and `npm run build` if changes are sweeping)
- ✅ Update docs if behavior changes
- ✅ Mention required Supabase migrations in the PR body
- ✅ Ensure the Vercel preview has finished (green check)

Review process:
- Open as Draft until you’re ready for eyes
- Request at least one teammate review
- Address comments quickly; keep discussion on GitHub for traceability
- **Merge via “Squash and merge”** unless multiple commits are intentionally distinct

## Deployment Flow

| Action                 | Vercel Result                                |
|------------------------|----------------------------------------------|
| Push to feature branch | Preview deployment (auto-updates per commit) |
| Merge PR into `main`   | Production deployment                        |
| Revert/hotfix PR       | Production deployment after merge            |

### Hotfix Protocol

1. `git checkout main && git pull`
2. `git checkout -b bs/hotfix-avatar-null`
3. Fix, lint, push, open PR tagged **Hotfix**
4. Request expedited review
5. Squash-merge, verify production, delete branch

## Supabase Migrations

Schema changes belong in `supabase/migrations/`.

1. Generate SQL via Supabase CLI (`supabase db diff --linked`) or copy from the dashboard
2. Commit the migration file
3. Document the migration + rollout steps in your PR
4. Apply the migration to the shared Supabase project before (or immediately after) merging
5. Never rewrite existing migrations—add a new one instead

## Environment Variables

- Keep `.env.example` updated for any new variables
- `.env.local` stays local; mirror the same keys in Vercel → Project Settings → Environment Variables
- For avatar uploads, ensure all `S3_AVATARS_*` vars are set both locally and in Vercel

## Preview Deployment Dry Run

Need to verify CI without code changes?

```bash
git checkout main && git pull
git checkout -b bs/vercel-pipeline-check
git commit --allow-empty -m "chore: verify vercel pipeline"
git push -u origin bs/vercel-pipeline-check
```

Open the PR, wait for the Vercel preview check, review the preview, then squash-merge. This confirms previews/prod deploys are still wired correctly.

## Do / Don’t

- ✅ Keep `main` deployable and in sync with Supabase migrations
- ✅ Share the Vercel preview link in PRs for easier QA
- ✅ Document feature flags/manual steps directly in PR descriptions
- ❌ Don’t force-push to `main`
- ❌ Don’t merge without at least one review (except sanctioned hotfixes)

## Questions?

Open a GitHub Discussion/Issue or ping the team chat. When in doubt, document the answer here! 
