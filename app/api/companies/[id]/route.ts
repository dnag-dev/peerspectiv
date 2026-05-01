import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

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
  "delivery_preference",
  "itemize_invoice",
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

  const update = pickAllowed(body);
  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "No allowed fields in request body" },
      { status: 400 }
    );
  }

  const { id } = params;
  const { data, error } = await supabaseAdmin
    .from("companies")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
