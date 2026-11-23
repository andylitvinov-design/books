# Daybook: two client-owned development vectors (2026-11-22)

Inner vector = 8 meaning axes from the existing live-coach profile intake.
Outer vector = 8 existing Life Plan areas (not the optional 4-sector portrait aggregation).
Each offers 0–10 current/desired self-rating, signed delta, independent focused area.
Scores are optional observations; missing ratings remain missing and never become
goal-completion percentages or psychometric test scores.

New signed-in EN/RU/ES page: /{locale}/development-vectors. Supports self-editor
and a one-at-a-time guided interview, with identical encrypted persistent profile.
The private development-goals envelope stores versioned optional vectors; legacy
editors that omit vectors cannot silently delete them. Existing Life Plan goals
and actions remain authoritative in coaching-life-plan and are never overwritten.

Coaching-to-profile bridge: import voluntarily saved, client-reviewed My Coach
protocol profileCheckin ratings. Import is an editable draft until explicit Save.
Self-to-coach bridge: preview/copy only saved ratings and explicitly send them to
the chosen AI coach. No silent release of scores to an external LLM/provider.

Integration limitation: automatic server-side AI memory ingestion needs consent,
provider-specific approval and owner reconciliation after active single-writer
PR #5404 (My Coach), #5419 (My Space), #5420 (daily Daybook). This PR never
overwrites those source files, adds a paid provider, new database, cron, or deploy.

Verify: pure schema tests, authenticated cross-account GET/POST, revision 409,
legacy development-goals POST retains vectors, mobile EN/RU/ES + WebKit,
consented saved protocol import; mandatory Core, Specialist, hh-merge-check.
Protected native merge only; hourly Vercel publisher only; alias SHA LIVE proof.
