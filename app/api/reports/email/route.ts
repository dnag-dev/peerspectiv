/**
 * Phase 8.2 — Secure email delivery for report bundles (SA-098, SA-132).
 *
 * POST { company_id, cadence_period_label, range_start, range_end }
 *
 * Honors the company.delivery_method column:
 *   'portal'        → no email; insert a notifications row pointing to /portal/reports.
 *   'secure_email'  → Resend send with the ZIP attached; audit log entry; no portal notification.
 *   'both'          → email AND notification.
 *
 * Companion to /api/reports/download-all (Phase 3.7); reuses the same PDF
 * generators rather than duplicating the pipeline.
 */
import { NextRequest, NextResponse } from 'next/server';
import archiver from 'archiver';
import { Readable } from 'stream';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { auditLogs, notifications } from '@/lib/db/schema';
import { sendEmail } from '@/lib/email/notifications';
import * as questionAnalytics from '@/lib/reports/types/question-analytics';
import * as specialtyHighlights from '@/lib/reports/types/specialty-highlights';
import * as providerHighlights from '@/lib/reports/types/provider-highlights';
import * as qualityCertificate from '@/lib/reports/types/quality-certificate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface Body {
  company_id: string;
  cadence_period_label: string;
  range_start: string;
  range_end: string;
}

function sanitize(s: string): string {
  return s.replace(/[^A-Za-z0-9_.-]+/g, '_').replace(/_+/g, '_');
}

interface CompanyRow {
  name: string;
  contact_email: string | null;
  contact_person: string | null;
  delivery_method: string | null;
}

async function getCompany(companyId: string): Promise<CompanyRow | null> {
  const result = await db.execute(sql`
    SELECT name, contact_email, contact_person, delivery_method
    FROM companies
    WHERE id = ${companyId}
    LIMIT 1
  `);
  const rows = (result as any)?.rows ?? result;
  return (Array.isArray(rows) ? (rows[0] as CompanyRow | undefined) : null) ?? null;
}

async function buildZip(args: {
  companyId: string;
  companyName: string;
  cadencePeriodLabel: string;
  rangeStart: string;
  rangeEnd: string;
}): Promise<{ buffer: Buffer; filename: string }> {
  const safeCo = sanitize(args.companyName);
  const safePeriod = sanitize(args.cadencePeriodLabel);
  const filename = `${safeCo}_${safePeriod}_All_Reports.zip`;

  const [qa, sh, ph, qc] = await Promise.all([
    questionAnalytics.generate({
      companyId: args.companyId,
      rangeStart: args.rangeStart,
      rangeEnd: args.rangeEnd,
      cadencePeriodLabel: args.cadencePeriodLabel,
    }),
    specialtyHighlights.generate({
      companyId: args.companyId,
      rangeStart: args.rangeStart,
      rangeEnd: args.rangeEnd,
      cadencePeriodLabel: args.cadencePeriodLabel,
    }),
    providerHighlights.generate({
      companyId: args.companyId,
      rangeStart: args.rangeStart,
      rangeEnd: args.rangeEnd,
      cadencePeriodLabel: args.cadencePeriodLabel,
    }),
    qualityCertificate.generate({
      companyId: args.companyId,
      cadencePeriodLabel: args.cadencePeriodLabel,
      rangeStart: args.rangeStart,
      rangeEnd: args.rangeEnd,
    }),
  ]);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.append(qa, { name: `${safeCo}_Question_Analytics_${safePeriod}.pdf` });
  archive.append(sh, { name: `${safeCo}_Specialty_Highlights_${safePeriod}.pdf` });
  archive.append(ph, { name: `${safeCo}_Provider_Highlights_${safePeriod}.pdf` });
  archive.append(qc, { name: `${safeCo}_Quality_Certificate_${safePeriod}.pdf` });
  archive.finalize();

  const chunks: Buffer[] = [];
  for await (const chunk of archive as unknown as Readable) chunks.push(chunk as Buffer);
  return { buffer: Buffer.concat(chunks), filename };
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { company_id, cadence_period_label, range_start, range_end } = body;
  if (!company_id || !cadence_period_label || !range_start || !range_end) {
    return NextResponse.json(
      { error: 'company_id, cadence_period_label, range_start, range_end all required' },
      { status: 400 }
    );
  }

  const company = await getCompany(company_id);
  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

  // Default to 'portal' for safety: no surprise emails.
  const deliveryMethod = (company.delivery_method ?? 'portal').toLowerCase();
  const wantsEmail = deliveryMethod === 'secure_email' || deliveryMethod === 'both';
  const wantsPortal = deliveryMethod === 'portal' || deliveryMethod === 'both';

  const result: {
    delivery_method: string;
    emailed: boolean;
    notification_id: string | null;
    skipped_reason?: string;
  } = { delivery_method: deliveryMethod, emailed: false, notification_id: null };

  let zip: { buffer: Buffer; filename: string } | null = null;
  if (wantsEmail) {
    if (!company.contact_email) {
      result.skipped_reason = 'company has no contact_email; falling back to portal';
    } else {
      try {
        zip = await buildZip({
          companyId: company_id,
          companyName: company.name,
          cadencePeriodLabel: cadence_period_label,
          rangeStart: range_start,
          rangeEnd: range_end,
        });

        const subject = `${company.name} — Peer review reports for ${cadence_period_label}`;
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color:#0F2044;">${company.name}</h2>
            <p>Hi ${company.contact_person ?? company.name},</p>
            <p>Your peer review report bundle for <strong>${cadence_period_label}</strong>
            (${range_start} → ${range_end}) is attached as a ZIP.</p>
            <p>Reports included: Question Analytics, Specialty Highlights, Provider Highlights, Quality Certificate.</p>
            <p style="margin-top:24px;color:#475467;font-size:12px;">
              Sent securely via Peerspectiv. Reply to this email to reach your account team.
            </p>
          </div>
        `;
        await sendEmail({
          to: company.contact_email,
          subject,
          html,
          attachments: [{ filename: zip.filename, content: zip.buffer }],
        });

        // Audit log entry — required by SA-132 for secure delivery.
        await db.insert(auditLogs).values({
          action: 'reports.email.sent',
          resourceType: 'company',
          resourceId: company_id,
          metadata: {
            delivery_method: deliveryMethod,
            cadence_period_label,
            range_start,
            range_end,
            recipient: company.contact_email,
            attachment: zip.filename,
            byte_size: zip.buffer.byteLength,
          } as any,
        });
        result.emailed = true;
      } catch (err) {
        console.error('[reports.email] send failed:', err);
        return NextResponse.json(
          { error: err instanceof Error ? err.message : 'email failed' },
          { status: 502 }
        );
      }
    }
  }

  if (wantsPortal || (wantsEmail && !result.emailed)) {
    try {
      const [n] = await db
        .insert(notifications)
        .values({
          type: 'report_ready',
          title: `${company.name} — reports ready for ${cadence_period_label}`,
          body: `Your peer review reports for ${range_start}–${range_end} are available in the portal.`,
          entityType: 'company',
          entityId: company_id,
        })
        .returning({ id: notifications.id });
      result.notification_id = n?.id ?? null;
    } catch (err) {
      console.error('[reports.email] notification insert failed:', err);
    }
  }

  return NextResponse.json(result);
}
