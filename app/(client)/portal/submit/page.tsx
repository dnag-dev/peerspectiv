import { db } from "@/lib/db";
import { companies, providers, companyForms } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { ClientSubmitWizard } from "@/components/portal/ClientSubmitWizard";

export const dynamic = "force-dynamic";

async function getCompanyContext() {
  // Demo: match the layout which defaults to Hunter Health.
  const hunterRows = await db
    .select()
    .from(companies)
    .where(eq(companies.name, "Hunter Health"))
    .limit(1);
  const company =
    hunterRows[0] ??
    (await db.select().from(companies).limit(1))[0] ?? {
      id: "demo",
      name: "Hunter Health",
    };

  const provs = await db
    .select({
      id: providers.id,
      firstName: providers.firstName,
      lastName: providers.lastName,
      specialty: providers.specialty,
      companyId: providers.companyId,
    })
    .from(providers)
    .where(eq(providers.companyId, company.id));

  const forms = await db
    .select({
      id: companyForms.id,
      specialty: companyForms.specialty,
      form_name: companyForms.formName,
    })
    .from(companyForms)
    .where(and(eq(companyForms.companyId, company.id), eq(companyForms.isActive, true)))
    .orderBy(asc(companyForms.specialty));

  return {
    company: { id: company.id as string, name: company.name as string },
    providers: provs.map((p) => ({
      id: p.id,
      first_name: p.firstName ?? "",
      last_name: p.lastName ?? "",
      specialty: p.specialty ?? null,
      company_id: p.companyId ?? company.id,
    })),
    forms,
  };
}

export default async function ClientSubmitPage() {
  const { company, providers, forms } = await getCompanyContext();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Submit Records
        </h1>
        <p className="text-sm text-white/60">
          Upload charts for peer review. Peerspectiv will activate the batch
          after a quick intake check.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0F2040] p-6 shadow-sm">
        <ClientSubmitWizard
          company={company}
          providers={providers}
          forms={forms}
        />
      </div>
    </div>
  );
}
