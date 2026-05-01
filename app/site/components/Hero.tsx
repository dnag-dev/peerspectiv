import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface HeroProps {
  eyebrow?: string;
  title: string;
  sub?: string;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
}

export function Hero({ eyebrow, title, sub, primary, secondary }: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-paper-canvas to-paper-surface">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        {eyebrow && (
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-cobalt-700">
            {eyebrow}
          </p>
        )}
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-ink-900 md:text-6xl">
          {title}
        </h1>
        {sub && (
          <p className="mt-6 max-w-2xl text-lg text-ink-600 md:text-xl">{sub}</p>
        )}
        {(primary || secondary) && (
          <div className="mt-10 flex flex-wrap items-center gap-4">
            {primary && (
              <Link
                href={primary.href}
                className="inline-flex items-center gap-2 rounded-md bg-cobalt-600 px-5 py-3 text-sm font-medium text-white hover:bg-cobalt-700"
              >
                {primary.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            {secondary && (
              <Link
                href={secondary.href}
                className="inline-flex items-center gap-2 rounded-md border border-ink-200 bg-paper-surface px-5 py-3 text-sm font-medium text-ink-800 hover:border-cobalt-200 hover:text-cobalt-700"
              >
                {secondary.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
