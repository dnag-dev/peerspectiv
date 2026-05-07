import { db } from "@/lib/db";
import {
  batches,
  companies,
  companyForms,
  providers as providersTable,
} from "@/lib/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { getDemoCompany } from "@/lib/portal/queries";
import { unstable_noStore as noStore } from "next/cache";
import { ClientBatchesView } from "./ClientBatchesView";

export const dynamic = "force-dynamic";

export default async function ClientBatchesPage() {
  noStore();
  const company = await getDemoCompany();

  const [batchRows, forms, providerRows] = await Promise.all([
    db
      .select({
        id: batches.id,
        batchName: batches.batchName,
        status: batches.status,
        totalCases: batches.totalCases,
        completedCases: batches.completedCases,
        dateUploaded: batches.dateUploaded,
        specialty: batches.specialty,
      })
      .from(batches)
      .where(eq(batches.companyId, company.id))
      .orderBy(desc(batches.createdAt)),
    db
      .select({
        id: companyForms.id,
        specialty: companyForms.specialty,
        form_name: companyForms.formName,
        is_active: companyForms.isActive,
      })
      .from(companyForms)
      .where(eq(companyForms.companyId, company.id))
      .orderBy(asc(companyForms.specialty)),
    db
      .select({
        id: providersTable.id,
        first_name: providersTable.firstName,
        last_name: providersTable.lastName,
        specialty: providersTable.specialty,
      })
      .from(providersTable)
      .where(eq(providersTable.companyId, company.id))
      .orderBy(asc(providersTable.lastName)),
  ]);

  return (
    <div className="space-y-6">
      <ClientBatchesView
        batches={batchRows.map((b) => ({
          id: b.id,
          batchName: b.batchName ?? "Untitled",
          status: b.status ?? "pending",
          totalCases: b.totalCases ?? 0,
          completedCases: b.completedCases ?? 0,
          dateUploaded: b.dateUploaded
            ? new Date(b.dateUploaded as any).toLocaleDateString()
            : "—",
          specialty: b.specialty ?? "—",
        }))}
        companyId={company.id}
        companyName={company.name}
        fiscalYearStartMonth={
          (company as any).fiscal_year_start_month ?? 1
        }
        forms={forms.map((f) => ({
          id: f.id,
          company_id: company.id,
          specialty: f.specialty,
          form_name: f.form_name,
          is_active: f.is_active ?? true,
        }))}
        providers={providerRows.map((p) => ({
          id: p.id,
          company_id: company.id,
          first_name: p.first_name ?? "",
          last_name: p.last_name ?? "",
          specialty: p.specialty ?? null,
        }))}
      />
    </div>
  );
}
