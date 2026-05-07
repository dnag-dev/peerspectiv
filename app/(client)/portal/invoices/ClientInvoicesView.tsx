"use client";

import { Download, ExternalLink, Receipt } from "lucide-react";

interface Inv {
  id: string;
  invoiceNumber: string;
  rangeStart: string | null;
  rangeEnd: string | null;
  reviewCount: number;
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
  sent: "bg-status-info-bg text-status-info-fg",
  paid: "bg-mint-50 text-status-success-fg",
  overdue: "bg-critical-50 text-status-danger-fg",
  void: "bg-ink-100 text-ink-secondary line-through",
};

const fmtMoney = (n: number, ccy = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: ccy }).format(n);

export function ClientInvoicesView({ companyName, invoices }: Props) {
  const outstandingTotal = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((s, i) => s + Number(i.totalAmount), 0);
  const paidTotal = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + Number(i.totalAmount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-ink-primary">Invoices</h1>
        <p className="text-sm text-ink-secondary">
          {companyName} · billing history and payment links.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-surface-card border border-border-subtle shadow-sm p-4">
          <div className="text-xs uppercase tracking-wide text-ink-secondary">Outstanding</div>
          <div className="mt-1 text-2xl font-medium text-status-info-fg">{fmtMoney(outstandingTotal)}</div>
        </div>
        <div className="rounded-lg bg-surface-card border border-border-subtle shadow-sm p-4">
          <div className="text-xs uppercase tracking-wide text-ink-secondary">Paid (lifetime)</div>
          <div className="mt-1 text-2xl font-medium text-status-success-fg">{fmtMoney(paidTotal)}</div>
        </div>
      </div>

      <div className="rounded-lg bg-surface-card border border-border-subtle shadow-sm overflow-hidden">
        {invoices.length === 0 ? (
          <div className="p-12 text-center text-ink-secondary">
            <Receipt className="h-8 w-8 mx-auto mb-2 text-ink-tertiary" />
            No invoices yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-secondary text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Number</th>
                <th className="px-4 py-3 text-left">Period</th>
                <th className="px-4 py-3 text-right">Reviews</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-left">Due</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-border-subtle">
                  <td className="px-4 py-3 font-mono text-xs text-ink-primary">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 text-ink-primary">
                    {/* Cadence-period invoices store the same label in start+end. */}
                    {inv.rangeStart === inv.rangeEnd
                      ? inv.rangeStart
                      : `${inv.rangeStart} → ${inv.rangeEnd}`}
                  </td>
                  <td className="px-4 py-3 text-right text-ink-800">{inv.reviewCount}</td>
                  <td className="px-4 py-3 text-right font-medium text-ink-primary">
                    {fmtMoney(Number(inv.totalAmount))}
                  </td>
                  <td className="px-4 py-3 text-ink-secondary">{inv.dueDate ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[inv.status] ?? "bg-ink-100 text-ink-primary"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {inv.pdfUrl && (
                      <a
                        href={inv.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-status-info-fg hover:underline"
                      >
                        <Download className="h-3 w-3" /> PDF
                      </a>
                    )}
                    {inv.paymentLinkUrl && inv.status !== "paid" && (
                      <a
                        href={inv.paymentLinkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-cobalt-600 px-3 py-1 text-xs font-medium text-ink-primary hover:bg-cobalt-700"
                      >
                        <ExternalLink className="h-3 w-3" /> Pay Now
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
