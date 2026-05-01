import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clinics } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.name === "string") updates.name = body.name.trim();
    if (typeof body.city === "string") updates.city = body.city.trim() || null;
    if (typeof body.state === "string") updates.state = body.state.trim() || null;
    if (typeof body.is_active === "boolean") updates.isActive = body.is_active;
    if (typeof body.isActive === "boolean") updates.isActive = body.isActive;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
    }

    const [row] = await db
      .update(clinics)
      .set(updates)
      .where(eq(clinics.id, params.id))
      .returning();

    if (!row) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (err) {
    console.error("[clinics PATCH]", err);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [row] = await db
      .delete(clinics)
      .where(eq(clinics.id, params.id))
      .returning();

    if (!row) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[clinics DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
