import { memo, useMemo, type ReactNode } from "react";
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
  modeToggle?: ReactNode;
  sidebarFooter?: ReactNode;
  children: ReactNode;
}

function AppShellBase({
  title,
  subtitle,
  logo,
  sidebarItems,
  activeTab,
  onTabChange,
  headerActions,
  modeToggle,
  sidebarFooter,
  children,
}: AppShellProps) {
  const headerActionsNode = useMemo(
    () => (
      <>
        <div className="md:hidden">
          <MobileNav items={sidebarItems} active={activeTab} onChange={onTabChange} />
        </div>
        {headerActions && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {headerActions}
          </div>
        )}
      </>
    ),
    [sidebarItems, activeTab, onTabChange, headerActions]
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header logo={logo} title={title} subtitle={subtitle} modeToggle={modeToggle} actions={headerActionsNode} />

      <div className="flex">
        <Sidebar
          items={sidebarItems}
          active={activeTab}
          onChange={onTabChange}
          footer={sidebarFooter}
        />

        <main className="flex-1 min-w-0 p-3 sm:p-4 md:p-6 md:pl-72 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

export const AppShell = memo(AppShellBase);
