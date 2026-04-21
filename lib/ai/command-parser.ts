import { callClaude } from './anthropic';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function parseCommand(commandText: string): Promise<{
  intent: string;
  parameters: Record<string, unknown>;
  plain_english_response: string;
  needs_confirmation: boolean;
  data?: unknown;
}> {
  // Gather context
  const { count: activeCases } = await supabaseAdmin
    .from('review_cases')
    .select('*', { count: 'exact', head: true })
    .in('status', ['assigned', 'in_progress', 'unassigned', 'pending_approval']);

  const { data: companies } = await supabaseAdmin
    .from('companies')
    .select('name')
    .eq('status', 'active');

  const companyNames = companies?.map((c: any) => c.name).join(', ') || 'None';

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
        const { count } = await supabaseAdmin
          .from('review_cases')
          .select('*', { count: 'exact', head: true })
          .eq('status', s);
        results[s] = count || 0;
      }
      return results;
    }

    case 'list_past_due': {
      const { data } = await supabaseAdmin
        .from('review_cases')
        .select('id, due_date, specialty_required, reviewer:reviewers(full_name), company:companies(name), provider:providers(first_name, last_name)')
        .eq('status', 'past_due')
        .order('due_date', { ascending: true });
      return data;
    }

    case 'list_cases': {
      let query = supabaseAdmin
        .from('review_cases')
        .select('id, status, due_date, specialty_required, reviewer:reviewers(full_name), company:companies(name), provider:providers(first_name, last_name)')
        .order('created_at', { ascending: false })
        .limit(20);

      if (parameters.status) query = query.eq('status', parameters.status as string);
      const { data } = await query;
      return data;
    }

    case 'reviewer_performance': {
      const { data } = await supabaseAdmin
        .from('reviewers')
        .select('full_name, specialty, active_cases_count, ai_agreement_score, total_reviews_completed, status')
        .order('ai_agreement_score', { ascending: true });
      return data;
    }

    case 'company_summary': {
      const { data } = await supabaseAdmin
        .from('review_cases')
        .select('status, company:companies(name)')
        .order('created_at', { ascending: false });

      // Group by company
      const summary: Record<string, Record<string, number>> = {};
      data?.forEach((c: any) => {
        const name = c.company?.name || 'Unknown';
        if (!summary[name]) summary[name] = {};
        summary[name][c.status] = (summary[name][c.status] || 0) + 1;
      });
      return summary;
    }

    default:
      return null;
  }
}
