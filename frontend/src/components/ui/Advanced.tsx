import { memo, type ReactNode } from "react";

interface AdvancedProps {
  mode: "simple" | "advanced";
  children: ReactNode;
  className?: string;
}

function AdvancedBase({ mode, children, className = "" }: AdvancedProps) {
  return (
    <div className={`${mode === "simple" ? "hidden" : ""} ${className}`}>
      {children}
    </div>
  );
}

export const Advanced = memo(AdvancedBase);
