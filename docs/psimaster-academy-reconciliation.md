# PsiMaster → Holistic House Academy reconciliation

Date: 2026-10-05

## Scope

- Public PsiMaster service/taxonomy URLs discovered: **147**
- Curated source-backed Academy routes added: **22**
- Existing video-course families backfilled: **7 logical media records** (6 legacy course families + Energy Pump-Ups archive)
- Verified legacy public YouTube records: **45**
- New HeyGen renders: **0**
- Large MP4 files copied to GitHub: **0**

## Source policy

PsiMaster is a second historical Academy provenance source. It does not replace:
- the existing PsiTrends preservation corpus;
- the canonical Reiki Yggdrasil curriculum imported from `andylitvinov-design/reiki-yggdrasil`.

When a PsiMaster Yggdrasil term duplicates the canonical curriculum it is classified `DuplicateCanonical` rather than published as a second course.

## New Academy routes

The migration adds source-backed records for:
- High Wisdom of the Egyptian Gods
- Beauty & Power of Antiquity — Greece & Rome
- Scandinavian Runic Mysteries
- Slavic Fairy Tales & Mysteries
- Slavic Shamanism
- Maya & Aztec Mysteries — Feathered Serpent
- Western Magic & Major Arcana Mysteries
- Zoroastrianism & Eastern Magic
- Demiurges of Creation — Business Hypno-Coaching
- Big Figures
- Tantric Healing (historical)
- Kundalini Reiki (historical)
- Energy Massage (historical)
- Body Psychotherapy / Bodynamics (historical)
- Imagery Therapy & Symboldrama
- Imagery Therapy — Mirrorland
- Hypnotherapy & Past-Life Imagery
- Sexual Energy & Greek Love Archetypes
- Archetypal Therapy
- Circle of Eros (archive)
- Dreams in Dionysus (archive)
- Temple of Love / Dionysian Tantra (archive)

Old prices, Viber/Telegram registration blocks, medical/cure guarantees and guaranteed supernatural/business outcomes are removed or reframed as historical source language.

## Legacy video recovery

Recovered public YouTube media:
- Planetary Power: **11**
- Greek Mysteries — Demeter: **5**
- Strength & Protection: **7**
- Maya Archetypes: **6**
- Egypt — Osiris: **7**
- Mysteries of Dionysus: **7**
- Energy Pump-Ups / free marathon archive: **2**

The runtime uses the existing poster-first Academy YouTube player. No re-rendering or duplicate YouTube upload is required.

## Full taxonomy classification

`data/academy/psimaster-inventory.generated.json` records all **147** discovered public term IDs and assigns each one to:
- Academy
- AcademyVideo
- AcademySupplement
- DuplicateCanonical
- Library
- Services
- Archive
- SystemNavigation
- AcademyMissingBody

One current taxonomy label, **term 12434 — “Курс Гипнотерапия Отношений”**, exposes navigation chrome but no trustworthy public body text during this audit. It is preserved as `AcademyMissingBody` and is not given invented copy.

## Supporting manifests

- `data/academy/psimaster-sources.generated.json`
- `data/academy/psimaster-media.generated.json`
- `data/academy/psimaster-inventory.generated.json`
- `docs/psimaster-academy-source-manifest.csv`
- `docs/psimaster-academy-media-manifest.csv`

## Release rules

- No silent public re-upload.
- Reuse verified existing YouTube IDs.
- Google Drive remains canonical master storage only when an owned source master is available; Drive is not used as public playback.
- Existing public videos are embedded through the Academy player.
- Production is not considered complete until CI/browser checks pass and the live deployment is read back.
