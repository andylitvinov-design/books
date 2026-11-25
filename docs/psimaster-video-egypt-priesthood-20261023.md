# PsiMaster video preservation → Egyptian Priesthood first course
Date: 2026-10-23

## What the public source actually proves

The PsiMaster taxonomy index has 147 classified entries. The educational subset contains **76 entries**:
- 7 `AcademyVideo` native video-course source pages;
- 22 `Academy` source-backed historical programme pages;
- 17 `AcademySupplement` pages;
- 19 `DuplicateCanonical` pages (must not replace the canonical Yggdrasil course);
- 10 `Archive` pages;
- 1 `AcademyMissingBody` page (unrecoverable term 12434).

All **75 available educational pages** above were screened for source video links/iframes across the preceding reconciliation passes; the remaining item has no trustworthy recovered body. The other 71 taxonomy entries are Library (42), Services (24), and SystemNavigation (5) and must not be silently treated as course lessons. This is a *taxonomy-based public video audit*, not a proof of every video ever uploaded to YouTube or private storage.

### Previously verified seven video-course families

`psimaster-media.generated.json` contains **45 original source placements / 41 unique YouTube IDs**, retaining cross-course use where legitimate. All source iframe IDs and source ordering match the current record order:
Egypt Osiris 7; Greek Demeter 5; Dionysus 7; Maya Archetypes 6; Planetary Power 11; Strength & Protection 7; Energy Pump-Ups 2.

### Additional public educational videos and appropriate grouping

| Origin / taxonomy | Material found | Grouping decision |
| --- | --- | --- |
| Programme term **12308**, Emotional/Imagery Therapy “Mirrorland” | `EhQPjuyNCS4`, `m03fo3CW7Eo` | **Published to existing** `/academy/applied/imagery-therapy/mirrorland`; 2 source-ordered original introductions, no new course duplicate. |
| Programme term **12392**, Maya & Aztec | 6 IDs, all already in Maya Archetypes | Existing `/academy/videos/maya-archetypes`; no re-upload or duplicate. |
| Supplement term **12387**, Greek/Dionysian | 2 IDs, already present in `videos/greek-mysteries-dionysus` | Keep under Dionysus; no duplicate. |
| Programmes **12399**, supplement **12402** | `m9RfDgK76PU` = Anton’s hypnosis/coaching testimonial | Historical testimonial, not a lesson; do not number as a course step or assert outcome. |
| Supplement **12395** | `Nkl1ox3UJCs`, Scandinavian ritual presentation credited to Maria Kardi | Related to runic study, **third-party credit/review** required, not an Andrey masterclass. |
| Supplement **12416**, archive **12207** | `w3t5RUJ0RFM`, “Занятие 6. Ритуалы мистерий…” from a separate School of Ethnopsychologists | Do not merge into unrelated Andrey course without rights and authorship review. |
| Canonical duplicate **12182** | 25 historical Tarot/Sephirot programme video links, e.g. `HP9KquVqt24`, `EE92FqDEaM4` | Source relates to Yggdrasil Western Magic; verified example YouTube titles credit **Nikolai Zhuravlev**. These are *external source references*, not original Andrey videos. Do not rewrite/replace canonical `reiki/yggdrasil/western-magic`. |
| Canonical/legacy Reiki pages **12180/12192/12200/12202/12206/12210/12397/12415**, supplement **12382** | Additional historical Reiki level recordings and introductions, including Andrey’s `PiZhuunFpHU` and third-party Zhuravlev-linked sources | Canonical Yggdrasil curriculum must win. Individual authorship, duplicate IDs and real availability need reconciliation before public insertion. |
| Archive **12393** | Several archival media references | Keep as historical archive pending precise per-video title/rights review. |
| Egyptian “High Wisdom” term **12455** | Seven *text modules*: Osiris, Ma’at, Horus, Isis, Hathor/Tefnut, Thoth, Amun-Ra/Min-Ra | Reading programme only. **No invented video sequence for the six modules beyond Osiris.** |

### Egyptian Priesthood product — first implemented course

**Route:** `/{locale}/academy/egyptian-priesthood` and immersive `/{locale}/academy/egyptian-priesthood/learn` in EN/RU/ES.

- 7 verified **Osiris** source videos from PsiMaster term **12472**, in their exact order and with original RU titles.
- **51 one-idea-per-screen screens** = 1 welcome + 7 × (intro, source-backed idea, original video, gentle minute practice, reflection question, transfer step, milestone) + 1 conclusion. Structure, pale-turquoise scenic visuals, short prompts, progress rail, fixed next/back CTA and original video poster-first behavior follow the existing Reiki Practitioner pattern.
- The additional ideas are **editorial learning prompts**, not invented transcripts of any of the 7 videos. Context is grounded in the author’s preserved term **12455** and existing Egyptian stage in Temple Studies.
- Source videos stream through the existing YouTube poster/player and are **not uploaded, rendered or duplicated**.
- The final screen links to the real seven-module *historical text* programme, transparently separating modules with and without source videos.
- Full 320–430px flow aims at one thought per viewport with scrollable inner text card and visible bottom CTA.
- Browser-only progress stores slide ID, completed days and manually marked video IDs; **personal reflections never enter browser storage, CRM, cookies, messenger or URL**. These local marks **are not My Courses private server progress**, and are not represented as such.
- No medical claims, religious/priesthood credentials, provider fees, Google-sign-in bypass, or private content exposed.

## Release gates

Focused tests: `node --test tests/egyptian-priesthood-course.test.mjs tests/academy-discovery-hero.test.mjs tests/academy-migration.test.mjs tests/academy-psimaster-video-sequence.test.mjs`.
Build: Vercel Next.js compile + typecheck/lint + production READY. Read back main Academy button and both Egyptian routes on RU/EN/ES; verify 7 video IDs in client data and initial video placeholder; test actual interactive mobile navigation and YouTube playback separately.

**Residual:** Fully external YouTube watch-page playback and all 75 non-video-course supplemental/link cases cannot be treated as proven until owner/rights review and browser E2E. Do not close parent #136 based on this first Egyptian course.
