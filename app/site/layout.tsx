import type { Metadata } from "next";
import { MarketingNav } from "./components/MarketingNav";
import { MarketingFooter } from "./components/MarketingFooter";
import { brand } from "./lib/copy";

export const metadata: Metadata = {
  title: { default: `${brand.name} — ${brand.tagline}`, template: `%s · ${brand.name}` },
  description:
    "Perspectiv is the AI-assisted peer-review platform built for FQHCs and the review firms that serve them.",
  metadataBase: new URL(brand.marketingUrl),
  openGraph: {
    type: "website",
    siteName: brand.name,
    url: brand.marketingUrl,
    title: `${brand.name} — ${brand.tagline}`,
    description:
      "Smarter assignment, cleaner scorecards, audit-ready PDFs — without the spreadsheet sprawl.",
  },
  twitter: { card: "summary_large_image", title: brand.name },
  icons: { icon: "/site/favicon-perspectiv.svg" },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper-surface text-ink-900 antialiased">
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
