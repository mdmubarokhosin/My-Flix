"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { NavGroup, NavMainItem, NavMainParentItem } from "@/navigation/admin-sidebar-items";

export function NavMain({ items }: { readonly items: readonly NavGroup[] }) {
  const path = usePathname();

  const isItemActive = (item: NavMainItem) => {
    if ("subItems" in item && item.subItems?.length) {
      return item.subItems.some((sub) => path.startsWith(sub.url));
    }
    return ("url" in item) && path === item.url;
  };

  const isSubItemActive = (url: string) => path === url;

  const isSubmenuOpen = (item: NavMainParentItem) => {
    return item.subItems.some((sub) => path.startsWith(sub.url));
  };

  return (
    <>
      {items.map((group) => (
        <SidebarGroup key={group.id}>
          {group.label && (
            <SidebarGroupLabel className="group-data-[collapsible=icon]:pointer-events-none">
              {group.label}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => {
                if ("subItems" in item && item.subItems?.length) {
                  return (
                    <CollapsibleSubItem
                      key={item.id}
                      item={item}
                      isActive={isItemActive(item)}
                      defaultOpen={isSubmenuOpen(item)}
                      isSubItemActive={isSubItemActive}
                    />
                  );
                }

                if ("url" in item && item.url) {
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        isActive={isItemActive(item)}
                        aria-disabled={item.disabled}
                      >
                        <Link prefetch={false} href={item.url}>
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}

function CollapsibleSubItem({
  item,
  isActive,
  defaultOpen,
  isSubItemActive,
}: {
  item: NavMainParentItem;
  isActive: boolean;
  defaultOpen: boolean;
  isSubItemActive: (url: string) => boolean;
}) {
  const { state, isMobile } = useSidebar();
  const isCollapsedDesktop = state === "collapsed" && !isMobile;

  const Icon = item.icon;

  if (isCollapsedDesktop) {
    return (
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton tooltip={item.title} isActive={isActive}>
              {Icon ? <Icon /> : (
                <span className="flex size-4 shrink-0 items-center justify-center rounded-xs font-medium text-[10px] outline">
                  {item.title.slice(0, 1)}
                </span>
              )}
              <span>{item.title}</span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" sideOffset={12} className="w-48">
            <DropdownMenuGroup>
              {item.subItems.map((subItem) => {
                const SubIcon = subItem.icon;
                return (
                  <DropdownMenuItem key={subItem.id} asChild>
                    <Link
                      prefetch={false}
                      href={subItem.url}
                      className="flex items-center gap-2"
                    >
                      {SubIcon && <SubIcon />}
                      <span>{subItem.title}</span>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible asChild defaultOpen={defaultOpen} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={item.title} isActive={isActive}>
            {Icon && <Icon />}
            <span>{item.title}</span>
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.subItems.map((subItem) => {
              const SubIcon = subItem.icon;
              return (
                <SidebarMenuSubItem key={subItem.id}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isSubItemActive(subItem.url)}
                  >
                    <Link prefetch={false} href={subItem.url}>
                      {SubIcon && <SubIcon />}
                      <span>{subItem.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
