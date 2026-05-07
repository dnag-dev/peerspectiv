/**
 * TopBar — every authenticated page renders one. Eyebrow shows persona
 * context; title shows the actual page (kills the "Peerspectiv" / "Peers"
 * generic-title bug).
 */
import * as React from "react";

interface TopBarProps {
  eyebrow: string;
  title: string;
  right?: React.ReactNode;
  className?: string;
}

export default function TopBar({ eyebrow, title, right, className = "" }: TopBarProps) {
  return (
    <div
      className={`flex items-center justify-between border-b border-border-subtle bg-surface-card px-5 py-3.5 ${className}`}
    >
      <div className="min-w-0">
        <p className="eyebrow truncate">{eyebrow}</p>
        <p className="mt-0.5 truncate text-lg font-medium tracking-tight text-ink-primary">
          {title}
        </p>
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}
