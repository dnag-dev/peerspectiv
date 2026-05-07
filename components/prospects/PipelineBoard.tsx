'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ProspectCard, type ProspectCardCompany } from './ProspectCard';

// Sentence-case titles + semantic stripe tones. Each column becomes a
// light muted track with a coloured top stripe + count pill.
const STAGES = [
  {
    key: 'lead',
    title: 'Lead',
    stripe: 'bg-status-neutral-dot',
    badgeClass: 'bg-status-neutral-bg text-status-neutral-fg',
  },
  {
    key: 'prospect',
    title: 'Prospect',
    stripe: 'bg-status-info-dot',
    badgeClass: 'bg-status-info-bg text-status-info-fg',
  },
  {
    key: 'contract_sent',
    title: 'Contract sent',
    stripe: 'bg-status-warning-dot',
    badgeClass: 'bg-status-warning-bg text-status-warning-fg',
  },
  {
    key: 'contract_signed',
    title: 'Contract signed',
    stripe: 'bg-status-success-dot',
    badgeClass: 'bg-status-success-bg text-status-success-fg',
  },
  {
    key: 'active_client',
    title: 'Active client',
    stripe: 'bg-brand',
    badgeClass: 'bg-brand/15 text-brand',
  },
] as const;

type StageKey = (typeof STAGES)[number]['key'];

interface PipelineBoardProps {
  initialPipeline: Record<string, ProspectCardCompany[]>;
}

export function PipelineBoard({ initialPipeline }: PipelineBoardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pipeline, setPipeline] =
    useState<Record<string, ProspectCardCompany[]>>(initialPipeline);
  const [dragOver, setDragOver] = useState<StageKey | null>(null);

  // Sync with server data when initialPipeline changes (e.g. after router.refresh)
  useEffect(() => {
    setPipeline(initialPipeline);
  }, [initialPipeline]);

  async function promoteCompany(id: string, stage: StageKey) {
    if (!id) return;
    // Find current stage and move optimistically.
    let fromStage: StageKey | null = null;
    let card: ProspectCardCompany | null = null;
    for (const k of Object.keys(pipeline) as StageKey[]) {
      const found = pipeline[k]?.find((c) => c.id === id);
      if (found) {
        fromStage = k;
        card = found;
        break;
      }
    }
    if (!card || !fromStage || fromStage === stage) return;

    const next = { ...pipeline };
    next[fromStage] = next[fromStage].filter((c) => c.id !== id);
    next[stage] = [{ ...card, status: stage }, ...(next[stage] ?? [])];
    setPipeline(next);

    try {
      const res = await fetch(`/api/companies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: stage }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to update stage');
      }
      toast({
        title: 'Stage updated',
        description: `Moved to ${stage.replace('_', ' ')}.`,
      });
      router.refresh();
    } catch (err) {
      // Revert on failure.
      setPipeline(pipeline);
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
      {STAGES.map((stage) => {
        const items = pipeline[stage.key] ?? [];
        const isOver = dragOver === stage.key;
        return (
          <div
            key={stage.key}
            data-testid="pipeline-column"
            data-stage={stage.key}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragOver !== stage.key) setDragOver(stage.key);
            }}
            onDragLeave={() => {
              if (dragOver === stage.key) setDragOver(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              const id = e.dataTransfer.getData('text/plain');
              if (id) promoteCompany(id, stage.key);
            }}
            className={`flex min-h-[400px] flex-col overflow-hidden rounded-md border border-border-subtle bg-surface-muted ${
              isOver ? 'ring-2 ring-brand' : ''
            }`}
          >
            {/* Top tone stripe — 3px coloured ribbon */}
            <div className={`h-1 w-full ${stage.stripe}`} />
            <div className="flex flex-col p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="eyebrow">{stage.title}</p>
                <span className={`inline-flex min-w-[24px] items-center justify-center rounded-full px-2 py-0.5 text-2xs font-medium ${stage.badgeClass}`}>
                  {items.length}
                </span>
              </div>
              <div className="flex-1 space-y-2">
                {items.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border-default bg-surface-card py-6 text-center text-xs text-ink-tertiary">
                    No {stage.title.toLowerCase()}
                  </div>
              ) : (
                items.map((company) => (
                  <div
                    key={company.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', company.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <ProspectCard company={company} />
                  </div>
                ))
              )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
