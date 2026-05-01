"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Send,
  Download,
  ExternalLink,
  Loader2,
  X,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  companyId: string;
  companyName: string | null;
  rangeStart: string | null;
  rangeEnd: string | null;
  reviewCount: number;
  totalAmount: string;
  status: string;
  pdfUrl: string | null;
  paymentLinkUrl: string | null;
  sentAt: Date | null;
  paidAt: Date | null;
  dueDate: string | null;
  createdAt: Date | null;
}

interface Props {
  invoices: InvoiceRow[];
  companies: { id: string; name: string }[];
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-ink-100 text-ink-700",
  sent: "bg-cobalt-50 text-cobalt-700",
  paid: "bg-mint-50 text-mint-700",
  overdue: "bg-critical-50 text-critical-700",
  void: "bg-ink-100 text-ink-500 line-through",
};

const fmtMoney = (n: number, ccy = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: ccy }).format(n);

export function InvoicesView({ invoices, companies }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Create-form state
  const today = new Date();
  const ninetyAgo = new Date(today.getTime() - 90 * 86400_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const [companyId, setCompanyId] = useState("");
  const [rangeStart, setRangeStart] = useState(fmt(ninetyAgo));
  const [rangeEnd, setRangeEnd] = useState(fmt(today));
  const [createPaymentLink, setCreatePaymentLink] = useState(false);
  const [quantityOverride, setQuantityOverride] = useState<string>("");
  const [adjustmentReason, setAdjustmentReason] = useState<string>("");

  // Filter / sort state
  const [searchQ, setSearchQ] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  type SortKey =
    | "invoiceNumber"
    | "companyName"
    | "rangeStart"
    | "reviewCount"
    | "totalAmount"
    | "status";
  type SortDir = "asc" | "desc";
  const [sortKey, setSortKey] = useState<SortKey>("invoiceNumber");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (companyFilter !== "all" && inv.companyId !== companyFilter) return false;
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (!q) return true;
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.companyName ?? "").toLowerCase().includes(q)
      );
    });
  }, [invoices, companyFilter, statusFilter, searchQ]);

  const visibleInvoices = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av: number | string = "";
      let bv: number | string = "";
      switch (sortKey) {
        case "invoiceNumber":
          av = a.invoiceNumber.toLowerCase();
          bv = b.invoiceNumber.toLowerCase();
          break;
        case "companyName":
          av = (a.companyName ?? "").toLowerCase();
          bv = (b.companyName ?? "").toLowerCase();
          break;
        case "rangeStart":
          av = a.rangeStart ?? "";
          bv = b.rangeStart ?? "";
          break;
        case "reviewCount":
          av = a.reviewCount;
          bv = b.reviewCount;
          break;
        case "totalAmount":
          av = Number(a.totalAmount);
          bv = Number(b.totalAmount);
          break;
        case "status":
          av = a.status;
          bv = b.status;
          break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(k);
      setSortDir("asc");
    }
  }

  function SortHead({
    label,
    k,
    align = "left",
  }: {
    label: string;
    k: SortKey;
    align?: "left" | "right";
  }) {
    const active = sortKey === k;
    const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
    return (
      <th
        onClick={() => toggleSort(k)}
        className={`px-4 py-3 cursor-pointer select-none hover:text-ink-900 ${
          align === "right" ? "text-right" : "text-left"
        }`}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <Icon className={`h-3 w-3 ${active ? "text-cobalt-600" : "text-ink-300"}`} />
        </span>
      </th>
    );
  }

  async function handleCreate() {
    setErr(null);
    if (!companyId) {
      setErr("Select a company");
      return;
    }
    const qoTrim = quantityOverride.trim();
    const qoNum = qoTrim === "" ? null : Number(qoTrim);
    if (qoTrim !== "" && (!Number.isFinite(qoNum) || (qoNum as number) < 0)) {
      setErr("Quantity override must be a non-negative integer");
      return;
    }
    if (qoNum !== null && !adjustmentReason.trim()) {
      setErr("Adjustment reason is required when quantity override is set");
      return;
    }
    setBusy("create");
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-demo-user-id": "admin-demo",
        },
        body: JSON.stringify({
          companyId,
          rangeStart,
          rangeEnd,
          createPaymentLink,
          quantityOverride: qoNum,
          adjustmentReason: adjustmentReason.trim() || null,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setShowCreate(false);
      setQuantityOverride("");
      setAdjustmentReason("");
      startTransition(() => router.refresh());
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleSend(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/invoices/${id}/send`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      startTransition(() => router.refresh());
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleRegeneratePdf(id: string) {
    setBusy(id);
    setErr(null);
    try {
      const res = await fetch(`/api/invoices/${id}/regenerate-pdf`, {
        method: "POST",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      startTransition(() => router.refresh());
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleMarkPaid(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid", paidAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Generate, track, and send invoices for client peer-review services.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-cobalt-600 hover:bg-cobalt-700">
          <Plus className="h-4 w-4 mr-2" /> New Invoice
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-ink-900">Create Invoice</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Company</Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Range Start</Label>
                <Input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
              </div>
              <div>
                <Label>Range End</Label>
                <Input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Quantity override (optional)</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="Leave blank to use auto-computed count"
                  value={quantityOverride}
                  onChange={(e) => setQuantityOverride(e.target.value)}
                />
              </div>
              <div>
                <Label>
                  Adjustment reason{" "}
                  {quantityOverride.trim() !== "" && (
                    <span className="text-critical-600">*</span>
                  )}
                </Label>
                <Input
                  type="text"
                  placeholder="Required when quantity override is set"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  disabled={quantityOverride.trim() === ""}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={createPaymentLink}
                onChange={(e) => setCreatePaymentLink(e.target.checked)}
              />
              Create Aautipay hosted payment link now
            </label>
            {err && (
              <p className="text-sm text-critical-700 bg-critical-50 px-3 py-2 rounded">{err}</p>
            )}
            <Button
              onClick={handleCreate}
              disabled={busy === "create"}
              className="bg-cobalt-600 hover:bg-cobalt-700"
            >
              {busy === "create" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
              Generate Invoice
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filter bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_200px_160px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <Input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search invoice number, company…"
                className="pl-9"
              />
            </div>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger>
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="mt-3 text-xs text-ink-500">
            Showing <strong>{visibleInvoices.length}</strong> of {invoices.length} invoices
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-600 text-xs uppercase">
              <tr>
                <SortHead label="Number" k="invoiceNumber" />
                <SortHead label="Company" k="companyName" />
                <SortHead label="Period" k="rangeStart" />
                <SortHead label="Reviews" k="reviewCount" align="right" />
                <SortHead label="Total" k="totalAmount" align="right" />
                <SortHead label="Status" k="status" />
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleInvoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-ink-500">
                    {invoices.length === 0 ? (
                      <>No invoices yet. Click <strong>New Invoice</strong> to generate one.</>
                    ) : (
                      <>No invoices match your filters.</>
                    )}
                  </td>
                </tr>
              )}
              {visibleInvoices.map((inv) => {
                const total = Number(inv.totalAmount);
                return (
                  <tr key={inv.id} className="border-t border-ink-100 hover:bg-ink-50/50">
                    <td className="px-4 py-3 font-mono text-xs text-ink-900">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-ink-800">{inv.companyName ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-600">
                      {inv.rangeStart} → {inv.rangeEnd}
                    </td>
                    <td className="px-4 py-3 text-right text-ink-800">{inv.reviewCount}</td>
                    <td className="px-4 py-3 text-right font-medium text-ink-900">
                      {fmtMoney(total)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[inv.status] ?? "bg-ink-100 text-ink-700"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      {inv.pdfUrl ? (
                        <a
                          href={inv.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-cobalt-700 hover:underline"
                        >
                          <Download className="h-3 w-3" /> PDF
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="text-[10px] text-amber-700"
                            title="PDF not generated — likely BLOB_READ_WRITE_TOKEN not configured in this environment."
                          >
                            PDF pending
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRegeneratePdf(inv.id)}
                            disabled={busy === inv.id || isPending}
                            className="h-6 px-2 text-[10px]"
                          >
                            {busy === inv.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Regenerate"
                            )}
                          </Button>
                        </span>
                      )}
                      {inv.paymentLinkUrl && (
                        <a
                          href={inv.paymentLinkUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-cobalt-700 hover:underline ml-2"
                        >
                          <ExternalLink className="h-3 w-3" /> Pay
                        </a>
                      )}
                      {inv.status === "draft" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSend(inv.id)}
                          disabled={busy === inv.id || isPending}
                          className="ml-2"
                        >
                          {busy === inv.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                      {inv.status === "sent" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkPaid(inv.id)}
                          disabled={busy === inv.id || isPending}
                          className="ml-2"
                        >
                          Mark paid
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
