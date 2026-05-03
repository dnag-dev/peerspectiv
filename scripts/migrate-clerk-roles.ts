// Phase 1.2 — migrate Clerk users from publicMetadata.role 'reviewer' to 'peer'.
// Run: npx tsx scripts/migrate-clerk-roles.ts
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

(async () => {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error('CLERK_SECRET_KEY not set');
  }
  const { createClerkClient } = await import('@clerk/backend');
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
  const users = await clerk.users.getUserList({ limit: 500 });
  const list = (users as any).data ?? users;
  const affected = list.filter((u: any) => (u.publicMetadata as any)?.role === 'reviewer');
  console.log(`Patching ${affected.length} user(s)…`);
  for (const u of affected) {
    const meta = { ...(u.publicMetadata as any), role: 'peer' };
    await clerk.users.updateUserMetadata(u.id, { publicMetadata: meta });
    console.log(`  ✓ ${u.emailAddresses?.[0]?.emailAddress ?? u.id}`);
  }
  console.log('Done.');
})();
