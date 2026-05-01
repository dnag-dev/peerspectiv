import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CTABlock({
  title,
  sub,
  primary,
  secondary,
}: {
  title: string;
  sub?: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <div className="rounded-2xl bg-ink-900 px-8 py-12 text-center md:px-16 md:py-16">
      <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
        {title}
      </h2>
      {sub && <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-300">{sub}</p>}
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link
          href={primary.href}
          className="inline-flex items-center gap-2 rounded-md bg-cobalt-600 px-5 py-3 text-sm font-medium text-white hover:bg-cobalt-500"
        >
          {primary.label}
          <ArrowRight className="h-4 w-4" />
        </Link>
        {secondary && (
          <Link
            href={secondary.href}
            className="inline-flex items-center gap-2 rounded-md border border-ink-700 px-5 py-3 text-sm font-medium text-white hover:border-ink-500"
          >
            {secondary.label}
          </Link>
        )}
      </div>
    </div>
  );
}
