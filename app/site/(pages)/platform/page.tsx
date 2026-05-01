import { Hero } from "../../components/Hero";
import { Section } from "../../components/Section";
import { CTABlock } from "../../components/CTABlock";
import { platform, home } from "../../lib/copy";

export const metadata = { title: "Platform" };

export default function PlatformPage() {
  return (
    <>
      <Hero {...platform.hero} />
      <Section>
        <div className="grid gap-10 md:grid-cols-2">
          {platform.sections.map((s) => (
            <div key={s.title} className="rounded-lg border border-ink-100 bg-paper-surface p-6">
              <h3 className="text-xl font-semibold text-ink-900">{s.title}</h3>
              <p className="mt-2 text-sm text-ink-600">{s.body}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section>
        <CTABlock {...home.cta} />
      </Section>
    </>
  );
}
