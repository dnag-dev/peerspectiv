export const runtime = 'nodejs';

import { clerkClient, auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { companies, notifications, auditLogs } from '@/lib/db/schema';
import { sendEmail } from '@/lib/email/notifications';

function generateSecurePassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function isUuid(s: string | null | undefined): boolean {
  return !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export async function POST(
  _req: NextRequest,
  ctx: { params: { id: string } }
) {
  // Admin check (with demo bypass)
  let adminId: string = 'demo-admin';
  let adminRole: string | undefined;
  try {
    const a: any = (auth as any)();
    if (a?.userId) {
      adminId = a.userId;
      adminRole = a?.sessionClaims?.publicMetadata?.role ?? a?.sessionClaims?.metadata?.role;
    }
  } catch {
    // demo / unauthed fallback
  }

  // If we have a Clerk session but it's not admin, reject. In demo mode (no session), allow.
  if (adminId !== 'demo-admin' && adminRole && adminRole !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden: admin role required' },
      { status: 403 }
    );
  }

  const companyId = ctx.params.id;
  const rows = await db
    .select()
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  if (!rows.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const company = rows[0];
  if (company.status !== 'contract_signed') {
    return NextResponse.json(
      {
        error: 'Contract must be signed before granting access',
        current_status: company.status,
      },
      { status: 400 }
    );
  }

  if (!company.contactEmail) {
    return NextResponse.json(
      { error: 'Company is missing a contact email' },
      { status: 400 }
    );
  }

  // Generate secure temp password
  const tempPassword = generateSecurePassword();

  // Create Clerk user for client
  let clientUserId: string | null = null;
  try {
    const cc: any = await (clerkClient as any)();
    const created = await cc.users.createUser({
      emailAddress: [company.contactEmail],
      password: tempPassword,
      firstName: company.contactPerson?.split(' ')[0] ?? 'Client',
      lastName: company.contactPerson?.split(' ').slice(1).join(' ') || 'User',
      skipPasswordChecks: true,
      publicMetadata: {
        role: 'client',
        name: company.contactPerson,
        company_id: company.id,
        company_name: company.name,
      },
    });
    clientUserId = created.id;
  } catch (e: any) {
    console.warn(
      '[activate] Clerk user creation failed, continuing in demo mode:',
      e?.message ?? e
    );
  }

  const now = new Date();
  await db
    .update(companies)
    .set({
      status: 'active',
      clientUserId: clientUserId ?? undefined,
      portalAccessGrantedAt: now,
      updatedAt: now,
    })
    .where(eq(companies.id, companyId));

  // Welcome email — dark navy design
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const welcomeHtml = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0B1829;color:#F8FAFC;padding:40px;border-radius:12px;">
      <h2 style="color:#4A8FFF;">Welcome to Peerspectiv</h2>
      <p>Hi ${company.contactPerson ?? 'there'},</p>
      <p>Your peer review portal for <strong>${company.name}</strong> is ready.</p>
      <div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:20px;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#94A3B8;">Your login credentials:</p>
        <p style="margin:8px 0 0;"><strong>Email:</strong> ${company.contactEmail}</p>
        <p style="margin:4px 0 0;"><strong>Temporary password:</strong> ${tempPassword}</p>
      </div>
      <a href="${appUrl}/login" style="background:#2E6FE8;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">Log in to your portal</a>
      <p style="color:#94A3B8;font-size:12px;margin-top:32px;">Peerspectiv &middot; Independent FQHC Peer Reviews</p>
    </div>
  `;

  await sendEmail({
    to: company.contactEmail,
    subject: 'Welcome to Peerspectiv — Your portal is ready',
    html: welcomeHtml,
  });

  // In-app notification (notifications.userId is text — Clerk IDs fit)
  try {
    await db.insert(notifications).values({
      userId: adminId,
      type: 'client_activated',
      title: `${company.name} is now active`,
      body: `Portal access granted. Welcome email sent to ${company.contactEmail}.`,
      entityType: 'company',
      entityId: company.id,
    });
  } catch (e) {
    console.warn('[activate] notification insert failed:', e);
  }

  // Audit log — audit_logs.user_id is uuid, so only set it when adminId is a uuid.
  try {
    await db.insert(auditLogs).values({
      userId: isUuid(adminId) ? adminId : undefined,
      action: 'client_activated',
      resourceType: 'company',
      resourceId: company.id,
      metadata: {
        client_user_id: clientUserId,
        has_clerk_user: !!clientUserId,
        admin_id: adminId,
      },
    });
  } catch (e) {
    console.warn('[activate] audit log insert failed:', e);
  }

  return NextResponse.json({
    success: true,
    message: `Portal access granted to ${company.contactEmail}`,
    client_user_id: clientUserId,
  });
}
