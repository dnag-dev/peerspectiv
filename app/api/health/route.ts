import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  try {
    const { error } = await supabaseAdmin
      .from('companies')
      .select('id', { count: 'exact', head: true });

    if (error) {
      return NextResponse.json(
        { status: 'degraded', db: false, timestamp: new Date().toISOString(), error: error.message, code: 'DB_CONNECTION_FAILED' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'ok',
      db: true,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Health check failed', code: 'HEALTH_CHECK_ERROR' },
      { status: 500 }
    );
  }
}
