'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { isAdminLoggedIn, clearAdminPassword } from '@/lib/admin-api';
import { AppSidebar } from './_components/sidebar/app-sidebar';
import { ThemeSwitcher } from './_components/header/theme-switcher';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

const pageTitles: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/videos': 'Movies',
  '/admin/tv-channels': 'TV Channels',
  '/admin/series': 'TV Series',
  '/admin/shorts': 'Shorts',
  '/admin/categories': 'Categories',
  '/admin/users': 'Users',
  '/admin/gift-codes': 'Gift Codes',
  '/admin/coin-packages': 'Coin Packages',
  '/admin/notifications': 'Notifications',
  '/admin/settings': 'Settings',
};

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !isAdminLoggedIn() && pathname !== '/admin/login') {
      window.location.href = '/admin/login';
    }
  }, [mounted, pathname]);

  if (!mounted) return null;
  if (pathname === '/admin/login') return <>{children}</>;
  if (!isAdminLoggedIn()) return null;

  const pageTitle = pageTitles[pathname] || 'Admin';

  return (
    <SidebarProvider
      style={{
        '--sidebar-width': 'calc(var(--spacing) * 68)',
      } as React.CSSProperties}
    >
      <AppSidebar collapsible="icon" />
      <SidebarInset className="min-w-0 overflow-x-clip">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex w-full items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-1 lg:gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="flex items-center gap-2">
              <ThemeSwitcher />
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View Site →
              </a>
            </div>
          </div>
        </header>
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden p-4 md:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
