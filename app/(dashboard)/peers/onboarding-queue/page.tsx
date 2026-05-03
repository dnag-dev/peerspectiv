import { db } from '@/lib/db';
import { peerInviteTokens } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OnboardingQueueRow } from './OnboardingQueueRow';
import { EmptyState } from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';

export default async function OnboardingQueuePage() {
  const rows = await db
    .select({
      token: peerInviteTokens.token,
      peerEmail: peerInviteTokens.peerEmail,
      submissionData: peerInviteTokens.submissionData,
      invitedAt: peerInviteTokens.invitedAt,
    })
    .from(peerInviteTokens)
    .where(eq(peerInviteTokens.submissionStatus, 'submitted'))
    .orderBy(desc(peerInviteTokens.invitedAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Path A Onboarding Queue</h1>
        <p className="text-sm text-ink-500">
          Submitted peer applications awaiting admin review.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Nothing in the queue"
          message="No path-A applications are pending review."
          backHref="/peers"
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{rows.length} pending</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-ink-200 bg-ink-50 text-xs uppercase tracking-wider text-ink-500">
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Submitted</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <OnboardingQueueRow
                    key={r.token}
                    token={r.token}
                    email={r.peerEmail}
                    invitedAt={r.invitedAt ? new Date(r.invitedAt).toISOString() : null}
                    submission={r.submissionData ?? {}}
                  />
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
