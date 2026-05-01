import { Hero } from "../../components/Hero";
import { Section } from "../../components/Section";
import { CTABlock } from "../../components/CTABlock";
import { fqhc, home } from "../../lib/copy";
import { Check } from "lucide-react";

export const metadata = { title: "For FQHCs" };

export default function FqhcPage() {
  return (
    <>
      <Hero {...fqhc.hero} />
      <Section>
        <ul className="mx-auto max-w-2xl space-y-4">
          {fqhc.bullets.map((b) => (
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
