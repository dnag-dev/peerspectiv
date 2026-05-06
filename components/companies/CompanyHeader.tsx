"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { EditCompanyDialog } from "./EditCompanyDialog";
import { Pencil, ArrowLeft, Send, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import type { Company } from "@/types";

interface CompanyHeaderProps {
  company: Company;
}

const STATUS_BADGE: Record<string, string> = {
  lead: "bg-ink-100 text-ink-700",
  prospect: "bg-blue-100 text-blue-700",
  contract_sent: "bg-amber-100 text-amber-700",
  contract_signed: "bg-cobalt-100 text-cobalt-700",
  active: "bg-mint-100 text-mint-700",
  active_client: "bg-mint-100 text-mint-700",
  in_cycle: "bg-purple-100 text-purple-700",
  archived: "bg-ink-100 text-ink-500",
};

export function CompanyHeader({ company }: CompanyHeaderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSendContract() {
    setBusy(true);
    try {
      const res = await fetch("/api/contracts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: company.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to send contract");
      toast({ title: "Contract sent", description: `DocuSign envelope created for ${company.name}.` });
      router.refresh();
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed" });
    } finally {
      setBusy(false);
    }
  }

  async function handleActivate() {
    setBusy(true);
    try {
      const res = await fetch(`/api/companies/${company.id}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to activate");
      toast({ title: "Portal access granted", description: `${company.name} is now active. Welcome email sent.` });
      router.refresh();
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed" });
    } finally {
      setBusy(false);
    }
  }

  const status = company.status ?? "draft";
  const statusLabel = status.replace(/_/g, " ");
  const badgeClass = STATUS_BADGE[status] ?? STATUS_BADGE.draft;

  return (
    <>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/companies" className="flex items-center gap-1 hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Companies
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{company.name}</h1>
            <Badge className={`border-0 normal-case ${badgeClass}`}>
              {statusLabel}
            </Badge>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            {company.contact_person && <span>Contact: {company.contact_person}</span>}
            {company.contact_email && <span>{company.contact_email}</span>}
            {company.contact_phone && <span>{company.contact_phone}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Status transition buttons */}
          {(status === "lead" || status === "prospect") && (
            <Button onClick={handleSendContract} disabled={busy} className="bg-cobalt-600 hover:bg-cobalt-700">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send Contract
            </Button>
          )}
          {status === "contract_signed" && (
            <Button onClick={handleActivate} disabled={busy} className="bg-mint-600 hover:bg-mint-700">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Activate Portal
            </Button>
          )}
          {status !== "archived" && (
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Company
            </Button>
          )}
        </div>
      </div>

      <EditCompanyDialog company={company} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
