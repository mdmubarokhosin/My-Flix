// ===== Telegram Mini App SDK Types & Utilities =====
// Works with the official Telegram WebApp script loaded via <script> tag
// Reference: https://core.telegram.org/bots/webapps

import type { TelegramUser } from './types';
export type { TelegramUser } from './types';

export interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

export interface HapticFeedback {
  impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  selectionChanged: () => void;
}

export interface MainButton {
  text: string;
  color: string;
  textColor: string;
  isVisible: boolean;
  isActive: boolean;
  show: () => void;
  hide: () => void;
  onClick: (fn: () => void) => void;
  offClick: (fn: () => void) => void;
  setText: (text: string) => void;
  enable: () => void;
  disable: () => void;
  showProgress: (leaveActive?: boolean) => void;
  hideProgress: () => void;
}

export interface BackButton {
  isVisible: boolean;
  show: () => void;
  hide: () => void;
  onClick: (fn: () => void) => void;
  offClick: (fn: () => void) => void;
}

export interface CloudStorage {
  getKeys: () => Promise<string[]>;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
  delete: (key: string) => Promise<void>;
}

export interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  MainButton: MainButton;
  BackButton: BackButton;
  HapticFeedback: HapticFeedback;
  CloudStorage: CloudStorage;
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    chat?: { id: number; type: string; title: string };
    start_param?: string;
    can_send_after?: number;
    auth_date: number;
    hash: string;
  };
  themeParams: TelegramThemeParams;
  colorScheme: 'light' | 'dark';
  version: string;
  platform: string;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  showPopup: (params: { title?: string; message: string; buttons?: Array<{ type?: string; text: string; id?: string }> }) => Promise<string>;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (ok: boolean) => void) => void;
  openTelegramLink: (url: string) => void;
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  switchInlineQuery: (query: string, choose_chat_types?: string[]) => void;
  requestContact: (callback: (sharedContact: { contact: { phone_number: string; first_name: string; last_name?: string; user_id?: number } }) => void, button_text?: string) => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  onEvent: (eventType: string, callback: (...args: any[]) => void) => void;
  offEvent: (eventType: string, callback: (...args: any[]) => void) => void;
}

// --- Detection ---
let _isTelegram: boolean | null = null;

export function isTelegramApp(): boolean {
  if (_isTelegram !== null) return _isTelegram;
  if (typeof window === 'undefined') { _isTelegram = false; return false; }
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) { _isTelegram = false; return false; }
    _isTelegram = !!(tg.initData && tg.initData.length > 0) || !!(tg.initDataUnsafe?.user);
    return _isTelegram;
  } catch { _isTelegram = false; return false; }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (!isTelegramApp()) return null;
  try { return (window as any).Telegram.WebApp as TelegramWebApp; } catch { return null; }
}

export function getTelegramUser(): TelegramUser | null {
  const tg = getTelegramWebApp();
  return tg?.initDataUnsafe?.user ?? null;
}

export function getStartParam(): string | null {
  const tg = getTelegramWebApp();
  return tg?.initDataUnsafe?.start_param ?? null;
}

// --- Haptic helpers (safe to call even outside Telegram) ---
export function hapticSuccess() { try { getTelegramWebApp()?.HapticFeedback?.notificationOccurred('success'); } catch {} }
export function hapticError() { try { getTelegramWebApp()?.HapticFeedback?.notificationOccurred('error'); } catch {} }
export function hapticWarning() { try { getTelegramWebApp()?.HapticFeedback?.notificationOccurred('warning'); } catch {} }
export function hapticLight() { try { getTelegramWebApp()?.HapticFeedback?.impactOccurred('light'); } catch {} }
export function hapticMedium() { try { getTelegramWebApp()?.HapticFeedback?.impactOccurred('medium'); } catch {} }
export function hapticHeavy() { try { getTelegramWebApp()?.HapticFeedback?.impactOccurred('heavy'); } catch {} }
export function hapticSelection() { try { getTelegramWebApp()?.HapticFeedback?.selectionChanged(); } catch {} }

// --- MainButton helpers ---
export function showMainButton(text: string, onClick: () => void) {
  const tg = getTelegramWebApp();
  if (!tg) return;
  tg.MainButton.setText(text);
  tg.MainButton.show();
  tg.MainButton.onClick(onClick);
  tg.MainButton.enable();
}

export function hideMainButton() {
  const tg = getTelegramWebApp();
  if (!tg) return;
  tg.MainButton.hide();
}

export function setMainButtonProgress(show: boolean) {
  const tg = getTelegramWebApp();
  if (!tg) return;
  if (show) tg.MainButton.showProgress(false);
  else tg.MainButton.hideProgress();
}

