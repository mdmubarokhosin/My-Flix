'use client';

import { useEffect, useState } from 'react';
import { getAdminStats } from '@/lib/admin-api';
import Link from 'next/link';
import {
  Film, Users, Gift, Coins, Tv, Video, Bell, Settings,
  ArrowUpRight, TrendingUp, Clapperboard, Tags,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Area, AreaChart, ComposedChart, Line } from 'recharts';

interface Stats {
  totalVideos: number;
  totalUsers: number;
  totalGiftCodes: number;
  activeGiftCodes: number;
  totalCoinsInCirculation: number;
}

const quickActions = [
  { label: 'Add Movie', href: '/admin/videos', icon: Film, desc: 'Add a new movie to your library' },
  { label: 'Add Channel', href: '/admin/tv-channels', icon: Tv, desc: 'Create a new TV channel' },
  { label: 'Add Series', href: '/admin/series', icon: Clapperboard, desc: 'Create a new TV series' },
  { label: 'Add Short', href: '/admin/shorts', icon: Video, desc: 'Upload a new short video' },
  { label: 'Create Code', href: '/admin/gift-codes', icon: Gift, desc: 'Generate a new gift code' },
  { label: 'Send Alert', href: '/admin/notifications', icon: Bell, desc: 'Send a push notification' },
  { label: 'Settings', href: '/admin/settings', icon: Settings, desc: 'Configure API keys and platform' },
];

// Sample content type distribution data (will be replaced with real stats)
const contentTypeData = [
  { type: 'Movies', count: 0, fill: 'var(--color-movies)' },
  { type: 'Series', count: 0, fill: 'var(--color-series)' },
  { type: 'Channels', count: 0, fill: 'var(--color-channels)' },
  { type: 'Shorts', count: 0, fill: 'var(--color-shorts)' },
];

const contentTypeConfig = {
  movies: { label: 'Movies', color: 'hsl(var(--chart-1))' },
  series: { label: 'Series', color: 'hsl(var(--chart-2))' },
  channels: { label: 'Channels', color: 'hsl(var(--chart-3))' },
  shorts: { label: 'Shorts', color: 'hsl(var(--chart-4))' },
} satisfies ChartConfig;

// Sample activity data for the area chart
const activityData = [
  { date: 'Aug 14', users: 12, videos: 3 },
  { date: 'Aug 15', users: 18, videos: 5 },
  { date: 'Aug 16', users: 15, videos: 2 },
  { date: 'Aug 17', users: 25, videos: 8 },
  { date: 'Aug 18', users: 22, videos: 6 },
  { date: 'Aug 19', users: 30, videos: 10 },
  { date: 'Aug 20', users: 28, videos: 7 },
];

const activityConfig = {
  users: { label: 'New Users', color: 'hsl(var(--chart-1))' },
  videos: { label: 'Content Added', color: 'hsl(var(--chart-2))' },
} satisfies ChartConfig;

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statCards = stats
    ? [
        { label: 'Total Content', value: stats.totalVideos, icon: Film, desc: 'Movies, series, and shorts', badge: `${stats.totalVideos} items` },
        { label: 'Total Users', value: stats.totalUsers, icon: Users, desc: 'Registered user accounts', badge: 'Active' },
        { label: 'Gift Codes', value: stats.totalGiftCodes, icon: Gift, desc: `${stats.activeGiftCodes} active codes`, badge: `${stats.activeGiftCodes} active` },
        { label: 'Coins in Circulation', value: stats.totalCoinsInCirculation, icon: Coins, desc: 'Total coins across all users' },
      ]
    : [];

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs xl:grid-cols-4 dark:*:data-[slot=card]:bg-card">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle>
                  <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                    <div className="h-4 w-4 rounded bg-muted-foreground/20 animate-pulse" />
                  </div>
                </CardTitle>
                <CardDescription>Loading...</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-1">
                <div className="h-8 w-24 rounded bg-muted animate-pulse" />
              </CardContent>
            </Card>
          ))
        ) : (
          statCards.map((card) => (
            <Card key={card.label}>
              <CardHeader>
                <CardTitle>
                  <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                    <card.icon className="size-4" />
                  </div>
                </CardTitle>
                <CardDescription>{card.label}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
                    {card.value.toLocaleString()}
                  </div>
                  {card.badge && (
                    <Badge><TrendingUp className="size-3" />{card.badge}</Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-sm">{card.desc}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Activity Chart */}
        <Card className="lg:col-span-4 @container/card">
          <CardHeader>
            <CardTitle className="leading-none">Platform Activity</CardTitle>
            <CardDescription>
              <span className="@[540px]/card:block hidden">User signups and content additions for the last 7 days</span>
              <span className="@[540px]/card:hidden">Last 7 days</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={activityConfig} className="aspect-auto h-[250px] w-full">
              <ComposedChart data={activityData} margin={{ top: 0 }}>
                <defs>
                  <linearGradient id="fillUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-users)" stopOpacity={0.36} />
                    <stop offset="95%" stopColor="var(--color-users)" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeOpacity={0.5} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" />}
                />
                <Area
                  dataKey="users"
                  type="natural"
                  fill="url(#fillUsers)"
                  stroke="var(--color-users)"
                  strokeWidth={1.25}
                  dot={false}
                  fillOpacity={1}
                />
                <Line
                  dataKey="videos"
                  type="natural"
                  stroke="var(--color-videos)"
                  strokeWidth={1.4}
                  dot={false}
                />
              </ComposedChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Content Distribution Chart */}
        <Card className="lg:col-span-3 @container/card">
          <CardHeader>
            <CardTitle className="leading-none">Content Overview</CardTitle>
            <CardDescription>
              <span className="@[540px]/card:block hidden">Distribution of content types in your library</span>
              <span className="@[540px]/card:hidden">Content types</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={contentTypeConfig} className="aspect-auto h-[250px] w-full">
              <BarChart data={contentTypeData} layout="vertical" margin={{ left: 0 }}>
                <CartesianGrid horizontal={false} strokeOpacity={0.5} />
                <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis
                  dataKey="type"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={60}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="var(--color-movies)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common admin operations to manage your platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {quickActions.map((action) => (
              <Link key={action.label} href={action.href}>
                <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                  <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                    <action.icon className="size-4" />
                  </div>
                  <div className="text-left">
                    <span className="font-medium text-sm block">{action.label}</span>
                    <span className="text-xs text-muted-foreground">{action.desc}</span>
                  </div>
                  <ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}