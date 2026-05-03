import { EmptyState } from "@/components/ui/EmptyState";

export default function AssignmentsStub() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Assignments</h1>
        <p className="text-sm text-ink-500">Manual + AI-driven case assignment review</p>
      </div>
      <EmptyState
        title="Assignments — Coming in Phase 6"
        message="A unified assignment review queue (manual + AI) will land here. For now, use the AI Assignment Queue under Admin Tools."
        backHref="/dashboard"
      />
    </div>
  );
}
