/* ================================================================
   ALL VIDEO HUB — TMA Bootstrap Helper (v1.0)
   Wires TMA SDK into the running app: applies haptics to all
   buttons/links, syncs theme, integrates native BackButton with
   browser history, manages MainButton state per page, etc.
   ================================================================ */
(function (global) {
  'use strict';

  if (global.TMABootstrap) return;
  global.TMABootstrap = true;

  let settingsButtonBound = false;

  function ready(fn) {
    if (global.TMA && global.TMA.ready) { setTimeout(fn, 0); return; }
    global.addEventListener('tma:ready', fn);
  }

  ready(function () {
    const TMA = global.TMA;
    if (!TMA) return;

    // 1) Apply haptics to ALL interactive elements automatically
    //    Use event delegation so dynamically-added elements get it too.
    document.addEventListener('click', function (e) {
      const el = e.target.closest('button, a, [role="button"], .nav-item, .admin-tab, .gift-tab, .video-card, .episode-btn, .detail-tag, .day-icon');
      if (!el) return;
      // Skip if disabled or has data-no-haptic
      if (el.disabled || el.getAttribute('data-no-haptic') === '1') return;
      // Light impact for taps
      TMA.haptic.tap();
    }, true);

    document.addEventListener('change', function (e) {
      const tag = e.target.tagName;
      if (tag === 'SELECT' || tag === 'INPUT' && (e.target.type === 'checkbox' || e.target.type === 'radio')) {
        TMA.haptic.selection();
      }
    }, true);

    // 2) Integrate native BackButton with browser history
    //    When user can go back, show native BackButton. On click, history.back().
    function updateBackButtonState() {
      // Show back button if there's history OR a custom back handler is registered
      const hasHistory = (global.history.length > 1) && (window.location.hash || document.referrer || window.history.state);
      const hasCustomHandler = !!global.TMABackHandler;
      if (hasCustomHandler || hasHistory) {
        TMA.BackButton.show(function () {
          if (typeof global.TMABackHandler === 'function') {
            // Custom handler takes priority
            const result = global.TMABackHandler();
            if (result === false) return; // handler says don't navigate
          }
          // Fall back to history.back() if available
          if (global.history.length > 1) {
            global.history.back();
          } else if (window.location.pathname !== '/' && !window.location.pathname.endsWith('index.html')) {
            window.location.href = 'index.html';
          } else {
            TMA.close();
          }
        });
      } else {
        TMA.BackButton.hide();
      }
    }
    // Run on hash change & popstate
    global.addEventListener('popstate', updateBackButtonState);
    global.addEventListener('hashchange', updateBackButtonState);
    setTimeout(updateBackButtonState, 500);

    // 3) Sync theme mode (light/dark) with Telegram theme changes
    //    (handled inside TMA SDK; nothing to do here beyond listening)
    global.addEventListener('tma:themeChanged', function () {
      // Theme already applied by SDK. Just notify app.
      const event = new CustomEvent('app:themeChanged');
      global.dispatchEvent(event);
    });

    // 4) Set viewport CSS variables on resize for proper 100dvh behavior
    function updateVH() {
      const vh = window.innerHeight || (TMA.viewportHeight || 0);
      document.documentElement.style.setProperty('--vh', vh + 'px');
    }
    global.addEventListener('resize', updateVH);
    global.addEventListener('orientationchange', function () { setTimeout(updateVH, 200); });
    updateVH();

    // 5) Show settings button (if Telegram supports it) — opens app's settings page
    //    Only on main app page, not on player pages.
    //    Bind only once to avoid duplicate handlers.
    if (!settingsButtonBound) {
      settingsButtonBound = true;
      if (!window.location.pathname.includes('1tera/') && !window.location.pathname.includes('anime/')) {
        TMA.SettingsButton.show(function () {
          // Route to profile panel (where theme toggle is) on index.html
          if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
            // Trigger profile nav
            const profileNav = document.querySelector('.nav-item[data-page="profile"]');
            if (profileNav) profileNav.click();
          } else {
            window.location.href = 'index.html?page=profile';
          }
        });
      } else {
        TMA.SettingsButton.hide();
      }
    }
  });

  // ---------- Public helpers ----------
  global.TMAHelpers = {
    /** Show a native-style toast with optional haptic feedback */
    toast: function (msg, type) {
      type = type || 'info';
      if (global.TMA && global.TMA.isTelegram && global.TMA.haptic) {
        if (type === 'success') global.TMA.haptic.success();
        else if (type === 'error') global.TMA.haptic.error();
        else if (type === 'warning') global.TMA.haptic.warning();
      }
      // If app has its own toast function, use it
      if (typeof global.notify === 'function') { global.notify(msg, type === 'error' ? 'exclamation-circle' : (type === 'success' ? 'check-circle' : 'info-circle')); return; }
      if (typeof global.adminToast === 'function') { global.adminToast(msg, type); return; }
      // Fallback: console + native alert (rare)
      console.log('[toast:' + type + ']', msg);
    },

    /** Set the MainButton for a context (auto-hidden when context changes) */
    setMainButton: function (text, onClick, opts) {
      const TMA = global.TMA;
      if (!TMA || !TMA.isTelegram) return;
      TMA.MainButton.show(text, onClick, opts);
    },

    hideMainButton: function () {
      const TMA = global.TMA;
      if (!TMA || !TMA.isTelegram) return;
      TMA.MainButton.hide();
    },

    /** Register a back handler that takes priority over history.back() */
    setBackHandler: function (fn) {
      global.TMABackHandler = fn;
      // Re-evaluate back button state
      if (global.TMA && global.TMA.ready) {
        const event = new Event('popstate');
        global.dispatchEvent(event);
      }
    },

    clearBackHandler: function () {
      delete global.TMABackHandler;
      const event = new Event('popstate');
      global.dispatchEvent(event);
    },

    /** Share a deep link to the current app */
    shareAppLink: function (path, text) {
      const TMA = global.TMA;
      const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/');
      const fullUrl = baseUrl + (path || '');
      if (TMA && TMA.Share) {
        return TMA.Share.shareUrl(fullUrl, text || 'Check this out!');
      }
      return Promise.resolve();
    },
  };

})(typeof window !== 'undefined' ? window : this);

