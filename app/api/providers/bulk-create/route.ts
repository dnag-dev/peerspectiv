import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { providers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface IncomingProvider {
  first_name?: string | null;
  last_name?: string | null;
  specialty?: string | null;
  npi?: string | null;
  email?: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { company_id, providers: incoming } = body || {};

    if (!company_id || typeof company_id !== "string") {
      return NextResponse.json({ error: "company_id is required" }, { status: 400 });
    }
    if (!Array.isArray(incoming) || incoming.length === 0) {
      return NextResponse.json({ error: "providers list is required" }, { status: 400 });
    }

    // Load existing providers for this company for dedupe
    const existing = await db
      .select({
        id: providers.id,
        firstName: providers.firstName,
        lastName: providers.lastName,
      })
      .from(providers)
      .where(eq(providers.companyId, company_id));

    const existingKeys = new Set(
      existing.map((p) =>
        `${(p.firstName || "").toLowerCase().trim()}|${(p.lastName || "").toLowerCase().trim()}`
      )
    );

    const seen = new Set<string>();
    const toInsert: Array<{
      companyId: string;
      firstName: string | null;
      lastName: string | null;
      specialty: string | null;
      npi: string | null;
      email: string | null;
      status: string;
    }> = [];
    const skipped: IncomingProvider[] = [];

    for (const p of incoming as IncomingProvider[]) {
      const first = (p.first_name || "").trim();
      const last = (p.last_name || "").trim();
      if (!first && !last) {
        skipped.push(p);
        continue;
      }
      const key = `${first.toLowerCase()}|${last.toLowerCase()}`;
      if (existingKeys.has(key) || seen.has(key)) {
        skipped.push(p);
        continue;
      }
      seen.add(key);
      toInsert.push({
        companyId: company_id,
        firstName: first || null,
        lastName: last || null,
        specialty: p.specialty?.trim() || null,
        npi: p.npi?.trim() || null,
        email: p.email?.trim() || null,
        status: "active",
      });
    }

    if (toInsert.length === 0) {
      return NextResponse.json({ inserted: 0, skipped: skipped.length });
    }

    const inserted = await db.insert(providers).values(toInsert).returning({ id: providers.id });

    return NextResponse.json({ inserted: inserted.length, skipped: skipped.length });
  } catch (err) {
    console.error("[providers/bulk-create]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
