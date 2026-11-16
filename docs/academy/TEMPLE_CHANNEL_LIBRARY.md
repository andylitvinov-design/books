# Temple Channel Attunements — Holistic House · v1.0 (2026-11-04)

## Where it appears

The new catalog is embedded **inside the existing Temple Studies page**:
`/{ru|en|es}/academy/temple-studies#temple-attunements`.

Do not fork a second mystery course or mix the card catalog into book summaries, Dao koans or homeopathic remedy records. The same visual language and search/filter interaction are reused but the semantic type is specifically **one authored attunement per card**.

## Data model

Canonical source: `data/academy/temple-channel-attunements.json`, `schemaVersion: 1`.

- `traditions[]`: tradition ID and RU/EN/ES display name (Greek, Egyptian, Roman, Norse, Maya, Daoist).
- `channels[]`: tradition ID, independent deity/channel ID, RU/EN/ES names and search aliases. A channel is not a card: **one channel -> many cards**.
- `attunements[]`: stable unique ID, tradition + channel keys, localized title, `place.city`, `place.site` (optional), `place.country`, `place.type` (museum/temple/archaeological_site/city), verbatim Russian `text`, `originalLanguage`, `source.archiveId`, `source.messageId`, `source.publishedAt`, and `photos[]`.
- Each `photos[]` entry includes a *local, served* JPEG `src`, the real `sourceFile` from the original export and the exact `sourceMessageId` that contains the media. This lets us audit photos posted in adjacent Telegram messages belonging to one post.
- `editorialNote` is for caution when archaeological attribution or photograph shooting location is uncertain. No inferred exact temple claim.

**Card route:** Cards have stable DOM IDs, for example `#greek-zeus-nemea-2026`. The user chooses tradition and channel, searches across title/aliases/locations/text, and expands full poems. Several settings of Zeus remain separate, even when the source Telegram message includes two poems.

**Public-facing translation:** UI and metadata in RU/EN/ES. Original author text remains in its original language; never generate or attribute translated verses as author originals.

## Verified imports in the initial seed

16 distinct Russian texts, 8 published Greek channels and 18 corresponding photographs, extracted from three author AATA Telegram HTML archives (2021, 2024, 2026), restored from Google Drive. The first image is a verified photo from the post or its contiguous media album. For album posts, the exact media message ID is persisted separately. Greek channels seeded: Zeus, Apollo, Dionysus, Aphrodite, Demeter, Hermes, Helios, Tyche.

Example archival lineage:
- Zeus Antalya: `messages.html` #437, 2021-11-16, photograph #437.
- Zeus Kaunos: `messages.html` #509, 2021-12-13, album photograph messages #505–506; the author notes a Zeus/Apollo attribution ambiguity.
- Zeus Pergamon: `messages.html` #509, 2021-12-13, album photograph #507; picture may depict a museum installation, not necessarily a photo taken at Pergamon.
- Zeus Olympieion Athens: `messages3.html` #2854, 2026-06-24, photo #2854; text says the author was outside the temple enclosure.
- Zeus Nemea: `messages3.html` #2864, 2026-06-28, photo #2867.
- Apollo Corinth: `messages3.html` #2873, 2026-06-30, photo #2874.
- Aphrodite Side: `messages2.html` #1829 / #1832, 2024-05-09; original photos linked to #1829 / #1833.

**No synthesized or reauthored poems, no unverified medical/energetic effects or historical assertions.** Empty Egyptian, Roman, Norse, Maya and Daoist categories are intentional — ready for future verified imports, not fabricated content. New sources can include author's original audio/video in a future schema version if their metadata and publication rights are confirmed.

## How to add a new setting without editing React

1. Confirm the source text is an original attunement and capture the exact source archive/file/message IDs and publication date. Distinguish *date of publication* from *date the setting was actually created*.
2. Select a tradition/channel key, or add a localized entry under `traditions[]` / `channels[]`.
3. Create a separate `attunements[]` object for each actual poem/variant. Preserve text exactly. Store site and city only if stated or verified, or leave optional site null.
4. Upload the matching source photograph as a local JPEG under `public/images/temple-channels/`, retain `sourceFile` and `sourceMessageId`. Do **not** hotlink private Drive image URLs, guess unrelated stock imagery, or embed photos of participants without proper release.
5. Run `node --test tests/temple-channel-attunements.test.mjs`, plus existing TypeScript/Next.js checks. Publish by normal ONE_PUBLISH PR procedure; prevent repeated CI waves.
6. Add audio/video fields only when separately validated, media is authorized, and the UI genuinely supports playback.

## Operations & ownership

- Production target branch: `codex/public-book-library`; change via PR and exact-HEAD CI gates, not direct prod writes.
- Existing Temple Studies and initiation chooser remain independent; do not alter ritual safety/consent behavior.
- Card filter UI: `components/temple-channel-library.tsx`; styles `components/temple-channel-library.module.css`.
- Data seed test: `tests/temple-channel-attunements.test.mjs`.
