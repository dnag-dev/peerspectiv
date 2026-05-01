import { ReviewerOnboardForm } from './ReviewerOnboardForm';

export const dynamic = 'force-dynamic';

export default function ReviewerOnboardPage() {
  return (
    <div className="min-h-screen bg-paper-canvas px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-ink-900">Reviewer Onboarding</h1>
        <p className="mt-2 text-sm text-ink-600">
          Tell us about your clinical background. We&rsquo;ll review your credentials
          and follow up within 5 business days.
        </p>

        <div className="mt-3 rounded-md border border-ink-200 bg-ink-50 px-3 py-2 text-xs text-ink-600">
          We&rsquo;ll collect tax/banking details offline after credential review.
        </div>

        <div className="mt-6 rounded-lg border border-ink-200 bg-white p-6 shadow-sm">
          <ReviewerOnboardForm />
        </div>
      </div>
    </div>
  );
}
