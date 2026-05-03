import { NextRequest, NextResponse } from 'next/server';
import { db, toCamel, toSnake } from '@/lib/db';
import { peers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      rate_type,
      rate_amount,
      full_name,
      email,
      specialty,
      specialties,
      board_certification,
      license_number,
      license_state,
      credential_valid_until,
      max_case_load,
      status,
    } = body as {
      rate_type?: 'per_minute' | 'per_report' | 'per_hour';
      rate_amount?: number | string;
      full_name?: string;
      email?: string;
      specialty?: string;
      specialties?: string[];
      board_certification?: string | null;
      license_number?: string | null;
      license_state?: string | null;
      credential_valid_until?: string | null;
      max_case_load?: number | string;
      status?: string;
    };

    const update: Record<string, unknown> = {};

    if (full_name != null) {
      const v = full_name.trim();
      if (!v) {
        return NextResponse.json(
          { error: 'full_name cannot be empty', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
      update.full_name = v;
    }

    if (email != null) {
      const v = email.trim();
      if (!v || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        return NextResponse.json(
          { error: 'Invalid email', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
      update.email = v;
    }

    // Multi-specialty: if specialties[] provided, also write specialty=specialties[0]
    if (Array.isArray(specialties)) {
      const cleaned = specialties.map((s) => s.trim()).filter(Boolean);
      if (cleaned.length === 0) {
        return NextResponse.json(
          { error: 'specialties cannot be empty', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
      update.specialties = cleaned;
      update.specialty = cleaned[0];
    } else if (specialty != null) {
      const v = specialty.trim();
      if (!v) {
        return NextResponse.json(
          { error: 'specialty cannot be empty', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
      update.specialty = v;
    }

    if (board_certification !== undefined) {
      const v = typeof board_certification === 'string' ? board_certification.trim() : '';
      update.board_certification = v || null;
    }

    if (license_number !== undefined) {
      const v = typeof license_number === 'string' ? license_number.trim() : '';
      update.license_number = v || null;
    }

    if (license_state !== undefined) {
      const v = typeof license_state === 'string' ? license_state.trim() : '';
      update.license_state = v || null;
    }

    if (credential_valid_until !== undefined) {
      const v = typeof credential_valid_until === 'string' ? credential_valid_until.trim() : '';
      update.credential_valid_until = v || null;
    }

    if (max_case_load !== undefined && max_case_load !== null && max_case_load !== '') {
      const n = Math.max(1, Number(max_case_load) || 0);
      if (!Number.isFinite(n) || n < 1) {
        return NextResponse.json(
          { error: 'Invalid max_case_load', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
      update.max_case_load = n;
    }

    if (status != null) {
      if (!['active', 'inactive'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
      update.status = status;
    }

    if (rate_type != null) {
      if (!['per_minute', 'per_report', 'per_hour'].includes(rate_type)) {
        return NextResponse.json(
          { error: 'Invalid rate_type', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
      update.rate_type = rate_type;
    }

    if (rate_amount != null) {
      const ra = Number(rate_amount);
      if (!Number.isFinite(ra) || ra < 0) {
        return NextResponse.json(
          { error: 'Invalid rate_amount', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
      update.rate_amount = String(ra);
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const [row] = await db
      .update(peers)
      .set(toCamel(update))
      .where(eq(peers.id, params.id))
      .returning();

    if (!row) {
      return NextResponse.json(
        { error: 'Peer not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: toSnake(row) });
  } catch (err) {
    console.error('[API] PATCH /api/peers/[id] error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
