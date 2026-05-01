import { Hero } from "../../components/Hero";
import { Section } from "../../components/Section";
import { CTABlock } from "../../components/CTABlock";
import { firms, home } from "../../lib/copy";
import { Check } from "lucide-react";

export const metadata = { title: "For Review Firms" };

export default function FirmsPage() {
  return (
    <>
      <Hero {...firms.hero} />
      <Section>
        <ul className="mx-auto max-w-2xl space-y-4">
          {firms.bullets.map((b) => (
            <li key={b} className="flex items-start gap-3 text-base text-ink-800">
              <Check className="mt-1 h-5 w-5 flex-shrink-0 text-cobalt-600" />
              {b}
            </li>
          ))}
        </ul>
      </Section>
      <Section>
        <CTABlock {...home.cta} />
      </Section>
    </>
  );
}
