# Kundalini Reiki — first-party source and user-uploaded manual audit
Updated: 2026-10-11

## Scope
Holistic House: \`/en|ru|es/academy/reiki/kundalini-reiki\`, from
\`andylitvinov-design/books\`, production branch \`codex/public-book-library\`.

**Editorial rule from Andrey:** All visitor-facing substantive content is based on his existing authored pages at PsiMaster, SuperSkills and PsiTrends, plus the **exact** manual uploaded for this task. No model-originated course descriptions, generic sales copy, substitute PDF or mixed-in Yggdrasil/Tantra content. UI/action labels, faithful translations and a brief safety caveat are necessary exceptions, not supplementary curriculum.

## Original manual and immutable file verification

Uploaded document identifies itself as **Kundalini Reiki Manual — Paul Crick**. The user-supplied original PDF is unchanged, not rewritten or synthesized.

- Original bytes: **243,352**
- SHA-256: \`dd28184c0199ceb947295dc2ef407fbc3e818375bb533928e0b721528355f18b\`
- Pages: **24**
- Public static path: \`public/academy/kundalini-reiki/kundalini-reiki-manual-paul-crick.pdf\`
- Git blob SHA: \`b6444bc9b38aaf9f1979036fc181e14e758a4fba\`
- PDF original preserved in canonical delivery; all language versions use this **English-language** uploaded PDF.
- Compatibility route \`/api/academy/reiki-guide?course=kundalini&locale=en|ru|es\` serves these exact bytes after SHA-256/length validation. Tantra/Yggdrasil generated guides retain their own behaviour.
- Old assistant-written \`public/academy/course-guides/kundalini.{en,ru,es}.txt\` removed. Any attempt to call the guide builder for Kundalini throws intentionally.

Three schematic drawings are directly cropped from the original document, without adding stock or AI visuals:
1. \`kundalini-manual-level-1.jpg\` from PDF p. 6 (manual printed p. 5)
2. \`kundalini-manual-level-2.jpg\` from PDF p. 9 (manual printed p. 8)
3. \`kundalini-manual-level-3.jpg\` from PDF p. 11 (manual printed p. 10)

The split hero uses the **original PsiMaster photograph**
\`https://psimaster.net/sites/default/files/kundalini%20reiki_1.jpg\`
proxied by the site's Next image optimizer (\`next.config.ts\` remote pattern).

## Source-to-section reconciliation

| Source | Primary material actually used on landing |
|---|---|
| [PsiMaster — original Russian Kundalini course](https://psimaster.net/service?shs_term_node_tid_depth=12345) | Russian hero and level quotations; original Gassho, daily self-practice, ethics/consent quote; Level 2 Balance hand gesture; Level 3 names and Master attunement |
| [SuperSkills — Kundalini Reiki Free Class](https://superskills.vip/trial-express-programs/academy-overview/master-of-kundalini-reiki.html) | English hero source quotation distinguishing Kundalini from traditional Usui Reiki, three-level attunement model |
| [SuperSkills — Reiki marathon](https://superskills.vip/trial-express-programs/academy-overview.html) | Identifies Kundalini, Tantra Reiki, Yggdrasil as distinct programs; archived promotional pricing not presented as current |
| [SuperSkills — Vedic & Tantric index](https://superskills.vip/shamanicacademy/vedic-tantric-magic.html) | Confirms Kundalini Reiki is an independent three-level elective; not the separate Kundalini Awakening course |
| [PsiTrends — Shamanic Reiki School](https://psitrends.com/studies/adv/reiki) | Original teaching components: reading, video, partner practice, meditation and report |
| **User-uploaded Paul Crick PDF (24 pages)** | Level 1 (p. 5); Level 2 and meditation (pp. 8–9); Master / Level 3 (pp. 10–16); traditional six supplementary systems and Balance (pp. 10–13); boosters (pp. 16–17); Gold Reiki 1–3 (p. 18); Ethereal Crystals 1–6 (pp. 19–23); original historical attribution |

The landing has **no offsite links to archive websites**. Source provenance remains tracked in \`data/academy/kundalini-reiki-course.ts\` and concise source labels appear beside quotes; all visible text is part of Holistic House. The original manual itself is offered both for browser reading and actual downloadable PDF; buttons refer to the **identical static local file**.

**Source variance**: PsiMaster puts short “Баланс” procedure under Kundalini Level 2; Paul Crick manual lists “Balance” with the Master-related extra attunements. The landing retains an independent “Balance” source-based block with both attributions rather than choosing an invented canonical level.

## Layout changes aligned with Reiki Yggdrasil

- Hero splits source-led editorial text and an actual PsiMaster Kundalini photograph.
- Three large photographic/illustrated level modules with image, short **quoted** source text and one expandable original-practice detail section.
- Balance and daily recommendations in separate clear panels.
- Six supplementary named practices/Gold Reiki/Ethereal Crystals available in expandable sections without front-page clutter.
- Original PDF with simple book-cover representation, explicit author and 24-page count, downloadable original.
- EN/RU/ES route support; for non-original-language copy, only faithful translations and UI labels are used.
- WhatsApp messages explicitly say Kundalini Reiki and the exact type of request. Teacher contact appears only at the bottom.
- Original Yggdrasil and Tantra Reiki layouts/data untouched.

## Editorial/health boundary

Source references to DNA, past life, birth trauma, energy flow, health, “300 times stronger”, etc. are historical names and subjective beliefs **not medically or scientifically established treatments or guarantees**. Some non-provable original quotations are attributed as quotes; the public site adds a short caution that Reiki is not a substitute for healthcare. No dosage, prescription or medical advice appears. Historical fees and promotional “free classes” are not presented as current.

## QA gate

- [x] Sources researched and reconciled
- [x] Exact PDF original (SHA-256), static-site file, legacy API compatibility
- [x] Exact source schematic images and source photo
- [x] Separate EN/RU/ES landing and Reiki catalog preservation
- [x] Automated tests authored for PDF checksum, content/source, no unrelated art, and routes
- [ ] Full GitHub Actions unit/lint/typecheck/build/browser checks (report via PR after run)
- [ ] Production deployment READY and public browser smoke-test (check before stating LIVE)
