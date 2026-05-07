import { db } from "@/lib/db";
import { companyForms, companies } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { unstable_noStore as noStore } from "next/cache";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

export const dynamic = "force-dynamic";

async function getCompanyId(): Promise<string | null> {
  const rows = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.name, "Hunter Health"))
    .limit(1);
  return rows[0]?.id ?? null;
}

export default async function ClientFormsPage() {
  noStore();
  const companyId = await getCompanyId();
  if (!companyId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-medium text-ink-primary">Forms</h1>
        <Card><CardContent className="py-12 text-center text-ink-secondary">No company found.</CardContent></Card>
      </div>
    );
  }

  const forms = await db
    .select({
      id: companyForms.id,
      formName: companyForms.formName,
      specialty: companyForms.specialty,
      isActive: companyForms.isActive,
      formFields: companyForms.formFields,
      createdAt: companyForms.createdAt,
    })
    .from(companyForms)
    .where(eq(companyForms.companyId, companyId))
    .orderBy(asc(companyForms.specialty), asc(companyForms.formName));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium text-ink-primary">Forms</h1>
        <p className="text-sm text-ink-tertiary">
          Review form templates for your practice — {forms.length} forms.
        </p>
      </div>

      {forms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="mb-4 h-12 w-12 text-ink-tertiary" />
            <h3 className="text-lg font-medium text-ink-200">No forms configured</h3>
            <p className="mt-1 text-sm text-ink-tertiary">
              Your administrator will set up review forms for your practice.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-ink-800/50 text-ink-tertiary text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Form Name</th>
                  <th className="px-4 py-3 text-left">Specialty</th>
                  <th className="px-4 py-3 text-center">Questions</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {forms.map((form) => {
                  const fieldCount = Array.isArray(form.formFields) ? form.formFields.length : 0;
                  return (
                    <tr key={form.id} className="border-t border-ink-700/50">
                      <td className="px-4 py-3 text-ink-100 font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4 text-ink-tertiary" />
                        {form.formName}
                      </td>
                      <td className="px-4 py-3 text-ink-tertiary">{form.specialty}</td>
                      <td className="px-4 py-3 text-center text-ink-tertiary">{fieldCount}</td>
                      <td className="px-4 py-3">
                        <Badge variant={form.isActive ? "success" : "pending"}>
                          {form.isActive ? "active" : "inactive"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
