import { Bot, Check } from "lucide-react";

export function AshDemoCard({
  eyebrow,
  title,
  sub,
  bullets,
}: {
  eyebrow?: string;
  title: string;
  sub: string;
  bullets: string[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-gradient-to-br from-cobalt-50 to-paper-surface p-8 md:p-12">
      <div className="grid gap-10 md:grid-cols-2 md:items-center">
        <div>
          {eyebrow && (
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-cobalt-700">
              {eyebrow}
            </p>
          )}
          <h2 className="text-3xl font-bold tracking-tight text-ink-900 md:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-base text-ink-600">{sub}</p>
          <ul className="mt-6 space-y-3">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-3 text-sm text-ink-700">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-cobalt-600" />
                {b}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <div className="rounded-xl border border-ink-200 bg-paper-surface p-5 shadow-lg">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cobalt-600 text-white">
                <Bot className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-ink-900">Ash</span>
            </div>
            <div className="space-y-3 text-sm">
              <div className="rounded-md bg-ink-50 px-3 py-2 text-ink-700">
                Who&apos;s overdue this week?
              </div>
              <div className="rounded-md bg-cobalt-50 px-3 py-2 text-ink-800">
                3 cases past due across 2 peers. Dr. Patel has 2 (Hunter Health
                batch B-241), Dr. Liu has 1 (Aira batch B-238). Want me to draft
                a nudge?
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
