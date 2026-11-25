# HH Growth Studio — Evergreen repeat drafts (P2.2)

**Scope:** owner-only *draft generation*, not a social-media auto-publisher.

## User flow
1. In Growth Studio, open the **Posts / На согласование** list.
2. Choose a previously **Approved**, **Manual planned**, or provider-confirmed **Published** public editorial item.
3. Click **Prepare repeats / Подготовить повторы**, choose one of:
   - weekly,
   - every two weeks,
   - monthly.
4. Enter future first occurrence. The input uses the device time zone. The generated repetitions keep **America/Toronto local wall time** across daylight saving changes. Ambiguous repeated clocks (autumn 01:30) and nonexistent clocks (spring 02:30) are refused, never silently moved.
5. Choose 1–10 occurrences and confirm exact source/count/cadence/start. The owner-approved source is checked for **unchanged revision** in the server.
6. A durable Redis Lua transaction checks source revision **atomically** with all draft writes. A stale source, incomplete batch, duplicate IDs, capacity limit or storage failure causes **no partial write**. Retries carry one stable batch UUID.
7. Each new occurrence is a **separate new draft**, never approved, never put in the platform's publishing queue and never given a provider post ID. The owner must review and approve, then place it in the **manual** calendar or explicitly publish using a later approved provider connection.

## Engineering safety
- \`prepareEvergreenGrowthDrafts\` (server-only use) derives only whitelisted public fields; never copies original provider receipt, delivery state, secret or private-client references.
- \`createGrowthEvergreenDraftsAction\` calls \`requireAdminRequest\` before any read or write. Input is closed to \`sourceId, expectedRevision, batchId, cadence, count, startAt\`.
- \`store.batchCreateFromSource\` uses Redis \`EVAL\`, checking \`source.id\`, \`source.revision\`, \`source.status\` and all destination keys in one atomic operation. It rejects stale/edited/unapproved sources.
- Bounded to max 10 copies per confirmation and scheduled dates within ~370 days. First occurrence must be ≥1 hour ahead. Minimum cadence is weekly to avoid cheap repeat-post spam.
- No Vercel Cron changes, new environmental secrets, Metricool API calls, HeyGen credits, private health data or autonomous publishing.
- Covers Toronto DST fallback/gap, 31st-to-short-month, revision conflicts, idempotent retries, stale source and source publication receipt stripping.

## Release/acceptance
Run:
\`node --test tests/growth-studio-evergreen.test.mjs\`
\`node --test tests/growth-studio-editorial.test.mjs tests/growth-studio-evergreen.test.mjs\`
\`npm run build\`

Then verify exact PR commit and production branch, Vercel READY, iPhone/desktop interaction and owner Redis record reload. Until authenticated iPhone acceptance, **the code is not verified as fully operational to that user**.

This is an improvement in repeat *preparation*, **not yet Publer scheduled recurrence parity**, which requires official channel authorizations, a durable real provider scheduler and verified external receipts. The existing Publer subscription should remain active.

Related: [Growth Studio #1214](https://github.com/andylitvinov-design/books/issues/1214), [Publer parity audit](https://github.com/andylitvinov-design/books/blob/codex/public-book-library/docs/growth-studio/PUBLER_PARITY_AUDIT_2026-10-20.md).
