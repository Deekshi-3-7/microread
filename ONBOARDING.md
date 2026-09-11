# MicroRead — Developer Onboarding

A minimalist, group reading-habit tracker. Philosophy: **"Small pages. Daily steps. Lasting growth."** Members log daily reading, build streaks, and see each other's progress; an admin manages members, books, and reading data.

---

## Tech stack

- **React 19 + TypeScript**, **Vite 8**, **Tailwind CSS v4** (`@tailwindcss/vite`)
- **React Router v7** — `BrowserRouter` with `basename="/microread"`
- **Supabase** (`@supabase/supabase-js`) — auth + Postgres
- **GitHub Pages** deploy via GitHub Actions; base path `/microread/`, SPA fallback via `public/404.html`

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173/microread/
npm run build    # tsc -b && vite build  (must stay green)
npm run lint     # 0 errors expected; ~11 pre-existing style warnings are OK
```

Create `.env.local` (git-ignored):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

The same two keys are GitHub Actions secrets used by the deploy workflow. Pushing to `main` triggers the deploy — so `main` is effectively the production branch.

---

## Architecture / file map

- `src/App.tsx` — auth gate + app shell (sidebar + mobile nav + routes). Loads the `members` row for the logged-in `auth_user_id`, blocks inactive accounts, gates `/admin/*` on `role === 'admin'`.
- `src/main.tsx` — entry; `ErrorBoundary` + `RedirectHandler` (GitHub Pages `?redirect=` SPA recovery) wrap `App`.
- `src/lib/supabase.ts` — Supabase client from env vars.
- `src/lib/readingStats.ts` — **shared** date/streak helpers + `TRACKING_START_DATE` (`'2026-09-06'`).
- `src/lib/books.ts` — `computeCurrentPageFromHistory()` (see Business rules).
- `src/components/ErrorBoundary.tsx` — full-screen recoverable fallback.
- `src/pages/*` — one component per route; each self-fetches from Supabase.

Pages: `Home`, `Reading`, `Books`, `Friends`, `Insights`, `Milestones`, `Settings`, `Admin`, `AdminBooks`, `AdminReading`.

---

## Data model (Supabase / Postgres)

- **members** — `id, auth_user_id, name, email, role('admin'|'member'), active, joined_date, created_at, updated_at`
- **books** — `id, member_id, title, author, total_pages, starting_page, current_page, start_date, completion_date, status('reading'|'completed'|'paused'), created_at, updated_at`
- **reading_entries** — `id, member_id, book_id, reading_date, start_page, end_page, pages_read, minutes, takeaway, created_at, updated_at`
  - `pages_read` is a **GENERATED** column (`end_page - start_page`) — never INSERT/UPDATE it.
  - Unique constraint on `(member_id, book_id, reading_date)` — the log form treats Postgres error `23505` as "already logged today."
- **goals** — `id, member_id, goal_type('minutes'|'pages'), target, active, updated_at`

---

## Business rules & gotchas (read before changing logic)

### Streaks are computed, never stored
`calculateCurrentStreak()` (`readingStats.ts`) derives the current streak from `reading_entries` on each load. Rules:
- Counts **consecutive days**; multiple reads in a day = one day.
- Must include **today or yesterday** or it returns **0** (miss a full day → resets).
- Only counts dates `>= TRACKING_START_DATE`.
- **Current streak** (Home, Friends) resets on a gap. **Longest streak** (Insights) is an all-time record and only ever grows — `Insights` also filters to `TRACKING_START_DATE`.
- The 7-day "This Week" chain strip on Home reuses the same reading dates + tracking-start rule.

### `current_page` reconstruction — the "reopen" gotcha
Finishing a book overwrites `books.current_page` with `total_pages`. So **reopening/un-completing must restore the real page from history**, or the book is stuck at 100%.
- Single source of truth: **`computeCurrentPageFromHistory(bookId, startingPage)`** in `src/lib/books.ts` (latest entry's `end_page`, else `starting_page`).
- Used by `Books.handleReopenBook`, `AdminBooks.changeStatus` (reopen), and `AdminReading.syncBookCurrentPage`. **Keep any new page-mutation path going through this helper** — divergence here caused a real data bug.

### Dates
All dates are stored/compared as local `YYYY-MM-DD` strings (helpers in `readingStats.ts`). Don't introduce UTC `new Date('YYYY-MM-DD')` parsing into streak math.

### Daily goal
Default goal for new members is **15 minutes** (`Settings.tsx`). Existing members' saved `goals` rows load over the default — changing the default does **not** touch saved rows; that's a data update in the Supabase SQL editor.

---

## Auth & admin model

- Login is email/password (`signInWithPassword`) — **no self-signup**.
- Admin "Add Member" inserts a `members` row **without `auth_user_id`**; a matching Supabase Auth user must be created and linked before that person can log in. (Onboarding is currently a manual step.)
- Admin sub-pages (`/admin/books`, `/admin/reading`) are reachable from cards on the Admin dashboard and have "← Back to Admin" links.
- **⚠️ Client-side gating only.** All `role === 'admin'` checks are in the UI. Security depends on **Supabase Row Level Security** — verify RLS restricts writes to owners/admins (reads of members/books/entries are intentionally group-wide, per the Friends page). Do not treat the UI checks as authorization.

---

## Known follow-ups / not done

- Confirm/tighten **RLS write policies** (highest priority).
- Build a real **member onboarding** flow (auth user creation + link).
- Optional dashboard motivation ideas not yet built: today-urgency nudge, next-milestone-on-Home, broader accent-color pass.
- `npm run lint` has ~11 pre-existing **warnings** (react-hooks v7 / react-refresh style) intentionally downgraded from errors in `eslint.config.js`; safe to ignore, worth cleaning eventually.
