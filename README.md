# 🌱 MicroRead

**Small pages. Daily steps. Lasting growth.**

MicroRead is a shared reading-habit tracker for a small group of friends. Log
a few pages a day, keep your streak alive, cheer each other on, and watch the
habit compound. The emphasis is gentle consistency over big goals — the app
nudges, it never shames.

🔗 **Live:** https://deekshi-3-7.github.io/microread/

---

## ✨ Features

- **Daily reading log** — record pages read, time spent, and an optional takeaway per book.
- **Reading calendar** — a month view with an intensity heatmap (shaded by pages read) and a time-of-day dot, plus a "When you read" summary (morning / afternoon / evening / night).
- **Streaks & milestones** — current/longest streaks and achievement badges to keep momentum.
- **Insights** — personal charts for pages, minutes, and a 30-day reading journey.
- **Friends** — see your reading circle and drill into a friend's progress.
- **Five themes + light / dark / system** — Emerald, Midnight Blue, Warm Editorial, Cosmic Violet, and Monochrome, each with coordinated light and dark palettes. Preference is persisted and applied before first paint (no flash). Subtle 3D depth throughout, and everything respects `prefers-reduced-motion`.
- **Admin tools** — manage members, books, and reading entries. (A per-member "join date" means new members are never shown "missed" days for a time before they joined.)

---

## 🧰 Tech stack

| Area        | Choice                                             |
| ----------- | -------------------------------------------------- |
| Framework   | React 19 + TypeScript                              |
| Build tool  | Vite 8                                             |
| Styling     | Tailwind CSS v4 (CSS custom-property design tokens)|
| Routing     | React Router v7 (`basename="/microread"`)          |
| Backend     | Supabase (Postgres + Auth + Row-Level Security)    |
| Hosting     | GitHub Pages (deployed via GitHub Actions)         |

---

## 🚀 Local development

> ⚠️ **Node version matters.** Vite 8 requires **Node ≥ 20** (it uses
> `node:util`'s `styleText`, which older Node builds don't export). Node 18 will
> fail with `SyntaxError: ... does not provide an export named 'styleText'`.
> Check with `node --version` and use Node 20+ (e.g. via Homebrew or nvm).

```bash
# 1. Install dependencies
npm install

# 2. Create your local env file (see below)
cp .env.local.example .env.local   # then fill in the values

# 3. Start the dev server
npm run dev
# → http://localhost:5173/microread/
```

### Scripts

| Command           | What it does                                  |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Start the Vite dev server with HMR            |
| `npm run build`   | Type-check (`tsc -b`) and build to `dist/`    |
| `npm run preview` | Preview the production build locally          |
| `npm run lint`    | Run ESLint                                     |

---

## 🔑 Environment variables

Create a `.env.local` in the project root:

```bash
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon/publishable-key>
```

Both values come from your Supabase project under **Settings → API**.

> 🔒 Only the **publishable (anon)** key belongs in the frontend. The
> `service_role` key must **never** be committed or shipped to the browser — use
> it only in server-side code (e.g. a Supabase Edge Function).

---

## 🗄️ Data model (Supabase)

Four main tables, all protected by Row-Level Security:

- **`members`** — one row per reader (`name`, `email`, `role`, `active`, `joined_date`, `auth_user_id`). `auth_user_id` links the profile to the Supabase Auth login.
- **`books`** — a member's books (`title`, `author`, `total_pages`, `current_page`, `status`: `reading` / `completed` / `paused`).
- **`reading_entries`** — one logged session (`reading_date`, `start_page`, `end_page`, `minutes`, `takeaway`, `created_at`).
- **`goals`** — a member's active daily goal (`goal_type`: `minutes` / `pages`, `target`).

**Onboarding a new reader** (manual, via the Supabase dashboard):

1. **Authentication → Users → Add user** — set the email + a temporary password and tick **Auto Confirm User**. Copy the new user's **UID**.
2. **Table Editor → `members` → Insert row** — fill in `name`, `email`, `role`, `active = true`, `joined_date`, and paste the UID into **`auth_user_id`** (this link is what makes their login load their data).

---

## 📦 Project structure

```
src/
├── main.tsx              # Entry point; handles GitHub Pages SPA redirect
├── App.tsx               # Auth gate, layout, routes, nav
├── index.css             # Design tokens, themes, 3D & heatmap utilities
├── components/
│   ├── ErrorBoundary.tsx
│   ├── ThemePicker.tsx   # Settings: theme + light/dark/system picker
│   ├── ThemeToggle.tsx
│   └── TiltCard.tsx      # Subtle cursor-tilt 3D card
├── lib/
│   ├── supabase.ts       # Supabase client
│   ├── theme.ts          # Theme/mode engine + persistence
│   ├── readingStats.ts   # Streaks, dates, time-of-day, effective start date
│   ├── books.ts
│   └── useTilt.ts
└── pages/
    ├── Home.tsx          # Dashboard: today, this week, journey, stats
    ├── Reading.tsx       # Log reading + calendar heatmap
    ├── Books.tsx         # A member's books
    ├── Friends.tsx / FriendDetail.tsx
    ├── Insights.tsx      # Personal charts
    ├── Milestones.tsx    # Achievement badges
    ├── Settings.tsx      # Goals + appearance
    └── Admin*.tsx        # Admin: members / books / reading
```

---

## 🌐 Deployment

Pushing to **`main`** triggers the **Deploy MicroRead** GitHub Actions workflow
(`.github/workflows/deploy.yml`), which builds the app and publishes `dist/` to
GitHub Pages.

The build reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from
**repository secrets** (Settings → Secrets and variables → Actions), so the keys
are never stored in the repo.

Because the app is served from the `/microread/` sub-path, the router uses
`basename="/microread"` and `vite.config.ts` sets `base: '/microread/'`. The SPA
redirect in `main.tsx` keeps deep links working on GitHub Pages.
