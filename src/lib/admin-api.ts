'use client';

// ============================================================
// Admin API client — uses JWT (httpOnly cookie) for auth.
// ------------------------------------------------------------
// On login, the server sets an httpOnly cookie named
// `myflix_admin_session`. All subsequent requests send the
// cookie automatically (same-origin). We do NOT store the
// admin password in localStorage anymore.
//
// For backwards compatibility we also remember a "logged-in"
// flag in localStorage so client-side route guards can render
// the login page without first hitting the network.
// ============================================================

import type {
  Video,
  TvChannel,
  ShortVideo,
  Category,
  GiftCode,
  CoinPackage,
  AppNotification,
  Settings,
  AdminStats,
} from './types';

// Re-export a User type that matches what /api/admin/users returns.
export interface AdminUser {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  balance: number;
  isBanned?: boolean;
  purchased?: string[];
  favorites?: string[];
  streak?: number;
  lastCheckIn?: string | null;
  createdAt?: number;
  theme?: string;
}

const ADMIN_FLAG_KEY = 'myflix-admin-loggedIn';

/** Client-side flag only — NOT used for actual auth. */
function getAdminFlag(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ADMIN_FLAG_KEY) === '1';
}

/** Set the client-side logged-in flag. */
export function setAdminFlag(value: boolean): void {
  if (typeof window === 'undefined') return;
  if (value) localStorage.setItem(ADMIN_FLAG_KEY, '1');
  else localStorage.removeItem(ADMIN_FLAG_KEY);
}

/** Clear the client-side logged-in flag. */
export function clearAdminFlag(): void {
  setAdminFlag(false);
}

/**
 * Client-side check: only used to decide whether to redirect
 * to /admin/login. The server is the source of truth.
 */
export function isAdminLoggedIn(): boolean {
  return getAdminFlag();
}

/**
 * Wrapper around fetch that sends credentials (cookies) and
 * handles 401 by clearing the flag + redirecting to login.
 */
async function adminFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  // credentials: 'include' is needed so the httpOnly JWT cookie is sent.
  return fetch(path, { ...options, headers, credentials: 'include' });
}

async function handleResponse<T = unknown>(res: Response): Promise<T> {
  if (res.status === 401) {
    clearAdminFlag();
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/admin/login')) {
      window.location.href = '/admin/login';
    }
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error((err as { error?: string }).error || `Request failed with status ${res.status}`);
  }
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

// ============================================================
// Auth
// ============================================================

export async function adminLogin(password: string): Promise<{ success?: boolean }> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Login failed' }));
    throw new Error((err as { error?: string }).error || 'Login failed');
  }
  // Server sets the httpOnly cookie; we just set a client-side flag.
  setAdminFlag(true);
  return res.json();
}

export async function adminLogout(): Promise<void> {
  try {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
  } catch {
    // ignore — server may be unreachable
  }
  clearAdminFlag();
  if (typeof window !== 'undefined') {
    window.location.href = '/admin/login';
  }
}

// ============================================================
// Stats
// ============================================================

export async function getAdminStats(): Promise<AdminStats> {
  return handleResponse<AdminStats>(await adminFetch('/api/admin'));
}

// ============================================================
// Videos
// ============================================================

export async function getVideos(): Promise<Video[]> {
  return handleResponse<Video[]>(await adminFetch('/api/admin/videos'));
}
export async function createVideo(data: Record<string, unknown>): Promise<Video> {
  return handleResponse<Video>(
    await adminFetch('/api/admin/videos', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  );
}
export async function updateVideo(id: string, data: Record<string, unknown>): Promise<Video> {
  return handleResponse<Video>(
    await adminFetch(`/api/admin/videos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  );
}
export async function deleteVideo(id: string): Promise<{ success: boolean }> {
  return handleResponse<{ success: boolean }>(
    await adminFetch(`/api/admin/videos/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({}),
    }),
  );
}

// ============================================================
// TV Channels
// ============================================================

export async function getTvChannels(): Promise<TvChannel[]> {
  return handleResponse<TvChannel[]>(await adminFetch('/api/admin/tv-channels'));
}
export async function createTvChannel(data: Record<string, unknown>): Promise<TvChannel> {
  return handleResponse<TvChannel>(
    await adminFetch('/api/admin/tv-channels', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  );
}
export async function updateTvChannel(id: string, data: Record<string, unknown>): Promise<TvChannel> {
  return handleResponse<TvChannel>(
    await adminFetch(`/api/admin/tv-channels/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  );
}
export async function deleteTvChannel(id: string): Promise<{ success: boolean }> {
  return handleResponse<{ success: boolean }>(
    await adminFetch(`/api/admin/tv-channels/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({}),
    }),
  );
}

// ============================================================
// Shorts
// ============================================================

