import { EmptyState } from "@/components/ui/EmptyState";

export default function FormsStub() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Forms</h1>
        <p className="text-sm text-ink-400">Read-only view of the review forms attached to your account</p>
      </div>
      <EmptyState
        title="Forms — Coming in Phase 6"
        message="A read-only view of the form templates currently scoring your reviews will appear here."
        backHref="/portal"
      />
    </div>
  );
}
