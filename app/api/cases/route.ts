import { NextRequest, NextResponse } from 'next/server';
import { and, eq, ne } from 'drizzle-orm';
import { supabaseAdmin } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { reviewCases } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const batch_id = searchParams.get('batch_id');
    const reviewer_id = searchParams.get('reviewer_id');
    const company_id = searchParams.get('company_id');

    let query = supabaseAdmin
      .from('review_cases')
      .select(`
        *,
        provider:providers(id, first_name, last_name, specialty, npi),
        reviewer:reviewers(id, full_name, email, specialty),
        company:companies(id, name),
        batch:batches(id, batch_name)
      `)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (batch_id) query = query.eq('batch_id', batch_id);
    if (reviewer_id) query = query.eq('reviewer_id', reviewer_id);
    if (company_id) query = query.eq('company_id', company_id);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message, code: 'QUERY_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[API] GET /api/cases error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      provider_id,
      batch_id,
      company_id,
      reviewer_id,
      batch_period,
      encounter_date,
      specialty_required,
      priority,
      due_date,
      notes,
      status,
    } = body ?? {};

    // Duplicate case guard — one active case per provider per batch_period
    if (provider_id && batch_period) {
      const existing = await db
        .select({ id: reviewCases.id })
        .from(reviewCases)
        .where(
          and(
            eq(reviewCases.providerId, provider_id),
            eq(reviewCases.batchPeriod, batch_period),
            ne(reviewCases.status, 'archived')
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return NextResponse.json(
          {
            error: 'duplicate_case',
            message: `A review case already exists for this provider in ${batch_period}`,
            existing_case_id: existing[0].id,
          },
          { status: 409 }
        );
      }
    }

    // Insert via supabase to preserve existing tooling / RLS behaviors.
    const { data, error } = await supabaseAdmin
      .from('review_cases')
      .insert({
        provider_id: provider_id ?? null,
        batch_id: batch_id ?? null,
        company_id: company_id ?? null,
        reviewer_id: reviewer_id ?? null,
        batch_period: batch_period ?? null,
        encounter_date: encounter_date ?? null,
        specialty_required: specialty_required ?? null,
        priority: priority ?? 'normal',
        due_date: due_date ?? null,
        notes: notes ?? null,
        status: status ?? 'unassigned',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message, code: 'INSERT_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('[API] POST /api/cases error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
