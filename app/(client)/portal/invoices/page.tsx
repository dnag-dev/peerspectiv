import { db } from '@/lib/db';
import { invoices } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { getDemoCompany } from '@/lib/portal/queries';
import { ClientInvoicesView } from './ClientInvoicesView';
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = 'force-dynamic';

export default async function PortalInvoicesPage() {
  noStore();
  const company = await getDemoCompany();
  const rows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.companyId, company.id))
    .orderBy(desc(invoices.createdAt));

  return (
    <ClientInvoicesView
      companyName={company.name}
      invoices={rows.map((r) => ({
        id: r.id,
        invoiceNumber: r.invoiceNumber,
        rangeStart: r.rangeStart,
        rangeEnd: r.rangeEnd,
        reviewCount: r.reviewCount ?? 0,
        unitPrice: String(r.unitPrice ?? "0"),
        totalAmount: String(r.totalAmount ?? "0"),
        status: r.status,
        pdfUrl: r.pdfUrl ?? null,
        paymentLinkUrl: r.paymentLinkUrl ?? null,
        dueDate: r.dueDate ?? null,
      }))}
    />
  );
}
