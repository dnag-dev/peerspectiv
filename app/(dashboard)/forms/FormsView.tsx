"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, ToggleLeft, ToggleRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormBuilderModal } from "@/components/forms/FormBuilderModal";

interface FormRow {
  id: string;
  companyId: string | null;
  companyName: string | null;
  specialty: string;
  formName: string;
  formFields: unknown;
  isActive: boolean | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date | null;
  templatePdfUrl: string | null;
  templatePdfName: string | null;
}

interface Props {
  forms: FormRow[];
  companies: { id: string; name: string }[];
}

export function FormsView({ forms, companies }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderCompanyId, setBuilderCompanyId] = useState<string>("");

  const visible =
    companyFilter === "all" ? forms : forms.filter((f) => f.companyId === companyFilter);

  async function toggleActive(id: string, current: boolean | null) {
    const res = await fetch(`/api/company-forms/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !current }),
    });
    if (res.ok) startTransition(() => router.refresh());
  }

  function openBuilder(companyId: string) {
    setBuilderCompanyId(companyId);
    setShowBuilder(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Forms</h1>
          <p className="text-sm text-muted-foreground">
            Manage peer-review form templates per company and specialty.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All companies</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() =>
              openBuilder(companyFilter !== "all" ? companyFilter : companies[0]?.id ?? "")
            }
            disabled={companies.length === 0}
            className="bg-cobalt-600 hover:bg-cobalt-700"
          >
            <Plus className="h-4 w-4 mr-2" /> New Form
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Specialty</th>
                <th className="px-4 py-3 text-left">Form Name</th>
                <th className="px-4 py-3 text-right">Fields</th>
                <th className="px-4 py-3 text-left">Template</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-ink-500">
                    No forms yet. Click <strong>New Form</strong> to build one.
                  </td>
                </tr>
              )}
              {visible.map((f) => {
                const fieldCount = Array.isArray(f.formFields) ? f.formFields.length : 0;
                return (
                  <tr key={f.id} className="border-t border-ink-100 hover:bg-ink-50/50">
                    <td className="px-4 py-3 text-ink-900">{f.companyName ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-700">{f.specialty}</td>
                    <td className="px-4 py-3 text-ink-900 font-medium">{f.formName}</td>
                    <td className="px-4 py-3 text-right text-ink-700">{fieldCount}</td>
                    <td className="px-4 py-3">
                      {f.templatePdfUrl ? (
                        <a
                          href={f.templatePdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-cobalt-700 hover:underline"
                        >
                          <FileText className="h-3 w-3" />
                          {f.templatePdfName ?? "View"}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-ink-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                          f.isActive
                            ? "bg-mint-50 text-mint-700"
                            : "bg-ink-100 text-ink-500"
                        }`}
                      >
                        {f.isActive ? "active" : "inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActive(f.id, f.isActive)}
                        disabled={isPending}
                      >
                        {f.isActive ? (
                          <>
                            <ToggleRight className="h-3 w-3 mr-1" /> Disable
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-3 w-3 mr-1" /> Enable
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {showBuilder && builderCompanyId && (
        <FormBuilderModal
          open={showBuilder}
          onOpenChange={setShowBuilder}
          companyId={builderCompanyId}
          onCreated={() => {
            setShowBuilder(false);
            startTransition(() => router.refresh());
          }}
        />
      )}
    </div>
  );
}
