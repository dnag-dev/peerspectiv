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
 * Notify the credentialing inbox about a newly created peer (or expiring
 * credential). Falls back to console.log when RESEND_API_KEY is unset, matching
 * the leads endpoint pattern.
 */
export async function sendCredentialingAlert(params: {
  peerId: string;
  peerName: string;
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
    params.subject ?? `Credentialing review needed: ${params.peerName}`;
  const html =
    params.bodyHtml ??
    `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color:#0F2044;">New Peer Awaiting Credentialing</h2>
        <p><strong>${params.peerName}</strong> (${params.email}) was added and is currently inactive.</p>
        <p>Specialties: ${params.specialties.join(', ') || '—'}</p>
        <p>Please review credentials and set the expiry date to activate the peer.</p>
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
      peer: params.peerName,
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
 * Notify the admin inbox when a peer requests reassignment of a case.
 * Falls back to console.log when RESEND_API_KEY is unset (matches sendCredentialingAlert).
 */
export async function sendReassignmentRequestAlert(params: {
  caseId: string;
  peerName: string;
  peerEmail?: string | null;
  providerName?: string | null;
  reason: string;
}): Promise<{ delivery: 'email' | 'log' }> {
  const to = process.env.ADMIN_EMAIL || 'admin@peerspectiv.com';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.peerspectiv.ai';
  const reviewUrl = `${appUrl}/reassignments`;

  const subject = `Reassignment requested: case ${params.caseId.slice(0, 8)}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color:#0F2044;">Peer requested reassignment</h2>
      <p><strong>${params.peerName}</strong>${
        params.peerEmail ? ` (${params.peerEmail})` : ''
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
      peer: params.peerName,
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

/**
 * Phase 5.4 (SA-091) — alert a peer that a case has just been assigned to
 * them. Thin wrapper that uses the same Resend + console fallback pattern
 * as sendPeerAssignment but with a tighter signature for the assignment-
 * approval call site.
 */
export async function sendCaseAssignedAlert(
  peer: { fullName: string | null; email: string | null },
  caseRow: { id: string; specialtyRequired: string | null; dueDate: Date | string | null },
  providerName: string
): Promise<{ delivery: 'email' | 'log' | 'skipped' }> {
  if (!peer.email) return { delivery: 'skipped' };
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.peerspectiv.ai';
  const link = `${appUrl}/peer/cases/${caseRow.id}`;
  const due = caseRow.dueDate ? new Date(caseRow.dueDate).toLocaleDateString() : 'TBD';
  const subject = `New case assigned: ${providerName}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color:#0F2044;">New peer review assignment</h2>
      <p>Hello ${escapeHtml(peer.fullName ?? 'reviewer')},</p>
      <p>You've been assigned a new case for <strong>${escapeHtml(providerName)}</strong>.</p>
      <ul>
        <li><strong>Specialty:</strong> ${escapeHtml(caseRow.specialtyRequired ?? 'General')}</li>
        <li><strong>Due:</strong> ${escapeHtml(due)}</li>
      </ul>
      <a href="${link}"
         style="background:#1E4DB7;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">
        Open case
      </a>
    </div>
  `;
  if (!process.env.RESEND_API_KEY) {
    console.log('[case-assigned] (no RESEND_API_KEY)', { to: peer.email, subject });
    return { delivery: 'log' };
  }
  try {
    await getResend().emails.send({
      from: 'Peerspectiv <reviews@peerspectiv.com>',
      to: peer.email,
      subject,
      html,
    });
    return { delivery: 'email' };
  } catch (err) {
    console.log('[case-assigned] send failed:', err);
    return { delivery: 'log' };
  }
}

/**
 * Phase 5.4 (SA-092) — past-due reminder email to the assigned peer.
 */
export async function sendPastDueReminder(params: {
  peerEmail: string;
  peerName: string | null;
  caseId: string;
  providerName: string;
  dueDate: Date | string | null;
}): Promise<{ delivery: 'email' | 'log' }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.peerspectiv.ai';
  const link = `${appUrl}/peer/cases/${params.caseId}`;
  const due = params.dueDate ? new Date(params.dueDate).toLocaleDateString() : 'unknown';
  const subject = `Case past due: ${params.providerName}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color:#B91C1C;">Past-due reminder</h2>
      <p>Hello ${escapeHtml(params.peerName ?? 'reviewer')},</p>
      <p>Your assigned case for <strong>${escapeHtml(params.providerName)}</strong>
        was due on <strong>${escapeHtml(due)}</strong> and is still in progress.</p>
      <p>Please complete it as soon as possible.</p>
      <a href="${link}"
         style="background:#B91C1C;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">
        Open case
      </a>
    </div>
  `;
  if (!process.env.RESEND_API_KEY) {
    console.log('[past-due] (no RESEND_API_KEY)', { to: params.peerEmail, subject });
    return { delivery: 'log' };
  }
  try {
    await getResend().emails.send({
      from: 'Peerspectiv <reviews@peerspectiv.com>',
      to: params.peerEmail,
      subject,
      html,
    });
    return { delivery: 'email' };
  } catch (err) {
    console.log('[past-due] send failed:', err);
    return { delivery: 'log' };
  }
}

export async function sendPeerAssignment(params: {
  peerEmail: string;
  peerName: string;
  caseId: string;
  specialty: string;
  dueDate: string;
  portalUrl: string;
}) {
  try {
    await getResend().emails.send({
      from: 'Peerspectiv <reviews@peerspectiv.com>',
      to: params.peerEmail,
      subject: `New Peer Review Assignment — ${params.specialty} | Due ${params.dueDate}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0F2044;">New Review Assignment</h2>
          <p>Hello ${params.peerName},</p>
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
