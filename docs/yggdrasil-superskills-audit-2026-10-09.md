# SuperSkills → Holistic House: Reiki Yggdrasil source-completeness audit

Date: 2026-10-09
Scope: **17 distinct Reiki Yggdrasil / first-level initiation sources** from the navigation and connected product page at https://superskills.vip, not unrelated Tantra, Temple, generic book, or constellation site sections.
Target production source: `andylitvinov-design/books@codex/public-book-library`
Implementation PR: #285.

## Verified original source → implementation mapping

| # | Source on superskills.vip | What it covers | Holistic House placement |
|---|---|---|---|
| 1 | `/books/reiki/runic-reiki-yggdrasil-brief-description.html` | Master programme overview | `YggdrasilSourceStudyGuide` introduction and sources |
| 2 | `/books/reiki/runic-reiki-yggdrasil-brief-description/gift-runic-reiki-level-1-free-initiation.html` | Five-level outline and first-level entry | Source guide, five-level cards and free Level 1 article |
| 3 | `/books/reiki/runic-reiki-yggdrasil-brief-description/what-is-runic-reiki-detailed-overview.html` | Philosophy, origins, terminology | Source guide and required reading on free article |
| 4 | `/books/reiki/runic-reiki-yggdrasil-brief-description/retreat-1-details-basic-5-levels-of-initiation-into-runic-reiki.html` | Level 1 / Healing, Intuition, Protection, Situation Balancing | First level and required Level 1 reading |
| 5 | `/books/reiki/runic-reiki-yggdrasil-brief-description/runic-reiki-yggdrasil-level-2.html` | Level 2 / objects, money, cleansing, links | Second level overview and primary-source link |
| 6 | `/books/reiki/runic-reiki-yggdrasil-brief-description/runic-reiki-yggdrasil-level-3.html` | Level 3 / purpose, emotion, activation, power, sexuality, flight, intellect, karma | Third level overview and primary-source link |
| 7 | `/books/reiki/runic-reiki-yggdrasil-brief-description/runic-reiki-yggdrasil-level-4.html` | Level 4 / clairvoyance, previous lives, creating situations, knowledge | Fourth level overview and primary-source link |
| 8 | `/books/reiki/runic-reiki-yggdrasil-brief-description/runic-reiki-yggdrasil-level-5.html` | Level 5 / Connection with World, Connection with Gods | Fifth level overview and primary-source link |
| 9 | `/books/reiki/runic-reiki-yggdrasil-brief-description/runic-reiki-practice.html` | Practical assignments for levels 1–4 | Stage-by-stage adapted exercises and explicit full-source link |
| 10 | `/books/reiki/runic-reiki-yggdrasil-brief-description/questions-to-get-the-free-class-of-runic-reiki.html` | Post-first-initiation reading, practice and **seven checklist questions** | New free Level 1 article, after-initiation section, source library |
| 11 | `/shamanic-energy-healing-free-program/free-trial-runic-reiki-energy-healing-class.html` | Trial programme and beginner offer | Source library, archived offer reference |
| 12 | `/free-trial-runic-reiki-initiation-level-1.html` | Historical $0 product listing (do not assume checkout current) | Source library and free article historic-link footer |
| 13 | `/shamanic-energy-healing-free-program/free-trial-runic-reiki-energy-healing-class/faq-how-to-study-runic-reiki-yggdrasil.html` | Teacher-led initiation, pace, prior experience and study FAQ | FAQ adaptation, first-level required reading |
| 14 | `/shamanic-energy-healing-free-program/free-trial-runic-reiki-energy-healing-class/step-0-how-to-get-runic-reiki-initiation-free.html` | **Three ways to initiate and seven preparation questions** | New dedicated `/en|ru|es/academy/reiki/yggdrasil/free-initiation` |
| 15 | `/reiki/reiki-yggdrasil-levels-description.html` | Instructor training streams (6) | Instructor Course companion content and sources |
| 16 | `/shamanic-energy-healing-free-program/free-trial-runic-reiki-energy-healing-class/testimonials-1.html` | Historical student accounts, set one | Source library plus already-preserved testimonial section |
| 17 | `/shamanic-energy-healing-free-program/free-trial-runic-reiki-energy-healing-class/testimonials-2.html` | Historical student accounts, set two | Source library plus already-preserved testimonial section |

## Source checklist fidelity

Seven source questions checked against **both** entry article #14 and post-initiation reading article #10:

1. Reiki vs runes as foundation.
2. Historical author's comparative effectiveness claim vs classical Usui Reiki, presented as a *claim*, not a verified measurement.
3. Meaning of the World Tree Yggdrasil.
4. Healing stream and what the course means by it.
5. Protection stream and intended practice.
6. Money Stream Activation and claimed purpose.
7. Pantheons and gods introduced at the fifth level.

All 7 are present as distinct numbered questions on the new first-level article in English, Russian and Spanish. Both source pages are linked.

## Completeness and historical-version guardrails

- Current canonical Academy programme remains **seven modules, 37 steps, 177 attunements**; no modifications to that corpus or the current step/video bindings.
- Historical first-level source has **four** attunements. Old Level 2 overview describes five, Level 3 eight, Level 4 four and dedicated Level 5 article two. An old overall overview mentions additional Level 5 master-related titles: do not silently splice those into the current canonical syllabus.
- The exercises article details levels **1–4**. Fifth-level reflection tasks in the expanded guide are explicitly labelled *supplementary, not from the source*.
- Full original third-party articles are linked, not silently reproduced wholesale. Site adaptations are substantial thematic summaries, not verbatim source copies. Provenance is preserved on the new page and within the library.
- Claims about medical healing, diagnosis by aura, spectacular abilities, guaranteed income, comparative effectiveness, certification and historical prices/offers are framed as traditional/historical claims, not contemporary verified outcomes or contractual offers.
- Historical SuperSkills paid individual option mentions $50 and the product lists a $0 offer. No price/availability is advertised as a current Holistic House guarantee. The only live contact CTA is the existing direct WhatsApp/Telegram handoff; it sends nothing automatically.
- Existing books, historical archives, original testimonials, instructor curriculum and language-specific lesson videos are preserved.

## Navigation and routes

- Main Reiki Yggdrasil CTA now leads to **free-initiation**, rather than skipping the explanation and checklist.
- Course sidebar includes direct entry.
- Basic Course landing and the 38-page book both link to the preparation guide.
- Reusable free Level 1 capture links to the article without losing its WhatsApp request.
- Source study guide links to the article and all 17 source pages.
- Each new page has EN/RU/ES text, canonical metadata and hreflang via the existing Academy routing convention.

## Release acceptance required

- Run `node --test tests/yggdrasil-superskills-integration.test.mjs tests/yggdrasil-free-initiation.test.mjs`.
- Run repository unit, lint, typecheck, Next build, browser/mobile route checks on **exact PR head**.
- Verify Vercel Preview when the super10 build-rate-limit gate clears, merge to `codex/public-book-library`, then independently verify `https://holistichouse.vercel.app/{en,ru,es}/academy/reiki/yggdrasil/free-initiation` and main landing.
- Do not claim merged/live merely because a GitHub commit or PR was created.
