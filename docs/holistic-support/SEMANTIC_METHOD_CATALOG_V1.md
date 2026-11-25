# Holistic House · Semantic Method Catalog V1

Owner requirement 2026-11-18: one canonical set of eight facets for tests, practices, video stories, koans, specialists and courses. Services/audio are compatible extensions. Wave Magic Director must rank by the meaning of the expressed request, rather than literal label matches.

## Canonical record contract

- id, kind, title, href, sourceRef: stable canonical identity from an existing published source.
- sourcePublished, rightsCleared, editorialReviewed, safetyApproved: all four must be TRUE from trusted source evidence. Missing/uncertain means not eligible.
- tags.problem: controlled problem/concern themes, not diagnoses.
- tags.goal: intended area of exploration, not efficacy claims.
- tags.state: voluntary expressed state, not inferred psychological traits.
- tags.language: ACTUAL media language, not only localized interface language.
- tags.durationMinutes: source-confirmed runtime or null. A requested maximum rejects unknown length.
- tags.depth: editorial depth 1/2/3 or null; never used as clinical severity.
- tags.cost: free, paid or unknown; unknown fees are not free or converted to EUR.
- tags.availability: available, booking_required, unverified or unavailable. Last two excluded. Booking-required does not mean a real-time free appointment slot.

## Matching and safety

1. Existing Dialog Director verifies urgency, locale, opt-in, refusal, authentication and private profile access.
2. Source adapters load ONLY previously reviewed public records. No independent user database, crawler or content invented by AI.
3. Multilingual canonical concept matching maps explicit words and chosen goals to editorial themes; related concepts (e.g. judgment fear → confidence → self support) enable cross-word retrieval. Entirely first-party rule-based, no OpenRouter or paid inference.
4. Apply strict publication, rights, language, runtime, depth, cost and availability filters. Assign a RELATIVE topical rank; no diagnosis, effectiveness prediction or clinical percentage.
5. Return up to two confirmed, pertinent choices. Do not pad with unrelated entries. Preserve already verified original IDs, titles, URLs and user choice.
6. Any unindexed content can only retain existing upstream-approved ordering, never become a new suggestion.

## Rollout / limits

- Integrated with server-approved axis offers and main authenticated Holistic Agent chat: tests, services, courses and published video choices. The original source registries remain authoritative.
- Shared adapter supports six explicitly requested content categories + service/audio. Backfill of every historical item needs reviewed source metadata; unverified legacy entries must not be auto-published or guessed.
- Telegram uses a separate intake: the shared pure matcher is reusable there, but this first release does not claim that every Telegram/CRM journey has been rewired or tested.
- Avoid unconfirmed availability, misleading language, private test exposure, hidden commercial triggers, data persistence, new cron, paid API or deployment.
- Run focused unit tests and existing mandatory CI. GitHub merge is NOT proof of production LIVE.
- Site-visible release: protected codex/public-book-library → existing hourly Vercel production batch → exact served SHA and functional smoke.

This first stage is an auditable content/semantic integration, not blanket editorial approval of the existing historical library.
