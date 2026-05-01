import { Hero } from "./components/Hero";
import { Section, SectionHeader } from "./components/Section";
import { TrustBar } from "./components/TrustBar";
import { AudienceSplit } from "./components/AudienceSplit";
import { FeatureTriad } from "./components/FeatureTriad";
import { AshDemoCard } from "./components/AshDemoCard";
import { ProblemDiagram } from "./components/ProblemDiagram";
import { CTABlock } from "./components/CTABlock";
import { home } from "./lib/copy";

export default function MarketingHome() {
  return (
    <>
      <Hero {...home.hero} />
      <TrustBar title={home.trust.title} items={home.trust.items} />

      <Section>
        <SectionHeader title={home.audienceSplit.title} sub={home.audienceSplit.sub} />
        <div className="mt-12">
          <AudienceSplit fqhc={home.audienceSplit.fqhc} firms={home.audienceSplit.firms} />
        </div>
      </Section>

      <Section className="bg-paper-canvas">
        <SectionHeader title={home.features.title} />
        <div className="mt-12">
          <FeatureTriad items={home.features.triad} />
        </div>
      </Section>

      <Section>
        <AshDemoCard {...home.ash} />
      </Section>

      <Section className="bg-paper-canvas">
        <SectionHeader title={home.problem.title} sub={home.problem.sub} />
        <div className="mt-12">
          <ProblemDiagram />
        </div>
      </Section>

      <Section>
        <CTABlock {...home.cta} />
      </Section>
    </>
  );
}
