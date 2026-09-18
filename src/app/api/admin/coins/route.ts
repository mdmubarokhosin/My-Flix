import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const usersData = await db.get<Record<string, any>>('users');
    const paymentsData = await db.get<Record<string, any>>('payments');
    const userCoinSummaries: Array<{
      id: string; name: string; username: string;
      balance: number; totalEarned: number; totalSpent: number;
      transactionCount: number; lastActive: number;
    }> = [];
    let totalCoinsInCirculation = 0;
    let totalCoinsEarned = 0;
    let totalCoinsSpent = 0;
    let totalTransactions = 0;
    const txByType: Record<string, { count: number; amount: number }> = {};
    const allTransactions: Array<{
      userId: string; userName: string; type: string;
      title: string; amount: number; time: number;
    }> = [];

    if (usersData) {
      for (const [userId, user] of Object.entries(usersData) as [string, any][]) {
        const balance = Number(user.balance) || 0;
        totalCoinsInCirculation += balance;
        let userEarned = 0;
        let userSpent = 0;
        const txns = user.transactions || [];
        for (const tx of txns) {
          const amt = Number(tx.amount) || 0;
          totalTransactions++;
          if (!txByType[tx.type]) txByType[tx.type] = { count: 0, amount: 0 };
          txByType[tx.type].count++;
          txByType[tx.type].amount += amt;
          const isPositive = ['earn', 'gift', 'admin', 'checkin', 'purchase'].includes(tx.type);
          if (isPositive) { userEarned += amt; totalCoinsEarned += amt; }
          else { userSpent += amt; totalCoinsSpent += amt; }
          allTransactions.push({ userId, userName: user.firstName || user.username || 'Unknown', type: tx.type, title: tx.title, amount: amt, time: tx.time || 0 });
        }
        userCoinSummaries.push({ id: userId, name: user.firstName || '', username: user.username || '', balance, totalEarned: userEarned, totalSpent: userSpent, transactionCount: txns.length, lastActive: txns.length > 0 ? Math.max(...txns.map((t: any) => t.time || 0)) : (user.createdAt || 0) });
      }
    }
    userCoinSummaries.sort((a, b) => b.balance - a.balance);
    allTransactions.sort((a, b) => b.time - a.time);
    const recentTransactions = allTransactions.slice(0, 50);
    let totalPayments = 0;
    let completedPayments = 0;
    let totalRevenue = 0;
    let pendingPayments = 0;
    if (paymentsData) {
      for (const p of Object.values(paymentsData) as Record<string, any>[]) {
        totalPayments++;
        if (p.status === 'completed') { completedPayments++; totalRevenue += Number(p.amount) || 0; }
        else if (p.status === 'pending') { pendingPayments++; }
      }
    }
    return NextResponse.json({
      totalCoinsInCirculation, totalCoinsEarned, totalCoinsSpent, totalTransactions, txByType, userCoinSummaries, recentTransactions,
      paymentStats: { total: totalPayments, completed: completedPayments, pending: pendingPayments, totalRevenue },
    });
  } catch (error) {
    console.error('GET /api/admin/coins error:', error);
    return NextResponse.json({ error: 'Failed to fetch coin data' }, { status: 500 });
  }
}
