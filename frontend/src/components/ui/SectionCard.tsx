import type { ReactNode } from "react";
import { Card } from "./Card.tsx";

interface SectionCardProps {
  title?: ReactNode;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ title, description, action, children, className = "" }: SectionCardProps) {
  return (
    <Card variant="glass" className={`p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            {title && <h3 className="text-[14px] font-semibold txt-head">{title}</h3>}
            {description && <p className="text-[12px] txt-muted mt-0.5">{description}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </Card>
  );
}
