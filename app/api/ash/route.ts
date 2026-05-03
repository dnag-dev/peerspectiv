import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { anthropic, AI_MODEL } from '@/lib/ai/anthropic';
import { db } from '@/lib/db';
import { ashConversations } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

export const maxDuration = 45;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Portal = 'admin' | 'client' | 'peer';

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

const ADMIN_DB_SCHEMA = `
Postgres schema (read-only). Always use these EXACT table + column names. Do NOT invent columns like c.dos, p.name, or strftime — this is Postgres, not SQLite.

companies (id uuid, name, status, created_at, updated_at)
providers (id uuid, first_name, last_name, specialty, npi, company_id uuid → companies, active, created_at)
peers (id uuid, full_name, email, specialty, board_certification, active_cases_count, status, total_reviews_completed, ai_agreement_score numeric, availability_status, unavailable_from, unavailable_until, unavailable_reason, rate_type, rate_amount numeric, created_at)
batches (id uuid, batch_name, company_id → companies, date_uploaded, total_cases, assigned_cases, completed_cases, status, specialty, projected_completion, created_at)
review_cases (id uuid, batch_id → batches, provider_id → providers, reviewer_id → peers, company_id → companies, assigned_at, due_date, status, encounter_date date, chart_file_name, specialty_required, created_at, updated_at)
review_results (id uuid, case_id → review_cases, reviewer_id → peers, overall_score int, quality_score int, deficiencies jsonb, submitted_at, time_spent_minutes int, narrative_final, created_at)
reviewer_payouts (id uuid, reviewer_id → peers, period_start date, period_end date, unit_type, units numeric, rate_amount numeric, amount numeric, status, approved_at, paid_at, created_at)
corrective_actions (id uuid, case_id → review_cases, company_id, provider_id, status, description, due_date, created_at)
notifications (id uuid, user_id, type, message, read, created_at)
contracts (id uuid, company_id, status, sent_at, signed_at, created_at)
client_feedback (id uuid, company_id, rating_overall, rating_turnaround, rating_report_quality, rating_communication, open_feedback, submitted_at)
ash_conversations (id, user_id, portal, messages jsonb, created_at)

Date handling: use Postgres date functions.
  • Year: extract(year from encounter_date) = 2026  OR  encounter_date >= '2026-01-01' AND encounter_date < '2027-01-01'
  • Current month YTD: encounter_date >= date_trunc('year', now())
Full name: providers.first_name || ' ' || providers.last_name AS provider_name
`;

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

CRITICAL: When the user asks for data, counts, lists, or anything factual about the business, you MUST call the run_sql tool to fetch it from Postgres. NEVER fabricate numbers. NEVER print SQL in the chat — run it. After the tool returns rows, present the answer as a short plain-English summary with a compact markdown table only when helpful. If the result set is large, show the top 10-20 rows and mention the total.

Do not write \`\`\`typescript or import statements in responses. You have no code execution — only the run_sql tool.

${ADMIN_DB_SCHEMA}

Key business rules:
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

  // peer
  const peerName = context?.peerName || 'the peer';
  const currentCase = context?.currentCase || {};
  return `You are Ash, the clinical review assistant for peer peers on the Peerspectiv platform. You are assisting Dr. ${peerName}. You can ONLY reference the case currently open: ${JSON.stringify(
    currentCase
  )}. Help the peer understand the chart contents, interpret AI pre-fills, and complete the review form accurately. Never suggest how to score — only explain what the chart says and what criteria mean.`;
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
  if (!portal || !['admin', 'client', 'peer'].includes(portal)) {
    return NextResponse.json(
      { error: 'portal must be admin, client, or peer' },
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

  const messagesForAnthropic: Array<{ role: 'user' | 'assistant'; content: any }> = [
    ...priorTurns,
    { role: 'user' as const, content: message },
  ];

  // Admin portal gets a read-only SQL tool so Ash can actually fetch data
  // instead of hallucinating SQL or inventing numbers.
  const adminTools =
    portal === 'admin'
      ? [
          {
            name: 'run_sql',
            description:
              'Execute a read-only SELECT query against the Peerspectiv Postgres database and return the rows. Use the schema provided in the system prompt. Only SELECT statements are allowed. Keep queries focused and add LIMIT 50 for list queries unless the user asks for more.',
            input_schema: {
              type: 'object' as const,
              properties: {
                sql: {
                  type: 'string',
                  description: 'A single SELECT statement. Must not contain INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE/GRANT/COPY.',
                },
              },
              required: ['sql'],
            },
          },
        ]
      : undefined;

  let assistantText: string;
  try {
    let safetyLoops = 0;
    // Multi-turn tool loop
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (safetyLoops++ > 5) break;
      const response: any = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: 1500,
        system: systemPrompt,
        messages: messagesForAnthropic as any,
        ...(adminTools ? { tools: adminTools as any } : {}),
      });

      if (response.stop_reason === 'tool_use') {
        // Record assistant turn with tool_use blocks
        messagesForAnthropic.push({
          role: 'assistant',
          content: response.content,
        });

        const toolResults: Array<{
          type: 'tool_result';
          tool_use_id: string;
          content: string;
          is_error?: boolean;
        }> = [];

        for (const block of response.content) {
          if (block.type !== 'tool_use') continue;
          if (block.name !== 'run_sql') {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: `Unknown tool: ${block.name}`,
              is_error: true,
            });
            continue;
          }
          const sql = String((block.input as any)?.sql ?? '').trim();
          const lowered = sql.toLowerCase();
          const forbidden = /\b(insert|update|delete|drop|alter|truncate|grant|copy|create|revoke)\b/;
          if (!lowered.startsWith('select') && !lowered.startsWith('with')) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: 'Error: only SELECT / WITH queries are allowed.',
              is_error: true,
            });
            continue;
          }
          if (forbidden.test(lowered)) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: 'Error: query contains a forbidden mutation keyword.',
              is_error: true,
            });
            continue;
          }
          try {
            const url = process.env.DATABASE_URL;
            if (!url) throw new Error('DATABASE_URL not set');
            const sqlClient = neon(url);
            // Hard row cap as an extra guard
            const capped = sql.replace(/;$/, '') + ' LIMIT 500';
            const rows = (await sqlClient.query(capped)) as any[];
            const trimmed = rows.slice(0, 200);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify({
                row_count: rows.length,
                rows: trimmed,
                truncated: rows.length > trimmed.length,
              }),
            });
          } catch (err: any) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: `SQL error: ${err?.message ?? String(err)}`,
              is_error: true,
            });
          }
        }

        messagesForAnthropic.push({
          role: 'user',
          content: toolResults,
        });
        continue; // loop back for Claude to interpret results
      }

      // end_turn / stop_sequence / max_tokens — grab text
      const textBlock = (response.content as any[]).find(
        (b) => b.type === 'text'
      );
      if (!textBlock) {
        throw new Error('No text response from model');
      }
      assistantText = textBlock.text;
      break;
    }
    // Fallback in case the loop exited without assigning
    assistantText = assistantText! ?? 'I was not able to complete that request.';
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
