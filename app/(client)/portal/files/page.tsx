import { EmptyState } from "@/components/ui/EmptyState";

export default function FilesStub() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Files</h1>
        <p className="text-sm text-ink-400">All files you have uploaded for review</p>
      </div>
      <EmptyState
        title="My Files — Coming in Phase 6"
        message="A searchable list of your uploaded chart files will appear here."
        backHref="/portal"
      />
    </div>
  );
}
