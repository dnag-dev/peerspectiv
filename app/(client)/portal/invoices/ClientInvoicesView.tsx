"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, ExternalLink, Receipt, Loader2, Check } from "lucide-react";

interface Inv {
  id: string;
  invoiceNumber: string;
  rangeStart: string | null;
  rangeEnd: string | null;
  reviewCount: number;
  unitPrice: string;
  totalAmount: string;
  status: string;
  pdfUrl: string | null;
  paymentLinkUrl: string | null;
  dueDate: string | null;
}

interface Props {
  companyName: string;
  invoices: Inv[];
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-ink-100 text-ink-primary",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  void: "bg-gray-100 text-gray-500 line-through",
};

const fmtMoney = (n: number, ccy = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: ccy }).format(n);

export function ClientInvoicesView({ companyName, invoices: initialInvoices }: Props) {
  const router = useRouter();
  const [invoices, setInvoices] = useState(initialInvoices);
  const [savingId, setSavingId] = useState<string | null>(null);

  const outstandingTotal = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((s, i) => s + Number(i.totalAmount), 0);
  const paidTotal = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + Number(i.totalAmount), 0);

  function updateReviewCount(invId: string, newCount: number) {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invId) return inv;
        const count = Math.max(0, newCount);
        const unitPrice = Number(inv.unitPrice);
        const newTotal = (count * unitPrice).toFixed(2);
        return { ...inv, reviewCount: count, totalAmount: newTotal };
      })
    );
  }

  async function saveInvoice(inv: Inv) {
    setSavingId(inv.id);
    try {
      const res = await fetch(`/api/invoices/${inv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review_count: inv.reviewCount,
          total_amount: inv.totalAmount,
          subtotal: inv.totalAmount,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error || "Failed to save");
      }
      router.refresh();
    } catch {
      alert("Failed to save");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-ink-primary">Invoices</h1>
        <p className="text-sm text-ink-secondary">
          {companyName} · billing history and payment links.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-white border border-border-subtle shadow-sm p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Outstanding</div>
          <div className="mt-1 text-2xl font-medium text-blue-600">{fmtMoney(outstandingTotal)}</div>
        </div>
        <div className="rounded-lg bg-white border border-border-subtle shadow-sm p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Paid (lifetime)</div>
          <div className="mt-1 text-2xl font-medium text-green-600">{fmtMoney(paidTotal)}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border-subtle bg-white">
        {invoices.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Receipt className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            No invoices yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border-subtle bg-gray-50 text-left">
              <tr className="text-xs uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3 text-right">Rate</th>
                <th className="px-4 py-3 text-right">Reviews</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const originalInv = initialInvoices.find((i) => i.id === inv.id);
                const isDirty = originalInv && (
                  inv.reviewCount !== originalInv.reviewCount ||
                  inv.totalAmount !== originalInv.totalAmount
                );
                return (
                  <tr key={inv.id} className="border-b border-border-subtle hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3">
                      {inv.rangeStart === inv.rangeEnd
                        ? inv.rangeStart
                        : `${inv.rangeStart} → ${inv.rangeEnd}`}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {fmtMoney(Number(inv.unitPrice))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inv.status === "paid" || inv.status === "void" ? (
                        <span>{inv.reviewCount}</span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          value={inv.reviewCount}
                          onChange={(e) => updateReviewCount(inv.id, Number(e.target.value))}
                          className="w-16 rounded border border-border-subtle px-2 py-1 text-right text-sm"
                        />
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${isDirty ? "text-blue-600" : ""}`}>
                      {fmtMoney(Number(inv.totalAmount))}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{inv.dueDate ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[inv.status] ?? "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        {isDirty && (
                          <button
                            onClick={() => saveInvoice(inv)}
                            disabled={savingId === inv.id}
                            className="inline-flex items-center gap-1 rounded border border-green-300 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                          >
                            {savingId === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            Save
                          </button>
                        )}
                        {inv.pdfUrl && (
                          <a
                            href={inv.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                          >
                            <Download className="h-3 w-3" /> PDF
                          </a>
                        )}
                        {inv.paymentLinkUrl && inv.status !== "paid" && (
                          <a
                            href={inv.paymentLinkUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                          >
                            <ExternalLink className="h-3 w-3" /> Pay Now
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
