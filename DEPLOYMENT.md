# All Video Hub — Telegram Mini App Deployment Guide

This guide walks you through deploying the **All Video Hub** as a fully functional Telegram Mini App.

---

## 📦 Project Structure

```
my-flix/
├── index.html              # Main SPA (Home, Categories, Earn, Gift, Profile, Admin inline)
├── admin.html              # Standalone admin panel (mobile-responsive)
├── tma-sdk.js              # Telegram Mini App SDK wrapper (NEW)
├── tma-bootstrap.js        # Auto-haptics, native back button, viewport sync (NEW)
├── manifest.json           # PWA manifest (NEW)
├── movis.json              # Video metadata (fallback when Firebase is offline)
├── 18videos.json           # Adult video metadata
├── firebase-rules.json     # Realtime Database security rules
├── firebase-rules.json.txt # Plain-text copy for easy copy/paste
├── firebase-rules-readme.md # Firebase rules documentation
├── earn.html               # Standalone earn page (legacy, optional)
├── redeem.html             # Standalone redeem page (legacy, optional)
├── tiktok.html             # TikTok-style short video feed
├── telegram.html           # HY3 ChatBot (separate feature, optional)
├── 1tera/
│   ├── tv.html             # Generic video player (iframe + direct mp4)
│   ├── mp4.html            # Direct MP4 video player
│   └── gd.html             # Google Drive video player
├── anime/
│   ├── naruto01.html       # Naruto Season 01 episodes
│   ├── naruto02.html       # Naruto Season 02 episodes
│   ├── naruto03.html       # Naruto Season 03 episodes
│   └── naruto04.html       # Naruto Season 04 episodes
└── docs/
    ├── coins add.md        # Documentation on coin system
    └── demo Episode list.html  # Template for episode list pages
```

---

## ✨ Telegram Mini App Features

This project fully embraces the Telegram Mini App platform:

### Core SDK Features
- ✅ **Telegram WebApp SDK** — loaded via `telegram-web-app.js`
- ✅ **MainButton** — native bottom action button (Buy, Watch Ad, Redeem, etc.)
- ✅ **BackButton** — native header back button synced with in-app navigation
- ✅ **HapticFeedback** — impact, notification, and selection feedback on every interactive element
- ✅ **Popup** — native alert/confirm dialogs (with browser fallback)
- ✅ **CloudStorage** — persistent key-value storage synced across launches
- ✅ **SettingsButton** — native settings shortcut in header (routes to profile)
- ✅ **Theme sync** — auto-applies Telegram theme params (light/dark, colors)
- ✅ **Viewport management** — expand, requestFullscreen, disableVerticalSwipes
- ✅ **openLink / openTelegramLink** — proper external navigation
- ✅ **switchInlineQuery / shareMessage** — social sharing via Telegram
- ✅ **enableClosingConfirmation** — protects user from accidental closes
- ✅ **initData parsing** — extracts user info, start_param, auth_date, hash

### Page-Specific Behaviors
- **Home** — MainButton hidden, native back button hidden
- **Player** — MainButton shows "Buy for X coins" (if not purchased)
- **Earn** — MainButton shows "Watch Ad & Earn +5" (with progress state)
- **Gift** — MainButton shows "Redeem Code"
- **Profile** — MainButton shows "Share App" (Telegram blue)
- **Admin** — MainButton shows context-specific action (Save Video, Add Category, etc.)

### Player Pages (`1tera/`)
- Auto-expands Telegram viewport to fullscreen
- Requests native fullscreen where supported
- Haptic feedback on load success/error
- Safe-area-inset padding for notched devices
- 100dvh viewport height for proper mobile sizing

### Anime Pages (`anime/`)
- Native back button toggles between episode list and player
- Haptic feedback on episode selection
- Improved touch targets (44px+ minimum)
- Better mobile responsiveness

---

## 🚀 Deployment Steps

### Step 1: Get Free HTTPS Hosting

Telegram Mini Apps **require HTTPS**. Free options:

**Option A: GitHub Pages (recommended)**
1. Create a new public GitHub repository
2. Upload all files from `my-flix/` to the repo root
3. Go to **Settings → Pages**
4. Source: **Deploy from a branch** → `main` / `/ (root)`
5. Wait 1-2 minutes — your site will be at `https://<username>.github.io/<repo>/`

**Option B: Netlify (drag & drop)**
1. Go to https://app.netlify.com/drop
2. Drag the entire `my-flix/` folder onto the page
3. Get instant HTTPS URL like `https://random-name.netlify.app`

**Option C: Vercel**
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the `my-flix/` directory
3. Follow prompts to get `https://your-app.vercel.app`

**Option D: Cloudflare Pages**
1. Go to https://pages.cloudflare.com
2. Connect your GitHub repo or upload directly
3. Get `https://your-app.pages.dev`

