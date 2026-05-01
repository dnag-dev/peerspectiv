import { supabaseAdmin } from '@/lib/supabase/server';
import { CredentialsView } from '@/app/(dashboard)/credentials/CredentialsView';

export const dynamic = 'force-dynamic';

export default async function CredentialingCredentialsPage() {
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
          Track license expirations. Update credential dates to activate reviewers.
        </p>
      </div>

      <CredentialsView reviewers={reviewers ?? []} />
    </div>
  );
}
