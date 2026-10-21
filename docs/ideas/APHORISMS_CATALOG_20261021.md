# Ideas aphorism catalog · 2026-10-21

Tracking: [#1457](https://github.com/andylitvinov-design/books/issues/1457), builds on [#1451](https://github.com/andylitvinov-design/books/issues/1451).

## Scope and content ethics

- `data/ideas-aphorisms.json` is the reviewed **single editable source** for 142 entries / 16 themes, each with EN, RU and ES editorial wording and multilingual search keywords.
- Exactly 16 items are tagged `inspired`. They are new **paraphrases/interpretations**, **not verbatim historical quotations**. Display a named source link and "Inspired by / По мотивам / Inspirado en". Never quote or attribute this wording directly to a thinker.
- There are 112 original Holistic House editorial aphorisms. No material copied from unlicensed commercial quote aggregators. Direct historical translations from newer copyrighted editions are intentionally excluded.
- Public-domain reading sources were identified using Project Gutenberg and related published historical editions; the source `url` points to the underlying work, not an exact passage. A source link is for context, not proof of a literal quote.
- Do not add unverifiable internet memes, copyrighted modern quotations or invented attributions. Editorial EN/RU/ES rewrites may vary in wording while preserving meaning.
- Editorial reviews and source attribution are mandatory before increasing or replacing the catalog.

## Classical reading sources

- [Laozi · Tao Te Ching (James Legge)](https://www.gutenberg.org/ebooks/216)
- [Epictetus · The Enchiridion (George Long)](https://www.gutenberg.org/ebooks/10661)
- [Marcus Aurelius · Meditations (George Long)](https://www.gutenberg.org/ebooks/6920)
- [Dhammapada (F. Max Müller)](https://www.gutenberg.org/ebooks/2017)
- [Seneca · Moral Letters to Lucilius](https://senecaletters.com/en/about)
- [Emerson · Essays, First Series](https://www.gutenberg.org/ebooks/2944)
- [Thoreau · Walden](https://www.gutenberg.org/ebooks/205)
- [Montaigne · Essays (Charles Cotton)](https://www.gutenberg.org/ebooks/3600)
- [Kahlil Gibran · The Prophet](https://www.gutenberg.org/ebooks/58585)

## Historical multilingual traditional proverbs · 2026-10-21

- Added **14 documented folk proverbs**, exactly two per original language: French `fr`, Italian `it`, German `de`, Dutch `nl`, Spanish `es`, Portuguese `pt`, Danish `da`. Total **142** website entries; existing 128 IDs/texts remain unchanged.
- Verified the historical **1857** original printed wording in [Henry G. Bohn (compiler), *A Polyglot of Foreign Proverbs*](https://www.gutenberg.org/files/51090/51090-h/51090-h.htm). The printer/editor compiled traditional proverbs; **do not claim he personally authored them**. It is historical folk wisdom of uncertain individual origin; not verified as unique to any one nation.
- Each proverb carries stable `id`, `kind: proverb`, multilingual `keywords`, all three `text_ru`/`text_en`/`text_es` editorial **sense translations**, `original_text` (historical orthography), `original_language`, collection `source_id`, `source_locator`, `translation_method` and `source_license`. Historical 1857 collection is public domain in the United States. Any new translations are authored for Holistic House; none copied from more recent copyrighted books.
- `lib/ideas-guidance.mjs` translates the **source-label and language name** appropriately for RU/EN/ES; React displays a linked historical source plus the original text beneath every proverb. Original wordings and URLs are not changed by language switching. This keeps folk proverbs distinct from editorial pieces and inspired classical paraphrases.
- Migration `supabase/migrations/20261021162000_hh_ideas_proverbs_sources.sql` adds nullable original-provenance columns, expands the existing kind check to `proverb` and upserts **only** these 14 rows. Current RLS/privileges remain **SELECT published only** for public roles; no extra browser fetch, question storage, or new separate database. Source JSON is still the website serving snapshot: do not change only the DB.
- Do not mark a source verified merely because a random quote website repeats a line. Store direct URL, original-language wording and a precise section/book locator. A traditional proverb has no named individual author unless a primary source substantiates one. Check cross-language semantic duplicates as well as normalized text.
- Before each new batch, check live production branch/commit and prior reviewed PRs; no hourly Next/Vercel deployments, paid LLMs, scraping bursts or publication of uncertain rights. Future research should log accepted/rejected candidates and publish reviewed batches, not speculative placeholders. **An hourly ChatGPT task requires a free scheduling slot (15-task limit reached on 2026-10-21).**

## Runtime and database

- `lib/ideas-guidance.mjs` imports the compact published JSON snapshot into the client bundle and matches the text **inside the browser only**; no user question is persisted or sent to an API. No paid AI, embeddings, telemetry, cookies, CRM writes, or search URL params.
- `getIdeasAphorismMatches(question, locale, broadTopic)` scores specific intent, broad theme and lexical clues, then uses a stable deterministic tie-breaker; all pages consume one stable, unique-ID order.
- UI initially shows 3; each tap shows 3 **additional** entries from the same ranked list; the button disappears on exhaustion. A new question resets to the first 3. The public service and I Ching modes remain untouched.
- **Question language first (2026-10-21):** detect the language of the visitor's text locally and use RU/EN/ES for result aphorisms, headings, source labels, notes, Taoist interpretations and personal guidance copy, even when the public page is open in another language. The question form/navigation stay in the chosen site locale. Cyrillic resolves to Russian; Latin to English unless the question contains recognizable Spanish clues. Empty/punctuation-only input falls back to the page locale.
- **Explicit provenance under every aphorism:** editorial sayings are labeled “Source: Holistic House editorial · original aphorism” (translated), and original paraphrases are labeled “Source · inspired by” with linked author and work. Russian/Spanish author names and book titles are presentation translations of the historical source records; source URLs and DB provenance stay unchanged. The text is *not* presented as a verbatim classical quote.
- **Visual polish:** 320–430px-friendly compact Georgia quotation text, ivory bordered editorial slips, subdued petrol numbered badges and distinct source lines. The 3-at-a-time control retains its focus state, without large empty spacers.
- The matching content is also copied into `public.hh_ideas_aphorisms` in Supabase by `supabase/migrations/20261021125100_hh_public_ideas_aphorisms.sql`. RLS permits `anon` and `authenticated` **SELECT of published rows only**; INSERT, UPDATE and DELETE have no public grants. There are no customer texts or personal records in this table.
- **The JSON snapshot is currently the website's serving source**; updating the Supabase table alone does not automatically update browser results. When changing entries, regenerate/review the SQL seed and redeploy the JSON so both copies stay in sync. Do not claim the UI is live-editable from Supabase.
- Both sources must have identical IDs, texts and tags; verify counts (142 total, 112 editorial, 16 inspired, 14 sourced proverbs, 16 themes, all languages) and RLS permissions.
- Existing #1451 still requires actual mobile browser E2E and complete form handoff proof; READY/build alone is insufficient.

## Focused QA

```sh
node --test tests/ideas-guidance.test.mjs tests/ideas-aphorisms-catalog.test.mjs
npx tsc --noEmit
npx eslint components/ideas-discovery.tsx lib/ideas-guidance.mjs tests/ideas-aphorisms-catalog.test.mjs
npm run build
```

Confirm real browser behavior on iPhone widths 320/375/390/430 and EN/RU/ES. Confirm the 3-button mobile toolbar stays readable and "3 more" has keyboard focus. Never send public question text through the service forms until the visitor independently submits a consented form.
