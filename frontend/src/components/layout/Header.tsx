import { memo, type ReactNode } from "react";

interface HeaderProps {
  logo?: ReactNode;
  title: string;
  subtitle?: string;
  modeToggle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

function HeaderBase({ logo, title, subtitle, modeToggle, actions, className = "" }: HeaderProps) {
  return (
    <header className={`top-bar-glass sticky top-0 z-20 h-16 flex items-center justify-between px-4 md:px-6 ${className}`}>
      <div className="flex items-center gap-3 min-w-0">
        {logo}
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold txt-head truncate">{title}</h1>
          {subtitle && <p className="text-[11px] txt-muted truncate">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {modeToggle}
        {actions}
      </div>
    </header>
  );
}

export const Header = memo(HeaderBase);
