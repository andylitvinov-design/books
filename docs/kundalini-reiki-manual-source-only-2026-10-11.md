# Kundalini Reiki — original-source-only landing and PDF release audit

Date: 2026-10-11
Page: `/[en|ru|es]/academy/reiki/kundalini-reiki`
Target branch: `codex/public-book-library`.

## Scope

The earlier editorially invented lesson/benefit language has been replaced with short direct extracts from the requested owner's websites and passages from the exact PDF provided in chat. Russian extracts are from PsiMaster; English extracts are primarily the original English manual and SuperSkills. Spanish is a faithful translation of these passages; no new course stages have been invented.

- PsiMaster: `https://psimaster.net/service?shs_term_node_tid_depth=12345` — Level 1–3, Gassho, personal practice, Balance, Master and additional attunements.
- SuperSkills: `https://superskills.vip/trial-express-programs/academy-overview/master-of-kundalini-reiki.html` — original Kundalini Reiki explanation and three-attunement scope.
- SuperSkills: `https://superskills.vip/trial-express-programs/academy-overview.html` and `https://superskills.vip/shamanicacademy/vedic-tantric-magic.html` — Kundalini as its own system, separate from Tantra and Yggdrasil.
- PsiTrends: `https://psitrends.com/studies/adv/reiki` — study structure (video, reading, partner practice, meditation, report).
- Chat-uploaded `Kundalini Reiki Manual` attributed to **Paul Crick** — 24 pages, with original author attribution, diagram pages and all deeper chapters.

## Original PDF is not reconstructed

Exact asset: `public/academy/kundalini-reiki/kundalini-reiki-manual-paul-crick.pdf`

- Bytes: **243352**
- SHA-256: **dd28184c0199ceb947295dc2ef407fbc3e818375bb533928e0b721528355f18b**
- Git blob SHA: **b6444bc9b38aaf9f1979036fc181e14e758a4fba**
- Internal URL: `/academy/kundalini-reiki/kundalini-reiki-manual-paul-crick.pdf`
- Website hero and course book block link to the exact static asset.
- Compatibility endpoint `/api/academy/reiki-guide?course=kundalini&locale=en|ru|es` sends these same bytes after an SHA-256 integrity check. **No PDF generator is used for Kundalini**.
- Old assistant-generated Kundalini guide `.txt` files are not part of this release.

## Manual chapters preserved

The PDF table of contents (p. 1 of the manual / second PDF page) includes:
1. Kundalini Reiki 1–3, healing, distance work and meditations.
2. Diamond, Crystalline, DNA, birth trauma, location and past-life Reiki, and Balance.
3. Kundalini Reiki Boosters (six additional attunements).
4. Gold Reiki 1–3.
5. Ethereal Crystals 1–6, lists of gemstones, and working with chakra imagery.

These are presented as historical spiritual course terms, not as evidence of proven medical effects. The original full text and tables remain inside the uploaded PDF without redactions or reformatting. Personal/health statements are attributed to the sources and there is a separate short caution.

**Source conflict deliberately preserved:** PsiMaster places the Balance instruction within Level 2; Paul Crick places it in the Master/Level 3 chapter (manual p. 13). The landing labels both rather than silently rewriting one source.

## Design

- Editorial split hero with **three original diagrams cropped from the user-provided PDF** (PDF pages 6, 9 and 11). No unrelated Yggdrasil images, stock images or remote hotlinks.
- Three mobile-friendly course cards with click-to-expand source passages.
- Distinct sections for Balance, original first recommendations, the six Master additions, and the three extension paths.
- PDF book block displays original title and author, with download and open options.
- Training/in-person initiation WhatsApp actions identify Kundalini specifically; no automatic registration.
- EN/RU/ES URLs and language-specific UI retained; PDF remains the same English original.
- No links back to PsiMaster, SuperSkills or PsiTrends appear in the published landing's body.

## Release gates

- [x] PDF binary SHA and size verified against user-uploaded file.
- [x] Git repository binary blob verified (not a generated PDF).
- [x] Three diagram crops from the actual manual stored locally.
- [x] Prior marketing-sounding generated course paragraphs removed from visible landing data.
- [x] Regression tests updated for exact PDF and source-only design.
- [ ] GitHub Actions results on the PR.
- [ ] Preview Vercel state and mobile/desktop browser smoke tests.
- [ ] Production merge, deployment and readback.
