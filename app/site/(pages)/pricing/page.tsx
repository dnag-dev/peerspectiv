import { Hero } from "../../components/Hero";
import { Section } from "../../components/Section";
import { PricingTable } from "../../components/PricingTable";
import { CTABlock } from "../../components/CTABlock";
import { pricing, home } from "../../lib/copy";

export const metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <>
      <Hero {...pricing.hero} />
      <Section>
        <PricingTable tiers={pricing.tiers} />
      </Section>
      <Section>
        <CTABlock {...home.cta} />
      </Section>
    </>
  );
}
