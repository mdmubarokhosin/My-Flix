# MyFlix — Stream Movies & Videos

> Production-ready full-stack video streaming platform built with **Next.js 15**, **TypeScript**, **Firebase Realtime Database**, **Tailwind CSS 4**, and **shadcn/ui**. Mobile-first, Telegram Mini App compatible, deployable on **Cloudflare Pages** (Edge runtime).

---

## 🎯 What's New in v2.0.0

This is a **security-hardened, production-ready** rebuild of the original My-Flix project. Key changes:

### 🔒 Security (P0)
- **Firebase config moved to environment variables** — no more hardcoded keys in source.
- **Admin passwords are bcrypt-hashed** (not plaintext). Legacy plaintext is auto-migrated on first login.
- **JWT-based admin sessions** stored in `httpOnly` cookies (no password in localStorage).
- **Next.js middleware** protects `/admin/*` server-side (not just client-side).
- **Payment webhook signature verification** + IDOR fix in `/api/payment/verify`.
- **Telegram auth dev-mode fallback disabled in production** — no impersonation.
- **Rate limiting** on login, redeem, telegram-auth, tmdb, imdb, tv-channel views, ad rewards.
- **TMDB/IMDB proxies** are rate-limited (30 req/min/IP).
- **Telegram photo endpoint** streams image bytes server-side (no bot-token leak).
- **Server-side payment package validation** — client can't specify arbitrary `amount`/`coins`.
- **Atomic multi-location Firebase updates** for purchase / checkin / redeem / share / payment credit (eliminates race conditions).
- **`ignoreBuildErrors: false`** + `reactStrictMode: true` + security headers (`X-Frame-Options`, `HSTS`, `Referrer-Policy`, `Permissions-Policy`).
- **ESLint rules re-enabled** — `no-debugger`, `no-unreachable`, `no-fallthrough`, etc. now fail the build.

### 🐛 Bug Fixes
- **Gift codes data path unified** — admin-created codes are now redeemable (was broken because admin wrote to `giftCodes/` while user read from `gifts/`).
- **Series episode play** — episode URL no longer lost when navigating to the player (composite ID + `navigationData.episodeVideo`).
- **Shorts mute** — now uses `<video muted>` for MP4/HLS sources (was UI-only).
- **VideoPlayer "। ।" typo** — replaced with proper i18n key `player.notEnoughCoinsFull`.
- **`matchVideoTag`** — exact match (was substring, caused "All" / "Sci-Fi" false positives).
- **ThemeSwitcher** — icon now reflects `theme` state, not `dark:` CSS class.
- **Version mismatch** — `package.json`, `app-config.ts`, and ProfilePage footer all in sync at `2.0.0`.
- **Redeem/share atomicity** — balance deduction + code creation are now atomic (was losing coins on failure).
- **TV channel view increment** — moved to dedicated rate-limited `POST /api/tv-channels/[id]` endpoint (was auth-bypassed PUT).
- **Tailwind content path** — `./src/**/*` added (was missing, could purge classes).
- **Seed data createdAt** — now strictly in the past (was up to 24h in the future).
- **Ad reward abuse** — server now reads `coinsPerAd` from settings; client `amount` field is ignored.
- **Timezone-aware check-in** — uses client `tzOffset` so daily reset is local (was UTC).
- **Transaction list trimming** — `slice(0, 50)` applied everywhere, including `addTransaction` helper.

### 🏗️ Architecture
- **`useUserData()` custom hook** — single shared Firebase `users/${userId}` listener (was duplicated in 5 components).
- **`UserTransaction` type** — added `'ad'` to the union (was missing, type-unsafe).
- **`GiftCode` type** — added `code?` field (admin-created codes now have a redeemable code string).
- **`Settings` type** — added `adminPasswordHash` (preferred over legacy `adminPassword`).
- **`resolveVideoUrl()`** — detects MP4 / HLS / YouTube / Vimeo / Dailymotion / Google Drive and returns `type: 'mp4' | 'hls' | 'iframe'` (was always iframe, breaking direct video files).
- **`video-utils.ts` + `format-utils.ts`** — duplicates consolidated; `formatRelativeTime` accepts both `string` and `number`.
- **`admin-api.ts`** — all functions now return typed `Promise<Video[]>`, `Promise<GiftCode[]>`, etc. (was `Promise<unknown>`).
- **`db.ts` shim removed** — was unused re-export.
- **Atomic `deleteVideoAndCleanup`** — uses a single multi-location update (was per-user loop).
- **`db.transactionalUpdate()`** + `db.multiUpdate()` — added for race-free writes.

