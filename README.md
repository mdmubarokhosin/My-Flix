# MyFlix - Stream Movies & Videos

> Production-ready full-stack video streaming platform built with Next.js 16, TypeScript, Firebase Realtime Database, Tailwind CSS 4, and shadcn/ui.

> Mobile থেকে Termux দিয়ে রান করা যাবে এবং Cloudflare Pages এ ডিপ্লয় করা যাবে।

---

## Table of Contents

- [Project Overview](#-project-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Installation & Setup](#-installation--setup)
- [Firebase Realtime Database Rules](#-firebase-realtime-database-rules)
- [Run on Termux](#-run-on-termux)
- [Deploy to Cloudflare Pages](#-deploy-to-cloudflare-pages)
- [Database Schema](#-database-schema)
- [API Routes](#-api-routes)
- [Coin System](#-coin-system)
- [Video Source Support](#-video-source-support)
- [Admin Panel](#-admin-panel)
- [Notification System](#-notification-system)
- [Pages Overview](#-pages-overview)
- [Scripts](#-scripts)
- [License](#-license)

---

## Project Overview

MyFlix is a feature-rich video streaming platform. Built from scratch with Next.js 16 App Router, Firebase Realtime Database (both client SDK and server-side REST API), Zustand state management, and shadcn/ui components.

### Key Architecture Decisions

| Aspect | Implementation |
|--------|---------------|
| Database | Firebase Realtime Database (client SDK + server REST API, no Admin SDK) |
| Authentication | Simple password-based admin auth (no Firebase Auth) |
| User Identification | crypto.randomUUID() stored in localStorage |
| State Management | Zustand 5 with persist middleware |
| Navigation | SPA-style (no page reloads) via Zustand state |
| Styling | Tailwind CSS 4 + shadcn/ui (New York style) + oklch color system |
| Animations | Framer Motion |
| Icons | Lucide React + Bootstrap Icons (CDN) |
| Toast | Sonner |

---

## Features

### Video Streaming
- **Multi-source video player** - MP4, YouTube, Vimeo, Dailymotion, Google Drive, TeraBox, Rumble, Blogger, Abyss Player
- **Auto URL detection** - Automatically selects correct player type based on URL
- **Featured video carousel** - Auto-cycling hero section on home page
- **Category-based browsing** - 10+ categories with horizontal scroll rows
- **TikTok-style Shorts** - Vertical swipe short video feed with gesture support
- **TMDB Integration** - Movie details, cast, screenshots, crew, genres from TMDB API

### Coin Economy
- **Daily Check-in** - 7-day streak system (coins increase each day)
- **Watch Ads** - Earn 5 coins per ad, max 10 per day
- **Video Purchase** - Unlock premium videos with coins
- **Gift Code Redemption** - XXXX-XXXX-XXXX format crypto-safe gift codes
- **Coin Sharing** - Share coins with other users via generated gift codes
- **Transaction History** - Complete transaction log with type icons

### Admin Panel
- **Password-protected** (default: admin123)
- **Dashboard** - Stats and counters
- **Video CRUD** - Create, edit, delete videos with TMDB auto-fill
- **Category Management** - CRUD with Bootstrap Icon picker (60+ icons)
- **Gift Code Generator** - Custom coin amounts
- **User Management** - User list, coin editing, ban/unban, delete
- **Notification System** - Send alerts/links to all or specific users (2 types)
- **Settings** - Password change, TMDB API key, Ads notice message

### UI/UX
- **Mobile-first responsive design**
- **Dark/Light theme** (next-themes)
- **Framer Motion animations**
- **shadcn/ui components** (New York style, 40+ components)
- **SPA-style navigation** (Zustand state, no page reloads)
- **Sticky header + bottom navigation**
- **Loading skeletons** everywhere
- **Toast notifications** (sonner)

---

## Tech Stack

| Tool | Version | Purpose |
|------|---------|--------|
| Next.js | 16.x | App Router, API Routes |
| React | 19.x | UI library |
| TypeScript | 5.x | Strict typing |
| Tailwind CSS | 4.x | Styling (oklch color system) |
| shadcn/ui | latest | UI components (New York style) |
| Firebase | 12.x | Realtime Database (client SDK + server REST) |
| Zustand | 5.x | Client state management |
| Framer Motion | 12.x | Animations |
| Lucide React | latest | Icons |
| Sonner | 2.x | Toast notifications |
| next-themes | 0.4.x | Dark/Light mode |
| React Query | 5.x | Data fetching |
| date-fns | 4.x | Date formatting |
| uuid | 11.x | ID generation |

---

## Project Structure

```
Web-Test/
├── public/
│   ├── logo.svg               # App logo
│   └── robots.txt             # SEO robots
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout (ThemeProvider, Toaster, Bootstrap Icons CDN)
│   │   ├── page.tsx            # Main SPA shell + NotificationModal
│   │   ├── globals.css         # Global styles + custom utilities
│   │   └── api/                # 20+ API routes
│   │       ├── route.ts        # Health check
│   │       ├── seed/route.ts   # Demo data seeder
│   │       ├── notifications/route.ts  # Notification CRUD (NEW)
│   │       ├── videos/
│   │       │   ├── route.ts    # GET (list), POST (create)
│   │       │   └── [id]/route.ts  # GET, PUT, DELETE
│   │       ├── categories/
│   │       │   ├── route.ts    # GET, POST
│   │       │   └── [id]/route.ts  # DELETE
│   │       ├── user/
│   │       │   ├── route.ts         # GET, PUT, POST (ensure)
│   │       │   ├── favorites/route.ts   # GET, POST, DELETE
│   │       │   ├── purchases/route.ts   # GET, POST
│   │       │   ├── transactions/route.ts # GET, POST
│   │       │   └── checkin/route.ts      # POST (7-day streak)
│   │       ├── gift-codes/
│   │       │   ├── route.ts        # GET, POST (generate)
│   │       │   ├── redeem/route.ts  # POST (redeem)
│   │       │   └── share/route.ts   # POST (share coins)
│   │       ├── admin/
│   │       │   ├── route.ts      # GET (stats)
│   │       │   ├── login/route.ts # POST (password verify)
│   │       │   └── users/route.ts # GET, PUT, DELETE
│   │       ├── settings/route.ts # GET, PUT
│   │       ├── tmdb/route.ts    # GET (details, search, trending)
│   │       └── shorts/route.ts   # GET
│   ├── components/
│   │   ├── app/               # 12 application components
│   │   │   ├── Header.tsx          # Sticky header with coin balance
│   │   │   ├── BottomNav.tsx       # 5-tab bottom navigation
│   │   │   ├── HomePage.tsx        # Featured + category rows
│   │   │   ├── VideoCard.tsx       # Portrait + horizontal cards
│   │   │   ├── VideoPlayer.tsx     # Multi-source player + TMDB
│   │   │   ├── SearchPage.tsx      # Debounced search + trending
│   │   │   ├── ShortsPage.tsx      # TikTok-style vertical feed
│   │   │   ├── EarnPage.tsx        # Check-in + ads + history
│   │   │   ├── RedeemPage.tsx      # Gift code redemption + share
│   │   │   ├── ProfilePage.tsx     # Profile + 3 tabs
│   │   │   ├── AdminPanel.tsx      # 7-tab admin dashboard
│   │   │   └── CategoryDetailPage.tsx  # Category grid
│   │   └── ui/                # shadcn/ui components (40+)
│   ├── lib/
│   │   ├── firebase-client.ts # Client-side Firebase SDK (hardcoded config)
│   │   ├── firebase-server.ts # Server-side Firebase RTDB (REST API class)
│   │   ├── db.ts             # Re-export for backward compatibility
│   │   ├── auth.ts           # Admin password verification
│   │   ├── store.ts          # Zustand store with persist
│   │   ├── types.ts          # TypeScript interfaces
│   │   ├── video-utils.ts    # URL resolver + helpers
│   │   └── utils.ts          # cn() utility
│   └── hooks/
│       ├── use-toast.ts      # Toast hook
│       └── use-mobile.ts     # Mobile detection hook
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
└── components.json            # shadcn/ui config
```

---

## Installation & Setup

### Prerequisites

- **Node.js** 18+ or **Bun** latest
- **Git**
- **Firebase project** with Realtime Database enabled

### Step 1: Clone Repo

```bash
git clone https://github.com/mdmubarokhosin/Web-Test.git
cd Web-Test
```

### Step 2: Install Dependencies

```bash
# Using Bun (recommended)
bun install

# Or npm
npm install
```

### Step 3: Firebase Setup

#### a. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add Project**, give it a name (e.g., myflix-app)
3. Click **Create Project**

#### b. Create Realtime Database

1. In Firebase Console, go to **Build** > **Realtime Database**
2. Click **Create Database**
3. Select **Start in Test Mode** (you can change to Production mode later)
4. Select a location (e.g., asia-southeast1)

#### c. Get Firebase Config

1. Go to Firebase Console > **Project Settings** (gear icon) > **General** tab
2. Scroll down to **Your apps** > **Web app** (</> icon)
3. Click **Register app** or select existing web app
4. Copy the `firebaseConfig` object
5. Update the config in `src/lib/firebase-client.ts` and `src/lib/firebase-server.ts` with your values:
   ```js
   apiKey: "YOUR_API_KEY",
   authDomain: "YOUR_PROJECT.firebaseapp.com",
   databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
   projectId: "YOUR_PROJECT_ID",
   storageBucket: "YOUR_PROJECT.appspot.com",
   messagingSenderId: "YOUR_SENDER_ID",
   appId: "YOUR_APP_ID"
   ```

> **Note:** This project does NOT use Firebase Admin SDK, Firestore, Service Account Keys, or `.env` files. The Firebase config is hardcoded in two files (`firebase-client.ts` and `firebase-server.ts`). Server-side database access uses the Firebase REST API directly.

### Step 4: Set Database Rules

See the **Firebase Realtime Database Rules** section below.

### Step 5: Start Dev Server

```bash
bun run dev
```

Server will start at `http://localhost:3000`.

On first visit, 30 demo videos, 10 categories, and demo data will be auto-seeded to Firebase Realtime Database.

---

## Firebase Realtime Database Rules

Go to Firebase Console > **Build** > **Realtime Database** > **Rules** tab and paste one of the following rule sets, then click **Publish**.

### Option 1: Development / Open Rules (Recommended for testing)

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

### Option 2: Structured Production Rules

```json
{
  "rules": {
    "videos": {
      ".read": true,
      ".write": true
    },
    "categories": {
      ".read": true,
      ".write": true
    },
    "users": {
      ".read": true,
      ".write": true
    },
    "giftCodes": {
      ".read": true,
      ".write": true
    },
    "shortVideos": {
      ".read": true,
      ".write": true
    },
    "transactions": {
      ".read": true,
      ".write": true
    },
    "favorites": {
      ".read": true,
      ".write": true
    },
    "purchases": {
      ".read": true,
      ".write": true
    },
    "checkIns": {
      ".read": true,
      ".write": true
    },
    "settings": {
      ".read": true,
      ".write": true
    },
    "notifications": {
      ".read": true,
      ".write": true
    }
  }
}
```

### Option 3: Restricted Production Rules (Admin-only write via server)

```json
{
  "rules": {
    "videos": {
      ".read": true,
      ".write": false
    },
    "categories": {
      ".read": true,
      ".write": false
    },
    "users": {
      ".read": "auth != null",
      ".write": false
    },
    "giftCodes": {
      ".read": true,
      ".write": false
    },
    "shortVideos": {
      ".read": true,
      ".write": false
    },
    "transactions": {
      ".read": "auth != null",
      ".write": false
    },
    "favorites": {
      ".read": "auth != null",
      ".write": false
    },
    "purchases": {
      ".read": "auth != null",
      ".write": false
    },
    "checkIns": {
      ".read": true,
      ".write": false
    },
    "settings": {
      ".read": true,
      ".write": false
    },
    "notifications": {
      ".read": true,
      ".write": false
    }
  }
}
```

> **Important:** Since this project uses the Firebase REST API from server-side API routes (not the Admin SDK), the server requests are treated as unauthenticated. If you use Option 3, you must ensure your API routes have proper authentication, or the server-side writes will fail. **Option 1 or 2 is recommended for this project.**

---

## Run on Termux

### Step 1: Install & Update Termux

```bash
pkg update && pkg upgrade -y
```

### Step 2: Install Bun

```bash
pkg install tur-repo -y
pkg install openssl -y
pkg install git -y
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
```

### Step 3: Project Setup

```bash
cd ~/storage/shared/Web-Test  # or your project path
bun install
```

### Step 4: Firebase Configuration

Update Firebase config in `src/lib/firebase-client.ts` and `src/lib/firebase-server.ts` as described above.

### Step 5: Start Server

```bash
bun run dev
```

Open `http://localhost:3000` in mobile browser.

---

## Deploy to Cloudflare Pages

Since this project uses Firebase Realtime Database (cloud-hosted), you can deploy directly to Cloudflare Pages! No database migration needed.

### Deploy Steps

```bash
# Initialize git repo
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

Then go to Cloudflare Dashboard > Pages > Create Project > Connect GitHub.

Build settings:
- **Build command:** `bun run build`
- **Output directory:** `.next`
- **Node.js version:** 18+

> **Note:** No environment variables needed for Firebase (config is hardcoded in source files).

---

## Database Schema

### Firebase Realtime Database Paths (11 top-level nodes):

| Path | Description |
|------|------------|
| **videos** | Video data (name, url, thumbnail/img, amount, tags, featured, createdAt, tmdbId, quality, year, language, duration) |
| **categories** | Categories (name, icon) - stored inside `settings` |
| **users** | User data (firstName, lastName, username, balance, streak, lastCheckIn, isBanned, purchased[], favorites[], transactions[], giftHistory[]) - doc ID = userId |
| **transactions** | Transactions (type: earn/spend/redeem/gift/admin/checkin, title, amount, time) |
| **giftCodes** | Gift codes (code: XXXX-XXXX-XXXX, amount, package, status: active/used, redeemedBy, redeemedAt, createdAt) |
| **favorites** | Favorites (userId + videoId fields) |
| **purchases** | Purchases (userId + videoId fields, coins) |
| **checkIns** | Check-ins (userId + date fields, streak, coins) |
| **settings** | Settings (categories[], adminPassword, tmdbApiKey, adsNotice) - key-value store |
| **shortVideos** | Short videos (title, url, thumbnail, views, createdAt) |
| **notifications** | Admin notifications (type, title, message, link, targetUserId, isActive, createdAt, createdBy) |

---

## API Routes

| Method | Path | Description |
|--------|------|------------|
| GET | `/api` | Health check |
| POST | `/api/seed` | Seed demo data (30 videos, 10 categories) |
| GET | `/api/videos` | Video list (?search=, ?category=, ?featured=) |
| POST | `/api/videos` | Create video (Admin) |
| GET | `/api/videos/[id]` | Get single video |
| PUT | `/api/videos/[id]` | Update video (Admin) |
| DELETE | `/api/videos/[id]` | Delete video (Admin) |
| GET | `/api/categories` | Category list |
| POST | `/api/categories` | Create category (Admin) |
| PUT | `/api/categories` | Bulk update categories (Admin) |
| DELETE | `/api/categories/[id]` | Delete category (Admin) |
| GET/PUT/POST | `/api/user` | Read/Update/Create user |
| GET/POST/DELETE | `/api/user/favorites` | Favorites CRUD |
| DELETE | `/api/user/favorites/[id]` | Remove specific favorite |
| GET/POST | `/api/user/purchases` | Purchase list/create |
| GET/POST | `/api/user/transactions` | Transaction list/create |
| POST | `/api/user/checkin` | Daily check-in (7-day streak) |
| GET/POST | `/api/gift-codes` | Gift code list/generate |
| POST | `/api/gift-codes/redeem` | Redeem code |
| POST | `/api/gift-codes/share` | Share coins (create gift code) |
| GET | `/api/admin` | Admin stats |
| POST | `/api/admin/login` | Admin password verification |
| GET/PUT/DELETE | `/api/admin/users` | User management |
| GET/PUT | `/api/settings` | Settings (GET excludes password) |
| GET | `/api/tmdb?action=details&id=123` | TMDB movie details |
| GET | `/api/tmdb?action=search&query=xxx` | TMDB search |
| GET | `/api/tmdb?action=trending` | TMDB trending movies |
| GET/POST/PUT/DELETE | `/api/notifications` | Notification CRUD (NEW) |

---

## Coin System

### Earning Methods:

| Method | Coins | Limit |
|--------|-------|-------|
| Daily Check-in (Day 1) | 10 | 1x/day |
| Daily Check-in (Day 2-6) | 15-25 | 1x/day |
| Daily Check-in (Day 7) | 50 | 1x/day |
| Watch Ad | 5 | 10x/day |
| Gift Code Redeem | Variable | Per code |
| Admin Grant | Variable | Unlimited |

### Spending:

| Purpose | Coins |
|---------|-------|
| Video Purchase | Per video (0 = free) |
| Coin Sharing | Custom amount |

### Transaction Types:
- `earn` - Earnings from check-in/ads
- `spend` - Video purchases
- `redeem` - Gift code redemption
- `gift` - Received from admin or another user
- `admin` - Admin balance adjustment
- `checkin` - Daily check-in reward

---

## Video Source Support

The `resolveVideoUrl()` function automatically detects the video source:

| Source | Player Type | Example URL |
|--------|-------------|-------------|
| Direct MP4/WebM/OGG | HTML5 `<video>` | `https://example.com/video.mp4` |
| YouTube | iframe embed | `https://youtube.com/watch?v=xxx` |
| Vimeo | iframe embed | `https://vimeo.com/12345` |
| Dailymotion | iframe embed | `https://dailymotion.com/video/xxx` |
| Google Drive | iframe preview | `https://drive.google.com/file/d/xxx` |
| TeraBox | iframe | `https://terabox.com/s/xxx` |
| Rumble | iframe embed | `https://rumble.com/embed/xxx` |
| Blogger Video | iframe | `https://blogger.com/video.g?token=xxx` |
| Abyss Player | iframe | `https://abyssplayer.com/xxx` |
| Other | iframe (default) | Any URL |

---

## Admin Panel

### Access Methods:
1. Click the **Shield icon** in the Header
2. Tap the **version text 5 times** in Profile page (easter egg)

### Default Password: `admin123`

### 7 Tabs:

1. **Dashboard** - Total videos, users, gift codes, transactions, total coins
2. **Videos** - Create/edit/delete videos, TMDB auto-fill, category filter
3. **Categories** - CRUD with Bootstrap Icon Picker (60+ icons)
4. **Gift Codes** - Generate with custom coins, copy, filter (used/unused)
5. **Users** - User list, coin edit, ban/unban, delete
6. **Notifications** - Send notifications to all or specific users (2 types) **(NEW)**
7. **Settings** - Admin password change, TMDB API key, Ads notice message

---

## Notification System

### How It Works:

Admin can send notifications from the Admin Panel > **Notify** tab. Notifications appear as **modal dialogs** on the home page for users.

### Two Types of Notifications:

#### Type 1: Alert / Informational
- Shows a dialog with a **title**, **message**, and a single **"OK"** button
- Used for announcements, maintenance notices, general info
- Example: "Server maintenance scheduled for tonight"

#### Type 2: Action / Interactive
- Shows a dialog with **title**, **message**, and two buttons: **"Cancel"** and **"Visit"**
- The "Visit" button opens a URL in a new tab
- Used for promotions, updates, redirecting users to specific pages
- Example: "New movie available! Watch now" with a link to the movie

### Targeting:
- **All Users** - Notification appears for every user
- **Specific User** - Notification only appears for the selected user (by user ID)

### Features:
- Real-time delivery via Firebase Realtime Database listener
- Multiple notifications queue (shown one after another)
- Dismiss tracking (already seen notifications are not shown again)
- Toggle active/inactive from admin panel
- Delete notifications from admin panel

### Database Structure:
```json
"notifications": {
  "notif_id_1": {
    "type": "alert",
    "title": "Welcome!",
    "message": "Welcome to MyFlix!",
    "targetUserId": null,
    "isActive": true,
    "createdAt": 1722500000000,
    "createdBy": "admin"
  },
  "notif_id_2": {
    "type": "action",
    "title": "New Movie!",
    "message": "Check out the latest release",
    "link": "https://example.com/movie",
    "targetUserId": "user_id_here",
    "isActive": true,
    "createdAt": 1722600000000,
    "createdBy": "admin"
  }
}
```

---

## Pages Overview

| Page | Description |
|------|------------|
| **Home** | Featured carousel + category rows with horizontal scroll |
| **Video Player** | Multi-source player, purchase flow, TMDB details, related videos |
| **Search** | Debounced search (300ms), trending tags, category grid, recently added |
| **Shorts** | TikTok-style vertical swipe, like/share/mute, auto-advance |
| **Earn** | Coin balance card, 7-day streak calendar, ad watch (5 coins x10/day), transaction history |
| **Redeem** | Gift code input (auto-format XXXX-XXXX-XXXX), coin rain animation, coin sharing |
| **Profile** | Avatar, stats cards, dark/light toggle, 3 tabs (Favorites/Purchases/History) |
| **Admin** | 7-tab dashboard (stats/videos/categories/codes/users/notifications/settings) |
| **Category Detail** | Grid view with favorite/purchase support |

---

## Scripts

| Command | Description |
|--------|------------|
| `bun run dev` | Start dev server (port 3000) |
| `bun run build` | Production build |
| `bun run start` | Production server |
| `bun run lint` | ESLint check |

---

## License

This project is built for educational purposes. Free for personal use.

---

## Credit

- **Original Project:** [mdmubarokhosin/My-Flix](https://github.com/mdmubarokhosin/My-Flix)
- **Rebuild:** Next.js 16 + TypeScript + Firebase Realtime Database + Tailwind CSS 4 + shadcn/ui
- **Design:** Mobile-first, Dark/Light theme, Framer Motion animations

---

> Built for developers who want to test on mobile via Termux and deploy for free on Cloudflare Pages.
