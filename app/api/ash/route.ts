import { NextRequest, NextResponse } from 'next/server';
import { anthropic, AI_MODEL } from '@/lib/ai/anthropic';
import { db } from '@/lib/db';
import { ashConversations } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

export const maxDuration = 45;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Portal = 'admin' | 'client' | 'reviewer';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AshRequestBody {
  message: string;
  portal: Portal;
  context?: Record<string, any>;
  conversationHistory?: ChatMessage[];
}

async function resolveUserId(req: NextRequest): Promise<string> {
  // Try Clerk first (may throw or return null in demo mode)
  try {
    const { auth } = await import('@clerk/nextjs/server');
    const result = auth();
    // auth() may return an object in server context
    const userId = (result as any)?.userId;
    if (userId) return userId as string;
  } catch {
    // Clerk not configured / demo mode — fall through
  }

  const demoHeader = req.headers.get('x-demo-user-id');
  if (demoHeader && demoHeader.trim().length > 0) return demoHeader.trim();
  return 'demo-user';
}

function buildSystemPrompt(
  portal: Portal,
  context: Record<string, any> | undefined
): string {
  const todayIso = new Date().toISOString().split('T')[0];

  if (portal === 'admin') {
    return `You are Ash, the AI operations assistant for Peerspectiv.
You help Ashton manage the full business lifecycle:
- Prospect pipeline (prospects → contracts → active clients)
- Review operations (batches → assignments → reviews → reports)
- Compliance tracking and client reporting

You have visibility into: companies (all statuses), contracts, review cycles, cases, reviewers, corrective actions, notifications.

Key rules you must always follow:
1. Never suggest creating a client without a signed contract
2. Never suggest processing charts for a company that isn't 'active'
3. Always flag potential duplicate companies before creating
4. Always remind Ashton when contracts have been out > 7 days unsigned
5. AI suggests, humans approve — never auto-commit

Context: ${JSON.stringify(context ?? {})}
Today: ${todayIso}`;
  }

  if (portal === 'client') {
    const companyName = context?.companyName || 'this organization';
    const currentQuarter = context?.currentQuarter || 'Q1 2026';
    return `You are Ash, the compliance intelligence assistant for ${companyName} on the Peerspectiv platform. You help quality directors and CMOs understand their peer review compliance data. You can ONLY see data for ${companyName} — never reference other clients. You have access to: compliance scores, provider performance, review status, corrective actions, risk trends. Current reporting period: ${currentQuarter}. Be helpful, clear, and translate data into plain English recommendations.`;
  }

  // reviewer
  const reviewerName = context?.reviewerName || 'the reviewer';
  const currentCase = context?.currentCase || {};
  return `You are Ash, the clinical review assistant for peer reviewers on the Peerspectiv platform. You are assisting Dr. ${reviewerName}. You can ONLY reference the case currently open: ${JSON.stringify(
    currentCase
  )}. Help the reviewer understand the chart contents, interpret AI pre-fills, and complete the review form accurately. Never suggest how to score — only explain what the chart says and what criteria mean.`;
}

export async function POST(req: NextRequest) {
  let body: AshRequestBody;
  try {
    body = (await req.json()) as AshRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { message, portal, context, conversationHistory } = body;

  if (!message || typeof message !== 'string') {
    return NextResponse.json(
      { error: 'message is required' },
      { status: 400 }
    );
  }
  if (!portal || !['admin', 'client', 'reviewer'].includes(portal)) {
    return NextResponse.json(
      { error: 'portal must be admin, client, or reviewer' },
      { status: 400 }
    );
  }

  const userId = await resolveUserId(req);
  const systemPrompt = buildSystemPrompt(portal, context);

  // Build Anthropic message history (user/assistant turns only)
  const priorTurns: { role: 'user' | 'assistant'; content: string }[] = (
    conversationHistory ?? []
  )
    .filter(
      (m) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.length > 0
    )
    .slice(-20) // cap history to last 20 turns
    .map((m) => ({ role: m.role, content: m.content }));

  const messagesForAnthropic = [
    ...priorTurns,
    { role: 'user' as const, content: message },
  ];

  let assistantText: string;
  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: messagesForAnthropic,
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from model');
    }
    assistantText = textBlock.text;
  } catch (err: any) {
    console.error('[ash] Anthropic error', err);
    return NextResponse.json(
      {
        error: 'AI service error',
        detail: err?.message ?? String(err),
      },
      { status: 502 }
    );
  }

  // Persist conversation: upsert-by-(userId, portal) via find + insert/update
  try {
    const fullMessages = [
      ...priorTurns,
      { role: 'user', content: message },
      { role: 'assistant', content: assistantText },
    ];

    const existing = await db
      .select()
      .from(ashConversations)
      .where(
        and(
          eq(ashConversations.userId, userId),
          eq(ashConversations.portal, portal)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(ashConversations)
        .set({
          messages: fullMessages as any,
          context: (context ?? {}) as any,
          updatedAt: new Date(),
        })
        .where(eq(ashConversations.id, existing[0].id));
    } else {
      await db.insert(ashConversations).values({
        userId,
        portal,
        messages: fullMessages as any,
        context: (context ?? {}) as any,
      });
    }
  } catch (err) {
    // Don't fail the user response on persistence error — log and continue
    console.error('[ash] persistence error', err);
  }

  return NextResponse.json({ message: assistantText });
}
