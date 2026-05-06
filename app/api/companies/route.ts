import { NextRequest, NextResponse } from "next/server";
import { db, toSnake } from "@/lib/db";
import { companies } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name, contact_person, contact_email, contact_phone,
      per_review_rate, notes, status,
      cadence_period_type, fiscal_year_start_month, cadence_period_months,
    } = body;

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
        status: status || "lead",
        cadencePeriodType: cadence_period_type || "quarterly",
        fiscalYearStartMonth: fiscal_year_start_month != null ? Number(fiscal_year_start_month) : 1,
        cadencePeriodMonths: cadence_period_months != null ? Number(cadence_period_months) : null,
      })
      .returning();

    return NextResponse.json(toSnake(row), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
