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
        <h1 className="text-2xl font-bold text-gray-900">Reviewers</h1>
        <p className="text-sm text-gray-500">
          Manage peer reviewers and their availability
        </p>
      </div>

      <ReviewersTable reviewers={reviewers ?? []} />
    </div>
  );
}
