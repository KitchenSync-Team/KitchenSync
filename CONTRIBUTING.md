# Contributing to KitchenSync

Welcome! We are still setting up the development workflow. Use this document as a living guide and expand it as the team formalizes processes.

## Getting Started

- Walk through the onboarding checklist in `README.md` so your tooling, repo clone, and `.env.local` match the team baseline.
- Confirm you can log into the shared Supabase project and copy the Project URL + anon key for local development.
- If you are waiting on Supabase access, request a temporary anon key in team chat so you can unblock local work.

## Local Development Workflow

1. **Clone & install:** `git clone git@github.com:KitchenSync-Team/KitchenSync.git`, `npm install`.
2. **Configure env:** Follow the README onboarding steps to create `.env.local` with the Supabase URL plus anon/publishable key.
3. **Smoke test:** `npm run dev` to confirm the app boots and Supabase auth works with your `.env.local` values.
4. **Create branch:** `git checkout -b <initials>/<short-feature>`.
5. **Develop & test:** Keep `npm run dev` running; lint with `npm run lint` before pushing.
6. **Commit frequently:** Use conventional-ish summaries (e.g., `feat: add expiration alert cron wiring`).
7. **Push & validate:** `git push -u origin <branch>`; confirm the Vercel preview link in the PR and mention any required Supabase migrations in the PR description.
8. **Review & merge:** Address feedback, re-run `npm run lint`, then squash-merge once approved. Delete the branch after merging.

## Branching & Reviews

- The `main` branch mirrors production and triggers a fresh Vercel deployment on every push. Treat it as release-ready at all times.
- Create feature branches from `main` using the pattern `<initials>/<scope>` (e.g., `bs/inventory-crud`, `sg/onboarding-ui`).
- Push your branch to the shared GitHub repo and open a draft PR as soon as you have a checkpoint; Vercel will create a preview deployment for each PR.
- Request at least one review before merging. Use GitHub’s “Update branch” or `git merge main`/`git rebase main` to resolve conflicts before requesting review.
- Merge via “Squash and merge” unless the work represents multiple logical commits that should be preserved. Never force-push to `main`.

## Coding Standards

- Linting and formatting currently rely on the default Next.js + ESLint + Tailwind setup.
- TypeScript is required for all new code.
- Prefer colocating feature logic within the relevant `app/` route segment; shared utilities live under `lib/`.

## Deployment Workflow

### Preview deployments (Vercel)

- Every pull request automatically builds a Vercel preview URL. Wait for the **Vercel — Preview** check to turn green before asking for review.
- Share the preview link with reviewers or stakeholders so they can click through the UI and validate Supabase-backed flows.
- Push new commits to the same branch to trigger updated previews. Use Vercel build logs if a preview fails.

### Production releases

- Merging into `main` triggers the production deployment at `https://kitchen-sync.org`. Double-check that `npm run lint` passes and that you have smoke-tested the preview build before merging.
- After merge, confirm the **Vercel — Production** check succeeded and spot-check the live site (sign-in, dashboard load, any changed flows).
- For hotfixes, branch from `main` (`<initials>/hotfix-issue`), open a PR, and follow the same preview/merge checks. Avoid pushing directly to `main`.

### Supabase migrations

- Generate schema changes with the Supabase CLI (`supabase db diff --linked`), then commit the resulting SQL under `supabase/migrations/<timestamp>_<summary>.sql`. If you are working from the dashboard, export the SQL and add it to the repo manually.
- Apply the migration locally (`supabase db push` or run the SQL via the dashboard) and verify the app still runs before opening your PR.
- Document the migration steps in the PR description so reviewers know how to reproduce the change and how/when to apply it in production.
- Coordinate production rollout with the team: run the migration in the Supabase dashboard (SQL editor) or via the CLI before or immediately after the associated code deploys.
- Never rewrite an existing migration after it has landed in `main`; add a new one instead.

## Preview Deployment Dry Run

Use this checklist whenever you want to verify the GitHub → Vercel workflow (no code changes required).

### CLI / IDE Version

1. `git checkout main && git pull origin main`
2. `git checkout -b <initials>/vercel-preview-check`
3. `git commit --allow-empty -m "chore: verify vercel preview pipeline"`
4. `git push -u origin <initials>/vercel-preview-check`
5. Open the auto-generated PR on GitHub (leave it as Draft). Wait for the **Vercel — Preview** check, then follow the link to the preview URL.
6. Optional: `git fetch origin && git rebase origin/main`, then `git push --force-with-lease` to confirm previews update on new commits.
7. Mark the PR ready for review, approve it, and **Squash and merge**. Confirm Vercel shows a new Production deployment tied to the merge commit.
8. Clean up: delete the remote branch in GitHub; locally run `git checkout main`, `git pull`, `git branch -d <initials>/vercel-preview-check`.

### WebStorm Version

1. **Update `main`:** Status bar branch widget → `main` → _Update Project_.
2. **Create branch:** Branch widget → _New Branch from ‘main’_ → name `bs/vercel-preview-check` (or similar) → ensure “Checkout branch” is selected.
3. **Empty commit:** Use `VCS > Git > Commit…` (⌘K / Ctrl+K) → `Create Commit` → enable “Amend commit” off → add message “chore: verify vercel preview pipeline” → check “Allow empty commit” → commit. Push immediately when prompted.
4. **Open PR:** WebStorm offers a link after push; click it or go to GitHub manually and open a draft PR.
5. **Preview check:** On the PR page, wait for the Vercel Preview status, click through to verify the URL. The Vercel dashboard should also show a Preview deployment for the branch.
6. **Merge simulation:** In WebStorm, use _Git > Fetch_ then _Git > Rebase ‘bs/vercel-preview-check’ onto ‘origin/main’_ if you want to test updates; push again to trigger another preview build.
7. **Finalize:** Convert the PR to “Ready for review”, approve, and squash-merge via GitHub. Confirm the Production deployment in Vercel and pull `main` locally. Delete the branch both remotely (button on GitHub) and locally (_Git > Branches > Delete_).

Document any issues encountered during the dry run so the team can adjust tooling or documentation.

## Next Steps (TODO)

- Define commit message conventions.
- Add automated tests and CI checks.

Questions? Start a thread in the team chat or open a GitHub discussion so we can capture decisions in docs.
