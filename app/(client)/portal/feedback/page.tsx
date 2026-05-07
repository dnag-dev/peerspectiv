'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

function StarRating({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-ink-200">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`h-7 w-7 ${
                star <= value
                  ? 'fill-amber-600 text-status-warning-dot'
                  : 'text-ink-primary/20'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  const [ratingTurnaround, setRatingTurnaround] = useState(0);
  const [ratingReportQuality, setRatingReportQuality] = useState(0);
  const [ratingCommunication, setRatingCommunication] = useState(0);
  const [ratingOverall, setRatingOverall] = useState(0);
  const [wouldRecommend, setWouldRecommend] = useState<string | null>(null);
  const [openFeedback, setOpenFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ratingTurnaround,
          ratingReportQuality,
          ratingCommunication,
          ratingOverall,
          wouldRecommend,
          openFeedback,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-xl p-8 text-center" style={{ backgroundColor: 'var(--color-card)' }}>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand/15">
            <Star className="h-8 w-8 fill-brand text-status-info-dot" />
          </div>
          <h2 className="text-xl font-medium text-ink-primary">Thank you!</h2>
          <p className="mt-2 text-sm text-ink-tertiary">
            Your feedback has been recorded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-medium text-ink-primary">Help us improve</h1>
        <p className="mt-1 text-sm text-ink-tertiary">
          Your feedback helps Peerspectiv serve you better.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div
          className="space-y-6 rounded-xl p-6"
          style={{ backgroundColor: 'var(--color-card)' }}
        >
          <StarRating
            label="How satisfied are you with our turnaround time?"
            value={ratingTurnaround}
            onChange={setRatingTurnaround}
          />
          <StarRating
            label="How would you rate the quality of our review reports?"
            value={ratingReportQuality}
            onChange={setRatingReportQuality}
          />
          <StarRating
            label="How would you rate our communication and responsiveness?"
            value={ratingCommunication}
            onChange={setRatingCommunication}
          />
          <StarRating
            label="Overall, how satisfied are you with Peerspectiv?"
            value={ratingOverall}
            onChange={setRatingOverall}
          />
        </div>

        <div
          className="space-y-4 rounded-xl p-6"
          style={{ backgroundColor: 'var(--color-card)' }}
        >
          <div>
            <p className="text-sm font-medium text-ink-200">
              Would you recommend Peerspectiv to other FQHCs?
            </p>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => setWouldRecommend('true')}
                className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
                  wouldRecommend === 'true'
                    ? 'bg-[#2563EB] text-ink-primary'
                    : 'bg-white/10 text-ink-tertiary hover:bg-white/20'
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setWouldRecommend('false')}
                className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
                  wouldRecommend === 'false'
                    ? 'bg-[#2563EB] text-ink-primary'
                    : 'bg-white/10 text-ink-tertiary hover:bg-white/20'
                }`}
              >
                Not sure
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="open-feedback"
              className="block text-sm font-medium text-ink-200"
            >
              Anything else you&apos;d like us to know?
            </label>
            <textarea
              id="open-feedback"
              rows={4}
              value={openFeedback}
              onChange={(e) => setOpenFeedback(e.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-ink-primary placeholder-ink-500 focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              placeholder="Share your thoughts..."
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg py-3 text-sm font-medium text-ink-primary transition-colors disabled:opacity-50"
          style={{ backgroundColor: '#2563EB' }}
        >
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
}
