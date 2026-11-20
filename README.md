# RE-IQ

AI asset-management dashboard for multifamily owners and asset managers. Sign-in, orgs, invites and
file uploads are real (Supabase). The dashboards still run on deterministic mock data: no real
parsing, integrations or AI calls yet.

- `TODO.md`: what's next. `STRATEGY.md`: why. `SECURITY.md`: how data is protected, and setup steps.
- `docs/product.md`: how the product works. `docs/design-system.md`: the UI rules.

## Run it

```bash
npm install
cp .env.example .env.local   # then fill it in (see SECURITY.md, "Environments")
npm run dev                  # http://localhost:3000
```

`/demo` opens the sample portfolio without an account. With the Supabase variables unset, sign-in
falls back to the demo too.

## Workflow

1. `npm run dev`, fix things on localhost.
2. Commit and push to `main`. GitHub runs the tests; Vercel deploys to production.
3. **Only when a change touches the database** (a new file in `supabase/migrations/`): apply the
   migration to staging, then production, *before* pushing the code that needs it (SECURITY.md, "Database changes").
   Code that expects a table the database doesn't have yet breaks the live site.

Checks before pushing: `npx tsc --noEmit`, `npm run lint`, `npm run build`. `npm test` runs the
tests; the database tests skip unless `TEST_SUPABASE_*` are set (CI always runs them).

## Where things are

- `app/(workspace)/app/*`: the real, signed-in app (`/app`, `/app/setup`): real records only, empty
  states until there's data. `components/app`: its frame, setup and settings.
- `app/prototype`: the standalone, hard-coded prototype (no sign-in, browser storage). It stays
  separate from `/app`. `app/wireframe`: low-fidelity reference (`docs/product.md`).
- `app/(auth)`: sign-in, sign-up, invites. `app/(uploader)`: `/upload` for property managers.
  `app/(marketing)`: the public site. `app/_parked-demo`: the old mock `/app` demo, not routed.
- `proxy.ts`: gates `/app` on a Supabase session; keeps uploaders out of `/app`. `/demo` is parked.
- `lib/data/index.ts`: the only data import for UI code. Async and org-scoped, so the mock internals
  can move to Supabase without UI changes. `lib/types` mirrors the tables; every record has `org_id`.
- `lib/data/mock/*`: the deterministic generator and seed. `lib/data/insights.ts`: issues and AI
  summaries, computed from the same records as the tables so numbers agree everywhere.
- `lib/data/store.ts`: demo changes, kept in `localStorage`.
- `lib/supabase`, `lib/auth`, `lib/uploads`: the real backend. `supabase/migrations`: the schema.
- `components/ui`: primitives. Design tokens are CSS variables in `app/globals.css`.

## Dev tools

`NEXT_PUBLIC_SHOW_DEV_TOOLS=true` in `.env.local`, then restart. The sidebar footer gets a role
preview (Asset Manager, Owner / Investor, Executive) and **Reset demo data**.

## Gotchas

- A running `npm run dev` doesn't pick up `app/globals.css` changes; restart it.
- The demo clock is fixed (`lib/dates.ts`, Oct 18, 2026); never `new Date()` in render.
- Cache Components is on: components using pathname hooks sit under `<Suspense>`, dynamic routes use
  `generateStaticParams`, and a `generateMetadata` that awaits data breaks prerender.
- When a property is missing a month, its budget is left out for that month too.
- Own theme provider instead of next-themes (React 19 warns on its script tag).
- ESLint 9 and TypeScript 6 are pinned until eslint-config-next supports newer.
