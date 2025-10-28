# Contributing to KitchenSync (Draft)

Welcome! We are still setting up the development workflow. Use this document as a living guide and expand it as the team formalizes processes.

## Getting Started

- Clone the repo and follow the temporary setup steps in `README.md`.
- Ensure you have access to the shared Supabase project or create your own sandbox env.
- Copy `.env.example` to `.env.local` and populate any secrets provided by the team.

## Coding Standards

- Linting and formatting currently rely on the default Next.js + ESLint + Tailwind setup.
- TypeScript is required for all new code.
- Prefer colocating feature logic within the relevant `app/` route segment; shared utilities live under `lib/`.

## Branching & Reviews

- The `main` branch mirrors production and triggers a fresh Vercel deployment on every push. Treat it as release-ready at all times.
- Create feature branches from `main` using the pattern `<initials>/<scope>` (e.g., `bs/inventory-crud`, `sg/onboarding-ui`).
- Push your branch to the shared GitHub repo and open a draft PR as soon as you have a checkpoint; Vercel will create a preview deployment for each PR.
- Request at least one review before merging. Use GitHub’s “Update branch” or `git merge main` to resolve conflicts locally before requesting review.
- Merge via “Squash and merge” unless the work represents multiple logical commits that should be preserved. Never force-push to `main`.

## Local Workflow

1. **Clone & install:** `git clone git@github.com:KitchenSync-Team/KitchenSync.git`, `npm install`.
2. **Configure env:** Copy `.env.example` to `.env.local` and fill in the Supabase URL plus anon/publishable key for both env names.
3. **Create branch:** `git checkout -b <initials>/<short-feature>`.
4. **Develop & test:** Run `npm run dev` for local work; lint with `npm run lint` before pushing.
5. **Commit frequently:** Use conventional-ish summaries (e.g., `feat: add expiration alert cron wiring`).
6. **Push & validate:** `git push -u origin <branch>`; confirm Vercel preview link in the PR and mention any required Supabase migrations in the PR description.
7. **Review & merge:** Address feedback, re-run `npm run lint`, then squash-merge once approved. Delete the branch after merging.

## Deployment Rules

- **Preview Deployments:** Every PR gets an automatic Vercel preview URL. Use it for stakeholder reviews and QA.
- **Production Deployments:** Only merges to `main` trigger a production rebuild at `https://kitchen-sync.org`. Ensure `main` stays green (CI + lint + manual validation).
- **Hotfixes:** For urgent fixes, branch from `main` (`<initials>/hotfix-...`), open a PR, and merge once approved. Avoid pushing directly to `main`.
- **Migrations & Seeds:** If a change depends on Supabase schema updates, include the SQL/migration script in the PR and coordinate rollout timing with the team.

## Next Steps (TODO)

- Define commit message conventions.
- Add automated tests and CI checks.
- Document deployment workflow for Vercel and Supabase migrations.

Questions? Start a thread in the team chat or open a GitHub discussion so we can capture decisions in docs.
