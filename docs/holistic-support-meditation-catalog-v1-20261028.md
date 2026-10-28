# Holistic House — Meditation discovery catalog v1 (2026-10-28)

## Status / scope
- **Catalog database exists in Supabase project `holistichouse`**: `public.hh_meditation_catalog_v1` (31 records, all `candidate`) and `public.hh_meditation_facets_v1` (62 localized filters).
- 11 owner/legacy source-backed recordings + 20 third-party YouTube research candidates: EN 17, RU 11, ES 3.
- **ZERO candidate videos are publicly readable**. Anonymous RLS smoke: videos=0, facet options=62. No site UI or live playback claim.
- Reuse `freeMeditationVideos(locale)` and `HolisticMeditationGallery` for the existing published owner playlists. The new table is a curation/relevance layer and must NOT silently override those sources.
- All third-party videos require content/playback/embeddability/licensing checks. **Public YouTube video is not downloadable or reuploadable**. Official privacy-enhanced YouTube player only after user click, with creator credit + fallback YouTube URL.
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
