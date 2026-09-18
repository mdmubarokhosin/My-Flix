import {
  Film, Tv, Clapperboard, Video, Tags, Users,
  Gift, Coins, Bell, Settings, LayoutDashboard, FolderOpen,
  type LucideIcon,
} from "lucide-react";

export interface NavSubItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
  disabled?: boolean;
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
  url?: never;
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const adminSidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Overview",
    items: [
      {
        id: "dashboard",
        title: "Dashboard",
        url: "/admin",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: 2,
    label: "Content",
    items: [
      {
        id: "content-library",
        title: "Content Library",
        icon: FolderOpen,
        subItems: [
          { id: "videos", title: "Movies", url: "/admin/videos", icon: Film },
          { id: "tv-channels", title: "TV Channels", url: "/admin/tv-channels", icon: Tv },
          { id: "series", title: "TV Series", url: "/admin/series", icon: Clapperboard },
          { id: "shorts", title: "Shorts", url: "/admin/shorts", icon: Video },
          { id: "categories", title: "Categories", url: "/admin/categories", icon: Tags },
        ],
      },
    ],
  },
  {
    id: 3,
    label: "Management",
    items: [
      {
        id: "users",
        title: "Users",
        url: "/admin/users",
        icon: Users,
      },
      {
        id: "gift-codes",
        title: "Gift Codes",
        url: "/admin/gift-codes",
        icon: Gift,
      },
      {
        id: "coin-packages",
        title: "Coin Packages",
        url: "/admin/coin-packages",
        icon: Coins,
      },
    ],
  },
  {
    id: 4,
    label: "System",
    items: [
      {
        id: "notifications",
        title: "Notifications",
        url: "/admin/notifications",
        icon: Bell,
      },
      {
        id: "settings",
        title: "Settings",
        url: "/admin/settings",
        icon: Settings,
      },
    ],
  },
];
