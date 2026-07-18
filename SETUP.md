# SETUP.md — All Video Hub Installation Guide

Complete, step-by-step instructions for setting up and deploying the All Video Hub project. This guide covers local testing, static hosting, Firebase backend setup, Telegram Mini App configuration, and production hardening.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Development Setup](#2-local-development-setup)
3. [Firebase Backend Setup](#3-firebase-backend-setup)
4. [Deploy to Static Hosting](#4-deploy-to-static-hosting)
5. [Telegram Mini App Setup](#5-telegram-mini-app-setup)
6. [Admin Panel Setup](#6-admin-panel-setup)
7. [Production Hardening Checklist](#7-production-hardening-checklist)
8. [Troubleshooting](#8-troubleshooting)
9. [File-by-File Reference](#9-file-by-file-reference)

---

## 1. Prerequisites

### What you need before you start

- **A modern web browser** (Chrome, Firefox, Safari, Edge — latest version)
- **A text editor** (VS Code, Sublime Text, Notepad++, or even Notepad)
- **Python 3** installed (only for local testing — comes preinstalled on macOS/Linux; install from python.org on Windows)
- **Node.js 18+** (optional — only needed if you want to run the syntax-validation script in `scripts/validate_html_scripts.py`)
- **A Firebase account** (free tier is sufficient — https://console.firebase.google.com)
- **A Telegram account** (for the Mini App integration — https://telegram.org)

### Skill level

- Basic HTML/JavaScript knowledge is helpful but not required — this guide walks you through every step.
- No build tools needed. The project is plain HTML/CSS/JS — no `npm install`, no bundler, no compiler.

---

## 2. Local Development Setup

### Step 1: Unzip the project

```bash
unzip main.zip -d my-flix
cd my-flix
```

The folder structure should match the tree in [README.md](README.md).

### Step 2: Start a local web server

You MUST use a local server (not `file://`) because the app uses `fetch('movis.json')` which is blocked by the file:// protocol.

**Option A — Python (recommended, simplest):**
```bash
cd my-flix
python3 -m http.server 8080
```

**Option B — Node.js (if Python is unavailable):**
```bash
npx http-server -p 8080
```

**Option C — VS Code Live Server extension:**
1. Install the "Live Server" extension by Ritwick Dey.
2. Right-click `index.html` → "Open with Live Server".

### Step 3: Open the app in your browser

Visit **http://localhost:8080/** in your browser.

You should see:
- The preloader animation (4 red bars pulsing)
- The home page with video cards organized by category
- The bottom navigation bar (Home, Categories, Earn, Gift, Profile, Admin)

### Step 4: Test the admin panel

1. Click the **Admin** button in the bottom navigation.
2. You'll be redirected to `admin.html`.
3. Enter the default password: `admin123`
4. Click **Login**.
5. You should see the admin dashboard with stats.

> ⚠️ **Important:** Change the admin password immediately after your first login. See [§6](#6-admin-panel-setup).

### Step 5: Verify all pages work

Open each page and verify it loads:
- `http://localhost:8080/index.html` — main app
- `http://localhost:8080/admin.html` — admin panel
- `http://localhost:8080/earn.html` — earn coins page
- `http://localhost:8080/redeem.html` — gift redeem page
- `http://localhost:8080/tiktok.html` — short video feed
- `http://localhost:8080/anime/naruto01.html` — anime episode list
- `http://localhost:8080/1tera/tv.html?q=https://example.com/video.mp4` — generic video player wrapper

---

## 3. Firebase Backend Setup

The app uses Firebase Realtime Database for:
- **videos** — movie catalog (falls back to `movis.json` if Firebase is empty)
- **users** — per-user balance, favorites, purchases, transactions, streaks
- **gifts** — redeemable gift codes
- **settings** — categories list, admin password

### Step 1: Create a Firebase project

1. Go to https://console.firebase.google.com
2. Click **Add project** (or use an existing one — the project is preconfigured for `flix-net-bd1`).
3. Enter a project name (e.g., `my-video-hub`).
4. Toggle Google Analytics off (not needed for this app).
5. Click **Create project**.

### Step 2: Add a Web App to your project

1. In the Firebase console, click the **Web icon** (`</>`) to add a web app.
2. Enter an app nickname (e.g., `video-hub-web`).
3. Skip Firebase Hosting setup for now (we'll use a different host in §4).
4. Click **Register app**.
5. Firebase will show you a `firebaseConfig` object. Copy it.

### Step 3: Update `firebaseConfig` in the project files

Open these files in your text editor and replace the existing `firebaseConfig` with the one you copied:

- `index.html` (around line 891)
- `admin.html` (around line 706)
- `redeem.html` (around line 1292)

The config looks like this:
```js
const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project-default-rtdb.firebaseio.com",
    projectId: "your-project",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef123456"
};
```

### Step 4: Enable Realtime Database

1. In the Firebase console, go to **Build → Realtime Database** from the left sidebar.
2. Click **Create Database**.
3. Choose a location close to your users (e.g., `us-central1` for North America, `europe-west1` for Europe, `asia-southeast1` for South Asia).
4. Start in **test mode** for now (we'll lock it down in Step 5).
5. Click **Enable**.

### Step 5: Apply Security Rules

1. In the Firebase console, go to **Realtime Database → Rules**.
2. Open the `firebase-rules.json` file from the project in your text editor.
3. Copy the entire contents.
4. Paste it into the Firebase Rules editor, replacing the existing rules.
5. Click **Publish**.

The rules you just applied:
- Allow anyone to **read** gift codes, videos, and categories.
- Allow anyone to **create** a gift code (only if it has `amount` + `status` fields).
- Allow a gift code to be **redeemed** only via the `active → used` transition (preserves amount).
- Allow anyone to **create** a video (only if it has `name` + `url` fields).
- Allow only authenticated users to **read/write** user data, and only their own record.
- Allow only authenticated users to **write** settings (categories, admin password).

### Step 6: (Optional) Seed initial data

If you want to populate Firebase with the default 97 videos from `movis.json`:

1. In the Firebase console, go to **Realtime Database → Data**.
2. Click the **⋮** (three dots) menu at the top.
3. Click **Import JSON**.
4. Select the `movis.json` file from the project.
5. Click **Import**.

Now the app will read from Firebase instead of falling back to `movis.json`.

### Step 7: Enable Firebase Auth (RECOMMENDED for production)

The Firebase rules require `auth != null` for user data writes. To make this work:

1. In the Firebase console, go to **Build → Authentication → Sign-in method**.
2. Enable **Anonymous** sign-in.
3. (Optional) Enable **Email/Password** or **Google** sign-in for stricter user identity.

Then add this snippet to `index.html` and `admin.html` (inside the `<script>` block, after Firebase init):

```js
firebase.auth().signInAnonymously().catch(e => console.warn('Auth failed:', e));
```

This gives every visitor a stable `auth.uid` so the rules can enforce per-user data isolation.

---

## 4. Deploy to Static Hosting

The project is pure static HTML/CSS/JS — no server-side code required. You can deploy to any static host.

### Option A — GitHub Pages (FREE, recommended)

1. Create a new public GitHub repository (e.g., `my-video-hub`).
2. Upload all project files to the repo root:
   ```bash
   cd my-flix
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/my-video-hub.git
   git push -u origin main
   ```
3. Go to your repo on GitHub → **Settings → Pages**.
4. Under **Source**, select **Deploy from a branch**.
5. Select `main` branch and `/ (root)` folder.
6. Click **Save**.
7. Wait 1-2 minutes. Your site will be live at `https://YOUR_USERNAME.github.io/my-video-hub/`.

### Option B — Netlify (FREE, drag-and-drop)

1. Go to https://app.netlify.com/drop
2. Drag the entire `my-flix` folder onto the page.
3. Netlify will deploy instantly and give you a URL like `https://random-name.netlify.app`.
4. (Optional) Click "Claim site" to add it to your account and configure a custom domain.

### Option C — Vercel (FREE)

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the `my-flix` directory.
3. Follow the prompts (accept all defaults).
4. Your site will be live at `https://your-app.vercel.app`.

### Option D — Cloudflare Pages (FREE)

1. Go to https://pages.cloudflare.com
2. Click **Create a project** → **Direct Upload**.
3. Drag the `my-flix` folder.
4. Click **Deploy site**.
5. Your site will be live at `https://your-app.pages.dev`.

### Option E — Firebase Hosting (FREE)

Since you're already using Firebase for the database, you might as well use Firebase Hosting:

1. Install Firebase CLI: `npm i -g firebase-tools`
2. Login: `firebase login`
3. In the `my-flix` directory, run: `firebase init hosting`
   - Select your Firebase project.
   - Public directory: `.` (current directory)
   - Single-page app: No
   - GitHub Action: No (unless you want CI/CD)
4. Deploy: `firebase deploy`

Your site will be live at `https://your-project.web.app`.

### Option F — cPanel / Shared Hosting

1. Zip the entire `my-flix` folder.
2. Log in to your cPanel.
3. Open **File Manager** → `public_html`.
4. Click **Upload** and select the zip file.
5. Right-click the uploaded zip → **Extract`.
6. Move all extracted files directly into `public_html` (no subfolder).
7. Visit `https://yourdomain.com/` — the app should load.

### Important: HTTPS is required

Telegram Mini Apps **require HTTPS**. All the hosting options above provide HTTPS by default.

If you're using a custom domain, make sure to:
1. Enable HTTPS (use Let's Encrypt for free SSL certificates).
2. Redirect all HTTP traffic to HTTPS.

---

## 5. Telegram Mini App Setup

### Step 1: Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather).
2. Send `/newbot`.
3. Choose a name (e.g., `All Video Hub`).
4. Choose a username (must end in `_bot`, e.g., `allvideohub_bot`).
5. **Save the bot token** BotFather gives you — you'll need it for server-side validation later.

### Step 2: Configure the Mini App

1. In BotFather, send `/newapp`.
2. Select your bot.
3. Provide the following:
   - **Title:** `All Video Hub`
   - **Description:** `Stream movies, anime, web series and more`
   - **Cover image:** 640×360 JPEG (any image representing your app)
   - **Preview image:** 640×360 JPEG (a screenshot of the app)
   - **Web App URL:** `https://YOUR_DEPLOYED_URL/index.html` (use the URL from §4)
   - **Short description:** `Stream movies, anime, and more`

### Step 3: Set up the Menu Button (optional but recommended)

To make the Mini App accessible via the bot's menu button:

1. In BotFather, send `/setmenubutton`.
2. Select your bot.
3. Send the URL: `https://YOUR_DEPLOYED_URL/index.html`
4. Send button text: `🎬 Open Video Hub`
5. (Optional) Upload an icon (recommended size: 256×256 PNG).

### Step 4: Configure Bot Commands (optional)

1. In BotFather, send `/setcommands`.
2. Select your bot.
3. Send:
   ```
   start - Launch All Video Hub
   admin - Open Admin Panel
   help - Get help
   ```

### Step 5: Test the Mini App

1. Open your bot on Telegram: `https://t.me/YOUR_BOT_USERNAME`
2. Tap the **menu button** (or send `/start`).
3. Tap **"Open App"** or the web app button.
4. The Mini App should launch in Telegram's in-app browser.

### Step 6: (Optional) Server-side initData validation

For sensitive operations (admin login, balance updates), validate `initData` server-side:

1. Deploy a Cloud Function (Firebase Functions) or any backend.
2. When admin logs in, send `TMA.Auth.getInitData()` to your backend.
3. Backend validates the hash using your bot token:
   ```python
   import hmac, hashlib, urllib.parse
   def validate_init_data(init_data, bot_token):
       parsed = dict(urllib.parse.parse_qsl(init_data))
       hash_value = parsed.pop('hash', None)
       data_check_string = '\n'.join(f'{k}={v}' for k, v in sorted(parsed.items()))
       secret_key = hmac.new(b'WebAppData', bot_token.encode(), hashlib.sha256).digest()
       computed_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
       return computed_hash == hash_value
   ```
4. Backend returns a signed JWT or session token.
5. Frontend stores the token and uses it for admin operations.

---

## 6. Admin Panel Setup

### Step 1: First-time login

1. Visit `https://YOUR_DEPLOYED_URL/admin.html`.
2. Enter the default password: `admin123`.
3. Click **Login**.

### Step 2: Change the admin password (CRITICAL)

1. Go to **Settings → Change Admin Password**.
2. Enter the current password (`admin123`).
3. Enter a new password (minimum 6 characters; recommend 16+ characters with a mix of letters, numbers, and symbols).
4. Confirm the new password.
5. Click **Update Password**.

The new password is saved to both:
- `localStorage` (for instant access on this device)
- Firebase `settings/adminPassword` (for cross-device sync)

### Step 3: Add your first video

1. Go to the **Videos** tab.
2. Fill in the form:
   - **Name:** (e.g., `My First Video`)
   - **URL:** A direct video URL (`.mp4`, `.webm`, `.m3u8`), or a YouTube/Vimeo/TeraBox/Google Drive URL.
   - **Thumbnail URL:** Direct image URL (`.jpg`, `.png`, `.webp`).
   - **Coins:** The cost to unlock the video (e.g., `5`).
   - **Duration:** (e.g., `01:30:00`).
   - **Tags:** Comma-separated (e.g., `action, hindi, 2024`).
   - **Info:** One description line per line (becomes paragraphs in the detail view).
3. Click **Add Video** (or use the Telegram MainButton on mobile).

### Step 4: Create a gift code

1. Go to the **Codes** tab.
2. Enter the **Amount** (e.g., `100` coins).
3. Enter a **Package name** (e.g., `Welcome Bonus`).
4. Click **Generate Code**.
5. The code is automatically copied to your clipboard.
6. Share the code with your users via Telegram.

### Step 5: Manage categories

1. Go to the **Dashboard** tab.
2. Scroll to the **Categories** section.
3. Add a new category:
   - **Name:** (e.g., `Sci-Fi`)
   - **Icon:** A Font Awesome class (e.g., `fas fa-rocket`). Browse at https://fontawesome.com/icons.
4. Click **Add Category**.

To edit or delete an existing category, click the **Edit** (pencil) or **Delete** (trash) button next to it. Renaming a category will also update the tags on any videos that use the old name.

---

## 7. Production Hardening Checklist

Before going live with real users, work through this checklist:

### Security

- [ ] **Change admin password** from `admin123` to a strong 16+ character password.
- [ ] **Enable Firebase Auth** (anonymous or Telegram sign-in) so each user has an `auth.uid`.
- [ ] **Apply the hardened Firebase rules** from `firebase-rules.json` (already done if you followed §3 Step 5).
- [ ] **Tighten rules further**: restrict `videos` and `gifts` writes to admin-only using an `admins` node:
  ```json
  "videos": {
    ".read": true,
    "$videoId": {
      ".write": "auth != null && root.child('admins/' + auth.uid).exists() && newData.hasChild('name') && newData.hasChild('url')"
    }
  }
  ```
- [ ] **Enable Firebase App Check** (console → Project Settings → App Check) to prevent abuse from non-app clients.
- [ ] **Move payment API key to backend** — the key in `redeem.html` is currently exposed in client-side JavaScript. Proxy the payment API call through a Firebase Function or other backend.
- [ ] **Set up server-side `initData` validation** for admin login (see §5 Step 6).
- [ ] **Hash admin password** — currently stored as plaintext in `settings/adminPassword`. Use a Cloud Function that compares bcrypt hashes.

### Performance

- [ ] **Add a content filter** for adult content (some entries in `movis.json` are 18+). Consider an age gate or content tagging system.
- [ ] **Backup Firebase database** periodically (console → Realtime Database → ⋮ → Export JSON).
- [ ] **Test offline mode** — disconnect your network and verify the app still loads `movis.json` from the browser cache.
- [ ] **Add a Service Worker** for offline support (not currently included — would require adding `sw.js` and registering it in `index.html`).

### UX

- [ ] **Verify mobile UX** on real devices (iOS Safari, Android Chrome, Telegram in-app browser).
- [ ] **Test the back button** on each page — both the in-app back button and the native Telegram BackButton.
- [ ] **Test haptic feedback** on Telegram mobile (iOS and Android). Desktop Telegram and web browsers will silently no-op.
- [ ] **Verify all video sources play** — some sources (TeraBox, Blogspot) require specific user agents. Use the `1tera/tv.html` wrapper for problematic sources.

### SEO

- [ ] **Submit `sitemap.xml`** to Google Search Console (after deploying to your final domain).
- [ ] **Update `robots.txt`** with your absolute sitemap URL: change `Sitemap:` (currently removed) to `Sitemap: https://yourdomain.com/sitemap.xml`.
- [ ] **Add Open Graph meta tags** to `index.html` for better social-media sharing (currently only basic meta tags are present).

---

## 8. Troubleshooting

### "Videos don't load" / Blank home page

1. Open browser DevTools (F12) → Console tab.
2. Look for red error messages.
3. **If you see `Failed to fetch movis.json`:**
   - You're running on `file://` protocol. Use a local server (§2 Step 2).
4. **If you see `Firebase init failed`:**
   - Your `firebaseConfig` is wrong. Re-check the values from §3 Step 2.
5. **If you see `Firebase: Permission denied`:**
   - Your security rules are too strict. Re-apply the rules from `firebase-rules.json`.
6. **If you see no errors but the page is empty:**
   - Check the Network tab — is `movis.json` returning 200 OK?
   - Try a hard refresh (Ctrl+Shift+R / Cmd+Shift+R).

### "Admin password forgotten"

1. Go to Firebase Console → Realtime Database → Data.
2. Navigate to `settings/adminPassword`.
3. Edit the value to `admin123` (or any new password).
4. Click **Save**.
5. Try logging in with the new password.

If you're locked out of the admin panel AND Firebase is also inaccessible, you can clear the local session:
1. Open browser DevTools (F12) → Application tab → Local Storage.
2. Find and delete the key `avh_admin_session`.
3. Refresh the page — you'll be asked to log in again.

### "Gift codes not redeeming"

1. Open browser DevTools (F12) → Console tab.
2. Try redeeming the code again.
3. Look for transaction errors in the console.
4. **If you see `permission_denied`:**
   - Your Firebase rules don't allow the `active → used` transition.
   - Re-apply the rules from `firebase-rules.json`.
5. **If you see `committed: false`:**
   - The code was already used by someone else (race condition was prevented).
   - Generate a new code in the admin panel.

### "Video plays on desktop but not on mobile"

1. Some video sources (TeraBox, Blogspot) check the User-Agent header.
2. Try the `1tera/tv.html` wrapper: change the video URL to `1tera/tv.html?q=<original-url>`.
3. Test on the actual Telegram mobile client (not just a mobile browser).

### "Telegram BackButton doesn't appear"

1. The native BackButton only appears in Telegram mobile clients (iOS and Android).
2. Desktop Telegram and web browsers don't support it.
3. Verify `tma-sdk.js` and `tma-bootstrap.js` are loaded (check Network tab).
4. Check the console for `[TMA]` errors.

### "Haptic feedback not working"

1. Haptics only work in Telegram mobile clients.
2. Desktop Telegram and web browsers don't support haptics.
3. The TMA SDK silently no-ops when haptics are unavailable — this is expected behavior.

### "Theme toggle doesn't persist"

1. The theme is saved to `localStorage` AND Firebase `users/<userId>/theme`.
2. If localStorage is disabled (private browsing, strict cookie settings), the theme won't persist.
3. Check the console for `localStorage save failed` warnings.

### "Preloader never disappears"

1. The preloader auto-hides after 15 seconds even if videos never load (safety net).
2. If it stays longer than 15 seconds, check the console for JavaScript errors blocking `init()`.
3. Try clearing localStorage and refreshing: `localStorage.clear(); location.reload();`

---

## 9. File-by-File Reference

| File | Purpose |
|------|---------|
| `index.html` | Main SPA. Home, categories, video player, earn, gift, profile, inline admin. 2,736 lines. |
| `admin.html` | Standalone admin panel with login, dashboard, CRUD for videos/categories/codes/users. 1,650 lines. |
| `earn.html` | Standalone earn-coins page with daily check-in and ad-watch rewards. 1,099 lines. |
| `redeem.html` | Standalone gift-redeem and coin-purchase page. 1,940 lines. |
| `tiktok.html` | TikTok-style short video feed (uses `18videos.json`). 848 lines. |
| `telegram.html` | Standalone HY3 ChatBot Mini App (separate feature, optional). 2,512 lines. |
| `tma-sdk.js` | Telegram Mini App SDK wrapper (MainButton, BackButton, HapticFeedback, etc.). 769 lines. |
| `tma-bootstrap.js` | TMA bootstrap helper (auto-haptics, viewport sync, settings button). 171 lines. |
| `movis.json` | Default video catalog (97 videos) — fallback when Firebase is empty. |
| `18videos.json` | Short-video catalog (186 videos) for `tiktok.html`. |
| `manifest.json` | PWA manifest for "Add to Home Screen" support. |
| `firebase-rules.json` | Database security rules — paste into Firebase Console. |
| `firebase-rules.json.txt` | Same rules, plain-text copy for easy copy/paste. |
| `firebase-rules-readme.md` | Explanation of each rule + hardening recommendations. |
| `robots.txt` | SEO crawler rules. |
| `sitemap.xml` | Sitemap for search engines. |
| `1tera/mp4.html` | Direct MP4 video player wrapper. |
| `1tera/gd.html` | Google Drive video player wrapper. |
| `1tera/tv.html` | Generic iframe/embed player wrapper (TeraBox, Blogspot, etc.). |
| `anime/naruto01.html` | Naruto Season 01 episode list (7 episodes). |
| `anime/naruto02.html` | Naruto Season 02 episode list. |
| `anime/naruto03.html` | Naruto Season 03 episode list. |
| `anime/naruto04.html` | Naruto Season 04 episode list. |
| `docs/coins add.md` | Bengali-language instructions for creating gift codes. |
| `docs/demo Episode list.html` | Template for creating new anime episode list pages. |
| `README.md` | Project overview and quick start. |
| `CHANGES.md` | Detailed list of all fixes applied in this build. |
| `SETUP.md` | This file — complete installation guide. |
| `DEPLOYMENT.md` | Telegram-specific deployment walkthrough. |

---

End of document. For feature requests or bugs, contact via Telegram or open an issue in your repo.
