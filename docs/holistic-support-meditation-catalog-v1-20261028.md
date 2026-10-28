# Holistic House — Meditation discovery catalog v1 (2026-10-28)

## Status / scope
- **Catalog database exists in Supabase project `holistichouse`**: `public.hh_meditation_catalog_v1` (31 records, all `candidate`) and `public.hh_meditation_facets_v1` (62 localized filters).
- 11 owner/legacy source-backed recordings + 20 third-party YouTube research candidates: EN 17, RU 11, ES 3.
- **Discovery phase enabled 28 Oct:** exactly **five external videos** are publicly readable as explicitly labelled **link-only** YouTube recommendations (never embedded), after title/channel metadata checks; 15 other external candidates stay private, and 11 historic owner records remain staged in this table. Anonymous RLS smoke: five link-only rows, 62 filter options. Five external YouTube destinations are not verified to play as inline iframe.
- Existing 11 owner source IDs are loaded from verified `englishGuidedMeditations` + `freeMeditationVideos("ru")` and used for legacy click-to-play only. Never approve unreviewed archive records by merely copying IDs.
- Reuse `freeMeditationVideos(locale)` and `HolisticMeditationGallery` for the existing published owner playlists. The new table is a curation/relevance layer and must NOT silently override those sources.
- All third-party inline **embeds** still require content/playback/embeddability/licensing checks. Five verified-title videos are link-only: user opens original YouTube page; no third-party iframe, copy, downloading or reupload. For owner source-backed videos the original click-to-play privacy-enhanced YouTube player remains available.
- No health, test or emotional responses sent to YouTube, analytics pixels, CRM or external messengers. Visitor filters remain local-only.

## Files and provenance
- `data/academy/meditation-catalog-candidates-20261028.json`: 31 unique YouTube IDs, original title/channel, audio language, metadata provenance, user situations, desired outcomes, methods, estimated duration and warnings.
- `data/academy/meditation-filter-facets-20261028.json`: 62 choices under eight facets, all with EN/RU/ES labels.
- `supabase/migrations/20261028092000_hh_meditation_catalog_v1.sql`: schema, GIN indexes, SELECT-only grants and RLS.
- `supabase/migrations/20261028092100_hh_meditation_catalog_seed_v1.sql`: immutable candidate-only, ON CONFLICT DO NOTHING seed.
- `lib/holistic-support/meditation-catalog-ranker.mjs`: local-only deterministic matching.
- `tests/meditation-catalog-candidates.test.mjs`: source, gates and recommendation consistency.

## Filter matrix
| Dimension | Purpose | Examples |
| --- | --- | --- |
| Main goal | What user wants to work on | Money / income; energy; relationships; goals; meaning |
| Concrete situation | Why user is searching | Financial worries; uncertain income; difficult decisions; low focus; sleep difficulty; self-criticism |
| Desired state | What experience is sought | Calm; focus; confidence; reflection; gratitude; connection; hope |
| Technique | What happens in the practice | Breath awareness; body scan; yoga nidra; visualization; loving-kindness; affirmations; symbolic energywork |
| Original audio language | Strict discovery boundary | en, ru, es; NEVER infer dubbed audio from UI locale |
| Duration | Confirmed actual runtime or title hint | 5, 10, 15, 20, 30 minutes; unknown if unchecked |
| Time and posture | Usage context | Morning, day, evening, bedtime; sitting/lying |
| Personal preference | Intensity, spirituality, music, guide | Beginner; secular/open/Reiki; voice-only/music/unknown |
| Source and QA | Publish safety | Owner vs third party, source title, creator, evidence, embed availability, reviewed date, risks |

**Duration correctness:** title says “10 minutes” does NOT prove runtime is <= 10:00. Strict duration filter uses `duration_verified_seconds`, not title hints; preview may show hints only as explicitly unverified.

**No fake medical relevance:** situation tags are manual topical recommendations, not diagnosis or treatment; income improvement, fertility, health or other outcomes are NOT promised.

## Matching and example outcomes
Match in stages: (1) **audio_language hard filter**, (2) public editorial/rights/embed gate, (3) duration/accessibility/safety constraints, (4) exact goal and scenario relevance, (5) desired outcome and preferred technique, (6) transparent score + reason. Show 3-5 high-relevance practices; if nothing exact, show clearly labelled related content (not a fake 100% match). Put more weight on user's explicit request than broad tags. Avoid indiscriminate "all topics" labels.

