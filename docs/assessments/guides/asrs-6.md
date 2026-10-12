# ASRS-v1.1 6Q / Скринер для взрослых

**Instrument ID:** `asrs-6`

## What this test explores

The exact NYU patient-facing ASRS-v1.1 six-question screener concerns attention and activity during the past six months, for adults aged 18 or older. It is separate from ASRS-v1.1 18Q and DSM-5 ASRS-5. The current NYU owner page permits clinical, nonclinical and commercial use with attribution, and electronic reproduction without other modification: https://license.tov.med.nyu.edu/product/asrs6Qscreener .

Only the classic shaded-cell algorithm is used: Q1–3 responses Sometimes/Often/Very Often and Q4–6 Often/Very Often contribute one; all other responses contribute zero. The single count `symptoms.asrs6.shaded_count` ranges 0–6. Four or more is a positive screening threshold that may warrant qualified evaluation. It is not a diagnosis, severity scale, probability, norm, personality trait or treatment decision. A count below four does not rule ADHD out. Concerns should be discussed regardless of the count. No retesting interval is assigned.

All six integer answers are required. Zero is a real answer, not missing. No imputation or prorating: this is an HH implementation safeguard, not an author-validated missingness rule. The 2024 continuous 0–24 method and its strata are not implemented or combined with this count.

English is the original form. Russian is officially distributed by NYU, but validation of the exact Russian wording has not been established. The differently worded 2026 Russian study cannot establish accuracy for this version. Changing report language never changes instrument provenance. Source-specific validation research: Kessler et al. 2005, https://pubmed.ncbi.nlm.nih.gov/15841682/ ; Kessler et al. 2007, https://pubmed.ncbi.nlm.nih.gov/17623385/ . No study performance figures are displayed as a website accuracy promise.

## Что исследует тест

Точная пациентская форма NYU: шесть вопросов о внимании и активности за последние шесть месяцев, для взрослых от 18 лет. Подсчёт 0–6 отражает только ответы в заштрихованных клетках. При четырёх и более ответах возможно соответствие симптомам СДВГ у взрослых; можно обсудить профессиональную оценку. Результат не устанавливает диагноз. Значение ниже порога не исключает СДВГ. При беспокойстве обсудите его с квалифицированным медицинским специалистом независимо от балла.

Официальное распространение русского перевода NYU не подтверждает валидацию именно его формулировок. Клинические нормы, вероятность, уровни тяжести и назначения не вычисляются. Все шесть ответов обязательны; пропуски не превращаются в ноль. Шесть месяцев — период вопросов, а не интервал повторного прохождения.

## Шкалы, наблюдение и добровольная работа

Единственная шкала `symptoms.asrs6.shaded_count`: 0–3 ниже порога; 4–6 на уровне или выше скринингового порога. Это дискретный скрининговый подсчёт, не непрерывный показатель ресурса, тяжести или ежедневного прогресса. Он не преобразуется в процент здоровья, дефицит навыка или цель личного курса.

## Что можно попробовать

Пояснение Holistic House, отдельно от исходного инструмента: при желании запишите конкретные примеры трудностей с вниманием или активностью и их влияние на обычную жизнь за последние шесть месяцев. При беспокойстве можно обсудить примеры и результат с квалифицированным медицинским специалистом. Это не индивидуальное назначение лечения.

## Pinned identity and original sources

- EN definition: `7d84b0f8-027a-5992-a752-27133aa897ea`; content hash `sha256:3f2648c2008ae7436ab04fa28ce329f66d44960b7f1ca486ea5fdb814a872b04`
- RU definition: `132782f6-fe16-5d66-956c-ea47596f085a`; content hash `sha256:b64274437777684e0aea0150493adb4eb6015f9fd06bfbeb8b0b98998a67b387`
- Version `v1`; scorer `asrs-v1-6-classic:v1`; result `v1`; translations `nyu-patient-en-v1` / `nyu-patient-ru-v1`
- English master `6Q_ASRS_ENGLISH_final.pdf`: SHA-256 `3383491ecbbd65beb79b97c86a49e72fac8a5fdf8c40d94bfe58ed9189bdfee4`
- Russian master `6Q_Russian_final.pdf`: SHA-256 `43068fbc890d8f05ab08d563d9efd6464feafd130a9c881be73afc2f07651382`
- Both original masters, source manifest and exact extraction are preserved byte-for-byte in `docs/assessments/sources/asrs6/`. Questionnaire page 2 in both masters. Source checked 12 October 2026.

The 6-question Adult Self-Report Scale-Version1.1 (ASRS-V1.1) Screener is a subset of the 18-question Adult ADHD Self-Report Scale-Version1.1 (Adult ASRSV1.1) Symptom Checklist. © New York University and the President and Fellows of Harvard College.

© New York University and President and Fellows of Harvard College. All rights reserved.

## Release boundary

This local implementation does not establish production availability or clinical approval. Canonical runtime requires an exact `app.assessment_versions` row for each definition, including full JSON and content hash. The additive migration must be reviewed, authorized, applied in the intended environment and independently read back before enabling production use. Missing registration fails with `INSTRUMENT_UNAVAILABLE`; there is no fallback to another version. RU exact-version validation remains unverified and requires explicit clinical release review. No client records are needed for verification.
