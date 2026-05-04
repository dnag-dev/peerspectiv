import { db } from "@/lib/db";
import { companies, reviewResults, reviewCases } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { AshChat } from "@/components/ash/AshChat";
import { ClientPortalShell } from "@/components/layout/ClientPortalShell";
import { BfcacheGuard } from "@/components/auth/BfcacheGuard";

export const dynamic = "force-dynamic";

async function getCompany() {
  // Demo mode: default to Hunter Health
  const rows = await db
    .select()
    .from(companies)
    .where(eq(companies.name, "Hunter Health"))
    .limit(1);

  if (rows.length > 0) return rows[0];

  // Fallback: any company
  const any = await db.select().from(companies).limit(1);
  return any[0] ?? { id: "demo", name: "Hunter Health" };
}

async function computeComplianceScore(companyId: string): Promise<number> {
  try {
    const rows = await db
      .select({
        score: reviewResults.overallScore,
      })
      .from(reviewResults)
      .innerJoin(reviewCases, eq(reviewCases.id, reviewResults.caseId))
      .where(eq(reviewCases.companyId, companyId));

    if (rows.length === 0) return 0;
    // overall_score is numeric(5,2) → arrives as string from drizzle/neon
    const scores = rows
      .map((r) => (r.score == null ? 0 : Number(r.score)))
      .filter((s) => s > 0);
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  } catch {
    return 0;
  }
}

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const company = await getCompany();
  const complianceScore = await computeComplianceScore(company.id);

  return (
    <ClientPortalShell companyName={company.name}>
      <BfcacheGuard />
      {children}
      <AshChat
        portal="client"
        context={{
          companyId: company.id,
          companyName: company.name,
          complianceScore,
          currentQuarter: "Q1 2026",
        }}
        initialGreeting={`Hi — ${company.name} is at ${complianceScore}% compliance this quarter. What would you like to explore?`}
        // Phase 8.1 — client-tailored quick-action prompts.
        suggestedPrompts={[
          "Explain my Q4 score",
          "Which providers improved most?",
          "Draft a corrective action plan for Provider X",
          "Show providers at risk",
        ]}
      />
    </ClientPortalShell>
  );
}
