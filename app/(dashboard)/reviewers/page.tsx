import { db, toSnake } from '@/lib/db';
import { reviewers } from '@/lib/db/schema';
import { asc } from 'drizzle-orm';
import { ReviewersTable } from './ReviewersTable';

export const dynamic = 'force-dynamic';

export default async function ReviewersPage() {
  const rows = await db.select().from(reviewers).orderBy(asc(reviewers.fullName));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Reviewers</h1>
        <p className="text-sm text-ink-500">
          Manage peer reviewers, compensation, and availability
        </p>
      </div>

      <ReviewersTable reviewers={rows.map((r) => toSnake(r))} />
    </div>
  );
}
