-- Phase 2 patch: track which extraction method was used for each chart
alter table ai_analyses
  add column if not exists extraction_method text;

comment on column ai_analyses.extraction_method is 'pdf-parse | claude-native | failed';
