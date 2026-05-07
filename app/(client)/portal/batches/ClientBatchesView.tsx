"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FolderOpen } from "lucide-react";
import {
  NewBatchModal,
  type BatchWizardCompany,
  type BatchWizardForm,
  type BatchWizardProvider,
} from "@/components/batches/NewBatchModal";

interface BatchRow {
  id: string;
  batchName: string;
  status: string;
  totalCases: number;
  completedCases: number;
  dateUploaded: string;
  specialty: string;
}

interface Props {
  batches: BatchRow[];
  companyId: string;
  companyName: string;
  fiscalYearStartMonth: number;
  forms: BatchWizardForm[];
  providers: BatchWizardProvider[];
}

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
};

export function ClientBatchesView({
  batches,
  companyId,
  companyName,
  fiscalYearStartMonth,
  forms,
  providers,
}: Props) {
  const [showWizard, setShowWizard] = useState(false);

  const company: BatchWizardCompany = {
    id: companyId,
    name: companyName,
    fiscal_year_start_month: fiscalYearStartMonth,
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-ink-primary">Batches</h1>
          <p className="text-sm text-ink-secondary">
            Upload and manage chart batches for {companyName}
          </p>
        </div>
        <Button onClick={() => setShowWizard(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Batch
        </Button>
      </div>

      {batches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FolderOpen className="mb-4 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-medium text-ink-primary">No batches yet</h3>
          <p className="mt-1 text-sm text-ink-secondary">
            Click &ldquo;New Batch&rdquo; to upload your first chart batch.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border-subtle bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-border-subtle bg-gray-50 text-left">
              <tr className="text-xs uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Batch Name</th>
                <th className="px-4 py-3">Specialty</th>
                <th className="px-4 py-3">Upload Date</th>
                <th className="px-4 py-3 text-center">Cases</th>
                <th className="px-4 py-3 text-center">Completed</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} className="border-b border-border-subtle hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/portal/batches/${b.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {b.batchName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{b.specialty}</td>
                  <td className="px-4 py-3 text-gray-500">{b.dateUploaded}</td>
                  <td className="px-4 py-3 text-center">{b.totalCases}</td>
                  <td className="px-4 py-3 text-center">{b.completedCases}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_BADGE[b.status] ?? STATUS_BADGE.pending
                      }`}
                    >
                      {b.status.replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewBatchModal
        open={showWizard}
        onOpenChange={setShowWizard}
        companies={[company]}
        providers={providers}
        forms={forms}
        defaultCompanyId={companyId}
      />
    </>
  );
}
