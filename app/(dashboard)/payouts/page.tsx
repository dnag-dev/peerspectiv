import { PayoutsView } from './PayoutsView';

export const dynamic = 'force-dynamic';

export default function PayoutsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Payouts</h1>
        <p className="text-sm text-ink-500">
          Reviewer compensation by billing period. Pending amounts are computed from submitted reviews.
        </p>
      </div>
      <PayoutsView />
    </div>
  );
}