// --- Share helper ---
export function telegramShare(text?: string) {
  const tg = getTelegramWebApp();
  if (!tg) return false;
  try { if (tg.switchInlineQuery) { tg.switchInlineQuery(text || ''); return true; } } catch {}
  return false;
}

// --- Alert/Confirm helpers ---
export function telegramAlert(message: string) {
  const tg = getTelegramWebApp();
  if (tg?.showAlert) { tg.showAlert(message); return true; }
  return false;
}

export function telegramConfirm(message: string): Promise<boolean> {
  const tg = getTelegramWebApp();
  return new Promise((resolve) => {
    if (tg?.showConfirm) { tg.showConfirm(message, (ok) => resolve(ok)); } else { resolve(false); }
  });
}

// --- Popup helper ---
export async function telegramPopup(title: string, message: string, buttons?: Array<{ type?: string; text: string }>) {
  const tg = getTelegramWebApp();
  if (!tg?.showPopup) return null;
  try { return await tg.showPopup({ title, message, buttons }); } catch { return null; }
}

// --- Initialize Telegram WebApp ---
let _onTelegramThemeChange: ((scheme: 'light' | 'dark', params: TelegramThemeParams) => void) | null = null;

export function setTelegramThemeCallback(cb: (scheme: 'light' | 'dark', params: TelegramThemeParams) => void) {
  _onTelegramThemeChange = cb;
}

export function initTelegramApp() {
  const tg = getTelegramWebApp();
  if (!tg) return;

  tg.ready();
  tg.expand();
  tg.enableClosingConfirmation();

  document.documentElement.classList.add('telegram-active');

  applyTelegramThemeColors(tg);
  if (_onTelegramThemeChange) {
    _onTelegramThemeChange(tg.colorScheme, tg.themeParams);
  }

  tg.onEvent('themeChanged', () => {
    applyTelegramThemeColors(tg);
    if (_onTelegramThemeChange) {
      _onTelegramThemeChange(tg.colorScheme, tg.themeParams);
    }
  });
}

/**
 * Maps Telegram theme colors to shadcn CSS variables.
 */
function applyTelegramThemeColors(tg: TelegramWebApp) {
  const root = document.documentElement;
  const p = tg.themeParams;

  root.style.setProperty('--tg-theme-bg-color', p.bg_color || '');
  root.style.setProperty('--tg-theme-text-color', p.text_color || '');
  root.style.setProperty('--tg-theme-hint-color', p.hint_color || '');
  root.style.setProperty('--tg-theme-link-color', p.link_color || '');
  root.style.setProperty('--tg-theme-button-color', p.button_color || '');
  root.style.setProperty('--tg-theme-button-text-color', p.button_text_color || '');
  root.style.setProperty('--tg-theme-secondary-bg-color', p.secondary_bg_color || '');

  if (p.bg_color) {
    root.style.setProperty('--background', p.bg_color);
    root.style.setProperty('--popover', p.bg_color);
  }
  if (p.text_color) {
    root.style.setProperty('--foreground', p.text_color);
    root.style.setProperty('--popover-foreground', p.text_color);
    root.style.setProperty('--card-foreground', p.text_color);
  }
  if (p.secondary_bg_color) {
    root.style.setProperty('--card', p.secondary_bg_color);
    root.style.setProperty('--secondary', p.secondary_bg_color);
    root.style.setProperty('--muted', p.secondary_bg_color);
  }
  if (p.hint_color) {
    root.style.setProperty('--muted-foreground', p.hint_color);
  }
  if (p.button_color) {
    root.style.setProperty('--primary', p.button_color);
    root.style.setProperty('--ring', p.button_color);
  }
  if (p.button_text_color) {
    root.style.setProperty('--primary-foreground', p.button_text_color);
  }
  if (p.bg_color && p.secondary_bg_color) {
    root.style.setProperty('--border', tg.colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)');
    root.style.setProperty('--input', tg.colorScheme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)');
  }
  if (p.text_color && p.secondary_bg_color) {
    root.style.setProperty('--secondary-foreground', p.text_color);
    root.style.setProperty('--accent-foreground', p.text_color);
    root.style.setProperty('--accent', p.secondary_bg_color);
  }

  try {
    tg.setHeaderColor(p.bg_color || (tg.colorScheme === 'light' ? '#ffffff' : '#1a1a1a'));
    tg.setBackgroundColor(p.bg_color || (tg.colorScheme === 'light' ? '#ffffff' : '#1a1a1a'));
  } catch {}

  let metaTheme = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
  if (!metaTheme) {
    metaTheme = document.createElement('meta');
    metaTheme.name = 'theme-color';
    document.head.appendChild(metaTheme);
  }
  metaTheme.content = p.bg_color || (tg.colorScheme === 'light' ? '#ffffff' : '#1a1a1a');
}
