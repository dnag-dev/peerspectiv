import { PeerOnboardForm } from './PeerOnboardForm';

export const dynamic = 'force-dynamic';

export default function PeerOnboardPage() {
  return (
    <div className="min-h-screen bg-surface-canvas px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-medium tracking-tight text-ink-primary">Peer Onboarding</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Tell us about your clinical background. We&rsquo;ll review your credentials
          and follow up within 5 business days.
        </p>

        <div className="mt-3 rounded-md border border-border-subtle bg-ink-50 px-3 py-2 text-xs text-ink-secondary">
          We&rsquo;ll collect tax/banking details offline after credential review.
        </div>

        <div className="mt-6 rounded-lg border border-border-subtle bg-white p-6 shadow-sm">
          <PeerOnboardForm />
        </div>
      </div>
    </div>
  );
}
