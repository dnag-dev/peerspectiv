import { NextRequest, NextResponse } from "next/server";
import { db, toCamel, toSnake } from "@/lib/db";
import { companies, reviewCases } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getNextPeriodStartDate, type CadenceConfig } from "@/lib/cadence/core";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const [row] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, params.id))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json(toSnake(row));
}

async function getAdminUserId(req: NextRequest): Promise<string | null> {
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const result = auth();
    const userId = (result as any)?.userId;
    if (userId) return userId as string;
  } catch {
    /* clerk not configured */
  }
  const demo = req.headers.get("x-demo-user-id");
  if (demo && demo.trim()) return demo.trim();
  const cookieRaw = req.cookies.get('demo_user')?.value;
  if (cookieRaw) {
    try {
      const parsed = JSON.parse(cookieRaw);
      if (parsed?.email) return `demo:${parsed.email}`;
    } catch { /* malformed cookie */ }
  }
  return null;
}

// Whitelist of columns admins are allowed to PATCH on a company.
// Anything not on this list is dropped silently.
const ALLOWED_FIELDS = new Set([
  "name",
  "contact_person",
  "contact_email",
  "contact_phone",
  "status",
  "notes",
  "prospect_source",
  "annual_review_count",
  "review_cycle",
  "address",
  "city",
  "state",
  "per_review_rate",
  "billing_cycle_type",
  "billing_cycle",
  "fiscal_year_start_month",
  "cadence_period_type",
  "cadence_period_months",
  "delivery_preference",
  "delivery_method",
  "itemize_invoice",
  "pricing_mode",
  "next_cycle_due",
  "last_cycle_completed",
  "onboarding_notes",
  "client_user_id",
  "contract_sent_at",
  "contract_signed_at",
  "baa_signed_at",
  "portal_access_granted_at",
]);

function pickAllowed(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    // Accept either snake_case or camelCase from clients; normalize to snake_case.
    const snake = k.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
    if (ALLOWED_FIELDS.has(snake)) out[snake] = v;
  }
  return out;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Auth gate. Mirror the invoice route's pattern: Clerk if configured,
  // x-demo-user-id header for the demo path. No identity → 401.
  const userId = await getAdminUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const updateSnake = pickAllowed(body);
  if (Object.keys(updateSnake).length === 0) {
    return NextResponse.json(
      { error: "No allowed fields in request body" },
      { status: 400 }
    );
  }

  const { id } = params;

  // SA-063F: validate cadence configuration fields.
  if (updateSnake.fiscal_year_start_month !== undefined) {
    const fy = Number(updateSnake.fiscal_year_start_month);
    if (!Number.isInteger(fy) || fy < 1 || fy > 12) {
      return NextResponse.json(
        { error: "Fiscal year start month must be between 1 and 12." },
        { status: 400 }
      );
    }
  }
  if (updateSnake.cadence_period_type !== undefined) {
    const validTypes = ["quarterly", "monthly", "custom_multi_month", "random"];
    if (!validTypes.includes(updateSnake.cadence_period_type as string)) {
      return NextResponse.json(
        { error: "Invalid cadence period type." },
        { status: 400 }
      );
    }
  }
  if (updateSnake.cadence_period_months !== undefined) {
    const cm = Number(updateSnake.cadence_period_months);
    if (!Number.isInteger(cm) || cm < 2 || cm > 12) {
      return NextResponse.json(
        { error: "Custom period length must be between 2 and 12 months." },
        { status: 400 }
      );
    }
  }

  // SA-042: refuse to archive a company that still has active review cases.
  // Active = anything not yet completed/cancelled. Forces the admin to
  // resolve the work first instead of orphaning in-flight reviews.
  if (updateSnake.status === "archived") {
    const active = await db
      .select({ id: reviewCases.id })
      .from(reviewCases)
      .where(
        and(
          eq(reviewCases.companyId, id),
          inArray(reviewCases.status, [
            "unassigned",
            "pending_approval",
            "assigned",
            "in_progress",
            "past_due",
          ])
        )
      )
      .limit(1);
    if (active.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot archive company with active review cases. Reassign or complete them first.",
          code: "company_has_active_cases",
        },
        { status: 409 }
      );
    }
  }

  // Phase 9A: Auto-calculate next_cycle_due when cadence config changes
  const cadenceChanged =
    updateSnake.cadence_period_type !== undefined ||
    updateSnake.fiscal_year_start_month !== undefined ||
    updateSnake.cadence_period_months !== undefined;

  if (cadenceChanged) {
    // Read current + incoming values to build the config
    const [current] = await db
      .select({
        cadencePeriodType: companies.cadencePeriodType,
        fiscalYearStartMonth: companies.fiscalYearStartMonth,
        cadencePeriodMonths: companies.cadencePeriodMonths,
      })
      .from(companies)
      .where(eq(companies.id, id))
      .limit(1);

    if (current) {
      const config: CadenceConfig = {
        fiscalYearStartMonth:
          (updateSnake.fiscal_year_start_month as number) ?? current.fiscalYearStartMonth ?? 1,
        type: ((updateSnake.cadence_period_type as string) ?? current.cadencePeriodType ?? 'quarterly') as CadenceConfig['type'],
        customMonths:
          (updateSnake.cadence_period_months as number) ?? current.cadencePeriodMonths ?? undefined,
      };
      const nextStart = getNextPeriodStartDate(config, new Date());
      updateSnake.next_cycle_due = nextStart;
    }
  }

  const [row] = await db
    .update(companies)
    .set(toCamel(updateSnake))
    .where(eq(companies.id, id))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json(toSnake(row));
}
