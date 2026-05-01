-- 010_overall_score_numeric.sql
-- C3 fix — overall_score was integer, lossy for 8/9 (yields 89 not 88.89).
-- Promote review_results.overall_score and ai_analyses.overall_score to
-- numeric(5,2) so the displayed score matches the spec math exactly.

alter table review_results
  alter column overall_score type numeric(5,2)
  using overall_score::numeric(5,2);

alter table ai_analyses
  alter column overall_score type numeric(5,2)
  using overall_score::numeric(5,2);
