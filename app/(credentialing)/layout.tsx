import { CredentialerSidebar } from '@/components/layout/CredentialerSidebar';

/**
 * Credentialer-role layout. Renders the standard SidebarShell tailored to
 * the credentialing persona (Dashboard / Earnings / Profile / Log Out).
 */
export default function CredentialingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <CredentialerSidebar />
      <main className="flex-1 overflow-y-auto bg-paper-canvas p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
