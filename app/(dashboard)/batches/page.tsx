import { db } from "@/lib/db";
import { batches as batchesTable, companies as companiesTable, providers as providersTable, companyForms } from "@/lib/db/schema";
import { asc, desc, eq, inArray } from "drizzle-orm";
import type { Batch } from "@/types";
import {
  NewBatchModal,
  type BatchWizardCompany,
  type BatchWizardForm,
  type BatchWizardProvider,
} from "@/components/batches/NewBatchModal";
import { BatchesView } from "./BatchesView";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

interface BatchWithCompany extends Batch {
  company_name: string | null;
}

async function getBatches(): Promise<BatchWithCompany[]> {
  const data = await db.query.batches.findMany({
    orderBy: desc(batchesTable.createdAt),
    with: { company: { columns: { name: true } } },
  });

  return data.map((batch) => ({
    id: batch.id,
    batch_name: batch.batchName,
    company_id: batch.companyId ?? null,
    company_name: batch.company?.name ?? null,
    date_uploaded: batch.dateUploaded ? new Date(batch.dateUploaded).toISOString() : null,
    total_cases: batch.totalCases,
    assigned_cases: batch.assignedCases,
    completed_cases: batch.completedCases,
    status: batch.status,
    specialty: batch.specialty,
    created_at: batch.createdAt ? new Date(batch.createdAt).toISOString() : null,
    notes: batch.notes,
    created_by: batch.createdBy,
    source_file_path: batch.sourceFilePath,
    projected_completion: batch.projectedCompletion ? new Date(batch.projectedCompletion).toISOString() : null,
    company_form_id: batch.companyFormId,
  })) as unknown as BatchWithCompany[];
}

async function getWizardData(): Promise<{
  companies: BatchWizardCompany[];
  providers: BatchWizardProvider[];
  forms: BatchWizardForm[];
}> {
  const [companies, providers, forms] = await Promise.all([
    db
      .select({
        id: companiesTable.id,
        name: companiesTable.name,
        billing_cycle: companiesTable.billingCycle,
        fiscal_year_start_month: companiesTable.fiscalYearStartMonth,
      })
      .from(companiesTable)
      .where(inArray(companiesTable.status, ['active', 'active_client', 'in_cycle']))
      .orderBy(asc(companiesTable.name)),
    db
      .select({
        id: providersTable.id,
        company_id: providersTable.companyId,
        first_name: providersTable.firstName,
        last_name: providersTable.lastName,
        specialty: providersTable.specialty,
      })
      .from(providersTable),
    db
      .select({
        id: companyForms.id,
        company_id: companyForms.companyId,
        specialty: companyForms.specialty,
        form_name: companyForms.formName,
        is_active: companyForms.isActive,
      })
      .from(companyForms)
      .where(eq(companyForms.isActive, true)),
  ]);

  return {
    companies: companies as unknown as BatchWizardCompany[],
    providers: providers as unknown as BatchWizardProvider[],
    forms: forms as unknown as BatchWizardForm[],
  };
}

export default async function BatchesPage() {
  noStore();
  const [batches, wizardData] = await Promise.all([
    getBatches(),
    getWizardData(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Batches</h1>
          <p className="text-muted-foreground">
            View and manage uploaded case batches.
          </p>
        </div>
        <NewBatchModal
          companies={wizardData.companies}
          providers={wizardData.providers}
          forms={wizardData.forms}
        />
      </div>

      <BatchesView
        batches={batches.map((b) => ({
          id: b.id,
          batch_name: b.batch_name,
          company_id: b.company_id ?? null,
          company_name: b.company_name,
          date_uploaded: b.date_uploaded,
          total_cases: b.total_cases,
          assigned_cases: b.assigned_cases,
          completed_cases: b.completed_cases,
          status: b.status,
        }))}
      />
    </div>
  );
}
