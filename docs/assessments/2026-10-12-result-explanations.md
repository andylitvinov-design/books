# Scale explanations and practical steps: bounded coverage audit

Candidate base: `575f87639fbecd4b503e899124ac5b24c2e37429` (canonical integration 2026-10-12 15:04 UTC). No production deployment is part of this change.

## Coverage and provenance

The active, rights-cleared, startable catalog at this base contains **109 keys and 232 dimension slots**. This does **not** mean 109 professional or independently validated instruments, nor 109 newly reviewed original manuals.

- 184 dimension slots receive explicit construct explanations in EN/RU plus calculations derived from the exact registered definition and actual response anchors.
- 48 existing specialized slots are preserved: Bach 38, MHC-SF 4, SCS-SF 1 and Compassion Scale 5.
- Every key retains practical steps. The first scale meaning and first step are now visible in Insights; each numeric report exposes its scale explanations, scoring and sources without opening a disclosure. Bach retains its bespoke expandable theme list.
- The machine-readable companion `2026-10-12-result-explanation-coverage.json` enumerates every key, version, content hash, dimensions, source status and category reference. It contains no participant responses or scores.

Source-review counts are **by catalog key**, not by independent publication:

| Status | Keys | Meaning |
| --- | ---: | --- |
| original-hh-definition | 67 | Original Holistic House questions and scoring, including the preserved Bach profile; authored reflection, no independent norms asserted. |
| original-form | 21 | Original IPIP keys/forms and CDC questionnaire documentation inspected. This does not imply individual norms or a clinical interpretation manual. |
| original-guidance | 15 | Original author/custodian scoring guidance inspected for the claims below. |
| research-source | 1 | ERQ construct and scoring checked against CMU research documentation. |
| original-publication-abstract | 2 | BRCS and CES-D author abstracts inspected; detailed mechanics come from the registered form. Full original interpretation text was not newly reviewed. |
| existing-instrument-specific-guidance | 3 | Existing guarded MHC-SF and compassion explanations preserved; this change does not re-certify their full source audits. |

The UI labels the prose as Holistic House paraphrase or original HH explanation, never a verbatim author interpretation. RU explanations of English instruments explicitly do not constitute validated Russian adaptations. Optional practical steps are Holistic House suggestions, not score-based treatment instructions from the instrument authors.

## Source ledger and limits

All links below were inspected on 2026-10-12. A source status records the narrow claims actually checked, not a blanket clinical validation.

