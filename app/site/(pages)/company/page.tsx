import { Hero } from "../../components/Hero";
import { Section } from "../../components/Section";
import { CTABlock } from "../../components/CTABlock";
import { company, home } from "../../lib/copy";

export const metadata = { title: "Company" };

export default function CompanyPage() {
  return (
    <>
      <Hero {...company.hero} />
      <Section>
        <div className="grid gap-6 md:grid-cols-3">
          {company.values.map((v) => (
            <div key={v.title} className="rounded-lg border border-ink-100 bg-paper-surface p-6">
              <h3 className="text-lg font-semibold text-ink-900">{v.title}</h3>
              <p className="mt-2 text-sm text-ink-600">{v.body}</p>
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
