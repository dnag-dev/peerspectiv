/**
 * AskAshButton — brand green, replaces the old dark-blue Ash CTA across
 * all four personas. Gives Ash a consistent affordance everywhere.
 */
import * as React from "react";

interface AskAshButtonProps {
  onClick?: () => void;
  className?: string;
}

export default function AskAshButton({ onClick, className = "" }: AskAshButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-hover ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[#9FE1CB]" />
      Ask Ash
    </button>
  );
}
