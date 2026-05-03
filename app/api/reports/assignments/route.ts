import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reviewCases, peerSpecialties as peerSpecialtiesTbl } from "@/lib/db/schema";
import { and, desc, eq, gte, inArray, isNotNull, lte } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("company_id");
    const provider = searchParams.get("provider");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    const conditions = [isNotNull(reviewCases.peerId)];
    if (companyId && companyId !== "all") {
      conditions.push(eq(reviewCases.companyId, companyId));
    }
    if (startDate) conditions.push(gte(reviewCases.encounterDate, startDate));
    if (endDate) conditions.push(lte(reviewCases.encounterDate, endDate));

    const data = await db.query.reviewCases.findMany({
      where: and(...conditions),
      orderBy: desc(reviewCases.updatedAt),
      limit: 200,
      columns: {
        id: true,
        encounterDate: true,
        status: true,
        updatedAt: true,
        providerId: true,
        peerId: true,
        mrnNumber: true,
        isPediatric: true,
      },
      with: {
        provider: { columns: { firstName: true, lastName: true } },
        peer: { columns: { fullName: true } },
        reviewResult: { columns: { overallScore: true, deficiencies: true } },
      },
    });

    // Phase 1.3: hydrate specialties for the involved peers in one query
    const peerIds = Array.from(new Set(data.map((c) => c.peerId).filter(Boolean) as string[]));
    const specMap = new Map<string, string[]>();
    if (peerIds.length > 0) {
      const specRows = await db
        .select({ peerId: peerSpecialtiesTbl.peerId, specialty: peerSpecialtiesTbl.specialty })
        .from(peerSpecialtiesTbl)
        .where(inArray(peerSpecialtiesTbl.peerId, peerIds));
      for (const r of specRows) {
        const arr = specMap.get(r.peerId) ?? [];
        arr.push(r.specialty);
        specMap.set(r.peerId, arr);
      }
    }

    let rows = data.map((c) => {
      const result = c.reviewResult;
      const deficiencies = result?.deficiencies;
      const peer = c.peer;
      const peerSpecialties: string[] = (c.peerId ? specMap.get(c.peerId) : undefined) ?? [];
      const isPediatric = c.isPediatric === true;
      const pediatricMismatch =
        isPediatric &&
        !peerSpecialties.some((s) => s?.toLowerCase().includes("pediatric"));
      return {
        id: c.id,
        provider_id: c.providerId,
        peer_id: c.peerId,
        provider_name: c.provider
          ? `${c.provider.firstName} ${c.provider.lastName}`
          : "Unassigned",
        mrn_number: c.mrnNumber ?? "—",
        is_pediatric: isPediatric,
        pediatric_mismatch: pediatricMismatch,
        peer_name: peer?.fullName ?? "Unassigned",
        encounter_date: c.encounterDate,
        overall_score: result?.overallScore ?? null,
        deficiencies_count: Array.isArray(deficiencies) ? deficiencies.length : 0,
        completed_date: c.status === "completed" ? c.updatedAt : null,
        status: c.status,
      };
    });

    // Client-side provider name filter
    if (provider) {
      const search = provider.toLowerCase();
      rows = rows.filter((r) =>
        r.provider_name.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error("[API] GET /api/reports/assignments error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
