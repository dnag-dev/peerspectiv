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
  // Phase 8.2 — secure-email channel selector for report bundles. Distinct
  // from delivery_preference (which governs invoices). Maps to companies.delivery_method.
  const [deliveryMethod, setDeliveryMethod] = useState<'portal' | 'secure_email' | 'both'>(
    (company.delivery_method as 'portal' | 'secure_email' | 'both' | null) ?? 'portal'
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const annualRaw = formData.get("annual_review_count") as string;
    const payload = {
      name: formData.get("name") as string,
      contact_person: (formData.get("contact_person") as string) || null,
      contact_email: (formData.get("contact_email") as string) || null,
      contact_phone: (formData.get("contact_phone") as string) || null,
      address: (formData.get("address") as string) || null,
      city: (formData.get("city") as string) || null,
      state: (formData.get("state") as string) || null,
      annual_review_count: annualRaw ? Number(annualRaw) : null,
      notes: (formData.get("notes") as string) || null,
      itemize_invoice: itemizeInvoice,
      delivery_preference: deliveryPreference,
      delivery_method: deliveryMethod,
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
      <DialogContent className="bg-white border border-border-subtle shadow-2xl rounded-xl max-h-[90vh] overflow-y-auto sm:max-w-[540px]">
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
            <Label htmlFor="edit-address">Address</Label>
            <Input id="edit-address" name="address" defaultValue={company.address ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-city">City</Label>
              <Input id="edit-city" name="city" defaultValue={company.city ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-state">State</Label>
              <Input id="edit-state" name="state" defaultValue={company.state ?? ""} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-annual_review_count">Annual Review Count</Label>
            <Input id="edit-annual_review_count" name="annual_review_count" type="number" min="0" defaultValue={company.annual_review_count ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea id="edit-notes" name="notes" defaultValue={company.notes ?? ""} rows={3} />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-primary">
            <input
              type="checkbox"
              checked={itemizeInvoice}
              onChange={(e) => setItemizeInvoice(e.target.checked)}
              className="h-4 w-4 rounded border-border-default text-status-info-dot focus:ring-brand"
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
              className="flex h-10 w-full rounded-md border border-border-default bg-white px-3 py-2 text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="portal">Portal only</option>
              <option value="email">Email only</option>
              <option value="both">Both portal &amp; email</option>
            </select>
            <p className="text-xs text-ink-secondary">
              How to deliver invoices to this client.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-delivery_method">Report Bundle Delivery</Label>
            <select
              id="edit-delivery_method"
              value={deliveryMethod}
              onChange={(e) =>
                setDeliveryMethod(e.target.value as 'portal' | 'secure_email' | 'both')
              }
              className="flex h-10 w-full rounded-md border border-border-default bg-white px-3 py-2 text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="portal">Portal only (no email)</option>
              <option value="secure_email">Secure email (Resend with ZIP attachment + audit log)</option>
              <option value="both">Both portal &amp; secure email</option>
            </select>
            <p className="text-xs text-ink-secondary">
              Used by /api/reports/email when sending the per-cadence ZIP bundle.
            </p>
          </div>
          {error && <p className="text-sm text-status-danger-dot">{error}</p>}
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
