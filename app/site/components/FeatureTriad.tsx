import { Sparkles, ShieldCheck, FileText } from "lucide-react";

const ICONS = [Sparkles, ShieldCheck, FileText];

export function FeatureTriad({
  items,
}: {
  items: { title: string; body: string }[];
}) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {items.map((it, i) => {
        const Icon = ICONS[i % ICONS.length];
        return (
          <div
            key={it.title}
            className="rounded-lg border border-ink-100 bg-paper-surface p-6 shadow-sm"
          >
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-cobalt-50 text-cobalt-700">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-ink-900">{it.title}</h3>
            <p className="mt-2 text-sm text-ink-600">{it.body}</p>
          </div>
        );
      })}
    </div>
  );
}
