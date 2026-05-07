import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { companies, contracts } from '@/lib/db/schema';
import { and, eq, lt, lte, gte, isNotNull } from 'drizzle-orm';
import { sendEmail } from '@/lib/email/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function formatDate(d: Date | string | null): string {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toISOString().split('T')[0];
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000);
}

export async function GET(request: NextRequest) {
  if (
    request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    return NextResponse.json(
      { error: 'ADMIN_EMAIL not configured' },
      { status: 500 }
    );
  }

  const today = new Date();
  const todayIso = today.toISOString().split('T')[0];
  const in30 = new Date(today.getTime() + 30 * 86_400_000);
  const in30Iso = in30.toISOString().split('T')[0];
  const sevenDaysAgo = new Date(today.getTime() - 7 * 86_400_000);

  // 1) Upcoming: active companies with next cycle due within next 30 days (and not already overdue)
  const upcoming = await db
    .select({
      id: companies.id,
      name: companies.name,
      nextCycleDue: companies.nextCycleDue,
    })
    .from(companies)
    .where(
      and(
        eq(companies.status, 'active'),
        isNotNull(companies.nextCycleDue),
        gte(companies.nextCycleDue, todayIso),
        lte(companies.nextCycleDue, in30Iso)
      )
    );

  // 2) Overdue: active companies with next cycle due before today
  const overdue = await db
    .select({
      id: companies.id,
      name: companies.name,
      nextCycleDue: companies.nextCycleDue,
    })
    .from(companies)
    .where(
      and(
        eq(companies.status, 'active'),
        isNotNull(companies.nextCycleDue),
        lt(companies.nextCycleDue, todayIso)
      )
    );

  // 3) Stalled contracts: status='sent' AND sentAt < 7 days ago
  const stalledRows = await db
    .select({
      contractId: contracts.id,
      sentAt: contracts.sentAt,
      sentToEmail: contracts.sentToEmail,
      sentToName: contracts.sentToName,
      companyId: companies.id,
      companyName: companies.name,
    })
    .from(contracts)
    .leftJoin(companies, eq(contracts.companyId, companies.id))
    .where(
      and(
        eq(contracts.status, 'sent'),
        isNotNull(contracts.sentAt),
        lt(contracts.sentAt, sevenDaysAgo)
      )
    );

  if (
    upcoming.length === 0 &&
    overdue.length === 0 &&
    stalledRows.length === 0
  ) {
    return NextResponse.json({
      sent: false,
      reason: 'Nothing to report',
    });
  }

  const dashboardUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.peerspectiv.com';

  const overdueHtml = overdue.length
    ? `
      <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px;margin:16px 0;border-radius:4px;">
        <h3 style="margin:0 0 8px 0;color:#991b1b;">Overdue Cycles (${overdue.length})</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr style="color:#7f1d1d;"><th style="text-align:left;padding:4px 8px;">Company</th><th style="text-align:left;padding:4px 8px;">Due</th><th style="text-align:left;padding:4px 8px;">Days Late</th></tr>
          ${overdue
            .map((c) => {
              const due = c.nextCycleDue ? new Date(c.nextCycleDue) : null;
              const days = due ? daysBetween(today, due) : '—';
              return `<tr><td style="padding:4px 8px;border-top:1px solid #fecaca;">${c.name}</td><td style="padding:4px 8px;border-top:1px solid #fecaca;">${formatDate(c.nextCycleDue)}</td><td style="padding:4px 8px;border-top:1px solid #fecaca;">${days}</td></tr>`;
            })
            .join('')}
        </table>
      </div>
    `
    : '';

  const upcomingHtml = upcoming.length
    ? `
      <div style="background:#eff6ff;border-left:4px solid #0F6E56;padding:16px;margin:16px 0;border-radius:4px;">
        <h3 style="margin:0 0 8px 0;color:#085041;">Upcoming Cycles (${upcoming.length})</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr style="color:#1e40af;"><th style="text-align:left;padding:4px 8px;">Company</th><th style="text-align:left;padding:4px 8px;">Due</th><th style="text-align:left;padding:4px 8px;">Days Out</th></tr>
          ${upcoming
            .map((c) => {
              const due = c.nextCycleDue ? new Date(c.nextCycleDue) : null;
              const days = due ? daysBetween(due, today) : '—';
              return `<tr><td style="padding:4px 8px;border-top:1px solid #bfdbfe;">${c.name}</td><td style="padding:4px 8px;border-top:1px solid #bfdbfe;">${formatDate(c.nextCycleDue)}</td><td style="padding:4px 8px;border-top:1px solid #bfdbfe;">${days}</td></tr>`;
            })
            .join('')}
        </table>
      </div>
    `
    : '';

  const stalledHtml = stalledRows.length
    ? `
      <div style="background:#fffbeb;border-left:4px solid #d97706;padding:16px;margin:16px 0;border-radius:4px;">
        <h3 style="margin:0 0 8px 0;color:#92400e;">Stalled Contracts (${stalledRows.length})</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr style="color:#78350f;"><th style="text-align:left;padding:4px 8px;">Company</th><th style="text-align:left;padding:4px 8px;">Sent To</th><th style="text-align:left;padding:4px 8px;">Sent</th><th style="text-align:left;padding:4px 8px;">Days Out</th></tr>
          ${stalledRows
            .map((r) => {
              const sent = r.sentAt ? new Date(r.sentAt) : null;
              const days = sent ? daysBetween(today, sent) : '—';
              return `<tr><td style="padding:4px 8px;border-top:1px solid #fde68a;">${r.companyName ?? '—'}</td><td style="padding:4px 8px;border-top:1px solid #fde68a;">${r.sentToName ?? r.sentToEmail ?? '—'}</td><td style="padding:4px 8px;border-top:1px solid #fde68a;">${formatDate(r.sentAt)}</td><td style="padding:4px 8px;border-top:1px solid #fde68a;">${days}</td></tr>`;
            })
            .join('')}
        </table>
      </div>
    `
    : '';

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:640px;margin:0 auto;color:#111827;">
      <h2 style="color:#0F2044;">Weekly Peerspectiv Digest</h2>
      <p style="color:#4b5563;">Here's what needs your attention this week (${todayIso}).</p>
      ${overdueHtml}
      ${upcomingHtml}
      ${stalledHtml}
      <div style="text-align:center;margin:24px 0;">
        <a href="${dashboardUrl}/dashboard"
           style="background:#1E4DB7;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600;">
          Open Dashboard
        </a>
      </div>
      <p style="color:#9ca3af;font-size:12px;margin-top:32px;text-align:center;">
        Peerspectiv &middot; Weekly Cycle Reminders
      </p>
    </div>
  `;

  await sendEmail({
    to: adminEmail,
    subject: `Peerspectiv Weekly Digest — ${overdue.length} overdue, ${upcoming.length} upcoming, ${stalledRows.length} stalled`,
    html,
  });

  return NextResponse.json({
    sent: true,
    counts: {
      upcoming: upcoming.length,
      overdue: overdue.length,
      stalled: stalledRows.length,
    },
  });
}
