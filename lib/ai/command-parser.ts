import { callClaude } from './anthropic';
import { db } from '@/lib/db';
import { reviewCases, companies, reviewers } from '@/lib/db/schema';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';

export async function parseCommand(commandText: string): Promise<{
  intent: string;
  parameters: Record<string, unknown>;
  plain_english_response: string;
  needs_confirmation: boolean;
  data?: unknown;
}> {
  // Gather context
  const [{ count: activeCases }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reviewCases)
    .where(inArray(reviewCases.status, ['assigned', 'in_progress', 'unassigned', 'pending_approval']));

  const companyRows = await db
    .select({ name: companies.name })
    .from(companies)
    .where(eq(companies.status, 'active'));

  const companyNames = companyRows.map((c) => c.name).join(', ') || 'None';

  const systemPrompt = `You are Peerspectiv's AI command center. You help the operations manager run their peer review business through natural language.

You have access to these capabilities (respond with the action to take):

QUERY actions (return data):
- "dashboard_stats" - overall KPIs
- "list_cases" - with filters (status, company, reviewer, date_range)
- "list_past_due" - past due cases with details
- "reviewer_performance" - reviewer scores and stats
- "company_summary" - cases by company

ACTION actions (perform operations):
- "assign_batch" - trigger AI assignment for a batch_id
- "reassign_case" - move a case to a different reviewer
- "generate_report" - create QAPI report for company + date range

Parse the user's command and respond with ONLY valid JSON:
{
  "intent": "the_intent_name",
  "parameters": { "relevant": "params" },
  "plain_english_response": "What you're doing / what you found",
  "needs_confirmation": false
}

Current context:
- Today's date: ${new Date().toISOString().split('T')[0]}
- Total active cases: ${activeCases || 0}
- Companies: ${companyNames}`;

  const response = await callClaude(systemPrompt, commandText);

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      intent: 'unknown',
      parameters: {},
      plain_english_response: "I couldn't understand that command. Try asking about past-due cases, reviewer rankings, or batch assignments.",
      needs_confirmation: false,
    };
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Execute the intent and attach data
  const data = await executeIntent(parsed.intent, parsed.parameters);

  return { ...parsed, data };
}

async function executeIntent(intent: string, parameters: Record<string, unknown>): Promise<unknown> {
  switch (intent) {
    case 'dashboard_stats': {
      const statuses = ['unassigned', 'pending_approval', 'assigned', 'in_progress', 'completed', 'past_due'];
      const results: Record<string, number> = {};
      for (const s of statuses) {
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(reviewCases)
          .where(eq(reviewCases.status, s));
        results[s] = count || 0;
      }
      return results;
    }

    case 'list_past_due': {
      const data = await db.query.reviewCases.findMany({
        where: eq(reviewCases.status, 'past_due'),
        orderBy: asc(reviewCases.dueDate),
        columns: { id: true, dueDate: true, specialtyRequired: true },
        with: {
          reviewer: { columns: { fullName: true } },
          company: { columns: { name: true } },
          provider: { columns: { firstName: true, lastName: true } },
        },
      });
      return data;
    }

    case 'list_cases': {
      const conditions = [];
      if (parameters.status) conditions.push(eq(reviewCases.status, parameters.status as string));
      const data = await db.query.reviewCases.findMany({
        where: conditions.length ? and(...conditions) : undefined,
        orderBy: desc(reviewCases.createdAt),
        limit: 20,
        columns: { id: true, status: true, dueDate: true, specialtyRequired: true },
        with: {
          reviewer: { columns: { fullName: true } },
          company: { columns: { name: true } },
          provider: { columns: { firstName: true, lastName: true } },
        },
      });
      return data;
    }

    case 'reviewer_performance': {
      const data = await db
        .select({
          full_name: reviewers.fullName,
          specialty: reviewers.specialty,
          active_cases_count: reviewers.activeCasesCount,
          ai_agreement_score: reviewers.aiAgreementScore,
          total_reviews_completed: reviewers.totalReviewsCompleted,
          status: reviewers.status,
        })
        .from(reviewers)
        .orderBy(asc(reviewers.aiAgreementScore));
      return data;
    }

    case 'company_summary': {
      const data = await db.query.reviewCases.findMany({
        orderBy: desc(reviewCases.createdAt),
        columns: { status: true },
        with: { company: { columns: { name: true } } },
      });

      // Group by company
      const summary: Record<string, Record<string, number>> = {};
      data?.forEach((c) => {
        const name = c.company?.name || 'Unknown';
        if (!summary[name]) summary[name] = {};
        const status = c.status as string;
        summary[name][status] = (summary[name][status] || 0) + 1;
      });
      return summary;
    }

    default:
      return null;
  }
}
