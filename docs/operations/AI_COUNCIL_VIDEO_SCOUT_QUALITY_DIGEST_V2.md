# Holistic House · Video Scout 2.1 — quality guard and daily owner summary

Release scope: one conservative research-only metadata relevance guard and one optional private daily Telegram report. No new cron, account, paid model, video download or public publication.

## Finding and bounded correction

The first real Commons hourly slot on 2026-11-07 00:17 UTC produced 20 new candidate records from 36 provider results. The `calm river` query also returned hurricane, helicopter, JPL and rapids footage; `people embracing` returned cats and Hugging Face event titles. Wikimedia full-text search can legitimately match metadata unrelated to the visible scene.

The new `plausibleResearchTitle` filter rejects **clear title-level mismatches** for these two observed high-noise search phrases before candidate insertion. Unknown titles are treated conservatively; the filter does not inspect frames, infer rights or guarantee emotional/visual relevance. Other fixed searches retain the original discovery pipeline until real evidence justifies a separate rule. Historical research records are not deleted or silently reclassified. Rejected counts increase transparently. The owner still reviews individual original files before any Vault admission.

## Daily owner report

One optional `video-scout-digest-daily` task is registered OFF and has an explicit `HH_VIDEO_SCOUT_DIGEST_ENABLED=true` Production environment gate. It runs at 15:17 UTC **through the existing** `/api/internal/video-scout-hourly` Vercel Cron (`17 * * * *`); it creates **no additional Cron** and cannot be triggered as an unscheduled owner send.

The report contains only aggregate count of actual Video Scout slots, successful/failed/no-change states, inserted research candidates, duplicates and source API calls over the past 24 hours. There are no client, therapy, model prompt, private source file, or credential details. Destination is exclusively the existing independently verified owner Telegram pairing and configured existing bot.

`claimDailyVideoDigest` inserts a unique `(task_id,slot_utc)` execution before attempting a send; `telegramSendMessage` validates Telegram's real provider response for the exact recipient. On ambiguous success or delivery failure there is **no automatic retry**; receipt is terminal or remains claimed so a later tick cannot double-send. A result receipt proves provider acceptance, not that the user read the message.

Control Tower `/admin/automations` shows the task, its enabled state and historic run receipts. Owner may pause/resume only if the server flag is enabled. No schedule-only `run_now` button. The proposed `task_kind=report_delivery` is added to the existing private tasks check constraint; all other tasks and forced-RLS policies remain unchanged.

## Release and operator gates

1. Verify current protected production, existing Core, Specialist, Browser and `hh-merge-check`. No no-op workflow triggers or new paid runners.
2. Run `node --test tests/video-scout-automations.test.mjs tests/video-scout-quality-digest.test.mjs`, existing classifier and Council suites, JS syntax and TypeScript transpile checks; then production CI (including browser/DB).
3. Apply `sql/ai-council-video-digest-v2-20261106.sql` only after review; verify `enabled=false`, no public grants, existing RLS still forced and `hh_app_backend` has necessary privileges.
4. Verify a release SHA is deployed to `holistichouse.vercel.app`, not just merged to GitHub.
5. Enable `HH_VIDEO_SCOUT_DIGEST_ENABLED=true` in the **existing** Vercel Production project and deploy the reviewed build, then only if the existing Telegram bot and owner pairing are independently ready set the private task `enabled=true` through the owner dashboard. No new credential or new Telegram service.
6. At a real 15:17 UTC slot verify exactly one provider-accepted send and one durable DB run; do not claim live delivery before provider readback. If blocked, keep task OFF while the hourly Scout remains live.

## Rollback

Disable the private task (or set `HH_VIDEO_SCOUT_DIGEST_ENABLED=false` and redeploy) to stop future sends. No change to existing approved Video Vault assets. The quality guard can be reverted by a protected source change; historical research records are immutable and remain unapproved.
