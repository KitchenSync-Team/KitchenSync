# KitchenSync

KitchenSync is a shared kitchen management app for households and teams. Track pantry inventory, expiration dates, receipts, and recipes — all synced in real time across everyone in your kitchen.

Live at [kitchen-sync.org](https://kitchen-sync.org)

## Features

- **Inventory management** — Add, edit, and consume items with location, unit, and expiration tracking
- **Expiration alerts** — Automatic flagging of items expiring soon or already expired
- **Recipe discovery** — Search Spoonacular recipes, filter by diet/allergens/cuisine, and match against what's in your pantry
- **Receipt parsing** — Upload receipts and map line items to inventory
- **Multi-user kitchens** — Invite members, manage roles, and share a live pantry with your household
- **Onboarding flow** — New users set up profile, dietary preferences, allergens, and storage locations before reaching the app
- **Profile & preferences** — Avatar upload, locale/theme settings, dietary and cuisine preferences

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Server Components, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix UI) |
| Auth & Database | Supabase (Auth, Postgres, Row Level Security) |
| Storage | AWS S3 (avatars) |
| Recipe API | Spoonacular |
| AI | OpenAI gpt-4.1 (recipe standardization) |
| Hosting | Vercel (preview per PR, production on `main`) |

## Project Structure

```
app/
├── page.tsx                   # Landing page (redirects authed users to /protected)
├── layout.tsx                 # Root layout — ThemeProvider, session providers
├── protected/
│   ├── (app)/                 # Main authenticated app
│   │   ├── inventory/         # Pantry inventory management
│   │   ├── ingredients/       # Ingredient search and mapping
│   │   ├── recipes/           # Recipe search and discovery
│   │   ├── kitchen-settings/  # Kitchen name, locations, members, invites
│   │   └── profile/           # User profile and preferences
│   └── onboarding/            # First-run onboarding flow
├── api/                       # API routes (ingredients, inventory, recipes, search, profile)
└── auth/                      # Auth pages (login, sign-up, password reset/update, confirm)

components/
├── ui/                        # Shared shadcn/Radix primitives
├── inventory/                 # Inventory feature components
├── recipes/                   # Recipe feature components
├── navigation/                # Sidebar, header, notification bell
└── auth/, profile/, onboarding/, theme/

lib/
├── supabase/                  # Client, server, service-role, middleware, guards, types
├── recipes/                   # Search, matching, preferences, filters, caching
├── ingredients/               # Search, badges, icon, details
├── openai/recipes.ts          # AI recipe standardization (rate limiting, caching, fallback)
├── domain/                    # Kitchen data loaders and bootstrap logic
├── spoonacular/               # API client and fetch helpers
└── storage/, image/, units/

scripts/db/
├── auth_stub.sql              # Fake auth schema for local Postgres (run first)
└── bootstrap.sql              # Complete schema, indexes, functions, triggers, and RLS policies

supabase/migrations/           # Incremental production migrations (applied via Supabase dashboard)
```

## Key Patterns

- **Auth guards** — `requireAuthenticatedUser()` and `requireKitchenMembershipForUser()` in `lib/supabase/guards.ts` protect every server action and route
- **Service role client** — `lib/supabase/service-role.ts` bypasses RLS for admin operations (kitchen bootstrap, invite acceptance)
- **Kitchen roles** — `owner` and `member` stored in `kitchen_members`; owners can invite, rename, and delete the kitchen
- **Server Actions** — mutations use Next.js `"use server"` actions; no separate mutation API routes

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for local setup, environment variables, database setup, branching conventions, PR process, and deployment workflow.
