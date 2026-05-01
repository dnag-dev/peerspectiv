import { supabaseAdmin } from '@/lib/supabase/server';
import { CredentialsView } from './CredentialsView';

export const dynamic = 'force-dynamic';

export default async function CredentialsPage() {
  const { data: reviewers } = await supabaseAdmin
    .from('reviewers')
    .select(
      'id, full_name, email, specialty, specialties, credential_valid_until, status, license_number, license_state'
    )
    .order('full_name');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Credentials</h1>
        <p className="text-sm text-ink-500">
          Track license expirations. Reviewers with missing or expired credentials
          are automatically excluded from assignment.
        </p>
      </div>

      <CredentialsView reviewers={reviewers ?? []} />
    </div>
  );
}