### 🎨 UI/UX
- **Coins badge in Header** — `10K` formatting (was `10000`).
- **Settings page** — password change now requires `currentPassword` (was open).
- **Admin theme switcher** — icon reflects actual theme state.
- **ProfilePage footer** — version sync (`v2.0.0`).
- **Telegram SDK** loaded via `next/script` `afterInteractive` (was sync, blocking render).
- **`useAppStore.reset()`** — full in-memory state reset for logout/ban.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 20+** (Cloudflare Pages default)
- **npm** (or `bun`/`pnpm`)
- **Firebase project** with Realtime Database enabled

### 1. Clone & install

```bash
git clone <your-fork-url>
cd My-Flix
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your Firebase + auth secrets:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_FIREBASE_*` (7 vars) | Firebase web app config (from Firebase Console → Project Settings). |
| `ADMIN_JWT_SECRET` | A long random string used to sign admin JWTs. Generate with `openssl rand -base64 48`. |
| `BCRYPT_ROUNDS` | Bcrypt cost factor (10 is good; 12 is slower but safer). |
| `TELEGRAM_BOT_TOKEN` | Optional — only if you use Telegram Mini App auth / photo proxy. |
| `TMDB_API_KEY` | Optional — for TMDB auto-fill in admin video form. |
| `OMDB_API_KEY` | Optional — for IMDb auto-fill in admin video form. |
| `BOHUDUR_API_KEY` | Optional — for coin-package payments. |
| `BOHUDUR_WEBHOOK_SECRET` | Optional — shared secret for Bohudur webhook signature verification. |
| `NEXT_PUBLIC_APP_URL` | Your production URL (e.g. `https://myflix.pages.dev`). |

### 3. Set Firebase Realtime Database Rules

In Firebase Console → Realtime Database → Rules, paste (Option 2 from the original README — read-only public, write via server only):

```json
{
  "rules": {
    "videos":         { ".read": true,  ".write": false },
    "categories":     { ".read": true,  ".write": false },
    "shortVideos":    { ".read": true,  ".write": false },
    "tvChannels":     { ".read": true,  ".write": false },
    "coinPackages":   { ".read": true,  ".write": false },
    "notifications":  { ".read": true,  ".write": false },
    "settings":       { ".read": true,  ".write": false },
    "users":          { ".read": "auth != null", ".write": false },
    "gifts":          { ".read": false, ".write": false },
    "payments":       { ".read": false, ".write": false }
  }
}
```

> All writes happen via the Next.js API routes (Edge runtime), which use the Firebase REST API. The server treats each request as unauthenticated — that's fine, because **all sensitive mutations are admin-auth-protected** (JWT cookie) or user-auth-protected (Telegram initData or userId).

### 4. Run dev server

```bash
npm run dev
```

Open `http://localhost:3000`. On first visit, the app auto-seeds 30 demo videos + categories + 2 demo gift codes (`GIFT-WELCOM1`, `GIFT-PREMIU1`).

> If no admin password is configured yet, the seed route generates a random one and logs it to the server console. Change it immediately in **Admin → Settings**.

### 5. Access the admin panel

Open `https://your-domain/admin/login` and enter your admin password. The server issues an 8-hour JWT in an httpOnly cookie.

---

## ☁️ Deploy to Cloudflare Pages

### Build configuration (set in Cloudflare dashboard)

| Setting | Value |
|---|---|
| **Framework preset** | Next.js |
| **Build command** | `npx @cloudflare/next-on-pages@1` |
| **Build output directory** | `.vercel/output/static` |
| **Root directory** | (repo root) |
| **Node.js version** | 20 |

### Environment variables (set in Cloudflare dashboard → Settings → Environment Variables)

Add the **same** variables from your `.env.local` (Production + Preview environments). `NEXT_PUBLIC_*` vars are inlined at build time; the rest are runtime secrets.

> ⚠️ **Do NOT** put secret values in `wrangler.toml` — that file is committed. Use the dashboard for secrets.

### Connect your GitHub repo

