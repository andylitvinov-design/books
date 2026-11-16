# AI Council 2.1 — bounded owner candidate pagination

The Video Scout continues to add up to 20 research candidates per hourly UTC slot. Its protected owner UI originally displayed only the latest 40. This makes the first 20 of a 60-item backlog inaccessible to the owner for editorial rights triage.

Implementation:
- Explicit `?page=1..100` in the existing owner-only SSR route and its owner-only JSON API.
- Forty candidates per page; stable chronological order `first_seen_at desc,candidate_id desc`. Safe parameterized SQL `LIMIT 40 OFFSET (page - 1)*40`. No arbitrary user SQL. Existing run history limits remain separate.
- Review decisions are obtained for **the exact 40 candidate IDs on the current page**, not offset into a sparse table of reviewer actions. This prevents incorrectly showing an already-reviewed older candidate as unreviewed.
- Next/previous page links are localized RU/EN/ES. The total research and pending-review counters still come from the full private database.
- All candidates remain `research_only/rights_unverified`; pagination neither approves files nor incurs new model calls or a new scheduled task.

Limitations: pages beyond 100 are denied; 100 pages cover up to 4,000 candidates. At larger scale, replace OFFSET with server-verified keyset cursors after measuring indexed query performance. One-page UI browsing must never be called a full end-to-end legal review.

Acceptance: the owner can reach and review items 41–60 from the 60-candidate production readback, while unauthorized clients cannot query or mutate any private candidate. Verify actual logged-in mobile flow; do not infer it from a successful TypeScript build.
