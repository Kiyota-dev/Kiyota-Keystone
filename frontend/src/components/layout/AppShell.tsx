import type { ReactNode } from "react";
import { Header } from "./Header.tsx";
import { Sidebar, type SidebarItem } from "./Sidebar.tsx";
import { MobileNav } from "./MobileNav.tsx";

interface AppShellProps {
  title: string;
  subtitle?: string;
  logo?: ReactNode;
  sidebarItems: SidebarItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  headerActions?: ReactNode;
  sidebarFooter?: ReactNode;
  children: ReactNode;
}

export function AppShell({
  title,
  subtitle,
  logo,
  sidebarItems,
  activeTab,
  onTabChange,
  headerActions,
  sidebarFooter,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header
        logo={logo}
        title={title}
        subtitle={subtitle}
        actions={
          <>
            <div className="md:hidden">
              <MobileNav items={sidebarItems} active={activeTab} onChange={onTabChange} />
            </div>
            {headerActions}
          </>
        }
      />

      <div className="flex">
        <Sidebar
          items={sidebarItems}
          active={activeTab}
          onChange={onTabChange}
          footer={sidebarFooter}
        />

        <main className="flex-1 min-w-0 p-4 md:p-6 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
