'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ProspectCard, type ProspectCardCompany } from './ProspectCard';

const STAGES = [
  {
    key: 'lead',
    title: 'Lead',
    accent: 'border-l-4 border-[#94A3B8]',
    badgeClass: 'bg-[#94A3B8] text-[#172554]',
  },
  {
    key: 'prospect',
    title: 'Prospect',
    accent: 'border-l-4 border-[#2563EB]',
    badgeClass: 'bg-[#2563EB] text-white',
  },
  {
    key: 'contract_sent',
    title: 'Contract Sent',
    accent: 'border-l-4 border-[#F59E0B]',
    badgeClass: 'bg-[#F59E0B] text-[#172554]',
  },
  {
    key: 'contract_signed',
    title: 'Contract Signed',
    accent: 'border-l-4 border-[#22C55E]',
    badgeClass: 'bg-[#22C55E] text-[#172554]',
  },
  {
    key: 'active_client',
    title: 'Active Client',
    accent: 'border-l-4 border-cobalt-500',
    badgeClass: 'bg-cobalt-500 text-white',
  },
  {
    key: 'in_cycle',
    title: 'In Cycle',
    accent: 'border-l-4 border-[#8B5CF6]',
    badgeClass: 'bg-[#8B5CF6] text-white',
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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
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
            className={`flex min-h-[400px] flex-col rounded-lg p-3 ${stage.accent} ${
              isOver ? 'bg-cobalt-50/10 ring-2 ring-cobalt-500' : 'bg-[#1E3A8A]'
            }`}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-white">
                {stage.title}
              </h2>
              <Badge className={`${stage.badgeClass} ml-2`}>
                {items.length}
              </Badge>
            </div>
            <div className="flex-1 space-y-2">
              {items.length === 0 ? (
                <Card className="border-dashed border-ink-700 bg-transparent">
                  <CardContent className="py-6 text-center text-xs text-ink-500">
                    No {stage.title.toLowerCase()}
                  </CardContent>
                </Card>
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
        );
      })}
    </div>
  );
}
