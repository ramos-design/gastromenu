"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CookingPot, LayoutDashboard, ListPlus, Sprout, Download, History } from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/jidla', label: 'Seznam jídel', icon: CookingPot },
  { href: '/alergeny', label: 'Alergeny', icon: Sprout },
  { href: '/sestav-menu', label: 'Sestavit menu', icon: ListPlus },
  { href: '/export', label: 'Export', icon: Download },
  { href: '/historie', label: 'Historie', icon: History },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="block">
            <div className="group-data-[collapsible=icon]:hidden">
              <img
                src="/LOGO.png"
                alt="Logo GastroDashboard"
                width={200}
                height={60}
                className="w-full h-auto"
              />
            </div>
            <div className="hidden group-data-[collapsible=icon]:block">
              <img
                src="/LOGO.png"
                alt="Logo GastroDashboard"
                width={40}
                height={40}
                className="mx-auto"
              />
            </div>
        </Link>
      </SidebarHeader>
      <SidebarMenu className="flex-1 p-4 space-y-3">
        {menuItems.map(({ href, label, icon: Icon }) => (
          <SidebarMenuItem key={href}>
            <Link href={href} passHref>
              <SidebarMenuButton
                isActive={pathname === href}
                tooltip={label}
                className="justify-start h-16 px-4 text-base rounded-xl backdrop-blur-lg border border-sidebar-border/30 shadow-lg bg-sidebar-accent/50 hover:!bg-sidebar-accent data-[active=true]:!bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground"
                onClick={() => setOpenMobile(false)}
              >
                <Icon className="w-10 h-10 ml-2" />
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
