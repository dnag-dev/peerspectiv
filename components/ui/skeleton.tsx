import { cn } from "@/lib/utils";

/**
 * Practitioner skeleton — mint shimmer (not generic gray pulse). The
 * `shimmer` keyframes are defined in app/globals.css and ride a
 * mint-tinted gradient so loading states feel like AI is doing work,
 * not that the page is broken.
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-sm bg-ink-100",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_ease-in-out_infinite] before:bg-gradient-to-r before:from-transparent before:via-mint-100 before:to-transparent",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
