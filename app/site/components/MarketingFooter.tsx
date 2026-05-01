import Link from "next/link";
import { WordmarkPerspectiv } from "./WordmarkPerspectiv";
import { footer, brand } from "../lib/copy";

export function MarketingFooter() {
  return (
    <footer className="border-t border-ink-100 bg-paper-canvas">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-4">
        <div>
          <WordmarkPerspectiv className="text-base" />
          <p className="mt-3 text-xs text-ink-500">{brand.tagline}</p>
        </div>
        <FooterCol title="Product" items={footer.product} />
        <FooterCol title="Company" items={footer.company} />
        <FooterCol title="Trust" items={footer.trust} />
      </div>
      <div className="border-t border-ink-100 px-6 py-4">
        <p className="mx-auto max-w-6xl text-xs text-ink-500">{footer.copyright}</p>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  items,
}: {
  title: string;
  items: { href: string; label: string }[];
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-600">
        {title}
      </h4>
      <ul className="mt-3 space-y-2">
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="text-sm text-ink-700 hover:text-cobalt-700">
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
