export function WordmarkPerspectiv({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-baseline font-semibold tracking-tight text-ink-900 ${className}`}
      aria-label="Peerspectiv"
    >
      <span className="text-cobalt-700">Peerspect</span>
      <span>iv</span>
      <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-cobalt-600" aria-hidden />
    </span>
  );
}
