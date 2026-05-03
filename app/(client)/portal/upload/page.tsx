import { EmptyState } from "@/components/ui/EmptyState";

export default function UploadStub() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Submit Records</h1>
        <p className="text-sm text-ink-400">Upload medical records for peer review</p>
      </div>
      <EmptyState
        title="Submit Records — Coming in Phase 6"
        message="Drag-and-drop chart upload with provider mapping is in design. Use Submit Records (legacy) under Reviews while this lands."
        backHref="/portal"
      />
    </div>
  );
}
