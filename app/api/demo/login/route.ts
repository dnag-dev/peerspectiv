import { NextRequest, NextResponse } from 'next/server';

/**
 * Demo-mode auth: sets a `demo_user` cookie that the middleware honors when
 * E2E_AUTH_BYPASS=1 (or DEMO_AUTH=1). Lets the demo flip between roles without
 * going through real Clerk auth (which requires email verification on every
 * new browser).
 */

const ROLES: Record<string, { email: string; name: string; landing: string }> = {
  admin: {
    email: 'admin@peerspectiv.com',
    name: 'Ashton Williams',
    landing: '/dashboard',
  },
  client: {
    email: 'kelli@horizonhealth.org',
    name: 'Kelli Ramirez',
    landing: '/portal',
  },
  peer: {
    email: 'rjohnson@peerspectiv.com',
    name: 'Dr. Richard Johnson',
    landing: '/peer/portal',
  },
  // Section B6 — credentialing role. Read-only on /credentialing/* pages,
  // cannot reach /companies, /peers, /payouts, /invoices.
  credentialer: {
    email: 'credentialing@peerspectiv.com',
    name: 'Renée Cole',
    landing: '/credentialing/credentials',
  },
};

export async function POST(request: NextRequest) {
  const { role: rawRole } = await request.json();
  // Back-compat: legacy 'reviewer' role normalizes to canonical 'peer'.
  const role = rawRole === 'reviewer' ? 'peer' : rawRole;
  if (!role || !ROLES[role]) {
    return NextResponse.json({ error: 'Unknown role' }, { status: 400 });
  }
  const persona = ROLES[role];
  const res = NextResponse.json({ ok: true, redirect: persona.landing, persona });
  // 30-day demo session cookie
  res.cookies.set('demo_user', JSON.stringify({ role, ...persona }), {
    httpOnly: false, // sidebar reads it
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('demo_user');
  return res;
}
