import { NextRequest, NextResponse } from "next/server";
import { db, toSnake } from "@/lib/db";
import { companies } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, contact_person, contact_email, contact_phone, per_review_rate, notes, status } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    const [row] = await db
      .insert(companies)
      .values({
        name: name.trim(),
        contactPerson: contact_person || null,
        contactEmail: contact_email || null,
        contactPhone: contact_phone || null,
        perReviewRate: per_review_rate != null ? String(per_review_rate) : null,
        notes: notes || null,
        status: status || "active",
      })
      .returning();

    return NextResponse.json(toSnake(row), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
