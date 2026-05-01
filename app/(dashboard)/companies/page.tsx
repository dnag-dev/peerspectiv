import { supabaseAdmin } from "@/lib/supabase/server";
import { AddCompanyDialog } from "@/components/companies/AddCompanyDialog";
import type { Company } from "@/types";
import { CompaniesView } from "./CompaniesView";

export const dynamic = "force-dynamic";

interface CompanyWithCounts extends Company {
  provider_count: number;
  active_case_count: number;
}

async function getCompanies(): Promise<CompanyWithCounts[]> {
  const { data: companies, error } = await supabaseAdmin
    .from("companies")
    .select("*")
    .order("name");

  if (error) throw error;
  if (!companies?.length) return [];

  const { data: providerCounts } = await supabaseAdmin
    .from("providers")
    .select("company_id")
    .eq("status", "active");

  const { data: caseCounts } = await supabaseAdmin
    .from("review_cases")
    .select("company_id, status")
    .in("status", ["unassigned", "pending_approval", "assigned", "in_progress"]);

  const providerMap = new Map<string, number>();
  providerCounts?.forEach((p: any) => {
    if (p.company_id) {
      providerMap.set(p.company_id, (providerMap.get(p.company_id) || 0) + 1);
    }
  });

  const caseMap = new Map<string, number>();
  caseCounts?.forEach((c: any) => {
    if (c.company_id) {
      caseMap.set(c.company_id, (caseMap.get(c.company_id) || 0) + 1);
    }
  });

  return companies.map((company: any) => ({
    ...company,
    provider_count: providerMap.get(company.id) || 0,
    active_case_count: caseMap.get(company.id) || 0,
  }));
}

export default async function CompaniesPage() {
  const companies = await getCompanies();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
          <p className="text-muted-foreground">
            Manage companies and their provider networks.
          </p>
        </div>
        <AddCompanyDialog />
      </div>

      <CompaniesView companies={companies} />
    </div>
  );
}
