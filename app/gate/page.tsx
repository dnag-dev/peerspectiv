import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Image from 'next/image';

const GATE_KEY = 'menthra';
const GATE_COOKIE = 'site_gate';

async function submitGate(formData: FormData) {
  'use server';
  const key = String(formData.get('key') ?? '').trim();
  if (key.toLowerCase() !== GATE_KEY) {
    redirect('/gate?e=1');
  }
  cookies().set(GATE_COOKIE, '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  redirect('/login');
}

export default function GatePage({
  searchParams,
}: {
  searchParams: { e?: string };
}) {
  const error = searchParams?.e === '1';

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: '#0F2044' }}
    >
      <div className="text-center w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="rounded-lg bg-white px-6 py-4 shadow-lg">
            <Image
              src="/peerspectiv-logo.png"
              alt="Peerspectiv"
              width={280}
              height={57}
              priority
              className="block h-auto w-[280px]"
            />
          </div>
        </div>

        <form
          action={submitGate}
          className="bg-white rounded-xl shadow-xl p-8 text-left"
        >
          <h1 className="text-lg font-semibold text-[#0F2044] mb-1">
            Access Required
          </h1>
          <p className="text-sm text-gray-500 mb-5">
            Enter the access key to continue.
          </p>

          <input
            name="key"
            type="password"
            autoFocus
            autoComplete="off"
            placeholder="Access key"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-[#1E4DB7] focus:outline-none focus:ring-2 focus:ring-[#1E4DB7]/20"
          />

          {error && (
            <p className="mt-3 text-sm text-red-600">
              Incorrect key. Try again.
            </p>
          )}

          <button
            type="submit"
            className="mt-4 w-full rounded-lg bg-[#1E4DB7] px-4 py-3 text-sm font-semibold text-white shadow hover:bg-[#1a43a0] focus:outline-none focus:ring-2 focus:ring-[#1E4DB7]/40"
          >
            Continue
          </button>
        </form>

        <p className="mt-6 text-xs text-gray-400">
          Temporary access gate — remove before production launch.
        </p>
      </div>
    </div>
  );
}
