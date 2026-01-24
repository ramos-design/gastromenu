"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChefHat, CookingPot, LayoutDashboard, ListPlus, Settings, Sprout } from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { ThemeToggle } from '../theme-toggle';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/jidla', label: 'Jídla', icon: CookingPot },
  { href: '/alergeny', label: 'Alergeny', icon: Sprout },
  { href: '/sestav-menu', label: 'Sestavit menu', icon: ListPlus },
  { href: '/nastaveni', label: 'Nastavení', icon: Settings },
];

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <ChefHat className="w-8 h-8 text-primary" />
          <h1 className="text-xl font-bold group-data-[collapsible=icon]:hidden">
            GastroDash
          </h1>
        </div>
      </SidebarHeader>
      <SidebarMenu className="flex-1 p-4">
        {menuItems.map(({ href, label, icon: Icon }) => (
          <SidebarMenuItem key={href}>
            <Link href={href} passHref>
              <SidebarMenuButton
                isActive={pathname === href}
                tooltip={label}
                className="justify-start"
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
      <SidebarFooter className="p-4 items-center flex-row justify-between group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:justify-center">
         {/* In a real app, this would show user info */}
      </SidebarFooter>
    </Sidebar>
  );
}
