import { db } from "@/lib/db";
import { companyForms, companies } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { unstable_noStore as noStore } from "next/cache";
import { getDemoCompany } from "@/lib/portal/queries";
import { ClientFormsView } from "./ClientFormsView";

export const dynamic = "force-dynamic";

export default async function ClientFormsPage() {
  noStore();
  const company = await getDemoCompany();

  const forms = await db
    .select({
      id: companyForms.id,
      formName: companyForms.formName,
      formIdentifier: companyForms.formIdentifier,
      specialty: companyForms.specialty,
      isActive: companyForms.isActive,
      formFields: companyForms.formFields,
    })
    .from(companyForms)
    .where(eq(companyForms.companyId, company.id))
    .orderBy(asc(companyForms.specialty), asc(companyForms.formName));

  return (
    <div className="space-y-6">
      <ClientFormsView
        forms={forms.map((f) => ({
          id: f.id,
          formName: f.formName,
          formIdentifier: f.formIdentifier,
          specialty: f.specialty,
          isActive: f.isActive,
          formFields: f.formFields,
        }))}
        companyId={company.id}
        companyName={company.name}
      />
    </div>
  );
}
