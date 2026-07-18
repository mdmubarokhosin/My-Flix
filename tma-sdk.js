/* ================================================================
   ALL VIDEO HUB — Telegram Mini App SDK Wrapper (v1.0)
   Production-ready TMA integration with all platform features:
   - MainButton (native bottom action button)
   - BackButton (native header back button)
   - HapticFeedback (impact / notification / selection)
   - CloudStorage (persistent kv store across launches)
   - Popup (native alert/confirm dialogs)
   - Theme sync (auto-apply Telegram theme params)
   - Viewport management (expand, requestFullscreen, vertical swipes)
   - SettingsButton (in-app settings shortcut)
   - initData parsing & lightweight validation
   - openLink / openTelegramLink (proper external navigation)
   - shareMessage / switchInlineQuery (social features)
   - BiometricManager (optional)
   - Safe graceful degradation when running outside Telegram
   ================================================================ */
(function (global) {
  'use strict';

  if (global.TMA) return; // already loaded

  const TG = (function () {
    try { return global.Telegram && global.Telegram.WebApp; } catch (e) { return null; }
  })();

  const READY_TIMEOUT_MS = 4000;
  let readyDispatched = false;
  let readyTimer = null;
  let ready = false;

  // Theme defaults (will be overridden by Telegram themeParams when available)
  const FALLBACK_THEME = {
    bg: '#121212',
    bgDarker: '#0a0a0a',
    bgCard: '#1e1e1e',
    bgCardHover: '#2a2a2a',
    text: '#f5f5f5',
    hint: '#999999',
    button: '#ff0000',
    buttonHover: '#cc0000',
    link: '#3498db',
    danger: '#e74c3c',
    success: '#2ecc71',
    warning: '#f39c12',
  };

  // ---------- Public TMA object ----------
  const TMA = {
    version: '1.0.0',
    sdkVersion: TG ? (TG.version || 'unknown') : 'none',
    isTelegram: !!TG,
    ready: false,
    user: null,
    initData: '',
    initDataUnsafe: null,
    startParam: null,
    themeParams: {},
    viewportHeight: 0,
    viewportStableHeight: 0,
    isExpanded: false,
    themeApplied: false,
    platform: TG ? (TG.platform || 'unknown') : 'web',
    colorScheme: TG ? (TG.colorScheme || 'dark') : 'dark',
  };

  // ---------- Safe helpers (no-op when not in Telegram) ----------
  function safe(fn, fallback) {
    return function () {
      if (!TG || typeof fn !== 'function') return fallback;
      try { return fn.apply(TG, arguments); }
      catch (e) { console.warn('[TMA] safe() error:', e); return fallback; }
    };
  }

  function hexFromArgb(argb) {
    if (!argb && argb !== 0) return null;
    // Telegram returns numbers like -1 for white, or 0xff000000 + color
    if (typeof argb === 'string') {
      // Some clients return strings
      if (argb.startsWith('#')) return argb;
      if (/^[0-9a-fA-F]+$/.test(argb) && argb.length <= 8) return '#' + argb.padStart(6, '0');
      return argb;
    }
    if (typeof argb !== 'number') return null;
    // Convert signed 32-bit ARGB to #RRGGBB
    const n = argb >>> 0;
    const r = (n >> 16) & 0xff;
    const g = (n >> 8) & 0xff;
    const b = n & 0xff;
    return '#' +
      r.toString(16).padStart(2, '0') +
      g.toString(16).padStart(2, '0') +
      b.toString(16).padStart(2, '0');
  }

  // ---------- Init ----------
  function init() {
    if (!TG) {
      // Outside Telegram — set defaults
      TMA.ready = true;
      console.info('[TMA] Running outside Telegram — features limited.');
      // Dispatch a fake ready event so the app continues
      setTimeout(function () { dispatchReady(); }, 0);
      return;
    }

    try {
      // Set closing confirmation (user will be prompted before closing)
      TG.enableClosingConfirmation();
    } catch (e) { /* not supported on all clients */ }

    // Read user info from initDataUnsafe
    try {
      TMA.initData = TG.initData || '';
      TMA.initDataUnsafe = TG.initDataUnsafe || {};
      if (TMA.initDataUnsafe && TMA.initDataUnsafe.user) {
        TMA.user = TMA.initDataUnsafe.user;
      }
      TMA.startParam = (TMA.initDataUnsafe && TMA.initDataUnsafe.start_param) || null;
    } catch (e) { /* silent */ }

    // Apply theme params
    applyThemeParams(TG.themeParams || {});

    // Listen for theme changes
    try {
      TG.onEvent('themeChanged', function () {
        applyThemeParams(TG.themeParams || {});
        dispatchEvent('themeChanged', { themeParams: TG.themeParams });
      });
    } catch (e) { /* not supported */ }

    // Listen for viewport changes
    try {
      TMA.viewportHeight = TG.viewportHeight || 0;
      TMA.viewportStableHeight = TG.viewportStableHeight || 0;
      TMA.isExpanded = !!TG.isExpanded;
      TG.onEvent('viewportChanged', function (e) {
        TMA.viewportHeight = e.height || TG.viewportHeight || 0;
        TMA.viewportStableHeight = (e && typeof e.isStateStable !== 'undefined')
          ? (e.isStateStable ? e.height : TMA.viewportStableHeight)
          : TMA.viewportStableHeight;
        TMA.isExpanded = !!e.isExpanded;
        dispatchEvent('viewportChanged', {
          height: TMA.viewportHeight,
          isExpanded: TMA.isExpanded,
        });
        updateCSSViewportVars();
      });
    } catch (e) { /* not supported */ }

    // Ready + expand
    try {
      TG.ready();
      ready = true;
      TMA.ready = true;
      TG.expand();
    } catch (e) { /* silent */ }

    // Try to set background color to match app theme
    setBackgroundColor();

    // Try to set header color
    setHeaderColor();

    // Vertical swipes — disable so our scroll works smoothly inside the app
    try { if (typeof TG.disableVerticalSwipes === 'function') TG.disableVerticalSwipes(); } catch (e) { /* not supported */ }

    dispatchReady();

    // Safety timeout: if for some reason ready was never dispatched, force it
    readyTimer = setTimeout(function () {
      if (!readyDispatched) dispatchReady();
    }, READY_TIMEOUT_MS);
  }

  function dispatchReady() {
    if (readyDispatched) return;
    readyDispatched = true;
    if (readyTimer) { clearTimeout(readyTimer); readyTimer = null; }
    const ev = new CustomEvent('tma:ready', { detail: TMA });
    global.dispatchEvent(ev);
  }

  function dispatchEvent(name, detail) {
    try {
      const ev = new CustomEvent('tma:' + name, { detail: detail || {} });
      global.dispatchEvent(ev);
    } catch (e) { /* silent */ }
  }

  function applyThemeParams(tp) {
    if (!tp) tp = {};
    TMA.themeParams = tp;
    try {
      const root = document.documentElement;
      const setVar = function (name, value) {
        if (value) root.style.setProperty(name, value);
      };
      // Map Telegram theme params to our CSS variables
      setVar('--tg-bg-color', hexFromArgb(tp.bg_color));
      setVar('--tg-text-color', hexFromArgb(tp.text_color));
      setVar('--tg-hint-color', hexFromArgb(tp.hint_color));
      setVar('--tg-link-color', hexFromArgb(tp.link_color));
      setVar('--tg-button-color', hexFromArgb(tp.button_color));
      setVar('--tg-button-text-color', hexFromArgb(tp.button_text_color));
      setVar('--tg-secondary-bg-color', hexFromArgb(tp.secondary_bg_color));
      setVar('--tg-section-bg-color', hexFromArgb(tp.section_bg_color));
      setVar('--tg-section-header-text-color', hexFromArgb(tp.section_header_text_color));
      setVar('--tg-subtitle-text-color', hexFromArgb(tp.subtitle_text_color));
      setVar('--tg-accent-text-color', hexFromArgb(tp.accent_text_color));
      setVar('--tg-destructive-text-color', hexFromArgb(tp.destructive_text_color));
      setVar('--tg-header-bg-color', hexFromArgb(tp.header_bg_color));
      setVar('--tg-section-separator-color', hexFromArgb(tp.section_separator_color));
      setVar('--tg-card-bg-color', hexFromArgb(tp.section_bg_color));

      // Apply auto theme adaptation ONLY in Telegram mode — preserve user's light/dark toggle
      if (TMA.isTelegram) {
        // If secondary_bg_color is provided, sync to dark/light depending on brightness
        if (tp.bg_color && tp.text_color) {
          const bgHex = hexFromArgb(tp.bg_color);
          const textHex = hexFromArgb(tp.text_color);
          // Heuristic: if text is bright, background is dark
          if (bgHex && textHex) {
            const isLightText = isLightColor(textHex);
            const isLightBg = isLightColor(bgHex);
            // Telegram light themes have light bg + dark text
            // Telegram dark themes have dark bg + light text
            // If they are inverted (light bg + dark text), it's a light theme
            const isLightTheme = isLightBg && !isLightText;
            // Only apply if user hasn't manually toggled in last 60s
            const lastToggle = parseInt(document.body.getAttribute('data-last-theme-toggle') || '0', 10);
            if (Date.now() - lastToggle > 60000) {
              if (isLightTheme && !root.classList.contains('light-mode')) {
                root.classList.add('light-mode');
                dispatchEvent('themeModeChanged', { mode: 'light' });
              } else if (!isLightTheme && root.classList.contains('light-mode')) {
                root.classList.remove('light-mode');
                dispatchEvent('themeModeChanged', { mode: 'dark' });
              }
            }
          }
        }
      }

      TMA.themeApplied = true;
    } catch (e) { /* silent */ }
  }

  function isLightColor(hex) {
    if (!hex) return false;
    const c = hex.replace('#', '');
    if (c.length < 6) return false;
    const r = parseInt(c.substr(0, 2), 16);
    const g = parseInt(c.substr(2, 2), 16);
    const b = parseInt(c.substr(4, 2), 16);
    // YIQ brightness
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128;
  }

  function updateCSSViewportVars() {
    try {
      const root = document.documentElement;
      root.style.setProperty('--tg-vh', (TMA.viewportHeight || 0) + 'px');
      root.style.setProperty('--tg-vh-stable', (TMA.viewportStableHeight || 0) + 'px');
      // Also set --vh for compatibility with old code
      const vh = (TMA.viewportHeight || global.innerHeight || 0);
      root.style.setProperty('--vh', vh + 'px');
    } catch (e) { /* silent */ }
  }

  function setBackgroundColor() {
    if (!TG) return;
    try {
      // Try to set background to match our dark theme
      const isLight = document.documentElement.classList.contains('light-mode');
      const bgColor = isLight ? '#f5f5f5' : '#121212';
      const headerColor = isLight ? '#ffffff' : '#0a0a0a';
      if (TG.setBackgroundColor) TG.setBackgroundColor(bgColor);
      if (TG.setHeaderColor) TG.setHeaderColor(headerColor);
    } catch (e) { /* not supported */ }
  }

  function setHeaderColor() {
    if (!TG || !TG.setHeaderColor) return;
    try {
      const isLight = document.documentElement.classList.contains('light-mode');
      TG.setHeaderColor(isLight ? '#ffffff' : '#0a0a0a');
    } catch (e) { /* silent */ }
  }

  // ---------- MainButton ----------
  const MainButton = {
    show: safe(function (text, onClick, opts) {
      opts = opts || {};
      const mb = TG.MainButton;
      if (!mb) return;
      mb.setText(text || 'Continue');
      if (opts.color) mb.setOption('color', opts.color);
      else mb.setOption('color', TG.themeParams && TG.themeParams.button_color ? hexFromArgb(TG.themeParams.button_color) : '#ff0000');
      if (opts.text_color) mb.setOption('text_color', opts.text_color);
      else mb.setOption('text_color', TG.themeParams && TG.themeParams.button_text_color ? hexFromArgb(TG.themeParams.button_text_color) : '#ffffff');
      mb.enable();
      mb.show();
      // Remove existing handler by calling offClick (supported by Telegram SDK)
      try { mb.offClick(); } catch (e) { /* not supported */ }
      if (typeof onClick === 'function') {
        try { mb.onClick(onClick); } catch (e) { /* not supported */ }
      }
      MainButton.isActive = true;
      MainButton.isVisible = true;
    }),
    hide: safe(function () {
      const mb = TG && TG.MainButton;
      if (!mb) return;
      try { mb.hide(); } catch (e) { /* silent */ }
      try { mb.offClick(); } catch (e) { /* silent */ }
      MainButton.isActive = false;
      MainButton.isVisible = false;
    }),
    setText: safe(function (text) {
      if (TG && TG.MainButton) TG.MainButton.setText(text || '');
    }),
    enable: safe(function () { if (TG && TG.MainButton) { TG.MainButton.enable(); MainButton.isActive = true; } }),
    disable: safe(function () { if (TG && TG.MainButton) { TG.MainButton.disable(); MainButton.isActive = false; } }),
    showProgress: safe(function (leaveActive) { if (TG && TG.MainButton) TG.MainButton.showProgress(leaveActive); }),
    hideProgress: safe(function () { if (TG && TG.MainButton) TG.MainButton.hideProgress(); }),
    isActive: false,
    isVisible: false,
  };

  // ---------- BackButton ----------
  const BackButton = {
    show: safe(function (onClick) {
      if (!TG || !TG.BackButton) return;
      try { TG.BackButton.show(); } catch (e) { /* silent */ }
      if (typeof onClick === 'function') {
        try { TG.BackButton.offClick(); } catch (e) { /* silent */ }
        try { TG.BackButton.onClick(onClick); } catch (e) { /* silent */ }
      }
    }),
    hide: safe(function () {
      if (!TG || !TG.BackButton) return;
      try { TG.BackButton.hide(); } catch (e) { /* silent */ }
      try { TG.BackButton.offClick(); } catch (e) { /* silent */ }
    }),
  };

  // ---------- HapticFeedback ----------
  const HapticFeedback = {
    impact: safe(function (style) {
      // 'light', 'medium', 'heavy', 'rigid', 'soft'
      style = style || 'light';
      if (TG && TG.HapticFeedback && TG.HapticFeedback.impactOccurred) {
        TG.HapticFeedback.impactOccurred(style);
      }
    }, null),
    notification: safe(function (type) {
      // 'error', 'success', 'warning'
      type = type || 'success';
      if (TG && TG.HapticFeedback && TG.HapticFeedback.notificationOccurred) {
        TG.HapticFeedback.notificationOccurred(type);
      }
    }, null),
    selection: safe(function () {
      if (TG && TG.HapticFeedback && TG.HapticFeedback.selectionChanged) {
        TG.HapticFeedback.selectionChanged();
      }
    }, null),
    // Convenience wrappers
    light: function () { this.impact('light'); },
    medium: function () { this.impact('medium'); },
    heavy: function () { this.impact('heavy'); },
    soft: function () { this.impact('soft'); },
    rigid: function () { this.impact('rigid'); },
    success: function () { this.notification('success'); },
    error: function () { this.notification('error'); },
    warning: function () { this.notification('warning'); },
    tap: function () { this.impact('light'); },
  };

  // ---------- Popup (native alert/confirm) ----------
  const Popup = {
    show: function (opts) {
      return new Promise(function (resolve) {
        if (!TG || !TG.showPopup) {
          // Fallback to native browser dialog
          if (opts && opts.message) {
            if (opts.buttons && opts.buttons.length === 2) {
              // Confirm-style
              const ok = global.confirm(opts.title ? (opts.title + '\n\n' + opts.message) : opts.message);
              resolve(ok ? 'ok' : 'cancel');
            } else {
              global.alert((opts.title ? opts.title + '\n\n' : '') + (opts.message || ''));
              resolve('ok');
            }
          } else { resolve('close'); }
          return;
        }
        try {
          TG.showPopup({
            title: opts.title || 'Message',
            message: opts.message || '',
            buttons: opts.buttons || [{ id: 'ok', type: 'ok' }],
          }, function (btnId) { resolve(btnId || 'close'); });
        } catch (e) {
          global.alert((opts.title || '') + '\n' + (opts.message || ''));
          resolve('ok');
        }
      });
    },
    alert: function (message, title) {
      return this.show({ title: title || 'Notice', message: message, buttons: [{ type: 'close', text: 'OK' }] });
    },
    confirm: function (message, title) {
      return new Promise(function (resolve) {
        if (!TG || !TG.showPopup) {
          resolve(global.confirm(message) ? 'ok' : 'cancel');
          return;
        }
        try {
          TG.showPopup({
            title: title || 'Confirm',
            message: message,
            buttons: [
              { id: 'cancel', type: 'cancel' },
              { id: 'ok', type: 'ok' },
            ],
          }, function (id) { resolve(id === 'ok' ? 'ok' : 'cancel'); });
        } catch (e) {
          resolve(global.confirm(message) ? 'ok' : 'cancel');
        }
      });
    },
  };

  // ---------- CloudStorage (persistent key-value, max 1024 keys / 4096 chars each) ----------
  const CloudStorage = {
    setItem: function (key, value) {
      return new Promise(function (resolve, reject) {
        if (!TG || !TG.CloudStorage) {
          try { localStorage.setItem('cs_' + key, String(value)); resolve(true); }
          catch (e) { reject(e); }
          return;
        }
        try {
          TG.CloudStorage.setItem(key, String(value), function (err, success) {
            if (err) reject(err); else resolve(success);
          });
        } catch (e) { reject(e); }
      });
    },
    getItem: function (key) {
      return new Promise(function (resolve, reject) {
        if (!TG || !TG.CloudStorage) {
          try { resolve(localStorage.getItem('cs_' + key)); }
          catch (e) { resolve(null); }
          return;
        }
        try {
          TG.CloudStorage.getItem(key, function (err, value) {
            if (err) reject(err); else resolve(value);
          });
        } catch (e) { resolve(null); }
      });
    },
    getItems: function (keys) {
      return new Promise(function (resolve, reject) {
        if (!TG || !TG.CloudStorage) {
          const out = {};
          keys.forEach(function (k) { out[k] = localStorage.getItem('cs_' + k); });
          resolve(out);
          return;
        }
        try {
          TG.CloudStorage.getItems(keys, function (err, values) {
            if (err) reject(err); else resolve(values || {});
          });
        } catch (e) { resolve({}); }
      });
    },
    removeItem: function (key) {
      return new Promise(function (resolve, reject) {
        if (!TG || !TG.CloudStorage) {
          try { localStorage.removeItem('cs_' + key); resolve(true); }
          catch (e) { reject(e); }
          return;
        }
        try {
          TG.CloudStorage.removeItem(key, function (err, success) {
            if (err) reject(err); else resolve(success);
          });
        } catch (e) { reject(e); }
      });
    },
    removeItems: function (keys) {
      return new Promise(function (resolve, reject) {
        if (!TG || !TG.CloudStorage) {
          keys.forEach(function (k) { localStorage.removeItem('cs_' + k); });
          resolve(true);
          return;
        }
        try {
          TG.CloudStorage.removeItems(keys, function (err, success) {
            if (err) reject(err); else resolve(success);
          });
        } catch (e) { reject(e); }
      });
    },
    getKeys: function () {
      return new Promise(function (resolve, reject) {
        if (!TG || !TG.CloudStorage) {
          const out = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.indexOf('cs_') === 0) out.push(k.substr(3));
          }
          resolve(out);
          return;
        }
        try {
          TG.CloudStorage.getKeys(function (err, keys) {
            if (err) reject(err); else resolve(keys || []);
          });
        } catch (e) { resolve([]); }
      });
    },
  };

  // ---------- SettingsButton ----------
  const SettingsButton = {
    show: safe(function (onClick) {
      if (!TG || !TG.SettingsButton) return;
      try { TG.SettingsButton.show(); } catch (e) { /* silent */ }
      if (typeof onClick === 'function') {
        try { TG.SettingsButton.offClick(); } catch (e) { /* silent */ }
        try { TG.SettingsButton.onClick(onClick); } catch (e) { /* silent */ }
      }
    }),
    hide: safe(function () {
      if (!TG || !TG.SettingsButton) return;
      try { TG.SettingsButton.hide(); } catch (e) { /* silent */ }
    }),
  };

  // ---------- Navigation ----------
  const Nav = {
    openLink: safe(function (url, options) {
      try {
        if (TG && TG.openLink) {
          TG.openLink(url, options || {});
        } else {
          // Open in new tab with noopener
          const win = window.open(url, '_blank');
          if (win) win.focus();
        }
      } catch (e) {
        window.open(url, '_blank');
      }
    }),
    openTelegramLink: safe(function (url) {
      if (TG && TG.openTelegramLink) {
        try { TG.openTelegramLink(url); return; } catch (e) { /* silent */ }
      }
      window.open(url, '_blank');
    }),
    close: safe(function () {
      if (TG && TG.close) { TG.close(); return; }
      try { window.close(); } catch (e) { /* silent */ }
    }),
  };

  // ---------- Sharing / Inline ----------
  const Share = {
    switchInlineQuery: safe(function (query, chatTypes) {
      if (!TG || !TG.switchInlineQuery) {
        // Fallback: copy to clipboard
        try {
          navigator.clipboard && navigator.clipboard.writeText(query || '');
          console.info('[TMA] switchInlineQuery not available — query copied to clipboard');
        } catch (e) { /* silent */ }
        return;
      }
      TG.switchInlineQuery(query || '', chatTypes);
    }),
    shareMessage: safe(function (msgId, cb) {
      // Requires message_id from bot. Falls back gracefully.
      if (!TG || !TG.shareMessage) {
        if (typeof cb === 'function') cb({ error: 'shareMessage not supported' });
        return;
      }
      try {
        TG.shareMessage(msgId, function (id) {
          if (typeof cb === 'function') cb(id ? { messageId: id } : { error: 'cancelled' });
        });
      } catch (e) {
        if (typeof cb === 'function') cb({ error: e.message });
      }
    }),
    shareUrl: function (url, text) {
      // Try Web Share API first
      if (navigator.share) {
        return navigator.share({ title: text || 'Share', url: url }).catch(function () {});
      }
      // Fallback to switchInlineQuery with deep link
      const tmeUrl = 'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text || '');
      Nav.openTelegramLink(tmeUrl);
      return Promise.resolve();
    },
  };

  // ---------- Viewport ----------
  const Viewport = {
    expand: safe(function () { if (TG) TG.expand(); }),
    isExpanded: function () { return !!(TG && TG.isExpanded); },
    height: function () { return TG ? (TG.viewportHeight || 0) : global.innerHeight; },
    stableHeight: function () { return TG ? (TG.viewportStableHeight || 0) : global.innerHeight; },
    requestFullscreen: safe(function () { if (TG && TG.requestFullscreen) TG.requestFullscreen(); }),
    exitFullscreen: safe(function () { if (TG && TG.exitFullscreen) TG.exitFullscreen(); }),
    disableVerticalSwipes: safe(function () { if (TG && TG.disableVerticalSwipes) TG.disableVerticalSwipes(); }),
    enableVerticalSwipes: safe(function () { if (TG && TG.enableVerticalSwipes) TG.enableVerticalSwipes(); }),
    lockOrientation: safe(function (orientation) { if (TG && TG.lockOrientation) TG.lockOrientation(orientation); }),
    unlockOrientation: safe(function () { if (TG && TG.unlockOrientation) TG.unlockOrientation(); }),
  };

  // ---------- Biometric ----------
  const Biometric = {
    isAvailable: function () {
      if (!TG || !TG.BiometricManager) return { available: false };
      try {
        const bm = TG.BiometricManager;
        return {
          available: bm.isBiometricAvailable(),
          type: bm.biometricType ? bm.biometricType() : 'unknown',
          enrolled: bm.isBiometricTokenSaved(),
          accessRequested: bm.isAccessRequested(),
          accessGranted: bm.isAccessGranted(),
        };
      } catch (e) { return { available: false, error: e.message }; }
    },
    requestAccess: function (reason) {
      return new Promise(function (resolve) {
        if (!TG || !TG.BiometricManager) { resolve(false); return; }
        try {
          const bm = TG.BiometricManager;
          bm.requestAccess({ reason: reason || 'Please authenticate to continue' }, function (ok) {
            resolve(ok);
          });
        } catch (e) { resolve(false); }
      });
    },
    authenticate: function (reason) {
      return new Promise(function (resolve) {
        if (!TG || !TG.BiometricManager) { resolve({ success: false, error: 'not_supported' }); return; }
        try {
          const bm = TG.BiometricManager;
          bm.authenticate({ reason: reason || 'Authenticate' }, function (success, token) {
            resolve({ success: success, token: token });
          });
        } catch (e) { resolve({ success: false, error: e.message }); }
      });
    },
  };

  // ---------- initData validation ----------
  // Note: True validation requires the bot token server-side. This is a lightweight client-side check
  // that the hash exists and matches expected format. For production-sensitive operations, validate
  // server-side using the bot token from @BotFather.
  const Auth = {
    getUser: function () { return TMA.user; },
    getUserId: function () { return TMA.user ? String(TMA.user.id) : null; },
    getStartParam: function () { return TMA.startParam; },
    getInitData: function () { return TMA.initData; },
    getAuthDate: function () {
      if (TMA.initDataUnsafe && TMA.initDataUnsafe.auth_date) {
        return new Date(TMA.initDataUnsafe.auth_date * 1000);
      }
      return null;
    },
    isFresh: function (maxAgeHours) {
      const authDate = this.getAuthDate();
      if (!authDate) return false;
      const maxMs = (maxAgeHours || 24) * 60 * 60 * 1000;
      return (Date.now() - authDate.getTime()) < maxMs;
    },
    // For server-side validation: send this to your backend, which verifies with bot token
    getHash: function () {
      return (TMA.initDataUnsafe && TMA.initDataUnsafe.hash) || '';
    },
  };

  // ---------- Utilities ----------
  const Util = {
    hexFromArgb: hexFromArgb,
    isLightColor: isLightColor,
    onReady: function (cb) {
      if (TMA.ready) { setTimeout(cb, 0); return; }
      global.addEventListener('tma:ready', function () { cb(); });
    },
    on: function (eventName, cb) {
      global.addEventListener('tma:' + eventName, function (e) { cb(e.detail); });
    },
  };

  // ---------- Theme manager with sync ----------
  const Theme = {
    apply: function (themeName) {
      const root = document.documentElement;
      if (themeName === 'light') root.classList.add('light-mode');
      else root.classList.remove('light-mode');
      // Record timestamp to prevent auto-sync from overriding user choice
      document.body.setAttribute('data-last-theme-toggle', Date.now());
      // Update Telegram header/background colors to match
      setBackgroundColor();
      // Persist
      try { localStorage.setItem('avh_theme', themeName); } catch (e) { /* silent */ }
      dispatchEvent('themeModeChanged', { mode: themeName });
    },
    toggle: function () {
      const isLight = document.documentElement.classList.contains('light-mode');
      this.apply(isLight ? 'dark' : 'light');
      return isLight ? 'dark' : 'light';
    },
    current: function () {
      return document.documentElement.classList.contains('light-mode') ? 'light' : 'dark';
    },
    refresh: function () { applyThemeParams(TG ? TG.themeParams : {}); },
  };

  // ---------- Hook: re-apply background color when user toggles theme ----------
  document.addEventListener('tma:themeModeChanged', function () {
    setBackgroundColor();
  });

  // ---------- Expose ----------
  TMA.MainButton = MainButton;
  TMA.BackButton = BackButton;
  TMA.HapticFeedback = HapticFeedback;
  TMA.haptic = HapticFeedback; // alias
  TMA.Popup = Popup;
  TMA.CloudStorage = CloudStorage;
  TMA.SettingsButton = SettingsButton;
  TMA.Nav = Nav;
  TMA.Share = Share;
  TMA.Viewport = Viewport;
  TMA.Biometric = Biometric;
  TMA.Auth = Auth;
  TMA.Theme = Theme;
  TMA.Util = Util;

  // Convenience globals
  TMA.alert = Popup.alert.bind(Popup);
  TMA.confirm = Popup.confirm.bind(Popup);
  TMA.openLink = Nav.openLink;
  TMA.openTelegramLink = Nav.openTelegramLink;
  TMA.close = Nav.close;

  global.TMA = TMA;

  // ---------- Auto-init when DOM is ready ----------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(typeof window !== 'undefined' ? window : this);
