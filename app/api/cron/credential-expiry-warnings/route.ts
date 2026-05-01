import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendCredentialingAlert } from '@/lib/email/notifications';
import { auditLog } from '@/lib/utils/audit';

export const dynamic = 'force-dynamic';

/**
 * Daily cron — emails credentialing for any reviewer whose credential is
 * expiring in 30 days, or has just expired. Each (reviewer, kind) pair is
 * sent once: dedupe via audit_logs (action = 'credential_warning').
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const in30 = new Date(today);
    in30.setUTCDate(in30.getUTCDate() + 30);
    const in30Iso = in30.toISOString().slice(0, 10);

    const { data: reviewers } = await supabaseAdmin
      .from('reviewers')
      .select('id, full_name, email, specialties, specialty, credential_valid_until')
      .not('credential_valid_until', 'is', null);

    let sentExpiring = 0;
    let sentExpired = 0;
    let skipped = 0;

    for (const r of (reviewers ?? []) as any[]) {
      const cv = String(r.credential_valid_until).slice(0, 10);
      let kind: 'warn30' | 'expired' | null = null;
      if (cv < todayIso) kind = 'expired';
      else if (cv === in30Iso) kind = 'warn30';
      if (!kind) continue;

      // Dedupe: have we already sent this kind for this reviewer + expiry date?
      const { data: prior } = await supabaseAdmin
        .from('audit_logs')
        .select('id')
        .eq('action', 'credential_warning')
        .eq('resource_type', 'reviewer')
        .eq('resource_id', r.id);
      const alreadySent = (prior ?? []).some((row: any) => {
        const m = (row.metadata ?? {}) as any;
        return m.kind === kind && m.expiry === cv;
      });
      if (alreadySent) {
        skipped++;
        continue;
      }

      const specs: string[] =
        Array.isArray(r.specialties) && r.specialties.length > 0
          ? r.specialties
          : r.specialty
            ? [r.specialty]
            : [];

      const subject =
        kind === 'expired'
          ? `Credential EXPIRED: ${r.full_name}`
          : `Credential expiring in 30 days: ${r.full_name}`;
      const bodyHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color:#0F2044;">${subject}</h2>
          <p><strong>${r.full_name}</strong> (${r.email ?? ''})</p>
          <p>Credential expiry on file: <strong>${cv}</strong>.</p>
          ${
            kind === 'expired'
              ? '<p>This reviewer is now blocked from new assignments until renewed.</p>'
              : '<p>Please renew before the expiry date to avoid assignment interruptions.</p>'
          }
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.peerspectiv.ai'}/credentials"
             style="background:#1E4DB7;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;">
            Open Credentialing
          </a>
        </div>
      `;

      await sendCredentialingAlert({
        reviewerId: r.id,
        reviewerName: r.full_name ?? 'Reviewer',
        email: r.email ?? '',
        specialties: specs,
        subject,
        bodyHtml,
      });

      await auditLog({
        action: 'credential_warning',
        resourceType: 'reviewer',
        resourceId: r.id,
        metadata: { kind, expiry: cv },
      });

      if (kind === 'expired') sentExpired++;
      else sentExpiring++;
    }

    return NextResponse.json({ sentExpiring, sentExpired, skipped });
  } catch (err) {
    console.error('[cron/credential-expiry-warnings] error', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
