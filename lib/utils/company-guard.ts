import { db } from '@/lib/db';
import { companies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Check if a company is in Active status.
 * Returns the company row if active, null if not found or not active.
 */
export async function requireActiveCompany(companyId: string): Promise<{ id: string; status: string | null } | null> {
  const [row] = await db
    .select({ id: companies.id, status: companies.status })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  if (!row) return null;
  // Active statuses that allow operational activities (uploads, assignments, invoices, reports)
  const activeStatuses = ['active', 'active_client', 'in_cycle'];
  if (!activeStatuses.includes(row.status ?? '')) return null;
  return row;
}

/**
 * Check if a company allows setup operations (providers, forms).
 * Allowed for: draft, contract_sent, contract_signed, active.
 * Blocked for: archived.
 */
export async function requireNonArchivedCompany(companyId: string): Promise<{ id: string; status: string | null } | null> {
  const [row] = await db
    .select({ id: companies.id, status: companies.status })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  if (!row) return null;
  if (row.status === 'archived') return null;
  return row;
}
