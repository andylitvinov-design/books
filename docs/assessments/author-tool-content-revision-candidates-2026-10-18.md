# Content-level revision candidates — Holistic House original questionnaires

Date: 18 October 2026 · Status: **DRAFT INSTRUMENT REVISIONS — NOT REGISTERED, NOT ACTIVE, NOT PSYCHOMETRICALLY VALIDATED.**
These candidate wordings address construct coherence problems detected in existing source content. They are not retroactive changes to any stored version, score, report or respondent. They require qualified content reviewers and intended-user cognitive interviews before approval. Do not copy their questions into the production runner without new immutable v2 registrations, source hashes, language review and an append-only migration.

## Revision A: hh-felt-safety v2 → Body Awareness, Comfort and Choice

**Problem with v1:** the one mean combines noticing body tension, recognizing comfortable environments, changing posture, noticing calm, rejecting unwanted contact, and having a grounding action. Calling this one **felt-safety score** overstates content coherence and can falsely imply evaluation of trauma or objective safety.

**Construct contract:** three independent descriptive 3-item domains. No total score or psychological-health percentage. The questions concern ordinary subjective experiences **during the past seven days**, not causes, health status, diagnosis, or actual interpersonal safety. No item can evaluate anyone else's intention or consent.

**Answer options (all items, source-approved candidate only):** 0 Never / Никогда; 1 Rarely / Редко; 2 Sometimes / Иногда; 3 Often / Часто; 4 Almost always / Почти всегда. For a situation that did not arise, allow explicit **Not applicable / Не было такой ситуации**; never code that as 0.

| ID | Dimension / EN candidate wording (In the last 7 days…) | RU candidate wording (За последние 7 дней…) |
| --- | --- | --- |
| A1 | I noticed an early sign that my body was becoming tense. | Я замечал(а) первые признаки нарастающего напряжения в теле. |
| A2 | I could describe what I felt in my body without needing to explain its cause. | Я мог(ла) описать телесное ощущение без обязательного объяснения его причины. |
| A3 | I noticed when a body sensation became more or less intense. | Я замечал(а), когда телесное ощущение усиливалось или ослабевало. |
| B1 | I noticed at least one moment when my body felt reasonably comfortable. | Я замечал(а) хотя бы короткие моменты телесного комфорта. |
| B2 | When useful, I could adjust my posture or surroundings to feel more comfortable. | Когда было нужно, я мог(ла) изменить позу или обстановку ради большего комфорта. |
| B3 | I could take a short break when I noticed the need for rest. | Я мог(ла) сделать небольшую паузу, когда замечал(а) потребность в отдыхе. |
| C1 | In a relevant interaction, I felt able to say no to unwanted physical contact. | В соответствующей ситуации я чувствовал(а), что могу отказаться от нежелательного прикосновения. |
| C2 | In a relevant interaction, I could ask for more space or time. | В соответствующей ситуации я мог(ла) попросить больше пространства или времени. |
| C3 | When uncomfortable, I could choose a gentle action that increased my sense of ease. | При дискомфорте я мог(ла) выбрать мягкое действие, повышающее ощущение удобства. |

**Separate arithmetic:** `body_noticing` = A1–A3, `available_comfort` = B1–B3, `choice_and_boundaries` = C1–C3. Each uses a within-domain mean of source numeric codes, rounded to two decimals. Require at least two relevant answers in a domain. For all 3 present, attainable scores are precisely `0;.33;.67;1;1.33;1.67;2;2.33;2.67;3;3.33;3.67;4`; for 2 present, `0;.5;1;1.5;2;2.5;3;3.5;4`. Display N answered (of 3), the response-code meanings and **not enough relevant answers** when fewer than 2 items were applicable. Never compare the new domains directly with the single mixed v1 mean.

**Response bands:** five *editorial response-proximity* regions, respectively near codes 0,1,2,3,4, calculated from the actually attainable lattice for the applicable item count. Do not call them “unsafe/safe,” “traumatized/healed,” or clinical severity. A low endorsement of a choice item may reflect lack of opportunity or situational constraints, not a defect in a person.

