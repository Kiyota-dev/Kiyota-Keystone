import type { ReactNode } from "react";

interface AdvancedProps {
  mode: "simple" | "advanced";
  children: ReactNode;
  className?: string;
}

export function Advanced({ mode, children, className = "" }: AdvancedProps) {
  if (mode === "simple") return null;
  return <div className={className}>{children}</div>;
}
