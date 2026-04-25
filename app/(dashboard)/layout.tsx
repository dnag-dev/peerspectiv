import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MobileNavProvider } from '@/components/layout/MobileNavContext';
import { AshChat } from '@/components/ash/AshChat';
import { db } from '@/lib/db';
import { reviewCases, reviewers } from '@/lib/db/schema';
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
      .from(reviewers)
      .where(ne(reviewers.availabilityStatus, 'available'));

    return {
      overdueCount: Number(overdueRow?.count ?? 0),
      pendingCount: Number(pendingRow?.count ?? 0),
      unavailableReviewerCount: Number(unavailableRow?.count ?? 0),
    };
  } catch (err) {
    console.error('[dashboard layout] failed to load admin context', err);
    return { overdueCount: 0, pendingCount: 0 };
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { overdueCount, pendingCount, unavailableReviewerCount } = await getAdminContext();

  const initialGreeting = `Hey 👋 You have ${overdueCount} overdue cases and ${pendingCount} pending your approval. What do you need?`;

  const suggestedPrompts = [
    'How many prospects are in my pipeline?',
    'Which contracts have been out over a week?',
    'Who needs a new review cycle initiated?',
    'Show overdue cases',
    'Weekly summary',
  ];

  const ashContext = {
    overdueCount,
    pendingCount,
    unavailableReviewerCount,
    todayIso: new Date().toISOString().split('T')[0],
  };

  return (
    <MobileNavProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto bg-paper p-4 md:p-6">
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
