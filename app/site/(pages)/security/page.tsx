import { Hero } from "../../components/Hero";
import { Section } from "../../components/Section";
import { security } from "../../lib/copy";

export const metadata = { title: "Security & Compliance" };

export default function SecurityPage() {
  return (
    <>
      <Hero {...security.hero} />
      <Section>
        <div className="grid gap-6 md:grid-cols-2">
          {security.controls.map((c) => (
            <div key={c.title} className="rounded-lg border border-ink-100 bg-paper-surface p-6">
              <h3 className="text-lg font-semibold text-ink-900">{c.title}</h3>
              <p className="mt-2 text-sm text-ink-600">{c.body}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section id="privacy">
        <h2 className="text-2xl font-bold text-ink-900">Privacy</h2>
        <p className="mt-3 text-sm text-ink-600 max-w-3xl">
          Perspectiv processes patient-related data only as a Business Associate
          on behalf of FQHC and review-firm Covered Entities. We do not sell or
          share data with third parties for marketing purposes. Full privacy
          notice available on request.
        </p>
      </Section>
      <Section id="terms">
        <h2 className="text-2xl font-bold text-ink-900">Terms</h2>
        <p className="mt-3 text-sm text-ink-600 max-w-3xl">
          Standard MSA + DPA available on request. Pilot agreements run on a
          one-batch term and convert to annual at renewal.
        </p>
      </Section>
    </>
  );
}
