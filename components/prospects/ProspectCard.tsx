'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { FileText, KeyRound, ExternalLink, Loader2 } from 'lucide-react';

export interface ProspectCardCompany {
  id: string;
  name: string;
  status: string;
  contactPerson: string | null;
  state: string | null;
  annualReviewCount: number | null;
  contractSentAt: string | null;
  createdAt: string | null;
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const diffMs = Date.now() - then;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function ProspectCard({ company }: { company: ProspectCardCompany }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const createdDays = daysSince(company.createdAt);
  const sentDays = daysSince(company.contractSentAt);
  const overdueContract = company.status === 'contract_sent' && sentDays !== null && sentDays > 7;

  async function handleGenerateContract() {
    setLoading(true);
    try {
      const res = await fetch('/api/contracts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: company.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to generate contract');
      }
      toast({ title: 'Contract generated', description: `Sent for ${company.name}.` });
      router.refresh();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleActivate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${company.id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to grant portal access');
      }
      toast({ title: 'Portal access granted', description: `${company.name} is now active.` });
      router.refresh();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      data-testid="prospect-card"
      className={`flex flex-col bg-surface-card transition hover:shadow-sm ${
        overdueContract ? 'border border-status-warning-dot' : 'border border-border-subtle'
      }`}
    >
      <CardContent className="flex flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link href={`/companies/${company.id}`} className="block text-sm font-medium leading-tight text-ink-primary hover:underline">
              {company.name}
            </Link>
            {company.contactPerson && (
              <p className="mt-0.5 truncate text-xs text-ink-secondary">{company.contactPerson}</p>
            )}
          </div>
          {company.state && (
            <span className="shrink-0 rounded-full bg-status-info-bg px-2 py-0.5 text-2xs font-medium text-status-info-fg">
              {company.state}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-2xs text-ink-tertiary">
          {company.annualReviewCount != null && (
            <span>{company.annualReviewCount} reviews/yr</span>
          )}
          {createdDays !== null && <span>Added {createdDays}d ago</span>}
          {company.status === 'contract_sent' && sentDays !== null && (
            <span className={overdueContract ? 'font-medium text-status-warning-fg' : ''}>
              Sent {sentDays}d ago
            </span>
          )}
        </div>

        <div className="mt-auto pt-1">
          {company.status === 'prospect' && (
            <Button
              size="sm"
              className="w-full bg-brand text-white hover:bg-brand-hover"
              onClick={handleGenerateContract}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <FileText className="mr-2 h-3 w-3" />
              )}
              Generate contract
            </Button>
          )}
          {company.status === 'contract_sent' && (
            <Link
              href={`/companies/${company.id}`}
              className="inline-flex w-full items-center justify-center rounded-md border border-status-warning-dot px-2 py-1.5 text-xs font-medium text-status-warning-fg hover:bg-status-warning-bg"
            >
              <ExternalLink className="mr-2 h-3 w-3" />
              Resend / view
            </Link>
          )}
          {company.status === 'contract_signed' && (
            <Button
              size="sm"
              className="w-full bg-status-success-dot text-white hover:bg-brand-hover"
              onClick={handleActivate}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <KeyRound className="mr-2 h-3 w-3" />
              )}
              Grant portal access
            </Button>
          )}
          {company.status === 'active' && (
            <Link
              href={`/companies/${company.id}`}
              className="inline-flex w-full items-center justify-center rounded-md border border-border-default bg-surface-card px-2 py-1.5 text-xs font-medium text-ink-primary hover:bg-surface-muted"
            >
              <ExternalLink className="mr-2 h-3 w-3" />
              View
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
