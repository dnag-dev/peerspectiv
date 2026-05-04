import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clinics } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

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

export async function GET(req: NextRequest) {
  const userId = await getAdminUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const companyId = req.nextUrl.searchParams.get("company_id");
    if (!companyId) {
      return NextResponse.json({ error: "company_id is required" }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(clinics)
      .where(eq(clinics.companyId, companyId))
      .orderBy(asc(clinics.name));

    return NextResponse.json(rows);
  } catch (err) {
    console.error("[clinics GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getAdminUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { company_id, name, city, state } = body || {};

    if (!company_id) {
      return NextResponse.json({ error: "company_id is required" }, { status: 400 });
    }
    if (!name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const [row] = await db
      .insert(clinics)
      .values({
        companyId: company_id,
        name: name.trim(),
        city: city?.trim() || null,
        state: state?.trim() || null,
        isActive: true,
      })
      .returning();

    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    console.error("[clinics POST]", err);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
