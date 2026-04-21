import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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
    const res = await resend.emails.send({
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

export async function sendReviewerAssignment(params: {
  reviewerEmail: string;
  reviewerName: string;
  caseId: string;
  specialty: string;
  dueDate: string;
  portalUrl: string;
}) {
  try {
    await resend.emails.send({
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
