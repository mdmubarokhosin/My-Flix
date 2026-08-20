/** Shared transaction display helpers */
import { Coins, Gift, TrendingUp, TrendingDown, Calendar, ShoppingCart, CheckCircle, ArrowDownToLine } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { FirebaseRTDB } from './firebase-server';
import type { UserTransaction } from './types';

export interface TransactionDisplay {
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

const transactionStyles: Record<string, TransactionDisplay> = {
  earn: { icon: TrendingUp, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  ad: { icon: Coins, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  checkin: { icon: Calendar, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  purchase: { icon: ShoppingCart, color: 'text-rose-500', bgColor: 'bg-rose-500/10' },
  spend: { icon: TrendingDown, color: 'text-rose-500', bgColor: 'bg-rose-500/10' },
  redeem: { icon: Gift, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  gift: { icon: Gift, color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
  admin: { icon: CheckCircle, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
};

export function getTransactionDisplay(type: string): TransactionDisplay {
  return transactionStyles[type] || { icon: ArrowDownToLine, color: 'text-gray-500', bgColor: 'bg-gray-500/10' };
}

/**
 * Append a transaction record to a user's transaction history in Firebase.
 * Does NOT update the user's balance — the caller should handle that separately.
 */
export async function addTransaction(
  database: FirebaseRTDB,
  userId: string,
  { type, title, amount }: { type: UserTransaction['type']; title: string; amount: number },
): Promise<void> {
  const transaction: UserTransaction = {
    type,
    title,
    amount,
    time: Date.now(),
  };

  const existing = await database.get<UserTransaction[]>(`users/${userId}/transactions`);
  const transactions = Array.isArray(existing) ? [...existing, transaction] : [transaction];

  await database.update(`users/${userId}`, { transactions });
}