1. Push this code to a GitHub repo.
2. Cloudflare Dashboard → Pages → Create project → Connect to Git.
3. Pick your repo, fill in the build settings above.
4. Click **Save and Deploy**.

That's it — no build-configuration changes needed from the original project. The build command, output directory, and root directory all stay the same.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── layout.tsx           # Root layout (ThemeProvider, Toaster, Telegram SDK)
│   ├── page.tsx             # SPA entry → AppShell
│   ├── globals.css          # Tailwind v4 + theme tokens
│   ├── middleware.ts        # 🆕 Server-side /admin/* protection
│   ├── admin/               # Admin pages (App Router)
│   │   ├── layout.tsx       # Sidebar + breadcrumb
│   │   ├── page.tsx         # Dashboard
│   │   ├── login/page.tsx   # Login form
│   │   ├── videos/page.tsx
│   │   ├── categories/page.tsx
│   │   ├── gift-codes/page.tsx
│   │   ├── users/page.tsx
│   │   ├── notifications/page.tsx
│   │   ├── coin-packages/page.tsx
│   │   ├── shorts/page.tsx
│   │   ├── tv-channels/page.tsx
│   │   ├── series/page.tsx
│   │   ├── settings/page.tsx
│   │   └── _components/     # Sidebar + header
│   └── api/                 # Edge runtime API routes
│       ├── videos/          # Public video API
│       ├── categories/      # Public category API
│       ├── user/            # User auth, favorites, purchases, transactions, checkin
│       ├── gift-codes/      # Redeem + share (atomic)
│       ├── coin-packages/   # Public list
│       ├── notifications/   # Public list (targeted/all)
│       ├── tv-channels/     # Public list + view-counter endpoint
│       ├── shorts/          # Public list
│       ├── settings/        # Public (sensitive keys stripped)
│       ├── tmdb/            # 🆕 Rate-limited proxy
│       ├── imdb/            # 🆕 Rate-limited proxy
│       ├── telegram/photo/  # 🆕 Bot-token-safe proxy (GET streams image bytes)
│       ├── auth/telegram/   # 🆕 Telegram initData verification (prod: no fallback)
│       ├── payment/         # 🆕 Server-side package validation + IDOR fix + atomic credit
│       ├── admin/           # 🆕 All routes use JWT-cookie auth (requireAdmin)
│       │   ├── login/       # Issues JWT
│       │   ├── logout/      # 🆕 Clears cookie
│       │   ├── settings/    # 🆕 Requires currentPassword for changes
│       │   ├── videos/      # CRUD with deleteVideoAndCleanup
│       │   ├── gift-codes/  # Uses unified `gifts` path + `code` field
│       │   └── ...           # users, notifications, coin-packages, tv-channels, shorts
│       └── seed/            # Demo data (admin-only)
├── components/
│   ├── app/                 # SPA app components (12 files)
│   │   ├── AppShell.tsx     # 🆕 Uses useUserData (1 listener)
│   │   ├── HomePage.tsx     # 🆕 Uses useUserData
│   │   ├── EarnPage.tsx     # 🆕 Uses useUserData, server-set ad reward
│   │   ├── RedeemPage.tsx   # 🆕 Uses useUserData
│   │   ├── ProfilePage.tsx  # 🆕 Uses useUserData
│   │   ├── Header.tsx       # 🆕 formatNumber on coins badge
│   │   ├── VideoPlayer.tsx  # 🆕 mp4/hls support, episodeVideo support
│   │   ├── ShortsPage.tsx   # 🆕 mp4/hls support, real mute
│   │   ├── SeriesDetailPage.tsx # 🆕 Composite episode ID + episodeVideo pass-through
│   │   ├── LiveTvPage.tsx   # 🆕 Uses POST view-counter endpoint
│   │   ├── AdminPanel.tsx   # Legacy SPA admin (deprecated; prefer /admin/*)
│   │   └── ...
│   └── ui/                  # shadcn/ui components (40+)
├── lib/
│   ├── firebase-client.ts   # 🆕 Env-var-based config
│   ├── firebase-server.ts   # 🆕 Env-var-based + multiUpdate + transactionalUpdate
│   ├── auth.ts              # 🆕 bcrypt + JWT + setAdminPassword + verifyPassword
│   ├── auth-middleware.ts   # requireUser + Telegram initData verify
│   ├── admin-api.ts         # 🆕 JWT-cookie client, typed returns
│   ├── rate-limit.ts        # 🆕 In-memory rate limiter (Edge-safe)
│   ├── payment-utils.ts     # 🆕 Atomic creditCoinsForPayment + webhook verify
│   ├── store.ts             # 🆕 reset() action
│   ├── use-user-data.ts     # 🆕 Single shared Firebase listener (ref-counted)
│   ├── types.ts             # 🆕 GiftCode.code, UserTransaction.ad, Settings.adminPasswordHash
│   ├── video-utils.ts       # 🆕 resolveVideoUrl with mp4/hls/youtube; matchVideoTag exact match
│   ├── format-utils.ts      # 🆕 Re-exports from video-utils (single source of truth)
│   ├── transaction-utils.ts # 🆕 slice(0,50) trim
│   └── i18n.ts              # Bengali + English
├── config/app-config.ts     # 🆕 v2.0.0 in sync with package.json
└── hooks/
    ├── use-toast.ts
    └── use-mobile.ts
