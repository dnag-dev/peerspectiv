"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Company } from "@/types";

interface EditCompanyDialogProps {
  company: Company;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCompanyDialog({ company, open, onOpenChange }: EditCompanyDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemizeInvoice, setItemizeInvoice] = useState<boolean>(
    Boolean(company.itemize_invoice)
  );
  const [deliveryPreference, setDeliveryPreference] = useState<'email' | 'portal' | 'both'>(
    (company.delivery_preference as 'email' | 'portal' | 'both' | null) ?? 'portal'
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get("name") as string,
      contact_person: (formData.get("contact_person") as string) || null,
      contact_email: (formData.get("contact_email") as string) || null,
      contact_phone: (formData.get("contact_phone") as string) || null,
      notes: (formData.get("notes") as string) || null,
      itemize_invoice: itemizeInvoice,
      delivery_preference: deliveryPreference,
    };

    if (!payload.name.trim()) {
      setError("Company name is required.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update company");
      }

      onOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border border-ink-200 shadow-2xl rounded-xl sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Company</DialogTitle>
          <DialogDescription>Update the company information below.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Company Name *</Label>
            <Input id="edit-name" name="name" defaultValue={company.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-contact_person">Contact Person</Label>
            <Input id="edit-contact_person" name="contact_person" defaultValue={company.contact_person ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-contact_email">Contact Email</Label>
              <Input id="edit-contact_email" name="contact_email" type="email" defaultValue={company.contact_email ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-contact_phone">Contact Phone</Label>
              <Input id="edit-contact_phone" name="contact_phone" defaultValue={company.contact_phone ?? ""} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea id="edit-notes" name="notes" defaultValue={company.notes ?? ""} rows={3} />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={itemizeInvoice}
              onChange={(e) => setItemizeInvoice(e.target.checked)}
              className="h-4 w-4 rounded border-ink-300 text-cobalt-600 focus:ring-cobalt-600"
            />
            Itemize invoices (show per-provider breakdown on PDF)
          </label>
          <div className="space-y-2">
            <Label htmlFor="edit-delivery_preference">Report Delivery Preference</Label>
            <select
              id="edit-delivery_preference"
              value={deliveryPreference}
              onChange={(e) =>
                setDeliveryPreference(e.target.value as 'email' | 'portal' | 'both')
              }
              className="flex h-10 w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-cobalt-600"
            >
              <option value="portal">Portal only</option>
              <option value="email">Email only</option>
              <option value="both">Both portal &amp; email</option>
            </select>
            <p className="text-xs text-ink-500">
              How to deliver completed cycle reports to this client.
            </p>
          </div>
          {error && <p className="text-sm text-critical-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
