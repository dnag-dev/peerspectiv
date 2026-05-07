import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MobileNavProvider } from '@/components/layout/MobileNavContext';
import { AshChat } from '@/components/ash/AshChat';
import { BfcacheGuard } from '@/components/auth/BfcacheGuard';
import { db } from '@/lib/db';
import { reviewCases, peers, caseReassignmentRequests } from '@/lib/db/schema';
import { eq, ne, sql } from 'drizzle-orm';

async function getAdminContext() {
  try {
    const [overdueRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reviewCases)
      .where(eq(reviewCases.status, 'past_due'));

    const [pendingRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reviewCases)
      .where(eq(reviewCases.status, 'pending_approval'));

    const [unavailableRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(peers)
      .where(ne(peers.availabilityStatus, 'available'));

    const [reassignRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(caseReassignmentRequests)
      .where(eq(caseReassignmentRequests.status, 'open'));

    return {
      overdueCount: Number(overdueRow?.count ?? 0),
      pendingCount: Number(pendingRow?.count ?? 0),
      unavailablePeerCount: Number(unavailableRow?.count ?? 0),
      openReassignmentCount: Number(reassignRow?.count ?? 0),
    };
  } catch (err) {
    console.error('[dashboard layout] failed to load admin context', err);
    return { overdueCount: 0, pendingCount: 0, openReassignmentCount: 0 };
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { overdueCount, pendingCount, unavailablePeerCount, openReassignmentCount } = await getAdminContext();

  const initialGreeting = `Hey 👋 You have ${overdueCount} overdue cases and ${pendingCount} pending your approval. What do you need?`;

  // Phase 8.1 — admin-tailored quick-action prompts.
  const suggestedPrompts = [
    'Show overdue cases',
    'Pipeline summary',
    'Which credentialers are slow this month?',
    'Weekly summary',
  ];

  const ashContext = {
    overdueCount,
    pendingCount,
    unavailablePeerCount,
    todayIso: new Date().toISOString().split('T')[0],
  };

  return (
    <MobileNavProvider>
      <BfcacheGuard />
      <div className="flex h-screen overflow-hidden">
        <Sidebar openReassignmentCount={openReassignmentCount} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto bg-surface-canvas p-4 md:p-6">
            {children}
          </main>
        </div>
        <AshChat
          portal="admin"
          context={ashContext}
          initialGreeting={initialGreeting}
          suggestedPrompts={suggestedPrompts}
        />
      </div>
    </MobileNavProvider>
  );
}
