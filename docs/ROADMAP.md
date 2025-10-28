# KitchenSync Roadmap (Draft)

This roadmap guides the two-semester capstone delivery. It aligns with the team’s two-week sprint rhythm tracked in GitHub Projects and aims for an MVP by the end of the Fall semester followed by full feature rollout in Spring. Update milestones as requirements evolve.

## Phase 0 — Foundation & Planning _(In Progress)_

- Archive starter documentation and align project branding across the repo.
- Stand up project management tooling (GitHub Projects board, labels, milestones).
- Define personas, user journeys, and high-level IA for the web app.
- Draft initial Supabase schema (tables for users, inventory items, categories, notifications, preferences) and outline migration approach.
- Decide on notification mechanism (cron job vs. edge function) and document constraints.

## Phase 1 — MVP Delivery (Fall Semester)

**Goals:** Working web experience where users can manage inventory, track expirations, and configure preferences.

- Implement Supabase schema migrations with RLS policies and seed data scripts.
- Build onboarding flow including Supabase Auth and preferences quiz.
- Create inventory dashboards (fridge/freezer/pantry/spices) with CRUD and optional manual expiration tracking.
- Wire up reminder system (5-day warning + expired alerts) with Supabase scheduling.
- Replace landing page/tutorial copy with KitchenSync content and responsive layout.
- Establish accessibility/lighthouse baselines and snapshot tests for critical flows.

**Exit Criteria**
- Authenticated user can complete onboarding, add items, receive reminder notifications, and view inventory on desktop and mobile.
- Deployment pipeline green on `main` with reproducible environment setup instructions.

## Phase 2 — Smart Management (Early Spring)

**Goals:** Layer intelligence and collaboration atop the core MVP.

- Integrate OpenAI Vision OCR prototype for receipt and barcode ingestion (Supabase Storage + server actions).
- Implement recipe recommendation engine that cross-references user preferences and inventory availability.
- Add settings area for notification cadence, dietary adjustments, and profile management.
- Introduce analytics/insights (e.g., waste avoided, money saved) using Supabase SQL views.
- Expand automated test coverage (integration + e2e with Playwright or Cypress).

## Phase 3 — Expansion & Delivery (Late Spring)

**Goals:** Extend reach, social features, and potential mobile presence.

- Explore social layer (share recipes, follow creators) with appropriate Supabase policies.
- Evaluate mobile strategy (React Native companion app or PWA enhancements).
- Harden infrastructure (monitoring, error reporting, usage analytics).
- Prepare final capstone deliverables (demo scripts, documentation, deployment handoff).

## Process & Cadence

- **Sprints:** Two-week iterations with planning on Monday, review/demo on Friday.
- **Issue Labels:** `frontend`, `backend`, `database`, `automation`, `docs`, `infra`, `ai`.
- **Branches:** Feature branches or forks merging via PRs to `main`; Vercel previews generated automatically.
- **Environments:** Local ↔︎ Preview ↔︎ Production kept in sync via Vercel environment variable management.
- **Roadmap Tracking:** GitHub Projects board (Roadmap through March 2026) linked to milestones such as _Foundation Setup_, _MVP Delivery_, _Phase 1 Enhancements_, _Final Delivery_.

## References

- Project overview: `README.md`
- Starter guide: `docs/reference/nextjs-supabase-starter.md`
- Contributing workflow: `CONTRIBUTING.md`
