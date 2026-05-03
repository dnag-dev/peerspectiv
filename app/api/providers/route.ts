import { NextRequest, NextResponse } from "next/server";
import { db, toSnake } from "@/lib/db";
import { providers } from "@/lib/db/schema";

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
