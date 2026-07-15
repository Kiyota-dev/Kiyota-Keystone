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
    <header className={`top-bar-glass sticky top-0 z-20 min-h-16 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 px-3 sm:px-4 md:px-6 py-2 sm:py-0 ${className}`}>
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {logo}
        <div className="min-w-0">
          <h1 className="text-[14px] sm:text-[15px] font-semibold txt-head truncate">{title}</h1>
          {subtitle && <p className="hidden sm:block text-[11px] txt-muted truncate">{subtitle}</p>}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
        {modeToggle}
        {actions}
      </div>
    </header>
  );
}

export const Header = memo(HeaderBase);
