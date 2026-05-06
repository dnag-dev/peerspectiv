"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export function AddCompanyDialog() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialStatus, setInitialStatus] = useState("lead");
  const [cadenceFrequency, setCadenceFrequency] = useState("quarterly");
  const [fyStartMonth, setFyStartMonth] = useState("1");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const perReviewRate = formData.get("per_review_rate") as string;
    // Map frequency to cadence fields
    let cadencePeriodType = cadenceFrequency;
    let cadencePeriodMonths: number | null = null;
    if (cadenceFrequency === "semi_annual") {
      cadencePeriodType = "custom_multi_month";
      cadencePeriodMonths = 6;
    } else if (cadenceFrequency === "annual") {
      cadencePeriodType = "custom_multi_month";
      cadencePeriodMonths = 12;
    }

    const payload = {
      name: formData.get("name") as string,
      contact_person: (formData.get("contact_person") as string) || null,
      contact_email: (formData.get("contact_email") as string) || null,
      contact_phone: (formData.get("contact_phone") as string) || null,
      per_review_rate: perReviewRate ? Number(perReviewRate) : null,
      notes: (formData.get("notes") as string) || null,
      status: initialStatus,
      cadence_period_type: cadencePeriodType,
      fiscal_year_start_month: Number(fyStartMonth),
      cadence_period_months: cadencePeriodMonths,
    };

    if (!payload.name.trim()) {
      setError("Company name is required.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create company");
      }

      const data = await res.json();
      const newId = data?.id;
      toast({ title: "Company created", description: `${payload.name} has been added.` });
      setOpen(false);
      if (newId) {
        router.push(`/companies/${newId}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Company
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white border border-ink-200 shadow-2xl rounded-xl sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Company</DialogTitle>
          <DialogDescription>
            Enter the company details below. The company will be created with active status.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Company Name *</Label>
            <Input id="name" name="name" placeholder="Acme Healthcare" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_person">Contact Person</Label>
            <Input id="contact_person" name="contact_person" placeholder="John Smith" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input id="contact_email" name="contact_email" type="email" placeholder="john@acme.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Contact Phone</Label>
              <Input id="contact_phone" name="contact_phone" placeholder="(555) 123-4567" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="per_review_rate">Per-Review Rate ($)</Label>
              <Input id="per_review_rate" name="per_review_rate" type="number" min="0" step="0.01" placeholder="90.00" />
              <p className="text-xs text-muted-foreground">Leave blank to use global rate.</p>
            </div>
            <div className="space-y-2">
              <Label>Initial Status</Label>
              <Select value={initialStatus} onValueChange={setInitialStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Lead = first contact. Prospect = qualified.</p>
            </div>
          </div>
          {/* Review Cadence */}
          <div className="rounded-md border border-ink-200 p-3 space-y-3">
            <Label className="text-sm font-medium">Review Cadence</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Frequency</Label>
                <Select value={cadenceFrequency} onValueChange={setCadenceFrequency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="semi_annual">Semi-Annual</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="custom_multi_month">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Fiscal Year Start</Label>
                <Select value={fyStartMonth} onValueChange={setFyStartMonth}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" placeholder="Optional notes about this company..." rows={2} />
          </div>
          {error && <p className="text-sm text-critical-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Company"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
