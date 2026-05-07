import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { companyForms } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

interface FormField {
  field_key: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
  display_order: number;
  default_answer?: string | null;
}

export default async function ClientFormDetailPage({
  params,
}: {
  params: { id: string };
}) {
  noStore();
  const [form] = await db
    .select({
      id: companyForms.id,
      formName: companyForms.formName,
      specialty: companyForms.specialty,
      isActive: companyForms.isActive,
      formFields: companyForms.formFields,
    })
    .from(companyForms)
    .where(eq(companyForms.id, params.id))
    .limit(1);

  if (!form) notFound();

  const fields = (Array.isArray(form.formFields) ? form.formFields : []) as FormField[];
  const sorted = [...fields].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  const TYPE_LABEL: Record<string, string> = {
    yes_no_na: "Yes / No / NA",
    yes_no: "Yes / No / NA",
    abc_na: "A / B / C / NA",
    text: "Text",
    rating: "Rating",
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/portal/forms"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-ink-primary mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Forms
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-medium text-ink-primary">{form.formName}</h1>
          <Badge variant={form.isActive ? "success" : "secondary"}>
            {form.isActive ? "active" : "inactive"}
          </Badge>
        </div>
        <p className="text-sm text-ink-secondary mt-1">
          Specialty: {form.specialty} · {sorted.length} questions
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border-subtle bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-border-subtle bg-gray-50 text-left">
            <tr className="text-xs uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3 w-10">#</th>
              <th className="px-4 py-3">Question</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Default Answer</th>
              <th className="px-4 py-3 text-center">Required</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((f, i) => (
              <tr key={f.field_key} className="border-b border-border-subtle">
                <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                <td className="px-4 py-3 text-ink-primary">{f.field_label}</td>
                <td className="px-4 py-3 text-gray-500">{TYPE_LABEL[f.field_type] ?? f.field_type}</td>
                <td className="px-4 py-3 text-gray-500">{f.default_answer ?? "—"}</td>
                <td className="px-4 py-3 text-center">
                  {f.is_required ? (
                    <span className="text-green-600">Yes</span>
                  ) : (
                    <span className="text-gray-400">No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