## Revision B: hh-body-mind-context v2 → Body Sensation Observation and Context

**Problem with v1:** a mean of six statements combines observing physical sensations, separating distress from worry, daily functioning and knowing when to seek medical evaluation. It is not a score of physical disease, psychosomatic causes or severity.

**Construct contract:** separate observation/process domains with three self-report items each; non-scored health-service guidance remains informational and **cannot be used to infer a diagnosis**. A relevant experience screener is required: `Did you have a bodily sensation or physical discomfort you wanted to observe during the last seven days?` Yes / No / Prefer not to answer. If No or Prefer not to answer, show **not assessed** rather than an artificial low score.

**Answer options (per statements about last week):** 0 Not at all true / Совсем не соответствует; 1 Slightly true / Немного соответствует; 2 Somewhat true / Отчасти соответствует; 3 Mostly true / В основном соответствует; 4 Very true / Полностью соответствует. No added “normal” thresholds.

| ID | Domain / English candidate | RU candidate |
| --- | --- | --- |
| A1 | I could describe the location or quality of a body sensation without assigning a cause. | Я мог(ла) описать расположение или характер телесного ощущения, не устанавливая его причину. |
| A2 | I could notice whether a sensation changed during the day. | Я мог(ла) замечать, менялось ли ощущение в течение дня. |
| A3 | I could describe its intensity separately from how worried I felt about it. | Я мог(ла) описать силу ощущения отдельно от тревоги по его поводу. |
| B1 | I could note what I was doing or where I was when the sensation appeared. | Я мог(ла) отметить, чем занимался(ась) или где находился(ась) при появлении ощущения. |
| B2 | I could notice whether the sensation interfered with a particular everyday task. | Я мог(ла) заметить, мешало ли ощущение конкретному повседневному делу. |
| B3 | I could tell apart what I actually noticed and what I was only guessing. | Я мог(ла) отличать непосредственно замеченное от своих предположений. |

**Separate arithmetic:** `sensation_observation` = A1–A3; `situational_context` = B1–B3. Each mean 0–4 across all three items, final rounded to two decimals, same 13 attainable values as Revision A with three applicable items. No overall 6-item mean. The reporting contract states explicitly that the score concerns **reported observation habits**, not the origin of physical symptoms. Medical questions are addressed with a non-scored neutral reminder to seek appropriate qualified assessment for new, persistent or concerning physical symptoms.

## Shared scientific and technical release gates for both draft revisions

1. Independent mental-health measurement reviewer checks item relevance, completeness, unique construct, polarity, recall period and possibility of “not applicable” for each subscale. Record disagreements and outcome for each item, not only overall impressions.
2. Voluntary, appropriately consented EN and RU cognitive interviews confirm the reading level and intended interpretation of item wording, answer anchors and response timeframe. No automatic harvesting of historic Client Cabinet records.
3. A pre-registered, appropriately powered pilot estimates domain dimensionality, reliability, test–retest error, and construct relationships. Do not compute Cronbach's alpha for the individual v1 items or claim accuracy without data; do not infer a person's reliable change from short-term self-ratings.
4. Any approved new content must use distinct **v2 version IDs/content hashes**, version-specific original-language item sets, explicit applicability/missing data contract, distinct score dimension keys and additive database registration. Source version `v1` stays readable and unchanged. Display **new baseline required** before collecting longitudinal trends.
5. Synthetic numeric tests check every possible 2- and 3-answer mean, all five response-proximity categories, the missingness boundary, inverse/invalid answers, cross-version comparisons, layout in EN/RU and no cached-report mutation. Do not use these draft questions in a live test until these gates pass.
6. Only after exact-head build/CI, Supabase isolated/production migration readback and Vercel Production READY can the new editions be called technically published; separate evidence is needed to call them scientifically validated.

Frameworks: COSMIN 2024 https://pmc.ncbi.nlm.nih.gov/articles/PMC11541334/ ; ITC Guidelines 2017 https://www.intestcom.org/page/14.
