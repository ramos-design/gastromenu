import { GastroProvider } from '@/contexts/GastroContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GastroProvider>
      <SidebarProvider>
        <AppSidebar />
        <div className="flex flex-col w-full">
          <Header />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
            {children}
          </main>
        </div>
      </SidebarProvider>
    </GastroProvider>
  );
}
