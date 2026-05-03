import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Inbox } from 'lucide-react';

/**
 * Minimal layout for the credentialing role. Renders a stripped-down sidebar
 * with just Credentials + New Peer Inbox links — no Ash, no full admin
 * sidebar.
 */
export default function CredentialingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex h-full w-64 flex-shrink-0 flex-col bg-cobalt-900 text-paper-canvas">
        <div className="flex h-20 items-center px-5">
          <div className="rounded-md bg-paper-surface px-3 py-2 shadow-sm">
            <Image
              src="/peerspectiv-logo.png"
              alt="Peerspectiv"
              width={180}
              height={37}
              priority
              className="block h-auto w-[160px]"
            />
          </div>
        </div>

        <div className="px-6 pb-2 text-eyebrow text-cobalt-200">Credentialing</div>

        <nav className="mt-2 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          <Link
            href="/credentialing/credentials"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-cobalt-100 hover:bg-cobalt-700/40 hover:text-white"
          >
            <ShieldCheck className="h-[18px] w-[18px]" />
            Credentials
          </Link>
          <Link
            href="/credentialing/inbox"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-cobalt-100 hover:bg-cobalt-700/40 hover:text-white"
          >
            <Inbox className="h-[18px] w-[18px]" />
            New Peer Inbox
          </Link>
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto bg-paper-canvas p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