```

---

## 🔑 Default Admin Password

If the database is empty (first run), the seed route (`POST /api/seed`) generates a random admin password and **logs it to the server console**:

```
[seed] No existing admin password found. Generated a random password: <16-char string>.
Change it immediately in Admin > Settings after first login.
```

Change it via **Admin → Settings → Security → New Admin Password** (requires current password).

---

## 🛠️ Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server (port 3000) |
| `npm run build` | Production build (next build) |
| `npm run pages:build` | Cloudflare Pages build (`@cloudflare/next-on-pages@1`) |
| `npm run pages:dev` | Local Cloudflare Pages dev (wrangler) |
| `npm run pages:deploy` | Build + deploy to Cloudflare Pages |
| `npm run start` | Production server (next start) |
| `npm run lint` | ESLint |

---

## 🧱 Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| Next.js | 15.5 | App Router, API Routes (Edge) |
| React | 19 | UI library |
| TypeScript | 5 | Strict typing |
| Tailwind CSS | 4 | Styling (oklch color system) |
| shadcn/ui | latest | UI components (New York style) |
| Firebase | 12 | Realtime Database (client SDK + REST) |
| Zustand | 5 | Client state (with `persist`) |
| Framer Motion | 12 | Animations |
| Lucide React | latest | Icons |
| Sonner | 2 | Toast notifications |
| next-themes | 0.4 | Dark/Light mode |
| hls.js | 1.6 | HLS streaming (Live TV) |
| jose | 5 | JWT signing/verification (Edge-compatible) |
| bcryptjs | 2 | Password hashing (Edge-compatible) |
| zod | 3 | Input validation (payment route) |

---

## 🔐 Security Notes

- **Admin password is stored as a bcrypt hash** in `settings.adminPasswordHash`. The legacy `settings.adminPassword` (plaintext) field, if present, is auto-migrated to a hash on the next successful login.
- **Admin JWT** is signed with `ADMIN_JWT_SECRET` and stored in an `httpOnly`, `SameSite=Lax`, 8-hour cookie named `myflix_admin_session`. The client only knows a boolean `myflix-admin-loggedIn` flag (for UX), not the token.
- **`/admin/*` is server-side protected** by `src/middleware.ts` — even if the client flag is tampered with, the middleware redirects to `/admin/login`.
- **Rate limiting** is in-memory per-isolate (best-effort on Cloudflare's edge). For strict limits, also configure Cloudflare Rate Limiting Rules in the dashboard.
- **Payment webhook** verifies the `X-Bohudur-Signature` header against `BOHUDUR_WEBHOOK_SECRET` (if set). Even without a shared secret, the webhook always re-queries Bohudur for the canonical payment status before crediting.
- **Payment verify** no longer accepts a `?userId=` query param. The user is read from the payment record itself (IDOR fix).
- **Telegram auth** rejects empty `initData` in production. Dev mode (`NODE_ENV !== 'production'`) allows a fallback for local testing.

---

## 📝 License

Built for educational purposes. Free for personal use.

---

## 🙏 Credits

- Original project: [mdmubarokhosin/My-Flix](https://github.com/mdmubarokhosin/My-Flix)
- Rebuild: Next.js 15 + TypeScript + Firebase RTDB + Tailwind CSS 4 + shadcn/ui + Cloudflare Pages (Edge)
