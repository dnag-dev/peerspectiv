import { CommandCenter } from "@/components/command/CommandCenter";

export default function CommandPage() {
  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-medium tracking-tight text-ink-primary">
          Command Center
        </h1>
        <p className="text-sm text-muted-foreground">
          Natural-language interface for managing cases, stats, and reports
        </p>
      </div>
      <CommandCenter />
    </div>
  );
}
