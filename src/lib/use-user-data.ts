'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from './store';
import { database } from './firebase-client';
import { ref, onValue, off } from 'firebase/database';
import { normalizeUser } from './user-utils';
import type { AppUser } from './types';

/**
 * Subscribe to the current user's Firebase document and keep the Zustand
 * store in sync. This hook is idempotent: if multiple components use it,
 * only ONE Firebase listener is active at a time (ref-counted).
 *
 * Usage:
 *   function MyComponent() {
 *     useUserData();
 *     const user = useAppStore((s) => s.user);
 *     ...
 *   }
 */

let listenerRefCount = 0;
let activeUserId: string | null = null;
let activeUnsub: (() => void) | null = null;

function attachListener(userId: string, onUser: (u: AppUser | null) => void) {
  if (activeUserId === userId && activeUnsub) return;
  detachListener();
  const userRef = ref(database, `users/${userId}`);
  const handler = onValue(userRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      onUser(null);
      return;
    }
    const normalized = normalizeUser(data, userId);
    onUser(normalized);
  });
  activeUserId = userId;
  activeUnsub = () => off(userRef, 'value', handler);
}

function detachListener() {
  if (activeUnsub) {
    activeUnsub();
    activeUnsub = null;
  }
  activeUserId = null;
}

export function useUserData(): void {
  const userId = useAppStore((s) => s.userId);
  const setUser = useAppStore((s) => s.setUser);
  const refCount = useRef(0);

  useEffect(() => {
    if (!userId) {
      setUser(null);
      return;
    }
    listenerRefCount += 1;
    refCount.current = listenerRefCount;
    attachListener(userId, setUser);
    return () => {
      listenerRefCount -= 1;
      if (listenerRefCount <= 0) {
        detachListener();
        listenerRefCount = 0;
      }
    };
  }, [userId, setUser]);
}
