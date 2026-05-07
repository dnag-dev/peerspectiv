import { db } from "@/lib/db";
import { companyForms, companies } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { unstable_noStore as noStore } from "next/cache";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import Link from "next/link";

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
        <p className="text-sm text-ink-secondary">No company found.</p>
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
    })
    .from(companyForms)
    .where(eq(companyForms.companyId, companyId))
    .orderBy(asc(companyForms.specialty), asc(companyForms.formName));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium text-ink-primary">Forms</h1>
        <p className="text-sm text-ink-secondary">
          Review form templates for your practice — {forms.length} forms.
        </p>
      </div>

      {forms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="mb-4 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-medium text-ink-primary">No forms configured</h3>
          <p className="mt-1 text-sm text-ink-secondary">
            Your administrator will set up review forms for your practice.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border-subtle bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-border-subtle bg-gray-50 text-left">
              <tr className="text-xs uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Form Name</th>
                <th className="px-4 py-3">Specialty</th>
                <th className="px-4 py-3 text-center">Questions</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {forms.map((form) => {
                const fieldCount = Array.isArray(form.formFields) ? form.formFields.length : 0;
                return (
                  <tr key={form.id} className="border-b border-border-subtle hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/portal/forms/${form.id}`}
                        className="flex items-center gap-2 text-blue-600 hover:underline"
                      >
                        <FileText className="h-4 w-4 text-gray-400" />
                        {form.formName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{form.specialty}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{fieldCount}</td>
                    <td className="px-4 py-3">
                      <Badge variant={form.isActive ? "success" : "secondary"}>
                        {form.isActive ? "active" : "inactive"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
