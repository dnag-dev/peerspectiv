import { NextRequest, NextResponse } from "next/server";
import { db, toSnake } from "@/lib/db";
import { providers, specialtyTaxonomy } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { company_id, first_name, last_name, specialty, npi, email, status } = body;

    if (!first_name?.trim() || !last_name?.trim()) {
      return NextResponse.json({ error: "First and last name are required" }, { status: 400 });
    }

    if (!specialty?.trim()) {
      return NextResponse.json({ error: "Specialty is required" }, { status: 400 });
    }

    // SA-038: server-side gate against off-taxonomy specialty values.
    const taxonomyHit = await db
      .select({ id: specialtyTaxonomy.id })
      .from(specialtyTaxonomy)
      .where(and(eq(specialtyTaxonomy.name, specialty.trim()), eq(specialtyTaxonomy.isActive, true)))
      .limit(1);
    if (taxonomyHit.length === 0) {
      return NextResponse.json(
        { error: "Specialty must match an active taxonomy entry.", code: "invalid_specialty" },
        { status: 400 }
      );
    }

    const [row] = await db
      .insert(providers)
      .values({
        companyId: company_id,
        firstName: first_name.trim(),
        lastName: last_name.trim(),
        specialty: specialty.trim(),
        npi: npi || null,
        email: email || null,
        status: status || "active",
      })
      .returning();

    return NextResponse.json(toSnake(row), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
