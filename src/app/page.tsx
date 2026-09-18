import AppShell from '@/components/app/AppShell';

// Force this page to be server-rendered on demand (not statically prerendered).
// The AppShell uses client-only state (localStorage, Telegram SDK, Firebase
// listeners) and cannot be statically prerendered at build time.
export const dynamic = 'force-dynamic';

// Required for Cloudflare Pages (@cloudflare/next-on-pages): all non-static
// routes must use the Edge runtime. The page itself is a thin server shell
// that renders <AppShell /> (which is a 'use client' component).
export const runtime = 'edge';

export default function Page() {
  return <AppShell />;
}
