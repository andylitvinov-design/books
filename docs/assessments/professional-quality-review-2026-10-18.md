# Professional-quality audit: in progress

17 October 2026, 20:59 America/Toronto. Owner-requested professional-quality review.

Inventory: 145 active instrument keys; 73 Holistic House author-created reflections/monitoring tools and 72 published-instrument candidates. Exact versions exist for all 145. Catalogue rightsStatus=cleared is a declaration, not independent evidence. No client records were read. The attached ledger has no blanket professional-validity pass.

Acceptance gates: exact primary source and web-use permission; intended construct/population/purpose; reliability and validity evidence for the exact form and language; item/response/reversal/missing-answer rules; attainable score range; justified source thresholds or explicitly descriptive intervals; complete construct-specific explanations and proportionate recommendations; synthetic boundary, invalid-input, EN/RU, accessibility, mobile and historical-version checks.

Passing software tests or improving report prose does not validate a psychological instrument. Author reflections must remain labelled non-diagnostic and unvalidated. Translation does not automatically inherit evidence from the original language. An empirical validation study would require a separate design and consent and is not being conducted here. Recommendations must not diagnose, prescribe treatment or infer treatment efficacy from a self-report score.

Primary references reread:
- https://www.testingstandards.net/
- https://www.testingstandards.net/uploads/7/6/6/4/76643089/9780935302356.pdf
- https://www.intestcom.org/page/15
- https://www.intestcom.org/files/guideline_test_adaptation_2ed.pdf
- https://ipip.ori.org/newPermission.htm
- https://ipip.ori.org/IPIPImplementationsAroundTheWeb.htm

Technical release is separate: all 1,380 immutable interpretation rows are present in production (460 v1, 460 v2, 460 v3). All 460 v3 payloads and 230 technical definitions matched; historical 920-row hashes remained unchanged. Native PostgreSQL 17.11 and 33,100 finite score/locale comparisons passed. PR #773: prior head 65d1a9e passed 4,932 local tests and TypeScript; current reconciliation and browser acceptance are still in progress. Merge and live runtime acceptance remain pending. Exact methodological review of all published instruments is still in progress.

## Confirmed correction
CBI work/client scales combine degree and frequency anchors. Their mean cannot be relabelled simply rarely/often. Neutral editorial position labels replace those words; source items, scoring, and caveats remain unchanged. Six EN/RU subscale regression cases pass. Source: https://nfa.dk/media/a4wheblj/cbi-scales.pdf . Commit: https://github.com/andylitvinov-design/books/commit/65d1a9e7955f94b4c977168ef3dbbfea1cb0c72e . Not yet live.

## Unresolved evidence, not alleged infringements
ERQ: CMU explicitly describes public-domain availability; Stanford's current resources page explicitly mentions academic research use. Reconcile original form and relevant scope before an unrestricted-commercial-use certification. Sources: https://www.cmu.edu/common-cold-project/measures-by-study/psychological-and-social-constructs/other-psychological-measures/emotion-regulation.html and https://spl.stanford.edu/resources .
BRCS: publisher appendix with author permission states public domain but prints a 0–4 response scale. That reproduction cannot validate the original 1–5 / 4–20 thresholds. Compare the original 2004 form; do not change scoring based on a secondary reproduction. Source: https://www.springerpub.com/media/springer-downloads/Simmons_PTR_Ancillary.pdf .
UMD RSES page timed out; NCBI CES-D table returned a browser-check page. These reads do not confirm or disprove the existing rights declarations. No access checks were bypassed.

## Exact IPIP item/key comparison, 18 October 2026 01:34 UTC
All 45 active IPIP-family forms (28 VIA-R and 17 other forms including Mini-IPIP) matched current official-source question text and key polarity, after typographic quote/whitespace normalization. This comparison is narrower than scale validation: independent factor composition, reliability estimates for the exact short forms, target population and local norm applicability remain under review. The complete 96-item VIA-R profile and its standalone components are overlapping forms, not independent validation studies.
Sources: https://ipip.ori.org/IPIP-VIA-R_Key.html ; https://ipip.ori.org/IPIP-VIA-R-core-strengths_Key.html ; https://ipip.ori.org/newSingleConstructsKey.htm ; https://ipip.ori.org/newEmotionalIntelligenceKey.htm ; https://ipip.ori.org/BFASKeys.htm ; https://www.ipip.ori.org/MiniIPIPKey.htm ; https://ipip.ori.org/new_ipip-50-item-scale.htm .

PHQ/GAD source-family rights statement rechecked: https://www.pfizer.com/news/press-release/press-release-detail/pfizer_to_offer_free_public_access_to_mental_health_assessment_tools_to_improve_diagnosis_and_patient_care . This does not independently certify every translated form or local use.

Recommendation safety triage: 27 unique English action strings mentioning diagnosis, treatment, harm, trauma, prescriptions or absolute terms were manually reviewed. They contained referral/limitations, consent safeguards or descriptive guidance rather than prescribing medication or declaring diagnoses. This limited keyword screen is not a complete clinical review of every narrative.

CFPB: all 84 cells of the abbreviated age/administration-mode lookup match the official scorecard. MSPSS: all four source item memberships and mean ranges match; the author explicitly says established population norms are unavailable. Sources: https://files.consumerfinance.gov/f/documents/bcfp_fin-well-being_short-scorecard.pdf and https://gzimet.wixsite.com/mspss .

## Separate portrait mapping audit — read-only reproduction
Current source inspection confirms the findings already tracked in [issue #900](https://github.com/andylitvinov-design/books/issues/900): 32 explicit dimension mappings cover 11 of 17 displayed axes. Embodiment, focus, intimacy, boundaries, sexual wellbeing and emotional regulation cannot currently be filled by this builder. Three mappings also differ from the scale guide: state.tension, resource.support and resources.monthly.support. These are product interpretation gaps, not missing questionnaire answers. Do not invent values or convert unrelated screening counts/non-normative traits into ability scores. The existing issue scopes larger mapping/display/growth changes to audit/design pending owner approval; this PR does not implement that separate redesign. No saved client result was read or changed.


## Additional source verification, 18 October 2026 02:33 UTC

RSES: the exact ten-item order and five negative items in this implementation match the [PhenX 180901 protocol](https://www.phenxtoolkit.org/protocols/view/180901?origin=browse). All 40 item-response scoring cells agree with its 0–30 convention. The protocol explicitly allows use without permission. This resolves the key-order question; it does not certify local population norms, a translated version, or clinical cutoffs. The [NLSY79 scoring documentation](https://www.nlsinfo.org/content/cohorts/nlsy79/other-documentation/codebook-supplement/nlsy79-appendix-25-center) independently corroborates that ordering and polarity. UMD direct retrieval remained unavailable.

Portrait audit #900: the owner approved mapping/label corrections and raw-score display in the conversation on 18 October at 02:39 UTC. PR902 was independently confirmed merged and deployed at commit a7984236390c0d91bf8cd19d3a1cbd203745a935. Its implementation is retained rather than replaced by a duplicate. Technical integration verification continues; this is not psychometric certification.
