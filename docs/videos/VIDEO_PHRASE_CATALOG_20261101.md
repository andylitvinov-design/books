# Holistic House Video Studio · Phrase Catalog v1

**Implementation:** 2026-11-01. **Source branch:** `feat/video-phrase-catalog-goal-tree-20261101` (stacked on #2949). **LIVE:** unverified — never confuse successful database migration with production deployment.

## Canonical tree

Use #2949 as the single authoritative 5 × 6 × 4 category/topic/scenario tree. Do not create another parallel topic taxonomy.

`goal/category → topic → scenario → idea → tone × address × length → three texts`

| Dimension | Values |
| --- | --- |
| Category | 5: Тело, Дело, Энергия, Любовь, Стресс |
| Topic | 6 per category, 30 total; IDs inherited from #2949 |
| Scenario | 4 per topic, 120 total; IDs inherited from #2949 |
| Idea | 4 semantic ideas per scenario, IDs `{scenarioId}-i{1..4}` |
| Language | `ru`, `en`, `es` |
| Tone | `gentle`, `confident`, `grounded`, `inspiring` |
| Address | `self` (Я/I/Yo) / `support` (Ты/You/Tú) |
| Length | `short` (one sentence) / `extended` (two sentences) |
| Variant | Three distinct copy alternatives per exact selection |

**Total:** 5 categories, 30 topics, 120 scenarios, 480 ideas × 3 locales × 4 tones × 2 addresses × 2 lengths × 3 variants = **69,120 materialized editorial records**.

For language and editorial nuance, topic actions are reviewed in one multilingual JSON file: `data/video-catalog/video-phrase-actions-v1.json`. Tone/address/closing fragments are in `data/video-catalog/video-phrase-templates-v1.json`. The deterministic generator `lib/mandala/video-phrase-catalog.mjs` unifies them with #2949's scenario IDs. There is no AI call, prompt or external API needed to show ready-made strings. Four ideas are **topic-specific**; every story receives four action ideas with story-scoped stable IDs and story-specific arc endings. The ideas are not claimed to be four completely new therapeutic approaches for each of the 120 scenarios. The distinct scenario title and visually associated idea are pulled from #2949. This deliberately avoids hallucinating separate medical effects or four fully unique clinical interventions for every story.

## Live database already populated

The additive SQL in `sql/hh-video-phrase-catalog-v1-20261101.sql` and follow-up `sql/hh-video-phrase-tone-copy-revision-v1-20261101.sql` were applied through Supabase to existing **holistichouse** project `shervdixkaxurnaecioe`. PostgreSQL table: `public.hh_video_phrase_catalog_v1`.

Verified query outputs on 2026-11-01:
- `COUNT(*) = 69120`; distinct 5 categories / 30 topics / 120 scenarios / 480 ideas / 3 locales.
- Policy uses RLS and only SELECT grant to `anon` and `authenticated`. Neither has INSERT/UPDATE rights.
- Composite index `hh_video_phrase_filter_v1_idx` supports `scenario_id,locale,idea_id,tone,speaker,phrase_length,variant`. A sample indexed `EXPLAIN ANALYZE` returned three records with ~0.1 ms SQL execution, **not** a promise of end-to-end user latency.
- No visitor prompt, health result, contact details, user ID, private voice or generated video is stored in this table.
- Extra tone-quality sweep: earlier gentle/confident copy contained 5,760 duplicated rows when switching tone. The additive `refine_hh_video_phrase_tone_overlap_v1` data migration corrected those six localized overlaps. **Verified: 69,120 distinct phrases within their own scenario/locale, zero duplicate groups for a given scenario + idea + locale + speaker + length.** Original schema seed and the follow-up patch are both committed so fresh databases and existing databases converge on the same editorial copy.

Query sample:

```sql
select id, phrase_text
from public.hh_video_phrase_catalog_v1
where scenario_id='love-trust-s1'
  and locale='ru'
  and idea_id='love-trust-s1-i1'
  and tone='gentle'
  and speaker='self'
  and phrase_length='short'
order by variant;
```

## Scenario-aware editorial refinement

On 2026-11-01, the follow-up `sql/hh-video-phrase-story-arc-copy-v1-20261101.sql`
was applied to the same live Supabase table. The 4 scenarios within a topic
now have a different editorial tag *in the phrase text itself*: journey
(«шаг за шагом»), shelter («без спешки»), awakening («с новым интересом»)
and connection («в своём ритме»), with corresponding EN/ES grammatical
versions. The four idea titles within each scenario reflect its arc. This
retains fixed IDs; a theme switch cannot silently select a different person's
text.

Verified from the real database after the update: 69,120 rows,
480 scenario-specific ideas (1,440 language-scoped idea selectors), all
69,120 phrase texts distinct within scenario + locale, no repeated
tone variant, maximum 105 Unicode characters. Runtime word wrapping
handles the longer sentence without truncation.

Manual category/topic/scenario/idea selection is kept on tone, address,
length and locale changes; only changing the *underlying video request/theme*
offers a fresh automatic recommendation. This avoids clobbering user input
when the site language changes.

## Compatibility with production mobile Phrases PR #2971

The independently published #2971 added a single large mobile `MandalaHypnoCompact` editor with custom idea/phrase selection and real voice/music choices. The full 69,120-entry tree now appears in an **optional, collapsed catalog inside that same editor**, before its existing voice and music panels. This preserves the short first-time path, the approved one-column phrase UI, exactly one microphone/audio form and the actual export/preview state. The old hardcoded quick phrase rail is removed. Selecting a catalog phrase writes to the same canonical `AffirmationSettings`; no parallel video editor is mounted.

## Application path

- **Client:** `MandalaPhraseCatalog` mounted once inside existing `mandala-free-video-studio.tsx` in the **phrases** workspace, replacing the previous `quickSupportPhrases[locale][theme]` hardcoded list. One large **Audio guide / music / voice** button calls the **existing** video-audio editor. No duplicate music picker, microphone, media renderer, or public page.
- **Immediate render:** the read-only generator displays three selectable options synchronously in React; changing tone/address/length never requires a network/AI request.
- **Remote refresh:** `GET /api/holistic-support/video-phrases?scenarioId=...&locale=...` fetches the 192 public phrases for that scenario/locale from Supabase with a publishable key, checks that all expected IDs and texts are valid, and supplies a prefetched dictionary for future filter switches. If unavailable or invalid, the bundled copy remains visible without error.
- **Selection:** one chosen phrase writes to the existing `AffirmationSettings.custom`; it is wrapped on word boundaries for existing Canvas overlays (at most 36 characters per visual line), never truncated mid-word. Existing video exports/voice workflows remain separate and must be independently verified before LIVE claim.
- **Localization:** all controls and all phrases support RU/EN/ES; changing locale preserves the semantically selected scenario and idea IDs.
- **Security:** no service-role key in client or public API. Input scenario and locale validated against the taxonomy, no arbitrary query, no public write permissions, React text rendering rather than HTML injection.

## Merge & acceptance

1. Land canonical taxonomy #2949 in `codex/public-book-library` after its required CI; this PR is stacked on that source branch, **not** the default repo branch `codex/bootstrap-books`.
2. Rebase / source-preserving reconcile against UX repair #2938 and chat PR #2913 before production. Preserve the approved one-screen mobile design, existing workspace tabs, single audio CTA and video player. This PR does not overwrite #2938's revised styles.
3. Validate `node --test tests/mandala-video-goal-taxonomy.test.mjs tests/mandala-video-phrase-catalog.test.mjs`; check TypeScript/lint/Next build, then mobile WebKit navigation and phrase insertion in RU/EN/ES.
4. Protected production merge only after exact-head Core and specialist gates; verify Vercel READY production SHA and a real browser path. Don't claim the new phrases are currently LIVE from database success alone.

### Editorial & safety notes

All copy offers ordinary non-clinical encouragement and options, not automatic cures, efficacy promises, subconscious manipulation or unreviewed medical advice. Long text is constrained by the existing video overlay. If editing or importing new lines in the future, use the same ID, safe length and approval checks and maintain the offline fallback or a catalog-version migration.
