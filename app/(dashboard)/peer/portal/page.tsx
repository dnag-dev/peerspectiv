import { db, toSnake } from "@/lib/db";
import { peers, reviewCases } from "@/lib/db/schema";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { ReviewCase } from "@/types";
import { PeerPortalClient } from "./client";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

// Demo peer — same as peer/profile/page.tsx. When Clerk auth is active,
// this will be replaced with session-based peer resolution.
const DEMO_PEER_EMAIL = "rjohnson@peerspectiv.com";

async function resolvePeerId(): Promise<string | null> {
  const found = await db
    .select({ id: peers.id })
    .from(peers)
    .where(eq(peers.email, DEMO_PEER_EMAIL))
    .limit(1);
  return found[0]?.id ?? null;
}

const STATUS_GROUPS: Record<string, string[]> = {
  in_progress: ["assigned", "in_progress"],
  completed: ["completed"],
  incomplete: ["unassigned", "past_due", "pending_approval"],
  // Default open queue (when no filter): assigned + in_progress.
  all: ["assigned", "in_progress"],
};

export default async function PeerPortalPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  noStore();
  const peerId = await resolvePeerId();
  const statusKey = (searchParams?.status ?? "all").toLowerCase();
  const wanted = STATUS_GROUPS[statusKey] ?? STATUS_GROUPS.all;

  let cases: ReviewCase[] = [];
  try {
    const rows = await db.query.reviewCases.findMany({
      where: peerId
        ? and(eq(reviewCases.peerId, peerId), inArray(reviewCases.status, wanted))
        : inArray(reviewCases.status, wanted),
      orderBy: asc(reviewCases.dueDate),
      with: {
        provider: true,
        peer: true,
        company: true,
        aiAnalysis: true,
      },
    });
    cases = rows.map((r) => {
      const snake = toSnake<any>(r);
      return {
        ...snake,
        ai_analysis: snake.ai_analysis ? [snake.ai_analysis] : [],
      };
    }) as ReviewCase[];
  } catch (err) {
    console.error("[PeerPortal] Failed to fetch cases:", err);
  }

  // Status circle counts — scoped to this peer so circles show their cases only.
  const peerFilter = peerId ? eq(reviewCases.peerId, peerId) : undefined;
  const counts = await db
    .select({
      status: reviewCases.status,
      c: sql<number>`count(*)::int`,
    })
    .from(reviewCases)
    .where(peerFilter)
    .groupBy(reviewCases.status);

  const countMap: Record<string, number> = {};
  for (const r of counts) countMap[r.status ?? ""] = Number(r.c ?? 0);
  const inProgressCount = (countMap.assigned ?? 0) + (countMap.in_progress ?? 0);
  const completedCount = countMap.completed ?? 0;
  const incompleteCount =
    (countMap.unassigned ?? 0) +
    (countMap.past_due ?? 0) +
    (countMap.pending_approval ?? 0);

  return (
    <PeerPortalClient
      cases={cases}
      activeStatus={statusKey}
      counts={{
        in_progress: inProgressCount,
        completed: completedCount,
        incomplete: incompleteCount,
      }}
    />
  );
}
