# All Video Hub — Production-Ready HTML Website

A complete streaming-platform-style web app built with **vanilla HTML/CSS/JavaScript** and **Firebase Realtime Database**. Designed as a Telegram Mini App but works in any modern browser. Mobile-first, fully responsive, with a dedicated admin panel.

---

## 📁 Project Structure

```
my-flix/
├── index.html              ← Main app (home, categories, player, earn, gift, profile)
├── admin.html              ← Standalone admin panel (login + dashboard + CRUD)
├── movis.json              ← Default video catalog (97 videos) — fallback when Firebase empty
├── 18videos.json           ← Short-video catalog (186 videos) for tiktok.html
├── firebase-rules.json     ← Database security rules (paste into Firebase Console)
├── firebase-rules.json.txt ← Same rules (without comments — directly pasteable)
├── firebase-rules-readme.md← Explanation of each rule
├── earn.html               ← Standalone earn-coins page
├── redeem.html             ← Standalone gift-redeem page
├── telegram.html           ← Telegram HY3 ChatBot Mini App (separate)
├── tiktok.html             ← TikTok-style short video player
├── tma-sdk.js              ← Telegram Mini App SDK wrapper
├── tma-bootstrap.js        ← TMA bootstrap (auto-haptics, native back button, viewport sync)
├── manifest.json           ← PWA manifest
├── robots.txt              ← SEO crawler rules
├── sitemap.xml             ← Sitemap for search engines
├── README.md               ← This file
├── CHANGES.md              ← Detailed list of all fixes applied (NEW)
├── SETUP.md                ← Setup & installation documentation (NEW)
│
├── 1tera/                  ← Video player wrappers (used by URL resolver)
│   ├── gd.html             ← Google Drive player
│   ├── mp4.html            ← Direct MP4 player
│   └── tv.html             ← Generic iframe/embed player (TeraBox, etc.)
│
├── anime/                  ← Anime episode pages
│   ├── naruto01.html       ← Naruto Season 01 (edit episode list as needed)
│   ├── naruto02.html       ← Naruto Season 02
│   ├── naruto03.html       ← Naruto Season 03
│   └── naruto04.html       ← Naruto Season 04
│
└── docs/                   ← Internal docs
    ├── coins add.md        ← How to create gift codes (Bengali)
    └── demo Episode list.html ← Demo episode list template
```

---

## 🚀 Quick Start

### Option A — Local Test
1. Make sure all files stay in the same folder structure shown above.
2. Run a local server (required because `fetch('movis.json')` needs HTTP):
   ```bash
   cd my-flix
   python3 -m http.server 8080
   ```
3. Open `http://localhost:8080/` in your browser.

### Option B — Deploy to Any Static Host
Upload the entire `my-flix/` folder to:
- **GitHub Pages** — push to a repo, enable Pages
- **Netlify / Vercel / Cloudflare Pages** — drag-and-drop the folder
- **cPanel / Shared Hosting** — upload to `public_html/`
- **Firebase Hosting** — `firebase deploy` (recommended since you already use Firebase)

