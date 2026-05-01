import { ArrowRight, FileSpreadsheet, Mail, MessageSquare, Layers } from "lucide-react";

export function ProblemDiagram() {
  return (
    <div className="grid gap-8 md:grid-cols-2 md:items-center">
      <div className="rounded-xl border border-ink-100 bg-paper-canvas p-8">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-critical-700">
          Today
        </p>
        <div className="flex items-center justify-around gap-4">
          <Tile icon={FileSpreadsheet} label="Spreadsheet" tone="critical" />
          <Tile icon={Mail} label="Email thread" tone="critical" />
          <Tile icon={MessageSquare} label="Side chat" tone="critical" />
        </div>
        <p className="mt-6 text-sm text-ink-600">
          Three sources of truth, none of them right. Reviewer assignments drift,
          deadlines slip, audit prep takes a week.
        </p>
      </div>
      <div className="hidden md:flex md:justify-center">
        <ArrowRight className="h-8 w-8 text-ink-400" />
      </div>
      <div className="rounded-xl border border-cobalt-200 bg-cobalt-50 p-8 md:col-start-2 md:row-start-1">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-cobalt-700">
          With Perspectiv
        </p>
        <div className="flex items-center justify-center">
          <Tile icon={Layers} label="One system of record" tone="cobalt" wide />
        </div>
        <p className="mt-6 text-sm text-ink-700">
          Cases, reviewers, results, attestations, reports — one place, role-aware,
          audit-logged.
        </p>
      </div>
    </div>
  );
}

function Tile({
  icon: Icon,
  label,
  tone,
  wide,
}: {
  icon: typeof Layers;
  label: string;
  tone: "critical" | "cobalt";
  wide?: boolean;
}) {
  const toneClasses =
    tone === "critical"
      ? "border-critical-100 bg-paper-surface text-critical-700"
      : "border-cobalt-200 bg-paper-surface text-cobalt-700";
  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-lg border ${toneClasses} px-4 py-3 ${
        wide ? "w-full max-w-xs" : ""
      }`}
    >
      <Icon className="h-6 w-6" />
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}
