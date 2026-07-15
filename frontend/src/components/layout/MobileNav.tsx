import { useState } from "react";
import { Menu, X } from "lucide-react";
import type { SidebarItem } from "./Sidebar.tsx";
import { Button } from "../ui/Button.tsx";

interface MobileNavProps {
  items: SidebarItem[];
  active: string;
  onChange: (id: string) => void;
}

export function MobileNav({ items, active, onChange }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <div className="md:hidden">
      <Button variant="secondary" size="icon" onClick={() => setOpen(true)} aria-label="Open menu">
        <Menu className="w-5 h-5" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-72 max-w-[80vw] h-full bg-background border-r border-theme/30 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[15px] font-semibold txt-head">Menu</span>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <nav className="flex-1 space-y-4 overflow-y-auto">
              {items.map((item, idx) => {
                const isActive = item.id === active;
                const showGroup = item.group && (idx === 0 || items[idx - 1].group !== item.group);
                return (
                  <div key={item.id}>
                    {showGroup && (
                      <p className="px-3 mb-1.5 text-[10px] font-semibold txt-muted uppercase tracking-wider">
                        {item.group}
                      </p>
                    )}
                    <button
                      onClick={() => handleSelect(item.id)}
                      className={`nav-item w-full text-left ${
                        isActive ? "nav-item-active txt-head" : "txt-nav-muted"
                      }`}
                    >
                      {item.icon && <span className="shrink-0">{item.icon}</span>}
                      <span className="truncate">{item.label}</span>
                    </button>
                  </div>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
