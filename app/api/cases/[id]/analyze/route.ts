import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { analyzeChart } from '@/lib/ai/chart-analyzer';
import { auditLog } from '@/lib/utils/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;

    // Verify case exists
    const { data: caseData, error: caseError } = await supabaseAdmin
      .from('review_cases')
      .select('id, ai_analysis_status')
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) {
      return NextResponse.json(
        { error: 'Case not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (caseData.ai_analysis_status === 'processing') {
      return NextResponse.json(
        { error: 'Analysis already in progress', code: 'ANALYSIS_IN_PROGRESS' },
        { status: 409 }
      );
    }

    // Fire and forget -- don't await the full analysis
    analyzeChart(caseId).catch((err) => {
      console.error('[API] Background analysis failed for case:', caseId, err);
    });

    await auditLog({
      action: 'ai_analysis_triggered',
      resourceType: 'review_case',
      resourceId: caseId,
      request,
    });

    return NextResponse.json({ success: true, message: 'Analysis started' });
  } catch (err) {
    console.error('[API] POST /api/cases/[id]/analyze error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
