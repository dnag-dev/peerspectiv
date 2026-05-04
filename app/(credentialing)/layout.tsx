import { CredentialerSidebar } from '@/components/layout/CredentialerSidebar';
import { AshChat } from '@/components/ash/AshChat';
import { BfcacheGuard } from '@/components/auth/BfcacheGuard';

/**
 * Credentialer-role layout. Renders the standard SidebarShell tailored to
 * the credentialing persona (Dashboard / Earnings / Profile / Log Out).
 *
 * Phase 8.1: includes the credentialer-tailored Ash with quick-action prompts
 * and access to the credentialing-bucket typed tools (lib/ash/tools.ts).
 */
export default function CredentialingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <BfcacheGuard />
      <CredentialerSidebar />
      <main className="flex-1 overflow-y-auto bg-paper-canvas p-4 md:p-6">
        {children}
      </main>
      <AshChat
        portal="credentialer"
        context={{}}
        initialGreeting="Hi — I can pull credentialing throughput and license-expiry queues. What do you need?"
        suggestedPrompts={[
          'Which peers expire next week?',
          'Generate the credentialing report for last month',
          'Who is still in pending_credentialing > 7 days?',
        ]}
      />
    </div>
  );
}
