import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { parseCommand } from '@/lib/ai/command-parser';
import { auditLog } from '@/lib/utils/audit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command_text } = body as { command_text: string };

    if (!command_text || typeof command_text !== 'string' || command_text.trim().length === 0) {
      return NextResponse.json(
        { error: 'command_text is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const response = await parseCommand(command_text.trim());

    // Save command + response to nl_command_history
    await supabaseAdmin.from('nl_command_history').insert({
      command_text: command_text.trim(),
      parsed_intent: response.intent,
      response_text: response.plain_english_response,
      action_taken: response.intent !== 'unknown' ? response.intent : null,
    });

    await auditLog({
      action: 'nl_command_executed',
      resourceType: 'command',
      metadata: { intent: response.intent },
      request,
    });

    return NextResponse.json({ data: response });
  } catch (err) {
    console.error('[API] POST /api/command error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
