import type { UserTransaction, GiftHistoryEntry } from './types';

/**
 * Shared user data normalization utility.
 * Normalizes Firebase user data into the standard AppUser shape.
 * This eliminates duplication across HomePage, EarnPage, RedeemPage, ProfilePage, AdminPanel.
 */

export interface NormalizedUser {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  balance: number;
  isBanned?: boolean;
  purchased: string[];
  favorites: string[];
  lastCheckIn: string | null;
  streak: number;
  adWatchedToday: number;
  lastAdDate: string | null;
  transactions: UserTransaction[];
  giftHistory: GiftHistoryEntry[];
  createdAt: number;
}

/**
 * Normalizes raw Firebase user data into a consistent shape.
 */
export function normalizeUser(
  raw: Record<string, unknown> | null,
  userId: string,
): NormalizedUser {
  if (!raw) {
    return {
      id: userId,
      balance: 0,
      purchased: [],
      favorites: [],
      lastCheckIn: null,
      streak: 0,
      adWatchedToday: 0,
      lastAdDate: null,
      transactions: [],
      giftHistory: [],
      createdAt: 0,
    };
  }

  return {
    id: userId,
    firstName: (raw.firstName as string) || undefined,
    lastName: (raw.lastName as string) || undefined,
    username: (raw.username as string) || undefined,
    photoUrl: (raw.photoUrl as string) || undefined,
    balance: Number(raw.balance) || 0,
    isBanned: !!raw.isBanned,
    purchased: Array.isArray(raw.purchased)
      ? raw.purchased.map((p: string | number) => String(p))
      : [],
    favorites: Array.isArray(raw.favorites)
      ? raw.favorites.map((f: string | number) => String(f))
      : [],
    lastCheckIn: (raw.lastCheckIn as string) || null,
    streak: Number(raw.streak) || 0,
    adWatchedToday: Number(raw.adWatchedToday) || 0,
    lastAdDate: (raw.lastAdDate as string) || null,
    transactions: (Array.isArray(raw.transactions) ? raw.transactions : []) as UserTransaction[],
    giftHistory: (Array.isArray(raw.giftHistory) ? raw.giftHistory : []) as GiftHistoryEntry[],
    createdAt: Number(raw.createdAt) || 0,
  };
}

/** @deprecated Use normalizeUser instead */
export const normalizeUserData = normalizeUser;