Examples from new third-party research:
- **Money → worried about finances → calm**, English: [Great Meditation: Guided Meditation when Stressing over Money](https://www.youtube.com/watch?v=fWfG5gXHK5Y) and [The Honest Guys: Guided Meditation for Money Worries](https://www.youtube.com/watch?v=8Cx-cTU1Y9k).
- **Goals → focus → 10-minute title**, English: [Great Meditation: 10 Minute Focus Guided Meditation](https://www.youtube.com/watch?v=x6dYoegBt7I).
- **Stress → body scan → lying down**, English: [Ally Boothroyd: 20 minute yoga nidra](https://www.youtube.com/watch?v=9r8jXUvsi3w).
- **Relationships → self-compassion → mindfulness**, English: [Tara Brach: Embodying Loving Awareness](https://www.youtube.com/watch?v=qbPE5zaiNqs).
- **Stress → body scan → Russian**, [MEDITARI: Сканирование тела](https://www.youtube.com/watch?v=okYUCEsHQCk).
- **Uncertainty → calm → Spanish**, [Meditación guiada CALMA](https://www.youtube.com/watch?v=EpMXNJiFOt4).

## Public release gates (NOT passed)
1. Editorially verify real title, creator/channel and **is actually a guided meditation**; exclude promotional webinars/lectures and unverifiable archive recordings. Grade safe content and risk (health and money “cure” claims, panic/trauma cues, binaural sounds, spiritual framing). Check full content manually.
2. Verify real duration from player metadata, original audio language and captions. Check actual embed enabled, no age/geographic restrictions, no error 153 (Referrer), and iPhone Safari/Chrome playback on real site. Keep `youtube-nocookie.com`, click-to-play, no autoplay. See [official YouTube embedding help](https://support.google.com/youtube/answer/171780).
3. Set `content_checked_at`, `embed_status='confirmed'`, `rights_status='embed_approved'` only after checks. Database CHECK prevents a candidate from being marked `approved` while gates are missing.
4. Integrate only the verified public DB results into existing `HolisticMeditationGallery` and goal filter; no new navigation, no duplicated playlists; EN/RU/ES/320–430px; include graceful no-results UI and fallback YouTube links.
5. Run `node --test tests/meditation-catalog-candidates.test.mjs`, targeted lint, typecheck, relevant React UI tests, GitHub CI, Vercel READY SHA/domain, real mobile click-to-play. Do not merge QA-pending candidates as a public selection.

## Known limitations
- 31 source IDs are distinct, but only **metadata-level** research is complete. Precise runtime, transcription, geo-availability, playback and embedding are not confirmed.
- Historical archive items marked `content_type='unknown'` are deliberately excluded from the matching engine until independently classified.
- No YouTube API key purchased, no content downloaded, no paid render, no analytics of individual visitor concerns.
- Local matching module is staged and not yet wired to the live HolisticMeditationGallery.

## Implementation release update — 2026-10-28

- Page integration: `app/[locale]/holistic-support/page.tsx` asynchronously loads public RLS metadata using `loadMeditationDiscovery` and passes it to the **existing** `HolisticMeditationGallery`. No new public menu entry or duplicate gallery.
- The new `HolisticMeditationFinder` appears when a visitor chooses **Find a meditation for me**. It filters client-side across five sectors, situation, desired state, practice, audio-language, creator, time of day, style and approximate duration; shows match explanations. No user selections or scores are sent to CRM, pixels or Supabase.
- The approved owner videos continue in the native no-autoplay player. Externally sourced candidate videos are **metadata-only link recommendations** and always open at the original YouTube page; currently five link-only external records approved by RLS (not endorsed for in-site playback). Hidden candidates remain hidden.
- SQL migration `20261028100500_hh_meditation_link_discovery_v1.sql` was independently applied to production Supabase on 2026-10-28, alongside the two pre-existing seed/schema migrations. RLS check with `set local role anon` returned **exactly five** named external records.
- Independent Vercel Sandbox on the exact PR sources (sandbox `hh-meditation-2391-qa`, stopped after verification) passed **19/19 targeted tests, ESLint 0 warnings/errors, `tsc --noEmit` no errors** after fixes. GitHub Actions targeted CI remained queued at that point; do not mislabel full CI green.
- Deployment, canonical alias and real Safari/Chromium clicks require separate verification **after** squash merge. A successful GitHub merge is not proof of live playback.

The remaining 15 external candidates must pass manual content, embedding and audio/duration QA before promotion. If YouTube forbids embedding or transcription is unavailable, retain `link_only` or `private_review` respectively.


## 28 October 2026 — verified YouTube discovery expansion & browser E2E

The external catalog was re-audited against **YouTube's official public oEmbed API**:
- All **20 of 20** external IDs returned HTTP 200 plus a real title and author/channel. This proves public video metadata is available, **not** full-content approval, true audio language, accurate running time, permission to embed, or successful audio playback.
- Supabase migration `20261028112000_hh_meditation_oembed_verified_links.sql` sets `youtube_oembed_checked_at` for the 20 and makes exactly **19 low/moderate-risk external items visible as metadata-only `link_only`**. The high-risk claim candidate `beqlbgNtwSk` remains private.
- Public RLS query under `SET LOCAL ROLE anon`: **19 visible**, **0 high-risk visible**, **0 unverified visible** (28 Oct 2026). Metadata-only links open the **original creator's YouTube page**; external iframes remain disabled.
- Application checks an oEmbed timestamp **in addition to RLS and existing source checks** before presenting a third-party recommendation. This is a separate defense-in-depth safeguard.
- Live browser Chromium 390px EN: clicked picker, switched goal to money, submitted, received 3 relevant links, no horizontal overflow or browser JS errors (2026-10-28). A CI Chromium/WebKit 320/375/390/430 EN/RU/ES journey script was added to the existing meditation workflow to cover the remaining responsive interactions.

**Important:** Click-to-play for the published teacher's original videos remains supported. Actual YouTube iframe audio/video decoding on physical iPhone is not asserted until real device playback is observed. The provider's official YouTube link is retained as fallback. See YouTube embedding guidance: https://support.google.com/youtube/answer/171780.
