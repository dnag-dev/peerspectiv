import Link from "next/link";
import { Check } from "lucide-react";

interface Tier {
  name: string;
  price: string;
  blurb: string;
  features: string[];
  cta: { href: string; label: string };
  highlighted?: boolean;
}

export function PricingTable({ tiers }: { tiers: Tier[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {tiers.map((t) => (
        <div
          key={t.name}
          className={`rounded-xl border p-8 ${
            t.highlighted
              ? "border-cobalt-200 bg-cobalt-50 shadow-md"
              : "border-ink-100 bg-paper-surface"
          }`}
        >
          <h3 className="text-xl font-semibold text-ink-900">{t.name}</h3>
          <p className="mt-2 text-3xl font-bold text-ink-900">{t.price}</p>
          <p className="mt-2 text-sm text-ink-600">{t.blurb}</p>
          <ul className="mt-6 space-y-3">
            {t.features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-ink-700">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-cobalt-600" />
                {f}
              </li>
            ))}
          </ul>
          <Link
            href={t.cta.href}
            className={`mt-8 inline-flex w-full items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium ${
              t.highlighted
                ? "bg-cobalt-600 text-white hover:bg-cobalt-700"
                : "border border-ink-200 bg-paper-surface text-ink-800 hover:border-cobalt-200 hover:text-cobalt-700"
            }`}
          >
            {t.cta.label}
          </Link>
        </div>
      ))}
    </div>
  );
}
