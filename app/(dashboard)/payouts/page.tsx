import { PayoutsView } from './PayoutsView';
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = 'force-dynamic';

export default function PayoutsPage() {
  noStore();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-ink-primary">Payouts</h1>
        <p className="text-sm text-ink-secondary">
          Peer compensation by billing period. Pending amounts are computed from submitted reviews.
        </p>
      </div>
      <PayoutsView />
    </div>
  );
}
