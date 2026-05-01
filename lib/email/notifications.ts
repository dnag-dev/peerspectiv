import { Resend } from 'resend';

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');
  return _resend;
}

/**
 * Generic email helper. Falls back to console log if RESEND_API_KEY is missing.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<{ id?: string; skipped?: boolean } | void> {
  const from = params.from ?? 'Peerspectiv <notifications@peerspectiv.com>';

  if (!process.env.RESEND_API_KEY) {
    console.log('[email] RESEND_API_KEY not set — logging instead:', {
      to: params.to,
      subject: params.subject,
    });
    return { skipped: true };
  }

  try {
    const res = await getResend().emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    return { id: (res as any)?.data?.id };
  } catch (err) {
    console.log('[email] send failed for:', params.to, err);
  }
}

/**
 * Notify the credentialing inbox about a newly created reviewer (or expiring
 * credential). Falls back to console.log when RESEND_API_KEY is unset, matching
 * the leads endpoint pattern.
 */
export async function sendCredentialingAlert(params: {
  reviewerId: string;
  reviewerName: string;
  email: string;
  specialties: string[];
  /** Optional override subject — used by the expiry-warning cron. */
  subject?: string;
  /** Optional message body, e.g. "Credential expires on 2026-05-30" */
  bodyHtml?: string;
}): Promise<{ delivery: 'email' | 'log' }> {
  const to = process.env.CREDENTIALING_EMAIL || 'credentialing@peerspectiv.com';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.peerspectiv.ai';
  const editUrl = `${appUrl}/credentials`;

  const subject =
    params.subject ?? `Credentialing review needed: ${params.reviewerName}`;
  const html =
    params.bodyHtml ??
    `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color:#0F2044;">New Reviewer Awaiting Credentialing</h2>
        <p><strong>${params.reviewerName}</strong> (${params.email}) was added and is currently inactive.</p>
        <p>Specialties: ${params.specialties.join(', ') || '—'}</p>
        <p>Please review credentials and set the expiry date to activate the reviewer.</p>
        <a href="${editUrl}"
           style="background:#1E4DB7;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;">
          Open Credentialing
        </a>
      </div>
    `;

  if (!process.env.RESEND_API_KEY) {
    console.log('[credentialing] (no RESEND_API_KEY — printing to log)', {
      to,
      subject,
      reviewer: params.reviewerName,
    });
    return { delivery: 'log' };
  }

  try {
    await getResend().emails.send({
      from: 'Peerspectiv <notifications@peerspectiv.com>',
      to,
      subject,
      html,
    });
    return { delivery: 'email' };
  } catch (err) {
    console.log('[credentialing] send failed:', err);
    return { delivery: 'log' };
  }
}

/**
 * Notify the admin inbox when a reviewer requests reassignment of a case.
 * Falls back to console.log when RESEND_API_KEY is unset (matches sendCredentialingAlert).
 */
