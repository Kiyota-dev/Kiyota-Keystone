import type { ReactNode } from "react";

interface HeaderProps {
  logo?: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export function Header({ logo, title, subtitle, actions, className = "" }: HeaderProps) {
  return (
    <header className={`top-bar-glass sticky top-0 z-20 h-16 flex items-center justify-between px-4 md:px-6 ${className}`}>
      <div className="flex items-center gap-3 min-w-0">
        {logo}
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold txt-head truncate">{title}</h1>
          {subtitle && <p className="text-[11px] txt-muted truncate">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}
