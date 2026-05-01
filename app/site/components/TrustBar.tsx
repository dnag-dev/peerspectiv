export function TrustBar({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="border-y border-ink-100 bg-paper-canvas py-10">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-center text-sm text-ink-500">{title}</p>
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
          {items.map((it) => (
            <li key={it} className="text-sm font-medium text-ink-700">
              {it}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
