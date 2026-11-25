# MyTube 256 scenario coverage & creative QA — 2026-11-19

## Non-breaking delivery
- Keep canonical 4/16/64/256 IDs and the 1,536 plot alternatives with four beats;
  Video Studio independently has 256 films with six five-second shots.
- New low-confidence contextual intake in RU/EN/ES: shame/guilt,
  inner critic/perfectionism, anger/resentment, fear of social evaluation.
  Map to existing neighboring themes and ASK the user to confirm the choice.
  Do not call it a new treatment, diagnosis, or new original screenplay.
- Existing sleep, grief, boundaries, sexuality and family/parenting aliases retained.
- Read-only audit: `node scripts/audit-mytube-creative-coverage.mjs`.
  Tests: `node --test tests/mytube-coverage-quality.test.mjs`.

## Quality truth
There are four individually directed 30s motivational scripts; the remaining
252 are complete scene-level drafts, NOT independently human-edited masterpieces.
Automated completeness scores do not prove artistic quality. All 256 screenplay
objects explicitly indicate unverified scene media.

For active Supabase read-only inventory, separately verify:
```sql
select target_aspect,match_kind,count(*) from public.hh_video_plot_scene_choices_v3 group by 1,2;
select count(*) filter (where individually_approved>0) as reviewed,
       count(*) filter (where physically_verified>0) as physical,
       count(*) as scenes from public.hh_video_plot_scene_coverage_v3;
```

## Follow-up editor acceptance
1. Rewrite and individually review 252 draft scripts (real human action,
   distinct dramatic mechanisms, no coercion; RU/EN/ES and IDs preserved).
2. Photo review must prove the depicted object/action, not just category tag.
   Prioritize Love & Relationships and Goals & Money; keep 5 candidates per
   plot/beat/aspect, unique originals, orientation and provenance.
3. Physical phone, audio-sync and 9:16/16:9 FFmpeg validation is distinct from
   source/metadata approval. Never claim an MP4 playable because a PR merged.
4. Preserve owner publish consent and rights; no new paid service, cron or
   manual Vercel deployment. Existing CI, auto-merge, hourly publisher only.
