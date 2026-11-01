# Holistic House — Model of client axes → video / courses / services / tests (v1)
**28 October 2026 · source-only concept + isolated pure ranker. NOT integrated into live pages, Supabase or CRM.**

Related issues: [#2480](https://github.com/andylitvinov-design/books/issues/2480) video taxonomy; [#1881](https://github.com/andylitvinov-design/books/issues/1881) unified Profile; [#338](https://github.com/andylitvinov-design/books/issues/338) My Development Path; [#1223](https://github.com/andylitvinov-design/books/issues/1223) measurement validity. Do not duplicate existing My Tests, Profile, Insights, Academy, Meditation Finder or media database.

## 1. What exists; what is missing
- Holistic meditation discovery: 31 source candidates, 62 localised filters across 8 facets, and a deterministic intent ranker. Last recorded status was 19 metadata-reviewed third-party link-only records, NOT approved embedded content or iPhone sound QA. Recheck live DB before implementation.
- One unified private Profile: 4 root life spheres, not 5: business, relationships, energy_health, personal_growth. Existing goal/meaning is within personal_growth.
- 10 profile research topics and 34 source-backed presentation facets (31 within old 4 areas plus 3 supporting goal facets). Source of truth is lib/profile/profile-scale-selection.js; goal support source maps are in lib/profile/goal-profile.js. The 17 existing psych-portrait rays are a DIFFERENT display layer, not 34 new psychometric scores.
- Four evidence layers: stable traits/values, current state, life context, confirmed development goals. Source-scored tests are not interchangeable with the visitor's 1–10 sliders or self-rated current→desired gap.
- Missing edge: human-reviewed CONTENT TARGET → exact topic::facet and desired interaction (relieve/develop/reinforce/explore), then explanation of the evidence and client-selected priorities.

## 2. Client matching table (private UI only)
| Field | Example, illustrative (never actual private client data) | Important source guard |
| --- | --- | --- |
| Area / topic | relationships / connection | canonical 4-area aliases |
| Axis | connection::boundaries | allowed research facet from current registry |
| Test source | definitionKey + dimensionKey + version | registered exact source and rights, not the video topic |
| Observed score | 2 / 0–4 | immutable completed result and instrument language |
| Above/below | below source-specific reference | NEVER use arbitrary 50% as a population norm |
| Direction | higher_resource / higher_load / descriptive | low descriptive trait ≠ weakness |
| Date / trust | saved result ID, date, evidence freshness | no measurement bonus for stale/unverified data |
| Chosen goal | improve boundaries | explicitly selected/editable by client |
| Current → desired | 2→8 on self-rated 0–10 | voluntary goal gap, NOT clinical scale |
| Content context | audio language, duration, sensitivity, modality | never infer translated audio from interface locale |
| Content output | canonical video/course/service/test ID | no duplicate media; no raw results in URL |

A source may supply one of: true published, instrument-specific normative reference; named instrument band (not necessarily a population average); version-compatible within-person change; or NO reference. Never merge score levels across two tests, editions, directions or languages. Contradictory source interpretations must withhold automatic rank boosts; uncertain results show “not assessed / source uncertain”. Goal-specific clarity/motivation/confidence remain voluntary self-ratings; their listed supporting tests do NOT directly measure the user's specific chosen goal.

## 3. Expanded content classification (editorial metadata, 30+ useful matching positions)
| Layer | Positions |
| --- | --- |
| Identity/provenance | canonical media ID; provider+YouTube ID; content owner; public link; rights; source; reviewed date; publication version |
| Topic/axes | one or more life spheres; 10 profile topics; exact topic::facet targets; target effect; editor weight 1–3; client situation; desired state |
| Practice | video type: soft_meditation / energy_boost_practice / explanation / course_lesson; approaches: psychological / temple / magical / reiki_energy / optional somatic; conditional temple tradition (Egyptian/Greek/Maya/Aztec/Northern etc); actual practice technique |
| Accessibility | original audio language EN/RU/ES; captions; verified runtime; time of day; posture; intensity; beginner/advanced; accessibility/sensory flags; guide voice; music; spiritual preference |
| Safety/approval | actual audio/content check; source and embedding permission; link_only vs approved embed; no health/income promises; age/consent; sensitive sexual topics explicit opt-in; warnings |
| Product links | real existing course/lesson ID; service offering ID; free vs paid; format; published provider status; public next-step CTA; request ≠ booking ≠ payment |

One media ID can appear in several spheres without cloning files. Content is not typed automatically by YouTube vs owner upload. Existing provider+video_id dedup and #2480 owner publication gates apply. Do not auto-publish prototype crosswalk tags to existing public videos: each target requires human review.

## 4. Axis offer matrix
The [34-row CSV](../../data/holistic-support/axis-offer-crosswalk-v1.csv) covers every canonical axis/topic in source order. Its 12 columns include exact facet_ref, canonical root sphere, topic, existing scorer presentation axis, polarity/reference policy, proposed editorial intent, video type, approach, course theme, service theme, sensitive-opt-in flag, and status **editorial_proposal_not_published**.

| Sphere | Topic/axis families | Appropriate content family (examples, NOT currently verified inventory items) |
| --- | --- | --- |
| Energy/health | emotions (stress, anxiety, mood, regulation), recovery (sleep, energy), body (awareness, body energy) | gentle meditations; grounding; rest; awareness; anti-stress skills |
| Relationships | connection (social contact, intimacy, boundaries, sexual wellbeing, descriptive traits) | connection; communication; consent and boundaries; sensitive themes require opt-in |
| Business/money | work (focus, clarity, functioning, workload, working style), money (financial wellbeing, money pressure, financial coping) | focus lessons; decisions; financial stress reflection; no income promises |
| Personal growth | traits (7 descriptive facets), support (resources, self-support), meaning; goal (clarity, motivation, confidence as supporting facets) | self-reflection; strengths; values; goal planning, not personality “correction” |

## 5. Five-component rank; no false personal health percentage
The pure [ranker](../../lib/holistic-support/axis-offer-ranker.mjs) returns an ADVISORY sorting score between 0 and 100:
| Component | Weight | Meaning |
| --- | ---: | --- |
| Client EXPLICITLY selected axis/topic/area | 45 | exact axis outweighs broad topical similarity |
| Consent-based source VERIFIED axis | 25 | only source-specific directional above/below with compatible content effect |
| Self-rated current→desired gap | 15 | separate from test score; magnitudes calculated only within the self-rating's own interval |
| Preferred format | 10 | video vs lesson vs service vs questionnaire |
| Free accessible entry point | 5 | modest free-first boost, no auto paid upsell |
| **Total** | **100** | CONTENT RELEVANCE, NOT probability of benefit, clinical score, or sales propensity |

Hard gates BEFORE any rank: public/published offer, rights cleared, editorial/safety review, original audio language, eligible availability/verified duration, opt-in for paid suggestions and protected facets. Never claim high relevance for an unpublished video, an unsourced score, a foreign audio track, or an invalid service.

Explanations: goal_and_measured_axis / goal_axis / measured_axis / topic / life_area. The private view may show matchedAxes: [{facetRef, selected, measurement: {value,min,max,band,referenceKind,definitionKey,dimensionKey,definitionVersion,instrumentLocale,measuredAt,resultId}, selfGoal, contentEffect}]. Other users, guest pages, external providers and analytics MUST NOT receive those measurements.

## 6. Route and scoped implementation plan
1. **This PR: source-only P0.** Pure deterministic matcher, 34 proposed editorial crosswalk rows, isolated Node tests; no private DB access, migrations, public UI, paid calls, media publication or new user scoring.
2. **P1 after schema review:** attach reviewed target facet relationships to the EXISTING one-record video taxonomy (#2480), Academy course IDs and published service IDs. Owner can approve content-topic mapping in existing /admin/videos; no guessed tags from unreviewed transcripts and no cloned catalogue.
3. **P2 private adapter:** reuse verifiedHistoryView / exact scorer dimension/version / existing My House auth and RLS. Explicit “Personalize using my results” consent; recency window chosen by original method. Only authorized in-session data, no server logs or unrelated CRM.
4. **P3 product UX:** existing My Tests result + “Discuss this test” assistant → explanation of measured source axes → free video/test → relevant course → optional published service request. Reuse Today’s pick, My Development Path and Holistic Support Finder; client may change subject. Completion checkmarks mean actions completed, not test improvement.
5. **P4 proof:** review actual video content and rights; account A/B IDOR/RLS; EN/RU/ES labels (not fake translations); 320/375/390/430px and real iPhone audio/video; trusted/guest/nonconsent/stale/conflicting score cases; lint/typecheck/build/CI; production exact-SHA Vercel READY/domain; real booking/receipt only if separate consent and payment readiness.

## 7. Acceptance & exclusions
- Unique 4 canonical root spheres, 10 research topics, all 34 registered facets in crosswalk; no extra “Goals” root.
- Actual measurements must show exact source, scale value, reference kind and time **only in the private authorized table**; user can override topic/goal and keep test data out of messages and external content requests.
- High vs low is correctly reversed for stress/load vs resource measures. Neutral/descriptive traits never imply deficits; mismatched, expired, unpublished and unsafe content is excluded.
- Every recommendation has a public canonical offering ID, editor-reviewed axis association and transparent reason; never assume an offering/course/video is available without verification.
- No medical claims, business success guarantees, automatic checkout, booking, provider spending, new CRM contact, study enrollment or use of raw answers in external AI.
- 73 original HH questionnaires still await independent validity review (#1223); a software ranking model cannot substitute for that scientific work.

**Status: P0 prototype only. This document/PR is not proof that a client has actually received a ranked video/course/service in production.**
