import { notFound } from "next/navigation";
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
import { CompanyHeader } from "@/components/companies/CompanyHeader";
import { AddProviderDialog } from "@/components/companies/AddProviderDialog";
import { ProviderActions } from "@/components/companies/ProviderActions";
import { Users } from "lucide-react";
import type { Company, Provider } from "@/types";

export const dynamic = 'force-dynamic';

interface ProviderWithCaseCount extends Provider {
  active_case_count: number;
}

async function getCompanyWithProviders(id: string) {
  const { data: company, error: companyError } = await supabaseAdmin
    .from("companies")
    .select("*")
    .eq("id", id)
    .single();

  if (companyError || !company) return null;

  const { data: providers } = await supabaseAdmin
    .from("providers")
    .select("*")
    .eq("company_id", id)
    .order("last_name");

  // Get active case counts for each provider
  const { data: caseCounts } = await supabaseAdmin
    .from("review_cases")
    .select("provider_id, status")
    .eq("company_id", id)
    .in("status", ["unassigned", "pending_approval", "assigned", "in_progress"]);

  const caseMap = new Map<string, number>();
  caseCounts?.forEach((c: any) => {
    if (c.provider_id) {
      caseMap.set(c.provider_id, (caseMap.get(c.provider_id) || 0) + 1);
    }
  });

  const providersWithCounts: ProviderWithCaseCount[] = (providers || []).map((p: any) => ({
    ...p,
    active_case_count: caseMap.get(p.id) || 0,
  }));

  return { company: company as Company, providers: providersWithCounts };
}

export default async function CompanyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const result = await getCompanyWithProviders(params.id);

  if (!result) {
    notFound();
  }

  const { company, providers } = result;

  return (
    <div className="space-y-6">
      <CompanyHeader company={company} />

      {company.notes && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{company.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5" />
            Providers
            <Badge variant="secondary" className="ml-2">
              {providers.length}
            </Badge>
          </CardTitle>
          <AddProviderDialog companyId={company.id} />
        </CardHeader>
        <CardContent>
          {providers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">No providers yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add providers to this company to start assigning cases.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>NPI</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Active Cases</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell className="font-medium">
                      {provider.first_name} {provider.last_name}
                    </TableCell>
                    <TableCell>{provider.specialty}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {provider.email || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {provider.npi || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={provider.status === "active" ? "success" : "secondary"}>
                        {provider.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {provider.active_case_count}
                    </TableCell>
                    <TableCell>
                      <ProviderActions
                        providerId={provider.id}
                        providerName={`${provider.first_name} ${provider.last_name}`}
                        status={provider.status}
                      />
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