### Step 2: Configure Firebase Backend

The app uses Firebase Realtime Database for:
- User data (balance, purchases, favorites, transactions)
- Video catalog (with admin CRUD)
- Gift codes (with status tracking)
- Admin password (stored in `settings/adminPassword`)

**Setup:**
1. Go to https://console.firebase.google.com
2. Create a new project (or use existing `flix-net-bd1`)
3. Add a Web App to get your config
4. Enable **Realtime Database** (start in test mode for now)
5. Update `firebaseConfig` in both `index.html` and `admin.html` if using a different project

**Apply Security Rules:**
1. In Firebase Console → Realtime Database → Rules
2. Paste the contents of `firebase-rules.json`
3. Click **Publish**

The updated rules restrict:
- User data: only the authenticated owner can write
- Videos: anyone can read, writes require name+url fields
- Gift codes: anyone can read, creation/update is allowed but constrained
- Settings: only authenticated users can write

### Step 3: Create Your Telegram Bot

1. Open [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot`
3. Choose a name (e.g., `All Video Hub`)
4. Choose a username (e.g., `allvideohub_bot`)
5. **Save the bot token** — you'll need it for server-side validation later

### Step 4: Configure the Mini App

1. In @BotFather, send `/newapp`
2. Select your bot
3. Provide a title: `All Video Hub`
4. Provide a description: `Stream movies, anime, web series and more`
5. Upload a 640x360 JPEG cover image
6. Upload a 640x360 JPEG preview image
7. Provide your HTTPS URL from Step 1 (e.g., `https://username.github.io/repo/index.html`)
8. Optionally provide a short description for the bot's about section

### Step 5: Test the Mini App

1. Open your bot on Telegram: `https://t.me/allvideohub_bot`
2. Tap the **menu button** (or send `/start`)
3. Tap **"Open App"** or the web app button
4. The Mini App should launch in Telegram's in-app browser

### Step 6: Configure Bot Commands (Optional)

In @BotFather:
1. Send `/setcommands`
2. Select your bot
3. Send:
```
start - Launch All Video Hub
admin - Open Admin Panel
help - Get help
```

### Step 7: Set Up Menu Button (Optional)

To make the Mini App accessible via the bot's menu button:
1. In @BotFather, send `/setmenubutton`
2. Select your bot
3. Send the URL: `https://your-deployed-url/index.html`
4. Send button text: `🎬 Open Video Hub`
5. Upload an icon (optional)

### Step 8: Server-Side Validation (Recommended for Production)

For sensitive operations (admin login, balance updates), validate `initData` server-side:

1. Deploy a Cloud Function (Firebase Functions) or any backend
2. When admin logs in, send `TMA.Auth.getInitData()` to your backend
3. Backend validates the hash using your bot token:
   ```python
   import hmac, hashlib
   def validate_init_data(init_data, bot_token):
       parsed = dict(urllib.parse.parse_qsl(init_data))
       hash_value = parsed.pop('hash', None)
       data_check_string = '\n'.join(f'{k}={v}' for k, v in sorted(parsed.items()))
       secret_key = hmac.new(b'WebAppData', bot_token.encode(), hashlib.sha256).digest()
       computed_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
       return computed_hash == hash_value
   ```
4. Backend returns a signed JWT or session token
5. Frontend stores token and uses for admin operations

---

## 🔧 Customization

### Change Default Admin Password

1. Deploy the app
2. Open the admin panel (`/admin.html`)
3. Login with default password: `admin123`
4. Go to **Settings → Change Admin Password**
5. Set a strong password (min 6 characters)
6. Password is saved to Firebase `settings/adminPassword`

### Change Theme Colors

Edit CSS variables in `index.html` and `admin.html`:
```css
:root {
    --primary: #ff0000;          /* Brand color */
    --primary-dark: #cc0000;     /* Hover state */
    --bg-dark: #121212;          /* Background */
    --bg-card: #1e1e1e;          /* Card background */
    --text-light: #f5f5f5;       /* Text color */
}
```

### Add Videos

**Via Admin Panel:**
1. Open `/admin.html`
2. Login with admin password
3. Go to **Videos** tab
4. Fill the form (Name, URL, Thumbnail, Coins, Tags, Description)
5. Click **Add Video** (or use Telegram MainButton)

**Via Firebase Directly:**
Push to `videos/<unique_id>`:
```json
{
  "id": "98",
  "name": "Movie Title",
  "url": "https://example.com/video.mp4",
  "thumbnail": "https://example.com/thumb.jpg",
  "amount": 5,
  "duration": "01:30:00",
  "tags": "action, hindi",
  "info": ["Plot summary line 1", "Plot summary line 2"],
  "createdAt": 1700000000000
}
```

### Create Gift Codes

1. Admin Panel → **Gift Codes** tab
2. Enter coin amount and package name
3. Click **Generate Code**
4. Code is auto-copied to clipboard
5. Share with users

### Supported Video Sources

The player automatically detects and embeds:
- ✅ Direct MP4/WebM/OGG/M3U8 URLs
- ✅ Google Drive (file ID extracted from URL)
- ✅ YouTube (watch / youtu.be / embed)
- ✅ Vimeo
- ✅ Dailymotion
- ✅ Rumble
- ✅ Blogger/Blogspot video
- ✅ TeraBox / 1024terabox (via `1tera/tv.html` wrapper)
- ✅ AbyssPlayer
- ✅ Any iframe-embeddable URL

---

## 🛠️ Troubleshooting

### Mini App shows blank screen
- Check browser console for errors (open in desktop Chrome with devtools)
- Ensure `tma-sdk.js` and `tma-bootstrap.js` are uploaded
- Verify HTTPS is enabled (Telegram requires it)

### Firebase connection fails
- Verify `databaseURL` in `firebaseConfig` matches your project
- Check Firebase Console → Realtime Database → ensure it's enabled
- Verify security rules don't block read access

### User balance not saving
- Check Firebase rules — user must be able to write to `users/<their_id>`
- Verify `state.userId` is set (check console for `[App] Running outside Telegram` message)
- If running outside Telegram, no userId is available — app runs in guest mode

### Haptic feedback not working
- Haptics only work in Telegram mobile apps (iOS/Android)
- Desktop Telegram and web browsers don't support haptics
- TMA SDK silently no-ops when haptics unavailable

### Native BackButton doesn't show
- Only appears in Telegram mobile clients
- TMA SDK auto-shows it based on navigation context
- If it doesn't appear, check that `tma-sdk.js` and `tma-bootstrap.js` are loaded

### MainButton not appearing
- Only appears in Telegram clients
- TMA SDK shows it contextually per page
- If hidden unexpectedly, check browser console for errors

### Video doesn't play
- Some sources block iframe embedding (X-Frame-Options)
- Try opening directly via the fallback link
- TeraBox links require the `1tera/tv.html` wrapper

---

## 📱 Mobile Responsiveness

The app is fully mobile-responsive with:
- ✅ Safe-area-inset padding (iPhone notch, Android navigation bar)
- ✅ 100dvh viewport height (handles mobile browser chrome)
- ✅ Touch targets 44px+ minimum (Apple HIG compliant)
- ✅ Horizontal scroll prevention
- ✅ Smooth scroll behavior
- ✅ Optimized font sizes for small screens
- ✅ Responsive grid layouts (2 cols on small, 3-4 on larger)
- ✅ Disabled text selection on UI (enabled in inputs)
- ✅ Disabled tap highlight color
- ✅ Disabled vertical swipes (so app scroll works smoothly)

### Tested Viewport Sizes
- iPhone SE (375×667)
- iPhone 12/13/14 (390×844)
- iPhone 14 Pro Max (430×932)
- Samsung Galaxy S21 (360×800)
- iPad Mini (768×1024)

---

## 🔒 Security Notes

1. **Admin password** is stored in Firebase `settings/adminPassword` (plaintext — for production, hash it)
2. **User data** is restricted to owner-only writes via Firebase rules
3. **Gift codes** have server-side validation (status must be 'active' to redeem)
4. **initData validation** is client-side only — for true security, add server-side validation
5. **API keys** in `firebaseConfig` are public by design — security comes from rules, not hidden keys

### For Production Hardening
- Add server-side `initData` validation using bot token
- Hash admin password with bcrypt before storing
- Add rate limiting on gift code redemption
- Add audit log for admin actions
- Use Firebase Auth (with Telegram sign-in) instead of public user ID

---

## 📞 Support

If you encounter issues:
1. Check browser console (Chrome devtools)
2. Verify all files are uploaded correctly
3. Test in Telegram desktop (has devtools via right-click → Inspect)
4. Check Firebase console for database errors

---

## 🎯 Production Checklist

Before going live:
- [ ] Deployed to HTTPS hosting (GitHub Pages / Netlify / Vercel)
- [ ] Firebase project configured
- [ ] Firebase security rules applied
- [ ] Bot created via @BotFather
- [ ] Mini App configured in @BotFather
- [ ] Default admin password changed
- [ ] Test user flow: open → browse → buy → play
- [ ] Test admin flow: login → add video → create gift code
- [ ] Test on real Telegram mobile client
- [ ] Test on both iOS and Android
- [ ] Verify haptic feedback works
- [ ] Verify native back button works
- [ ] Verify MainButton shows correct labels
- [ ] Test offline mode (graceful degradation)

---

**Built with ❤️ for Telegram Mini App platform.**