export async function getShorts(): Promise<ShortVideo[]> {
  return handleResponse<ShortVideo[]>(await adminFetch('/api/admin/shorts'));
}
export async function createShort(data: Record<string, unknown>): Promise<ShortVideo> {
  return handleResponse<ShortVideo>(
    await adminFetch('/api/admin/shorts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  );
}
export async function updateShort(id: string, data: Record<string, unknown>): Promise<ShortVideo> {
  return handleResponse<ShortVideo>(
    await adminFetch(`/api/admin/shorts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  );
}
export async function deleteShort(id: string): Promise<{ success: boolean }> {
  return handleResponse<{ success: boolean }>(
    await adminFetch(`/api/admin/shorts/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({}),
    }),
  );
}

// ============================================================
// Categories
// ============================================================

export async function getCategories(): Promise<Category[]> {
  return handleResponse<Category[]>(await adminFetch('/api/admin/categories'));
}
export async function updateCategories(categories: unknown[]): Promise<{ success: boolean }> {
  return handleResponse<{ success: boolean }>(
    await adminFetch('/api/admin/categories', {
      method: 'PUT',
      body: JSON.stringify({ categories }),
    }),
  );
}

// ============================================================
// Users
// ============================================================

export async function getUsers(): Promise<AdminUser[]> {
  return handleResponse<AdminUser[]>(await adminFetch('/api/admin/users'));
}
export async function updateUser(id: string, data: Record<string, unknown>): Promise<AdminUser> {
  return handleResponse<AdminUser>(
    await adminFetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  );
}
export async function deleteUser(id: string): Promise<{ success: boolean }> {
  return handleResponse<{ success: boolean }>(
    await adminFetch(`/api/admin/users/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({}),
    }),
  );
}
export async function toggleBanUser(id: string): Promise<AdminUser> {
  return handleResponse<AdminUser>(
    await adminFetch(`/api/admin/users/ban/${id}`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  );
}
export async function addUserCoins(userId: string, amount: number, reason: string): Promise<{ success: boolean }> {
  return handleResponse<{ success: boolean }>(
    await adminFetch('/api/admin/users/coins', {
      method: 'POST',
      body: JSON.stringify({ userId, amount, reason }),
    }),
  );
}

// ============================================================
// Gift Codes
// ============================================================

export async function getGiftCodes(): Promise<GiftCode[]> {
  return handleResponse<GiftCode[]>(await adminFetch('/api/admin/gift-codes'));
}
export async function createGiftCode(data: Record<string, unknown>): Promise<GiftCode> {
  return handleResponse<GiftCode>(
    await adminFetch('/api/admin/gift-codes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  );
}
export async function updateGiftCode(id: string, data: Record<string, unknown>): Promise<GiftCode> {
  return handleResponse<GiftCode>(
    await adminFetch(`/api/admin/gift-codes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  );
}
export async function deleteGiftCode(id: string): Promise<{ success: boolean }> {
  return handleResponse<{ success: boolean }>(
    await adminFetch(`/api/admin/gift-codes/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({}),
    }),
  );
}

// ============================================================
// Coin Packages
// ============================================================

export async function getCoinPackages(): Promise<CoinPackage[]> {
  return handleResponse<CoinPackage[]>(await adminFetch('/api/admin/coin-packages'));
}
export async function createCoinPackage(data: Record<string, unknown>): Promise<CoinPackage> {
  return handleResponse<CoinPackage>(
    await adminFetch('/api/admin/coin-packages', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  );
}
export async function updateCoinPackage(id: string, data: Record<string, unknown>): Promise<CoinPackage> {
  return handleResponse<CoinPackage>(
    await adminFetch(`/api/admin/coin-packages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  );
}
export async function deleteCoinPackage(id: string): Promise<{ success: boolean }> {
  return handleResponse<{ success: boolean }>(
    await adminFetch(`/api/admin/coin-packages/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({}),
    }),
  );
}

// ============================================================
// Notifications
// ============================================================

export async function getNotifications(): Promise<AppNotification[]> {
  return handleResponse<AppNotification[]>(await adminFetch('/api/admin/notifications'));
}
export async function createNotification(data: Record<string, unknown>): Promise<AppNotification> {
  return handleResponse<AppNotification>(
    await adminFetch('/api/admin/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  );
}
export async function updateNotification(id: string, data: Record<string, unknown>): Promise<AppNotification> {
  return handleResponse<AppNotification>(
    await adminFetch(`/api/admin/notifications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  );
}
export async function deleteNotification(id: string): Promise<{ success: boolean }> {
  return handleResponse<{ success: boolean }>(
    await adminFetch(`/api/admin/notifications/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({}),
    }),
  );
}

// ============================================================
// Settings
// ============================================================

export async function getSettings(): Promise<Partial<Settings>> {
  return handleResponse<Partial<Settings>>(await adminFetch('/api/settings'));
}
export async function updateSettings(data: Record<string, unknown>): Promise<{ success: boolean; settings?: Settings }> {
  return handleResponse<{ success: boolean; settings?: Settings }>(
    await adminFetch('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  );
}
