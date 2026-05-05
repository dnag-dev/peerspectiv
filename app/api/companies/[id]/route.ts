import { NextRequest, NextResponse } from "next/server";
import { db, toCamel, toSnake } from "@/lib/db";
import { companies, reviewCases } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";

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
