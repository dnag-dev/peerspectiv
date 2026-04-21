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
    blurb: 'Full access — pipeline, batches, reviewers, finance.',
    accent: '#2E6FE8',
  },
  {
    role: 'client' as const,
    label: 'Continue as Client CMO (Kelli)',
    email: 'kelli@horizonhealth.org',
    blurb: 'Hunter Health portal — compliance, providers, reports.',
    accent: '#22C55E',
  },
  {
    role: 'reviewer' as const,
    label: 'Continue as Reviewer (Dr. Johnson)',
    email: 'rjohnson@peerspectiv.com',
    blurb: 'Reviewer queue + AI-prefilled split-screen review.',
    accent: '#F59E0B',
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

  async function loginAsDemo(role: 'admin' | 'client' | 'reviewer') {
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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0F2044' }}>
      <div className="text-center w-full max-w-md">
        <div className="flex justify-center mb-2">
          <Image
            src="/peerspectiv-logo.png"
            alt="Peerspectiv"
            width={280}
            height={92}
            priority
          />
        </div>
        <p className="text-gray-300 mb-8 text-lg">AI-Powered Medical Peer Review Platform</p>

        {showDemo ? (
          <div className="bg-white rounded-xl shadow-xl p-8">
            <div className="mb-5 flex items-center justify-center gap-2 px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-bold uppercase">
              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              Demo Mode — Pick a Persona
            </div>
            <div className="space-y-3 text-left">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.role}
                  data-testid={`demo-login-${u.role}`}
                  onClick={() => loginAsDemo(u.role)}
                  disabled={loading !== null}
                  className="w-full rounded-lg border-2 border-gray-200 bg-white p-4 text-left transition-all hover:border-gray-400 hover:shadow-md disabled:opacity-50 disabled:hover:border-gray-200 disabled:hover:shadow-none"
                  style={{ borderLeftWidth: 6, borderLeftColor: u.accent }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{u.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{u.email}</div>
                      <div className="text-xs text-gray-600 mt-1">{u.blurb}</div>
                    </div>
                    {loading === u.role ? (
                      <svg className="animate-spin h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    ) : (
                      <span className="text-gray-400 text-lg">→</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            {isClerkConfigured && (
              <button
                onClick={() => setShowDemo(false)}
                className="mt-5 text-xs text-gray-500 hover:text-gray-700 underline"
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
                  <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto" />
                  <div className="h-10 bg-gray-200 rounded" />
                  <div className="h-10 bg-gray-200 rounded" />
                  <div className="h-10 bg-gray-200 rounded" />
                </div>
              </div>
            )}
            <button
              onClick={() => setShowDemo(true)}
              className="mt-5 text-xs text-gray-300 hover:text-white underline"
            >
              ← Back to demo personas
            </button>
          </>
        )}
      </div>
    </div>
  );
}
