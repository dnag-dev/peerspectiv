import { supabaseAdmin } from '@/lib/supabase/server';
import { ReviewersTable } from './ReviewersTable';

export const dynamic = 'force-dynamic';

export default async function ReviewersPage() {
  const { data: reviewers } = await supabaseAdmin
    .from('reviewers')
    .select('*')
    .order('full_name');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Reviewers</h1>
        <p className="text-sm text-ink-500">
          Manage peer reviewers, compensation, and availability
        </p>
      </div>

      <ReviewersTable reviewers={reviewers ?? []} />
    </div>
  );
}
