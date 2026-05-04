import { db } from '@/lib/db';
import { invoices, companies } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { unstable_noStore as noStore } from 'next/cache';
import { InvoicesView } from './InvoicesView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function InvoicesPage() {
  // SA-036: force-dynamic alone wasn't enough on Vercel — newly-created
  // companies were missing from the company dropdown. noStore() opts out
  // of every framework cache layer.
  noStore();
  const rows = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      companyId: invoices.companyId,
      companyName: companies.name,
      rangeStart: invoices.rangeStart,
      rangeEnd: invoices.rangeEnd,
      reviewCount: invoices.reviewCount,
      totalAmount: invoices.totalAmount,
      status: invoices.status,
      pdfUrl: invoices.pdfUrl,
      paymentLinkUrl: invoices.paymentLinkUrl,
      sentAt: invoices.sentAt,
      paidAt: invoices.paidAt,
      dueDate: invoices.dueDate,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .leftJoin(companies, eq(companies.id, invoices.companyId))
    .orderBy(desc(invoices.createdAt))
    .limit(200);

  const companyList = await db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .orderBy(companies.name);

  return <InvoicesView invoices={rows} companies={companyList} />;
}