- **CBI personal/work/client:** [NFA original scales and scoring, pages 1–2](https://nfa.dk/media/a4wheblj/cbi-scales.pdf). Constructs distinguish general prolonged physical and psychological exhaustion, exhaustion attributed to work, and exhaustion attributed to client-facing work. Item counts 6/7/6; 0/25/50/75/100 coding; means; last work item reversed; original minimum answered 3/4/3. Site completion is stricter, requiring all items. Only personal CBI has a uniform frequency scale, so only its mean is located between frequency response points. Work/client combine degree and frequency and must not inherit this mapping. No individual mild/moderate/severe cutoff was found in this original scoring sheet. The [NFA custodian page](https://nfa.dk/vaerktoejer/spoergeskemaer/spoergeskema-til-maaling-af-udbraendthed-cbi/copenhagen-burnout-inventory-cbi) allows commercial/noncommercial use with clear Borritz et al. (2006) PUMA citation, retained in the report. No diagnosis or percentage of burnout is inferred.
- **PHQ-2/4/8/9/15 and GAD-2/7:** [Spitzer/Williams/Kroenke instruction manual](https://case.edu/medicine/wellness-pathway/sites/default/files/2018-05/instructions.pdf), version/scoring tables and screening limits. Existing guarded screening categories remain. Author treatment tables are not automatically prescribed. PHQ-9's safety item is separate from total severity; PHQ-8 omits it.
- **K6/K10:** [Kessler author site](https://rckessler.scholars.harvard.edu/k10-and-k6-scales) and [scoring document](https://rckessler.scholars.harvard.edu/sites/g/files/omnuum8166/files/2026-03/Scoring_K6_K10.pdf). Registered 0–4 answers yield 0–24/0–40 totals. Alternate 1–5 scoring must not be mixed in. The existing K6 screening signal is not an individual diagnosis; no universal author missing-data rule is invented.
- **IPIP:** [Mini-IPIP key](https://ipip.ori.org/MiniIPIPKey.htm), [IPIP-50](https://ipip.ori.org/new_ipip-50-item-scale.htm), [BFAS aspect keys](https://ipip.ori.org/BFASKeys.htm), [IPIP VIA-R keys](https://ipip.ori.org/IPIP-VIA-R_Key.html). Constructs and keyed direction checked. Shared wording is used only for equivalent constructs across forms; scores remain form-specific. No percentiles or population norms inferred from possible ranges. Existing richer IPIP-50 trait guidance is preserved.
- **TIPI:** [Gosling author documentation](https://gosling.psy.utexas.edu/scales-weve-developed/ten-item-personality-measure-tipi/). Two-item means, reverse coding and limited precision of an ultra-short trait measure; not equivalent to a comprehensive personality assessment.
- **ERQ:** [CMU research documentation](https://www.cmu.edu/common-cold-project/measures-by-study/psychological-and-social-constructs/other-psychological-measures/emotion-regulation.html). Reappraisal and expressive suppression are separate habitual strategies, six/four items and means; neither strategy is assigned universally good/bad status.
- **RSES:** [University of Maryland Rosenberg guidance](https://socy.umd.edu/about-us/using-rosenberg-self-esteem-scale). Global self-esteem, ten items, five reversals, 0–30 scoring; higher means greater reported self-esteem. No norm inferred without an appropriate comparison population.
- **MSPSS:** [Zimet author site](https://gzimet.wixsite.com/mspss) and its [linked form/scoring guide](https://12fab08f-d2d3-ce70-6d1a-9d3fa0d8a67b.filesusr.com/ugd/5119f9_2f88fadcd382463daf5821e8af94a865.pdf). Family, friends and significant other each have four items; subscale means and total mean, with no established population norms. Suggested grouping is not added as a norm.
- **CDC Healthy Days:** [Original module documentation](https://archive.cdc.gov/www_cdc_gov/hrqol/hrqol14_measure.htm). Raw day counts, ordinal general health and calculated indices are explained separately. An ordinal category is not treated as a continuous percentage; unhealthy day counts can overlap. Index mechanics are stated from the unchanged registered scorer.
- **BRCS:** [Sinclair & Wallston original publication abstract](https://journals.sagepub.com/doi/10.1177/1073191103258144) supports the adaptive-coping construct and initial rheumatoid-arthritis samples, not a newly reviewed full manual. The separate existing [Johns Hopkins measurement reference](https://cih.jhu.edu/measurement/brief-resilient-coping-scale-brcs/) explicitly supplies 4–13/14–16/17–20 descriptive ranges. Both links are retained; the category reference is not replaced with the abstract. The UI notes the reference's adapted context and avoids calling these clinical thresholds or norms for the current user.
- **CES-D:** [Radloff original abstract](https://journals.sagepub.com/doi/abs/10.1177/014662167700100306) supports depressive-symptom measurement in the general population. The registered 20-item form supplies past-week wording, four reversals and 0–60 scoring. A different 10-item form was not substituted. Full original interpretation guidance remains unverified in this audit.

## Important findings

Three original HH composites (`hh-money-pressure`, `hh-overthinking-loop`, `hh-screen-saturation`) mix difficulty and coping items without reversal in their registered versions. Their existing definitions and scoring are not silently changed. The report explicitly explains the ambiguity; report and Insights gauges are neutral and improvement/worsening arrows are suppressed for those composites. Money-pressure steps concern clarifying a money question and seeking appropriate support, not workplace deadlines or a workplace diagnosis. A future corrected scoring version would require separate versioning/registration review.

Some HH titles suggest problems but actually score resources (approval pressure, perfectionism pressure, energy drains). The specific explanation follows the actual questions and registered direction, not the title.

New explanatory prose requires exact definition version, instrument locale, translation version, content hash, dimension shape and finite in-range score. A same-name incompatible historical result does not receive current-version wording.

## Change boundary and verification

Changed scope: report model, bilingual semantic content, shared report rendering, Insights, persisted interpretation schema/content/lookup, PDF, tests and this audit. Existing definitions/questions/scorers/hashes/registrations remain unchanged relative to integrated canonical 575f876. PR327 is superseded and is not resumed. Canonical methodology and four original typology questionnaires are preserved, including their explicit nonvalidated status. The new content table and its narrow existing-backend SELECT grant are prepared separately for coordinated release; no live application occurred.

Synthetic checks cover every active registered locale at answer endpoints/midpoint in EN/RU, 232-dimension coverage, distinct scale meanings, CBI arithmetic/anchors/reversal/source rules, misleading HH titles and mixed composites, exact provenance, category-source retention, and visible content outside closed disclosures. Existing MHC-SF, compassion, Bach and IPIP tests stay in the regression suite.

The new isolated browser script exercises CBI quick completion, saved report, visible explanation/source, EN/RU, Insights preview and full-report link, widths 320/390/1280, no overflow, and screenshot artifacts in both existing Chromium/WebKit CI jobs. It is guarded against non-loopback or non-isolated use. All fixtures are synthetic. Local React SSR was checked; local Chromium launch is blocked by this execution environment's Unix-socket restrictions, so a passing local visual/browser run is **not** claimed. Final CI status belongs to the exact PR head.
