"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";

interface CompanyForm {
  id: string;
  form_name: string;
  specialty: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  peerName: string;
  companyId: string;
  specialty: string | null;
  defaultFormId?: string | null;
  onConfirm: (formId: string | null) => void | Promise<void>;
}

export function ConfirmApproveModal({
  open,
  onOpenChange,
  peerName,
  companyId,
  specialty,
  defaultFormId,
  onConfirm,
}: Props) {
  const [forms, setForms] = useState<CompanyForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const qs = new URLSearchParams({ company_id: companyId });
    if (specialty) qs.set("specialty", specialty);
    fetch(`/api/company-forms?${qs.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        const list: CompanyForm[] = d.forms ?? [];
        setForms(list);
        setSelectedFormId(defaultFormId || list[0]?.id || "");
      })
      .catch(() => setForms([]))
      .finally(() => setLoading(false));
  }, [open, companyId, specialty, defaultFormId]);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm(selectedFormId || null);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm assignment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Peer
            </p>
            <p className="mt-1 text-sm font-medium">{peerName}</p>
          </div>

          <div>
            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Review form
            </label>
            {loading ? (
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading forms...
              </div>
            ) : forms.length === 0 ? (
              <p className="mt-1 text-sm text-status-warning-fg">
                No company-approved forms for {specialty ?? "this specialty"}.
                Peer will use the default form.
              </p>
            ) : (
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedFormId}
                onChange={(e) => setSelectedFormId(e.target.value)}
              >
                {forms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.form_name}
                    {f.specialty ? ` · ${f.specialty}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={submitting}>
            {submitting ? (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-3 w-3" />
            )}
            Confirm & Approve
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