export async function sendReassignmentRequestAlert(params: {
  caseId: string;
  reviewerName: string;
  reviewerEmail?: string | null;
  providerName?: string | null;
  reason: string;
}): Promise<{ delivery: 'email' | 'log' }> {
  const to = process.env.ADMIN_EMAIL || 'admin@peerspectiv.com';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.peerspectiv.ai';
  const reviewUrl = `${appUrl}/reassignments`;

  const subject = `Reassignment requested: case ${params.caseId.slice(0, 8)}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color:#0F2044;">Reviewer requested reassignment</h2>
      <p><strong>${params.reviewerName}</strong>${
        params.reviewerEmail ? ` (${params.reviewerEmail})` : ''
      } has asked to be reassigned from case <code>${params.caseId}</code>${
        params.providerName ? ` (provider: ${params.providerName})` : ''
      }.</p>
      <p style="background:#F8FAFC;border-left:3px solid #1E4DB7;padding:12px 16px;margin:16px 0;">
        <em>${escapeHtml(params.reason)}</em>
      </p>
      <a href="${reviewUrl}"
         style="background:#1E4DB7;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">
        Review reassignment requests
      </a>
    </div>
  `;

  if (!process.env.RESEND_API_KEY) {
    console.log('[reassignment] (no RESEND_API_KEY — printing to log)', {
      to,
      subject,
      caseId: params.caseId,
      reviewer: params.reviewerName,
    });
    return { delivery: 'log' };
  }

  try {
    await getResend().emails.send({
      from: 'Peerspectiv <notifications@peerspectiv.com>',
      to,
      subject,
      html,
    });
    return { delivery: 'email' };
  } catch (err) {
    console.log('[reassignment] send failed:', err);
    return { delivery: 'log' };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Notify a client that their review cycle is complete and reports are ready.
 * Falls back to console.log when RESEND_API_KEY is unset.
 *
 * @param company  – minimum: id, name, contact_email
 * @param urls     – list of report URLs (signed download links or per-report URLs)
 * @param mode     – 'email' = attach links directly, 'portal' = link to /portal/export, 'both' = both
 */
export async function sendCycleCompletionEmail(
  company: { id: string; name: string; contact_email: string | null },
  urls: string[],
  mode: 'email' | 'portal' | 'both'
): Promise<{ delivery: 'email' | 'log' | 'skipped' }> {
  if (!company.contact_email) {
    console.log('[cycle-completion] no contact_email for company:', company.id);
    return { delivery: 'skipped' };
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.peerspectiv.ai';
  const portalUrl = `${appUrl}/portal/export`;

  let body = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color:#0F2044;">Your review reports are ready</h2>
    <p>Hello ${escapeHtml(company.name)} team,</p>
    <p>Your latest peer review cycle is complete. Reports are ready below.</p>`;

  if (mode === 'email' || mode === 'both') {
    if (urls.length > 0) {
      body += `<p><strong>Direct download links</strong> (expire in 14 days):</p><ul>`;
      for (const url of urls) {
        body += `<li><a href="${url}">${escapeHtml(url)}</a></li>`;
      }
      body += `</ul>`;
    }
  }
  if (mode === 'portal' || mode === 'both') {
    body += `<p>You can also access all reports anytime in the portal:</p>
      <a href="${portalUrl}" style="background:#1E4DB7;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;">
        Open Reports Portal
      </a>`;
  }
  body += `<p style="color:#888;font-size:12px;margin-top:32px;">Peerspectiv &middot; FQHC Peer Reviews</p></div>`;

  const subject = `Your peer review reports are ready — ${company.name}`;

  if (!process.env.RESEND_API_KEY) {
    console.log('[cycle-completion] (no RESEND_API_KEY — printing to log)', {
      to: company.contact_email,
      subject,
      mode,
      urlCount: urls.length,
    });
    return { delivery: 'log' };
  }

  try {
    await getResend().emails.send({
      from: 'Peerspectiv <reports@peerspectiv.com>',
      to: company.contact_email,
      subject,
      html: body,
    });
    return { delivery: 'email' };
  } catch (err) {
    console.log('[cycle-completion] send failed:', err);
    return { delivery: 'log' };
  }
}

export async function sendReviewerAssignment(params: {
  reviewerEmail: string;
  reviewerName: string;
  caseId: string;
  specialty: string;
  dueDate: string;
  portalUrl: string;
}) {
  try {
    await getResend().emails.send({
      from: 'Peerspectiv <reviews@peerspectiv.com>',
      to: params.reviewerEmail,
      subject: `New Peer Review Assignment — ${params.specialty} | Due ${params.dueDate}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0F2044;">New Review Assignment</h2>
          <p>Hello ${params.reviewerName},</p>
          <p>You have been assigned a new peer review case.</p>
          <ul>
            <li><strong>Specialty:</strong> ${params.specialty}</li>
            <li><strong>Due Date:</strong> ${params.dueDate}</li>
            <li><strong>Case ID:</strong> ${params.caseId}</li>
          </ul>
          <p>The AI has already pre-analyzed the chart. Your estimated review time is 15-20 minutes.</p>
          <a href="${params.portalUrl}"
             style="background:#1E4DB7;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;">
            Open Review Portal
          </a>
          <p style="color:#888;font-size:12px;margin-top:32px;">
            Peerspectiv &middot; Independent FQHC Peer Reviews
          </p>
        </div>
      `,
    });
  } catch (err) {
    // Don't crash the flow if email fails — log ID only
    console.log('[WARN] Email send failed for case:', params.caseId);
  }
}
