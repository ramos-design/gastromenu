"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CookingPot, LayoutDashboard, ListPlus, Sprout, Download, History, LogOut, User } from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

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
  const { user, signOut } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="p-6">
        <Link href="/dashboard" className="block">
          <div className="group-data-[collapsible=icon]:hidden p-4">
            <img
              src="/LOGO.png"
              alt="Logo GastroDashboard"
              width={160}
              height={48}
              className="w-4/5 h-auto mx-auto"
            />
          </div>
          <div className="hidden group-data-[collapsible=icon]:block p-2">
            <img
              src="/LOGO.png"
              alt="Logo GastroDashboard"
              width={32}
              height={32}
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
      <SidebarFooter className="p-4">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <User className="mr-2 h-4 w-4" />
                <span className="truncate">{user.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Můj účet</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Odhlásit se
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
