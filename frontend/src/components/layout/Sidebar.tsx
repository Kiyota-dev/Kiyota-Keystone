import type { ReactNode } from "react";

export interface SidebarItem {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface SidebarProps {
  items: SidebarItem[];
  active: string;
  onChange: (id: string) => void;
  footer?: ReactNode;
  className?: string;
}

export function Sidebar({ items, active, onChange, footer, className = "" }: SidebarProps) {
  return (
    <aside className={`hidden md:flex flex-col w-64 h-[calc(100vh-4rem)] sticky top-16 border-r border-theme/30 bg-background/80 backdrop-blur ${className}`}>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`nav-item w-full text-left transition-colors ${
                isActive ? "nav-item-active txt-head" : "txt-nav-muted hover:text-foreground"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {item.icon && <span className="shrink-0">{item.icon}</span>}
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
      {footer && <div className="p-3 border-t border-theme/30">{footer}</div>}
    </aside>
  );
}
