import type { ReactNode } from "react";
import { Tooltip } from "./Tooltip.tsx";

interface FieldHelpProps {
  label: string;
  help?: ReactNode;
  example?: string;
  children: ReactNode;
  className?: string;
}

export function FieldHelp({ label, help, example, children, className = "" }: FieldHelpProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center gap-1">
        <span className="text-[12px] font-medium txt-head">{label}</span>
        {help && <Tooltip content={help} icon />}
      </div>
      {children}
      {example && (
        <p className="text-[11px] txt-muted">
          Example: <code className="text-gold">{example}</code>
        </p>
      )}
    </div>
  );
}
