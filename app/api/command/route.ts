import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nlCommandHistory } from '@/lib/db/schema';
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
    await db.insert(nlCommandHistory).values({
      commandText: command_text.trim(),
      parsedIntent: response.intent,
      responseText: response.plain_english_response,
      actionTaken: response.intent !== 'unknown' ? response.intent : null,
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
