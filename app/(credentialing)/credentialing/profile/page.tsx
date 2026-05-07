import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { credentialerUsers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function CredentialerProfilePage() {
  const raw = cookies().get('demo_user')?.value;
  let email = 'credentialing@peerspectiv.com';
  try {
    if (raw) email = JSON.parse(decodeURIComponent(raw)).email ?? email;
  } catch {
    /* ignore */
  }

  const [me] = await db
    .select({
      fullName: credentialerUsers.fullName,
      email: credentialerUsers.email,
      perPeerRate: credentialerUsers.perPeerRate,
      isActive: credentialerUsers.isActive,
      createdAt: credentialerUsers.createdAt,
    })
    .from(credentialerUsers)
    .where(eq(credentialerUsers.email, email))
    .limit(1);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-medium tracking-tight text-ink-primary">My Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle>{me?.fullName ?? email}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-ink-secondary">Email</span><div>{me?.email ?? email}</div></div>
          <div><span className="text-ink-secondary">Per-peer rate</span><div>${Number(me?.perPeerRate ?? 0).toFixed(2)}</div></div>
          <div><span className="text-ink-secondary">Status</span><div>{me?.isActive ? 'Active' : 'Inactive'}</div></div>
          <div><span className="text-ink-secondary">Member since</span><div>{me?.createdAt ? new Date(me.createdAt).toLocaleDateString() : '—'}</div></div>
        </CardContent>
      </Card>
    </div>
  );
}
