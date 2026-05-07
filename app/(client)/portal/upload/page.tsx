import { EmptyState } from "@/components/ui/EmptyState";

export default function UploadStub() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium text-ink-primary">Submit Records</h1>
        <p className="text-sm text-ink-tertiary">Upload medical records for peer review</p>
      </div>
      <EmptyState
        title="Submit records — drag and drop coming soon"
        message="Drag-and-drop chart upload with provider mapping is on the roadmap. Use Submit Records (legacy) under Reviews while this lands."
        backHref="/portal"
      />
    </div>
  );
}
