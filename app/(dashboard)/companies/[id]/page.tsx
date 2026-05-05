import { notFound } from "next/navigation";
import { db, toSnake } from "@/lib/db";
import { companies, providers as providersTable, reviewCases } from "@/lib/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
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
import { ImportProvidersDialog } from "@/components/companies/ImportProvidersDialog";
import { LocationsSection } from "@/components/companies/LocationsSection";
import { PricingSection } from "@/components/companies/PricingSection";
import { CadenceSection } from "@/components/companies/CadenceSection";
import { ProviderActions } from "@/components/companies/ProviderActions";
import { Users } from "lucide-react";
import type { Company, Provider } from "@/types";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = 'force-dynamic';

interface ProviderWithCaseCount extends Provider {
  active_case_count: number;
}

async function getCompanyWithProviders(id: string) {
  const [company] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  if (!company) return null;

  const providers = await db
    .select()
    .from(providersTable)
    .where(eq(providersTable.companyId, id))
    .orderBy(asc(providersTable.lastName));

  // Get active case counts for each provider
  const caseCounts = await db
    .select({ providerId: reviewCases.providerId, status: reviewCases.status })
    .from(reviewCases)
    .where(
      and(
        eq(reviewCases.companyId, id),
        inArray(reviewCases.status, ['unassigned', 'pending_approval', 'assigned', 'in_progress'])
      )
    );

  const caseMap = new Map<string, number>();
  caseCounts.forEach((c) => {
    if (c.providerId) {
      caseMap.set(c.providerId, (caseMap.get(c.providerId) || 0) + 1);
    }
  });

  const providersWithCounts: ProviderWithCaseCount[] = providers.map((p) => ({
    ...(toSnake(p) as Provider),
    active_case_count: caseMap.get(p.id) || 0,
  }));

  return { company: toSnake(company) as Company, providers: providersWithCounts };
}

export default async function CompanyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  noStore();
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
          <div className="flex gap-2">
            <ImportProvidersDialog companyId={company.id} />
            <AddProviderDialog companyId={company.id} />
          </div>
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

      <CadenceSection companyId={company.id} />

      <PricingSection companyId={company.id} />

      <LocationsSection companyId={company.id} />
    </div>
  );
}
