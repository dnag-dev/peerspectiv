import { EmptyState } from "@/components/ui/EmptyState";

export default function ProfileStub() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <p className="text-sm text-ink-400">Your contact information and notification preferences</p>
      </div>
      <EmptyState
        title="Profile — Coming in Phase 6"
        message="You will be able to update your contact info and notification preferences here."
        backHref="/portal"
      />
    </div>
  );
}
