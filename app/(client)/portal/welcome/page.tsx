'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Company = {
  id: string;
  name: string;
  contactPerson?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  // Stored in onboardingNotes on the server.
  specialtyMix?: string | null;
  onboardingNotes?: string | null;
};

const TOTAL_STEPS = 3;

export default function ClientWelcomePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [form, setForm] = useState<Company | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/companies/me', { cache: 'no-store' });
        if (!res.ok) throw new Error('Could not load your company profile.');
        const data = await res.json();
        if (!cancelled) {
          const hydrated: Company = {
            ...data,
            specialtyMix: data.specialtyMix ?? data.onboardingNotes ?? '',
          };
          setCompany(hydrated);
          setForm(hydrated);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveAndNext() {
    if (!form || !company) {
      setStep((s) => Math.min(TOTAL_STEPS, s + 1));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // PATCH endpoint uses snake_case DB column names.
      const map: Record<string, string> = {
        contactPerson: 'contact_person',
        contactEmail: 'contact_email',
        contactPhone: 'contact_phone',
        address: 'address',
        city: 'city',
        state: 'state',
        // specialty mix has no dedicated column — persist via onboarding_notes
        specialtyMix: 'onboarding_notes',
      };
      const diff: Record<string, any> = {};
      (Object.keys(map) as (keyof Company)[]).forEach((k) => {
        if (form[k] !== company[k]) diff[map[k as string]] = form[k];
      });
      if (Object.keys(diff).length > 0) {
        const res = await fetch(`/api/companies/${company.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(diff),
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || 'Save failed');
        }
      }
      setCompany(form);
      setStep(3);
    } catch (e: any) {
      setError(e?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={shellStyle}>
        <p style={{ color: '#94A3B8' }}>Loading your portal…</p>
      </div>
    );
  }

  const firstName =
    company?.contactPerson?.split(' ')[0] ?? 'there';

  return (
    <div style={shellStyle}>
      <div style={cardStyle}>
        <ProgressDots current={step} total={TOTAL_STEPS} />

        {error && (
          <div
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.4)',
              color: '#FCA5A5',
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {step === 1 && (
          <section>
            <div
              style={{
                fontSize: 14,
                letterSpacing: 3,
                color: '#2563EB',
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              PEERSPECTIV
            </div>
            <h1 style={h1Style}>Welcome, {firstName}.</h1>
            <p style={leadStyle}>
              Your portal for <strong>{company?.name ?? 'your organization'}</strong>{' '}
              is ready.
            </p>
            <p style={{ color: '#CBD5E1', marginTop: 16, marginBottom: 12 }}>
              From here you&apos;ll be able to:
            </p>
            <ul style={bulletListStyle}>
              <li>Track each review cycle from kickoff to final report</li>
              <li>See provider-level scores, deficiencies, and trends</li>
              <li>Follow up on corrective actions with your team</li>
              <li>Download board-ready quality reports in one click</li>
            </ul>

            <div style={meetAshBoxStyle}>
              <div style={{ fontWeight: 700, color: '#F8FAFC', marginBottom: 4 }}>
                Meet Ash
              </div>
              <div style={{ color: '#94A3B8', fontSize: 14 }}>
                Your AI copilot for peer review. Ask Ash anything about your data,
                compliance, or next steps — she&apos;s available from any screen in
                the portal.
              </div>
            </div>

            <div style={btnRowStyle}>
              <PrimaryButton onClick={() => setStep(2)}>Next</PrimaryButton>
            </div>
          </section>
        )}

        {step === 2 && form && (
          <section>
            <h1 style={h1Style}>Verify your information</h1>
            <p style={leadStyle}>
              Please confirm the details we have on file. You can update anything
              that looks off.
            </p>

            <div style={{ display: 'grid', gap: 14, marginTop: 20 }}>
              <Field
                label="Contact name"
                value={form.contactPerson ?? ''}
                onChange={(v) => setForm({ ...form, contactPerson: v })}
              />
              <Field
                label="Email"
                type="email"
                value={form.contactEmail ?? ''}
                onChange={(v) => setForm({ ...form, contactEmail: v })}
              />
              <Field
                label="Phone"
                value={form.contactPhone ?? ''}
                onChange={(v) => setForm({ ...form, contactPhone: v })}
              />
              <Field
                label="Address"
                value={form.address ?? ''}
                onChange={(v) => setForm({ ...form, address: v })}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field
                  label="City"
                  value={form.city ?? ''}
                  onChange={(v) => setForm({ ...form, city: v })}
                />
                <Field
                  label="State"
                  value={form.state ?? ''}
                  onChange={(v) => setForm({ ...form, state: v })}
                />
              </div>
              <Field
                label="Specialty mix"
                placeholder="e.g. Family Medicine, Pediatrics, Behavioral Health"
                value={form.specialtyMix ?? ''}
                onChange={(v) => setForm({ ...form, specialtyMix: v })}
              />
            </div>

            <div style={btnRowStyle}>
              <SecondaryButton onClick={() => setStep(1)}>Back</SecondaryButton>
              <PrimaryButton onClick={saveAndNext} disabled={saving}>
                {saving ? 'Saving…' : 'Save & Next'}
              </PrimaryButton>
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <h1 style={h1Style}>What happens next</h1>
            <p style={leadStyle}>
              Here&apos;s the path from today to your first board-ready report.
            </p>

            <ol style={timelineStyle}>
              <TimelineItem
                num="1"
                title="Ashton initiates your review cycle"
                body="We pull your provider list and assemble the first batch of cases for review."
              />
              <TimelineItem
                num="2"
                title="Board-certified physicians review"
                body="Specialty-matched peers score each chart against your quality criteria."
              />
              <TimelineItem
                num="3"
                title="Results appear in your portal"
                body="Provider-level scores, deficiencies, and corrective actions are available in real time."
              />
              <TimelineItem
                num="4"
                title="First report within 7 days"
                body="You'll have a downloadable board-ready quality report within one week of kickoff."
              />
            </ol>

            <div style={btnRowStyle}>
              <SecondaryButton onClick={() => setStep(2)}>Back</SecondaryButton>
              <PrimaryButton onClick={() => router.push('/portal')}>
                Go to Dashboard
              </PrimaryButton>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/* ─── UI primitives (scoped to this page) ───────────────────────────────── */

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
      {Array.from({ length: total }).map((_, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;
        return (
          <div
            key={n}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: active || done ? '#2563EB' : 'rgba(255,255,255,0.08)',
              transition: 'background 180ms ease',
            }}
          />
        );
      })}
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label style={{ display: 'block' }}>
      <span
        style={{
          display: 'block',
          fontSize: 12,
          letterSpacing: 1,
          color: '#94A3B8',
          marginBottom: 6,
          textTransform: 'uppercase',
        }}
      >
        {props.label}
      </span>
      <input
        type={props.type ?? 'text'}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
        style={{
          width: '100%',
          background: 'var(--color-card)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
          color: '#F8FAFC',
          padding: '10px 12px',
          fontSize: 14,
          outline: 'none',
        }}
      />
    </label>
  );
}

function PrimaryButton(props: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      style={{
        background: '#2563EB',
        color: 'white',
        padding: '12px 24px',
        borderRadius: 8,
        border: 'none',
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        fontWeight: 600,
        fontSize: 14,
        opacity: props.disabled ? 0.6 : 1,
      }}
    >
      {props.children}
    </button>
  );
}

function SecondaryButton(props: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={props.onClick}
      style={{
        background: 'transparent',
        color: '#CBD5E1',
        padding: '12px 20px',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.12)',
        cursor: 'pointer',
        fontWeight: 500,
        fontSize: 14,
      }}
    >
      {props.children}
    </button>
  );
}

function TimelineItem(props: { num: string; title: string; body: string }) {
  return (
    <li
      style={{
        display: 'flex',
        gap: 16,
        padding: '16px 0',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: '#2563EB',
          color: 'white',
          display: 'grid',
          placeItems: 'center',
          fontWeight: 700,
          flex: '0 0 auto',
        }}
      >
        {props.num}
      </div>
      <div>
        <div style={{ fontWeight: 600, color: '#F8FAFC', marginBottom: 2 }}>
          {props.title}
        </div>
        <div style={{ color: '#94A3B8', fontSize: 14 }}>{props.body}</div>
      </div>
    </li>
  );
}

/* ─── styles ────────────────────────────────────────────────────────────── */

const shellStyle: React.CSSProperties = {
  minHeight: '100%',
  padding: '48px 24px',
  display: 'flex',
  justifyContent: 'center',
  background: 'var(--color-card)',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 640,
  background: 'var(--color-card)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 16,
  padding: 40,
  color: '#F8FAFC',
};

const h1Style: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  margin: 0,
  marginBottom: 8,
  color: '#F8FAFC',
};

const leadStyle: React.CSSProperties = {
  color: '#CBD5E1',
  margin: 0,
  fontSize: 16,
  lineHeight: 1.5,
};

const bulletListStyle: React.CSSProperties = {
  paddingLeft: 20,
  margin: 0,
  color: '#CBD5E1',
  lineHeight: 1.8,
};

const meetAshBoxStyle: React.CSSProperties = {
  background: 'rgba(46,111,232,0.08)',
  border: '1px solid rgba(46,111,232,0.3)',
  borderRadius: 10,
  padding: 16,
  marginTop: 24,
};

const btnRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  justifyContent: 'flex-end',
  marginTop: 32,
};

const timelineStyle: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: '24px 0 0',
};
