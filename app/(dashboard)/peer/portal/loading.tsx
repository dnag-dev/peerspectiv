import { Skeleton } from "@/components/ui/skeleton";

export default function PeerPortalLoading() {
  return (
    <div className="flex h-[calc(100vh-7rem)] overflow-hidden rounded-lg border border-ink-200 bg-white shadow-sm">
      {/* Left panel skeleton */}
      <div className="hidden w-80 flex-shrink-0 border-r border-ink-200 bg-ink-50 lg:block">
        <div className="border-b border-ink-200 px-4 py-3.5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-1 h-3 w-28" />
        </div>
        <div className="space-y-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="border-b border-ink-100 px-4 py-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                {i === 0 && <Skeleton className="h-4 w-12 rounded-full" />}
              </div>
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Right panel skeleton */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Chart info header */}
        <div className="rounded-lg border border-ink-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-16 w-24 rounded-md" />
          </div>
        </div>

        {/* AI Analysis summary */}
        <div className="rounded-lg overflow-hidden shadow-md">
          <Skeleton className="h-12 w-full bg-mint-200" />
          <div className="p-5 space-y-4 bg-mint-50/30">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-4">
              <Skeleton className="h-20 w-28 rounded-lg" />
              <Skeleton className="h-20 w-28 rounded-lg" />
              <Skeleton className="h-20 w-28 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Criteria section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-2 w-24 rounded-full" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-ink-200 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-20 rounded-md" />
                  <Skeleton className="h-8 w-24 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>

        {/* Narrative skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-[180px] w-full rounded-lg" />
        </div>

        {/* Submit skeleton */}
        <div className="rounded-lg border border-ink-200 p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-11 w-36 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
