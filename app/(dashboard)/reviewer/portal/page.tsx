import { supabaseAdmin } from "@/lib/supabase/server";
import type { ReviewCase } from "@/types";
import { ReviewerPortalClient } from "./client";

export const dynamic = "force-dynamic";

export default async function ReviewerPortalPage() {
  const { data: cases, error } = await supabaseAdmin
    .from("review_cases")
    .select(
      `
      *,
      provider:providers (*),
      reviewer:reviewers (*),
      company:companies (*),
      ai_analysis:ai_analyses (*)
`
    )
    .in("status", ["assigned", "in_progress"])
    .order("due_date", { ascending: true });

  if (error) {
    console.error("[ReviewerPortal] Failed to fetch cases:", error);
  }

  const reviewCases = (cases ?? []) as ReviewCase[];

  return <ReviewerPortalClient cases={reviewCases} />;
}
