'use client';

const ADMIN_PWD_KEY = 'myflix-admin-pwd';

function getAdminPassword(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(ADMIN_PWD_KEY) || '';
}

export function setAdminPassword(pwd: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ADMIN_PWD_KEY, pwd);
}

export function clearAdminPassword() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ADMIN_PWD_KEY);
}

export function isAdminLoggedIn(): boolean {
  return !!getAdminPassword();
}

async function adminFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const pwd = getAdminPassword();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (pwd) {
    headers['X-Admin-Password'] = pwd;
  }

  const body = options.body;
  if (body && typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);
      if (!parsed.adminPassword && pwd) {
        parsed.adminPassword = pwd;
      }
      options.body = JSON.stringify(parsed);
    } catch {
      // not JSON
    }
  }

  return fetch(path, { ...options, headers });
}

async function handleResponse(res: Response) {
  if (res.status === 401) {
    clearAdminPassword();
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/admin/login')) {
      window.location.href = '/admin/login';
    }
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `Request failed with status ${res.status}`);
  }
  return res.json();
}

// Auth
export async function adminLogin(password: string) {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(err.error || 'Login failed');
  }
  setAdminPassword(password);
  return res.json();
}

// Stats
export async function getAdminStats() {
  return handleResponse(await adminFetch('/api/admin'));
}

// Videos
export async function getVideos() {
  return handleResponse(await adminFetch('/api/admin/videos'));
}
export async function createVideo(data: Record<string, unknown>) {
  return handleResponse(await adminFetch('/api/admin/videos', {
    method: 'POST', body: JSON.stringify(data),
  }));
}
export async function updateVideo(id: string, data: Record<string, unknown>) {
  return handleResponse(await adminFetch(`/api/admin/videos/${id}`, {
    method: 'PUT', body: JSON.stringify(data),
  }));
}
export async function deleteVideo(id: string) {
  return handleResponse(await adminFetch(`/api/admin/videos/${id}`, {
    method: 'DELETE', body: JSON.stringify({}),
  }));
}

// TV Channels
export async function getTvChannels() {
  return handleResponse(await adminFetch('/api/admin/tv-channels'));
}
export async function createTvChannel(data: Record<string, unknown>) {
  return handleResponse(await adminFetch('/api/admin/tv-channels', {
    method: 'POST', body: JSON.stringify(data),
  }));
}
export async function updateTvChannel(id: string, data: Record<string, unknown>) {
  return handleResponse(await adminFetch(`/api/admin/tv-channels/${id}`, {
    method: 'PUT', body: JSON.stringify(data),
  }));
}
export async function deleteTvChannel(id: string) {
  return handleResponse(await adminFetch(`/api/admin/tv-channels/${id}`, {
    method: 'DELETE', body: JSON.stringify({}),
  }));
}

// Shorts
export async function getShorts() {
  return handleResponse(await adminFetch('/api/admin/shorts'));
}
export async function createShort(data: Record<string, unknown>) {
  return handleResponse(await adminFetch('/api/admin/shorts', {
    method: 'POST', body: JSON.stringify(data),
  }));
}
export async function updateShort(id: string, data: Record<string, unknown>) {
  return handleResponse(await adminFetch(`/api/admin/shorts/${id}`, {
    method: 'PUT', body: JSON.stringify(data),
  }));
}
export async function deleteShort(id: string) {
  return handleResponse(await adminFetch(`/api/admin/shorts/${id}`, {
    method: 'DELETE', body: JSON.stringify({}),
  }));
}

// Categories
export async function getCategories() {
  return handleResponse(await adminFetch('/api/admin/categories'));
}
export async function updateCategories(categories: unknown[]) {
  return handleResponse(await adminFetch('/api/admin/categories', {
    method: 'PUT', body: JSON.stringify({ categories }),
  }));
}

// Users
export async function getUsers() {
  return handleResponse(await adminFetch('/api/admin/users'));
}
export async function updateUser(id: string, data: Record<string, unknown>) {
  return handleResponse(await adminFetch(`/api/admin/users/${id}`, {
    method: 'PUT', body: JSON.stringify(data),
  }));
}
export async function deleteUser(id: string) {
  return handleResponse(await adminFetch(`/api/admin/users/${id}`, {
    method: 'DELETE', body: JSON.stringify({}),
  }));
}
export async function toggleBanUser(id: string) {
  return handleResponse(await adminFetch(`/api/admin/users/ban/${id}`, {
    method: 'POST', body: JSON.stringify({}),
  }));
}
export async function addUserCoins(userId: string, amount: number, reason: string) {
  return handleResponse(await adminFetch('/api/admin/users/coins', {
    method: 'POST', body: JSON.stringify({ userId, amount, reason }),
  }));
}

// Gift Codes
export async function getGiftCodes() {
  return handleResponse(await adminFetch('/api/admin/gift-codes'));
}
export async function createGiftCode(data: Record<string, unknown>) {
  return handleResponse(await adminFetch('/api/admin/gift-codes', {
    method: 'POST', body: JSON.stringify(data),
  }));
}
export async function updateGiftCode(id: string, data: Record<string, unknown>) {
  return handleResponse(await adminFetch(`/api/admin/gift-codes/${id}`, {
    method: 'PUT', body: JSON.stringify(data),
  }));
}
export async function deleteGiftCode(id: string) {
  return handleResponse(await adminFetch(`/api/admin/gift-codes/${id}`, {
    method: 'DELETE', body: JSON.stringify({}),
  }));
}

// Coin Packages
export async function getCoinPackages() {
  return handleResponse(await adminFetch('/api/admin/coin-packages'));
}
export async function createCoinPackage(data: Record<string, unknown>) {
  return handleResponse(await adminFetch('/api/admin/coin-packages', {
    method: 'POST', body: JSON.stringify(data),
  }));
}
export async function updateCoinPackage(id: string, data: Record<string, unknown>) {
  return handleResponse(await adminFetch(`/api/admin/coin-packages/${id}`, {
    method: 'PUT', body: JSON.stringify(data),
  }));
}
export async function deleteCoinPackage(id: string) {
  return handleResponse(await adminFetch(`/api/admin/coin-packages/${id}`, {
    method: 'DELETE', body: JSON.stringify({}),
  }));
}

// Notifications
export async function getNotifications() {
  return handleResponse(await adminFetch('/api/admin/notifications'));
}
export async function createNotification(data: Record<string, unknown>) {
  return handleResponse(await adminFetch('/api/admin/notifications', {
    method: 'POST', body: JSON.stringify(data),
  }));
}
export async function updateNotification(id: string, data: Record<string, unknown>) {
  return handleResponse(await adminFetch(`/api/admin/notifications/${id}`, {
    method: 'PUT', body: JSON.stringify(data),
  }));
}
export async function deleteNotification(id: string) {
  return handleResponse(await adminFetch(`/api/admin/notifications/${id}`, {
    method: 'DELETE', body: JSON.stringify({}),
  }));
}

// Settings
export async function getSettings() {
  return handleResponse(await adminFetch('/api/settings'));
}
export async function updateSettings(data: Record<string, unknown>) {
  return handleResponse(await adminFetch('/api/admin/settings', {
    method: 'PUT', body: JSON.stringify(data),
  }));
}