import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// GET /api/reviewers/available?specialty=Family%20Medicine
// Returns active + available reviewers matching the given specialty,
// sorted by active_cases_count ascending (least-loaded first).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const specialty = searchParams.get('specialty');

  let query = supabaseAdmin
    .from('reviewers')
    .select(
      'id, full_name, email, specialty, board_certification, active_cases_count, total_reviews_completed, availability_status, unavailable_until, unavailable_reason, status'
    )
    .eq('status', 'active')
    .order('active_cases_count', { ascending: true });

  if (specialty) query = query.eq('specialty', specialty);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ reviewers: data ?? [] });
}
