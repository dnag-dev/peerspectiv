// Phase 1.2 — check Clerk users with publicMetadata.role === 'reviewer'.
// Uses @clerk/nextjs/server (already a dependency); no extra install needed.
//
// Run: npx tsx scripts/check-clerk-reviewer-roles.ts
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

(async () => {
  if (!process.env.CLERK_SECRET_KEY) {
    console.log('CLERK_SECRET_KEY not set — skipping (assume 0 affected users).');
    return;
  }
  try {
    const { createClerkClient } = await import('@clerk/backend');
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
    const users = await clerk.users.getUserList({ limit: 500 });
    const list = (users as any).data ?? users;
    const affected = list.filter((u: any) => (u.publicMetadata as any)?.role === 'reviewer');
    console.log(`Clerk users with role='reviewer': ${affected.length}`);
    if (affected.length) {
      console.log(
        affected
          .map((u: any) => u.emailAddresses?.[0]?.emailAddress)
          .filter(Boolean)
          .join('\n')
      );
    }
  } catch (e) {
    console.log('Clerk check failed (likely no SDK / no key):', (e as Error).message);
  }
})();
