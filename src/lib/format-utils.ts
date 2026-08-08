/**
 * Shared formatting utilities to eliminate duplication across components.
 */

/**
 * Formats a timestamp to a relative time string (e.g., "2m ago", "3h ago", "5d ago").
 */
export function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return '';
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

/** @deprecated Use formatRelativeTime instead */
export const formatTimestampForTx = formatRelativeTime;

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

/**
 * Formats a number with K/M suffixes.
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
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
