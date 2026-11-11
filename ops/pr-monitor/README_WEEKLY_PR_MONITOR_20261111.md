# PR Monitoring: weekly baseline and PR-first landing — 11 Nov 2026

- Main Commander landing `/` opens existing `/pr-monitor.html`; briefing is retained as `/briefing.html` and still accessible by the Home icon.
- Top of PR monitor: existing three-KPI block immediately after legacy page header, before the queue, stage details, and charts. No duplicate KPI or second polling loop.
- Each column and each release-efficiency card compares the same **24-hour Toronto-local time of day** now versus **7 days earlier**, including daylight-saving transitions. Creation cohorts are fetched with an existing cached, read-only GitHub endpoint; maximum nine paginated pages with rate reserve guard. No new schedule, CI workflow or provider.
- Archive completeness is NOT assumed: `weekly_coverage.status` reports no saved Core, partial start, or observed-but-incomplete Core events. Insufficient baseline shows `—`, **never 0** or a fabricated performance delta.
- At 11 Nov 2026, the observed authentic Core archive began 4 Nov 15:18 UTC, after the comparable week-old 24-hour window ending 4 Nov morning. Weekly CI and Repair numbers therefore need earlier verified history before claiming improvement. PR creation and merged data can be observed separately.
- Source merge to `codex/bootstrap-books` is not standalone Vercel LIVE; independently deploy the complete existing PR Monitor source with no lost assets and verify canonical /, /briefing.html, /pr-monitor.html and /api/pr-three-kpis?efficiency=1.
