import { supabaseAdmin } from "@/lib/supabase/server";
import type { Batch } from "@/types";
import {
  NewBatchModal,
  type BatchWizardCompany,
  type BatchWizardForm,
  type BatchWizardProvider,
} from "@/components/batches/NewBatchModal";
import { BatchesView } from "./BatchesView";

export const dynamic = "force-dynamic";

interface BatchWithCompany extends Batch {
  company_name: string | null;
}

async function getBatches(): Promise<BatchWithCompany[]> {
  const { data, error } = await supabaseAdmin
    .from("batches")
    .select("*, company:companies(name)")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((batch: any) => ({
    ...batch,
    company_name: (batch.companies as { name: string } | null)?.name ?? null,
    companies: undefined,
  }));
}

async function getWizardData(): Promise<{
  companies: BatchWizardCompany[];
  providers: BatchWizardProvider[];
  forms: BatchWizardForm[];
}> {
  const [companiesRes, providersRes, formsRes] = await Promise.all([
    supabaseAdmin
      .from("companies")
      .select("id, name, billing_cycle, fiscal_year_start_month")
      .order("name", { ascending: true }),
    supabaseAdmin
      .from("providers")
      .select("id, company_id, first_name, last_name, specialty"),
    supabaseAdmin
      .from("company_forms")
      .select("id, company_id, specialty, form_name, is_active")
      .eq("is_active", true),
  ]);
  return {
    companies: (companiesRes.data ?? []) as BatchWizardCompany[],
    providers: (providersRes.data ?? []) as BatchWizardProvider[],
    forms: (formsRes.data ?? []) as BatchWizardForm[],
  };
}

export default async function BatchesPage() {
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
