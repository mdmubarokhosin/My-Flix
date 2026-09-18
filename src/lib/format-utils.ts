/**
 * Shared formatting utilities.
 *
 * For `formatNumber` and `formatRelativeTime`, prefer the versions in
 * `video-utils.ts` (single source of truth). This file re-exports them
 * for backwards compatibility and adds date-time + transaction-icon
 * helpers that are only used here.
 */

import { formatNumber as _formatNumber, formatRelativeTime as _formatRelativeTime } from './video-utils';

export const formatNumber = _formatNumber;
export const formatRelativeTime = _formatRelativeTime;

/**
 * Formats a timestamp to a full date-time string.
 */
export function formatDateTime(timestamp: number): string {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** @deprecated Use formatRelativeTime instead */
export function formatTimestampForTx(timestamp: number): string {
  return _formatRelativeTime(timestamp);
}

/**
 * Returns the appropriate icon name for a transaction type.
 */
export function getTransactionIcon(type: string): string {
  switch (type) {
    case 'earn':
    case 'checkin':
    case 'ad':
      return 'TrendingUp';
    case 'spend':
    case 'purchase':
      return 'TrendingDown';
    case 'redeem':
    case 'gift':
      return 'Gift';
    case 'admin':
      return 'Shield';
    default:
      return 'ArrowRightLeft';
  }
}

/**
 * Returns the appropriate color class for a transaction type.
 */
export function getTransactionColor(type: string): string {
  switch (type) {
    case 'earn':
    case 'checkin':
    case 'ad':
    case 'redeem':
    case 'gift':
      return 'text-green-500';
    case 'spend':
    case 'purchase':
      return 'text-red-500';
    case 'admin':
      return 'text-blue-500';
    default:
      return 'text-muted-foreground';
  }
}