### Option C — Telegram Mini App
1. Talk to [@BotFather](https://t.me/BotFather), create or edit a bot.
2. Set the bot's **Menu Button URL** to your deployed `index.html` URL.
3. (Optional) Set a `/start` deep-link parameter like `video_42` to open a specific video.

---

## 📋 Setup & Installation

See **[SETUP.md](SETUP.md)** for the complete, step-by-step installation guide covering Firebase setup, security rules, Telegram bot configuration, and production hardening.

---

## 🔄 What Changed in This Build

See **[CHANGES.md](CHANGES.md)** for a complete, detailed list of every bug fixed, security improvement, and robustness enhancement applied to this build (vs. the original zip).

---

## 🔐 Admin Panel

The admin panel lives at **`admin.html`** — a complete, standalone page.

### First-time Login
- URL: `https://yoursite.com/admin.html`
- Default password: **`admin123`**
- **Change it immediately** via Settings → Change Admin Password.

### What You Can Do
| Tab         | Actions                                                       |
|-------------|---------------------------------------------------------------|
| Dashboard   | View stats (videos, codes, users, coins) + quick actions      |
| Videos      | Add / edit / delete videos (name, URL, thumbnail, coins, etc.)|
| Categories  | Add / delete category tags                                     |
| Gift Codes  | Generate redeemable codes (auto-copied to clipboard)          |
| Users       | Search users, edit balances, delete users                      |
| Settings    | Toggle dark/light theme, change admin password, logout         |

### Session
- Login persists for **4 hours** in `localStorage` (auto-expires after that).
- Logout from Settings → Session → Logout Admin.

---

## 🎬 How Video URLs Are Resolved

The app auto-detects the video source and renders the right player:

| URL Pattern                                         | Player Used                        |
|-----------------------------------------------------|------------------------------------|
| `*.mp4`, `*.webm`, `*.ogg`, `*.m3u8`                | Native HTML5 `<video>`             |
| `1tera/mp4.html?q=<url>`                            | Direct MP4 wrapper                 |
| `1tera/gd.html?q=<fileId>`                          | Google Drive iframe                |
| `1tera/tv.html?q=<url>`                             | Generic iframe wrapper             |
| `blogger.com/video.g?token=...`                     | Blogger video iframe               |
| `blogspot.com/<date>/<slug>`                        | Blogspot video iframe              |
| `terabox.com/s/...` / `1024terabox.com/s/...`       | Auto-wrapped via `1tera/tv.html`   |
| `drive.google.com/file/d/<id>/view`                 | Google Drive preview iframe        |
| `youtube.com/watch?v=<id>` / `youtu.be/<id>`        | YouTube embed                      |
| `vimeo.com/<id>`                                    | Vimeo embed                        |
| `dailymotion.com/video/<id>`                        | Dailymotion embed                  |
| `rumble.com/<slug>`                                 | Rumble embed                       |
| `abyssplayer.com/<id>`                              | Abyss Player iframe (as-is)        |

---

## ☁️ Firebase Setup

The app uses Firebase Realtime Database for:
- **videos** — movie catalog (falls back to `movis.json` if empty)
- **users** — per-user balance, favorites, purchased, transactions, streaks
- **gifts** — redeemable gift codes
- **settings** — categories list, admin password

### 1. Create / Use Existing Project
This project is configured for `flix-net-bd1`. To use your own:
1. Edit `firebaseConfig` in both `index.html` and `admin.html`:
   ```js
   const firebaseConfig = {
       apiKey: "...",
       authDomain: "your-project.firebaseapp.com",
       databaseURL: "https://your-project-default-rtdb.firebaseio.com",
       projectId: "your-project",
       storageBucket: "your-project.appspot.com",
       messagingSenderId: "...",
       appId: "..."
   };
   ```

### 2. Apply Security Rules
1. Open **Firebase Console → Realtime Database → Rules**.
2. Paste the contents of `firebase-rules.json`.
3. Click **Publish**.

### 3. (Optional) Seed Initial Data
If Firebase is empty, the app falls back to `movis.json`. To populate Firebase:
- Use the admin panel to add videos manually, **or**
- Import `movis.json` directly via Firebase Console → Import JSON.

---

## 📝 Customization Guide

### Add a New Video
Via admin panel: **Videos tab → Add New Video**.
Or directly in Firebase → `videos/<timestamp-id>`:
```json
{
  "id": "1679000000000",
  "name": "My Movie",
  "url": "https://example.com/video.mp4",
  "img": "https://example.com/thumb.jpg",
  "amount": 5,
  "time": "01:30:00",
  "tag": "action, hindi",
  "info": ["Line 1 of description", "Line 2 of description"],
  "createdAt": 1679000000000
}
```

### Edit Anime Episodes
Open `anime/naruto01.html` (or any season) and edit the `episodes` array:
```js
const episodes = [
    { name: "Episode 01", url: "https://1024terabox.com/s/..." },
    { name: "Episode 02", url: "https://..." },
    // ...
];
```

### Change Theme Colors
Edit the `:root` CSS variables at the top of `index.html` / `admin.html`:
```css
:root{
    --primary:#ff0000;        /* main accent */
    --bg-dark:#121212;        /* page background */
    --admin-accent:#6366f1;   /* admin panel accent */
    /* ... */
}
```

### Disable the Embedded Admin (in index.html)
If you only want the standalone `admin.html`:
- Remove the `<a class="nav-item" href="admin.html">` line from the footer nav.
- Optionally delete the `<section class="page-panel" id="panelAdmin">...</section>` block.

---

## ⚠️ Production Checklist

Before going live, do these:

- [ ] **Change admin password** from `admin123` to a strong one (16+ chars).
- [ ] **Tighten Firebase rules** — replace `".write": true` with proper auth checks (see `firebase-rules-readme.md`).
- [ ] **Enable Firebase Auth** (anonymous or Telegram sign-in) so each user can only edit their own data.
- [ ] **Set up Firebase App Check** to prevent abuse from non-app clients.
- [ ] **Add a content filter** for adult content (some entries in `movis.json` are 18+).
- [ ] **Backup Firebase database** periodically.
- [ ] **Test offline mode** — make sure the `movis.json` fallback works.
- [ ] **Verify mobile UX** on real devices (iOS Safari, Android Chrome).
- [ ] **Add HTTPS** — required for clipboard API, Service Workers, etc.
- [ ] **Move payment API key to backend** — the key in `redeem.html` is exposed client-side.

---

## 🆘 Troubleshooting

**Videos don't load?**
- Check browser console (F12) for errors.
- Verify `movis.json` exists and is valid JSON.
- If using Firebase, check your database URL in `firebaseConfig`.

**Admin password forgotten?**
- Open Firebase Console → Realtime Database → `settings/adminPassword` → edit value directly.
- Or clear `localStorage` and login with `admin123` (default).

**Gift codes not redeeming?**
- Verify Firebase rules allow the `active → used` transition.
- Check that the code exists in `gifts/` node.
- The redemption uses a Firebase transaction — check the console for transaction errors.

**Video plays on desktop but not mobile?**
- Some video sources (TeraBox, Blogspot) require specific user agents.
- Use the `1tera/tv.html` wrapper for problematic sources.

---

## 📞 Support

For feature requests or bugs, contact via Telegram or open an issue in your repo.

Built with ❤️ for streaming enthusiasts.

