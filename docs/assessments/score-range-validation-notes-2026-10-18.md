# Holistic House — precision review of scored ranges (18 October 2026)

## Scope and scientific-status boundary
This release improves **explanations of already scored, provenance-verified results**, not psychometric validation. It does **not** change questionnaire questions, response keys, reverse coding, immutable result hashes, clinical cutoffs, protected instruments, database migrations or client records.

A technically correct score is not evidence of an independently validated questionnaire, translation, target-population norm or effective intervention. The 73 original Holistic House reflection/monitoring instruments must remain labelled **author-created, non-diagnostic, not independently validated**. A research-backed form must be assessed per exact version and language; favourable evidence from a longer form or another population is not automatically transferable.

## Source-exact band definitions retained

| Instrument / dimension | Mathematical bounds (inclusive) | Meaning and release rule |
|---|---|---|
| PHQ-2 mood screening | 0–2 / 3–6 | Above/below published follow-up threshold 3; not a diagnosis |
| GAD-2 anxiety screening | 0–2 / 3–6 | Above/below published follow-up threshold 3; not a diagnosis |
| PHQ-4 combined distress | 0–2 / 3–5 / 6–8 / 9–12 | Four published distress bands; interpret two 0–6 subscales separately |
| PHQ-4 mood and anxiety subscales | each 0–2 / 3–6 | Two-item follow-up threshold 3; do not diagnose |
| PHQ-9 nine symptoms | 0–4 / 5–9 / 10–14 / 15–19 / 20–27 | Five published severity bands; independently respect PHQ-9 item-9 safety handling |
| PHQ-8 eight symptoms | 0–4 / 5–9 / 10–14 / 15–19 / 20–24 | Five-band reporting convention; CDC 2020 surveillance also legitimately groups 15–24 into one severe category. PHQ-8 does NOT contain PHQ-9 item 9 |
| GAD-7 anxiety | 0–4 / 5–9 / 10–14 / 15–21 | Published severity bands; clinical follow-up commonly considered from 10 |
| K6 non-specific distress | 0–12 / 13–24 | The 13 cutoff was developed in epidemiological/particular populations; never a personal probability |
| PHQ-15 somatic symptoms | 0–4 / 5–9 / 10–14 / 15–30 | Symptom burden only; does not determine causes, medical workup or a psychogenic explanation |
| BRCS resilient coping | 4–13 / 14–16 / 17–20 | Published **descriptive reference ranges** for 4 responses scored 1–5, NOT a clinical screening or fixed personal ability |
| ASRS-v1.1 6Q | 0–3 / 4–6 qualifying responses | Classic shaded-box **count**, not a continuous symptom-severity measure; only its exact pinned original and scorer qualify |

Only `interpretationBandModel` is authorised to assign the bounds to a valid scored, versioned assessment. The new `published-range-commentary.js` adds bilingual, source- and band-specific explanations **after** this check; it must not become a second scorer.

### Primary or authoritative references

- PHQ-4 scoring and missing-answer rules: OECD 2025 subjective well-being guidelines, https://www.oecd.org/en/publications/oecd-guidelines-on-measuring-subjective-well-being-2025-update_9203632a-en/full-report/core-and-extended-survey-modules_37f842ef.html
- PHQ-9 five ranges: CDC NCHS, https://www.cdc.gov/nchs/products/databriefs/db172.htm
- PHQ-8 surveillance 4 bands: CDC 2020, https://www.cdc.gov/nchs/products/databriefs/db379.htm
- PHQ-8 optional five-band coding: CDC NHIS 2019 survey description, https://ftp.cdc.gov/pub/Health_Statistics/NCHS/Dataset_Documentation/NHIS/2019/srvydesc-508.pdf
- GAD-7 severity and cutoff: original validation, https://doi.org/10.1001/archinte.166.10.1092
- K6 population screening 13 and limits: https://pmc.ncbi.nlm.nih.gov/articles/PMC3659799/
- PHQ-15 four reference categories: https://bmjopen.bmj.com/content/15/1/e083276
- BRCS exact response and reference range: https://cih.jhu.edu/measurement/brief-resilient-coping-scale-brcs/
- RSES deliberately has **no universal self-esteem severity cutoff**: University of Maryland official FAQ, https://socy.umd.edu/about-us/rosenberg-scale-faq
- Original ASRS shaded-count guidance and rights: https://license.tov.med.nyu.edu/product/asrs6Qscreener

## Quality and safety gates

1. All 37 supported published band codes have nonempty, distinct, construct-appropriate EN/RU explanations; source boundaries are not changed.
2. Numeric boundary and neighbouring scores select exactly one band; unverified/invalid/out-of-range results have no reassuring report interpretation.
3. BRCS displays reference-range wording rather than clinical screening wording. An elevated resource score does not guarantee functioning, treatment outcomes or safety.
4. PHQ-8 cannot be interpreted as a suicide-risk screen; PHQ-9 item-9 safety is handled separately, independently of the total.
5. There are no invented low/medium/high medical categories for RSES, ERQ, CBI, MSPSS, original HH, trait measures, or CFPB lookup values. Editorial five-position diagrams are explicitly *not norms*; equally spaced score positions cannot be treated as validated thresholds.
6. Exact instrument language, population, version and timing must accompany source-score interpretation. Translated report text does not validate an unreviewed questionnaire translation.
7. Full CI and isolated browser/DB/PDF QA should pass before calling the release finished. Production Vercel must report READY for the exact merge commit; real public and signed-in routes require readback where available.

## Outstanding professional review (cannot be completed by changing copy)
- Written independent psychometric/clinical review of measurement content, construct coverage, exact-form reliability, validity, local population and language versions of all 72 published-method candidates.
- Original Holistic House instruments require independently designed validation studies with consent before using phrases like 'validated clinical assessment', diagnostic percentiles or norms. They may still offer carefully described self-reflection.
- ERQ commercial-rights scope and separate professional licences remain unresolved under #342.
- Verify whether digital exports and UI show all limitations without misidentifying self-report as health status.
