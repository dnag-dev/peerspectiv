'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const isClerkConfigured =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== 'pk_test_placeholder' &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== '';

const DEMO_USERS = [
  {
    role: 'admin' as const,
    label: 'Continue as Admin (Ashton)',
    email: 'admin@peerspectiv.com',
    blurb: 'Full access — pipeline, batches, peers, finance.',
    accent: '#1D9E75',
  },
  {
    role: 'client' as const,
    label: 'Continue as Client CMO (Kelli)',
    email: 'kelli@horizonhealth.org',
    blurb: 'Hunter Health portal — compliance, providers, reports.',
    accent: '#534AB7',
  },
  {
    role: 'peer' as const,
    label: 'Continue as Peer (Dr. Johnson)',
    email: 'rjohnson@peerspectiv.com',
    blurb: 'Peer queue + AI-prefilled split-screen review.',
    accent: '#185FA5',
  },
  {
    role: 'credentialer' as const,
    label: 'Continue as Credentialing (Renée)',
    email: 'credentialing@peerspectiv.com',
    blurb: 'Credentials + new-peer inbox. Scoped, no admin access.',
    accent: '#BA7517',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [ClerkSignIn, setClerkSignIn] = useState<any>(null);
  const [showDemo, setShowDemo] = useState(true);

  // Detect bypass mode at runtime by trying the demo cookie endpoint
  // (we always show demo buttons; if real Clerk auth is preferred, click "Use real sign-in")

  useEffect(() => {
    if (isClerkConfigured && !showDemo) {
      import('@clerk/nextjs').then((mod) => setClerkSignIn(() => mod.SignIn));
    }
  }, [showDemo]);

  async function loginAsDemo(role: 'admin' | 'client' | 'peer' | 'credentialer') {
    setLoading(role);
    try {
      const res = await fetch('/api/demo/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? 'Demo login failed');
        setLoading(null);
        return;
      }
      router.push(data.redirect ?? '/dashboard');
    } catch (e) {
      console.error(e);
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface-sidebar">
      <div className="text-center w-full max-w-md">
        <div className="flex justify-center mb-4">
          <div className="rounded-lg bg-white px-6 py-4 shadow-lg">
            <Image
              src="/peerspectiv-logo.png"
              alt="Peerspectiv"
              width={320}
              height={65}
              priority
              className="block h-auto w-[320px]"
            />
          </div>
        </div>
        <p className="text-ink-tertiary mb-8 text-lg">AI-Powered Medical Peer Review Platform</p>

        {showDemo ? (
          <div className="bg-white rounded-xl shadow-xl p-8">
            <div className="mb-5 inline-flex items-center justify-center gap-1.5 rounded-full bg-status-warning-bg px-2 py-0.5 text-2xs font-medium text-status-warning-fg">
              <span className="h-1.5 w-1.5 rounded-full bg-status-warning-dot" />
              Demo mode — pick a persona
            </div>
            <div className="space-y-3 text-left">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.role}
                  data-testid={`demo-login-${u.role}`}
                  onClick={() => loginAsDemo(u.role)}
                  disabled={loading !== null}
                  className="w-full rounded-lg border-2 border-border-subtle bg-white p-4 text-left transition-all hover:border-ink-400 hover:shadow-md disabled:opacity-50 disabled:hover:border-border-subtle disabled:hover:shadow-none"
                  style={{ borderLeftWidth: 6, borderLeftColor: u.accent }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-ink-primary text-sm">{u.label}</div>
                      <div className="text-xs text-ink-secondary mt-0.5">{u.email}</div>
                      <div className="text-xs text-ink-secondary mt-1">{u.blurb}</div>
                    </div>
                    {loading === u.role ? (
                      <svg className="animate-spin h-5 w-5 text-ink-tertiary" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    ) : (
                      <span className="text-ink-tertiary text-lg">→</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            {isClerkConfigured && (
              <button
                onClick={() => setShowDemo(false)}
                className="mt-5 text-xs text-ink-secondary hover:text-ink-primary underline"
              >
                Use real Clerk sign-in instead
              </button>
            )}
          </div>
        ) : (
          <>
            {ClerkSignIn ? (
              <ClerkSignIn
                appearance={{ elements: { rootBox: 'mx-auto', card: 'bg-white shadow-xl rounded-xl' } }}
                routing="hash"
                afterSignInUrl="/dashboard"
              />
            ) : (
              <div className="bg-white rounded-xl shadow-xl p-8 mx-auto">
                <div className="animate-pulse space-y-4">
                  <div className="h-8 bg-ink-200 rounded w-1/2 mx-auto" />
                  <div className="h-10 bg-ink-200 rounded" />
                  <div className="h-10 bg-ink-200 rounded" />
                  <div className="h-10 bg-ink-200 rounded" />
                </div>
              </div>
            )}
            <button
              onClick={() => setShowDemo(true)}
              className="mt-5 text-xs text-ink-tertiary hover:text-white underline"
            >
              ← Back to demo personas
            </button>
          </>
        )}
      </div>
    </div>
  );
}
