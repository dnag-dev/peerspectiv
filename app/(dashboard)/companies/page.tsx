import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddCompanyDialog } from "@/components/companies/AddCompanyDialog";
import { CompanyActions } from "@/components/companies/CompanyActions";
import { Building2 } from "lucide-react";
import type { Company } from "@/types";

export const dynamic = 'force-dynamic';

interface CompanyWithCounts extends Company {
  provider_count: number;
  active_case_count: number;
}

async function getCompanies(): Promise<CompanyWithCounts[]> {
  // Fetch all companies
  const { data: companies, error } = await supabaseAdmin
    .from("companies")
    .select("*")
    .order("name");

  if (error) throw error;
  if (!companies?.length) return [];

  // Fetch provider counts per company
  const { data: providerCounts } = await supabaseAdmin
    .from("providers")
    .select("company_id")
    .eq("status", "active");

  // Fetch active case counts per company
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5" />
            All Companies
            <Badge variant="secondary" className="ml-2">
              {companies.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">No companies yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Get started by adding your first company.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Contact Email</TableHead>
                  <TableHead className="text-center">Active Providers</TableHead>
                  <TableHead className="text-center">Active Cases</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/companies/${company.id}`}
                        className="text-info-600 hover:underline"
                      >
                        {company.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {company.contact_person || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {company.contact_email || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {company.provider_count}
                    </TableCell>
                    <TableCell className="text-center">
                      {company.active_case_count}
                    </TableCell>
                    <TableCell>
                      <Badge variant={company.status === "active" ? "success" : "secondary"}>
                        {company.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <CompanyActions company={company} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
