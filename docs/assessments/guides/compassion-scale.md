# Compassion Scale (CS)

**Instrument ID:** `compassion-scale` · **Version:** `v1` · **Questionnaire language:** original English · **Questions:** 16

## What this test explores

16 original English items on compassion toward others, with a total and four subscale means. Research measure; no clinical norms or diagnostic cutoffs.

## Что исследует тест

16 оригинальных английских пунктов о сострадании к другим: общее среднее и четыре подшкалы. Исследовательская методика без клинических норм и диагностических порогов.

## Administration and scoring specification

The official sheet (page 2) supplies the English instructions and items, in unchanged order. The runner shows the original instructions in both UI languages. Response codes are integers 1–5: 1 = Almost never; 5 = Almost always. Intermediate points 2, 3 and 4 have no invented verbal anchors. Stable item IDs are `cs.01` through `cs.16`.

All items are required. Undefined, null, missing, noninteger and out-of-range values prevent scoring; 0 is invalid rather than missing. There is no imputation or prorating. Requiring a complete form is a conservative product rule because the author sheet does not prescribe a missing-item algorithm. Reverse-code the keyed responses as 6 minus the response, then average without intermediate rounding. The shared scorer rounds final means to two decimal places. No percentiles, clinical norms or high/low categories are assigned.

## Шкалы, наблюдение и добровольная работа

### Compassion toward others — total mean / Сострадание к другим — общее среднее

- **Key:** `resources.cs.total` · **Range:** 1–5 · **Unit:** response mean.
- **Items:** `cs.01`, `cs.02`, `cs.03`, `cs.04`, `cs.05`, `cs.06`, `cs.07`, `cs.08`, `cs.09`, `cs.10`, `cs.11`, `cs.12`, `cs.13`, `cs.14`, `cs.15`, `cs.16`.
- **Reverse coded:** `cs.03`, `cs.07`, `cs.11`, `cs.15`.
- **EN — Scoring and interpretation:** The total is the mean of 16 responses after reversing indifference items 3, 7, 11 and 15 (6 minus the response). Higher values describe more compassion toward other people, not self-compassion.
- **RU — Подсчёт и интерпретация:** Общий балл — среднее 16 ответов после обратного кодирования пунктов безразличия 3, 7, 11 и 15 (6 минус ответ). Чем выше значение, тем больше сообщаемое сострадание к другим людям, а не к себе.
- **EN — What to observe:** Consider how caring for others fits with your capacity and boundaries; this score is not a judgement of moral worth.
- **RU — На что обратить внимание:** Подумайте, как забота о других сочетается с вашими силами и границами; балл не оценивает нравственную ценность человека.

### Kindness toward others / Доброта к другим

- **Key:** `resources.cs.kindness` · **Range:** 1–5 · **Unit:** response mean.
- **Items:** `cs.02`, `cs.06`, `cs.10`, `cs.14`.
- **Reverse coded:** none.
- **EN — Scoring and interpretation:** The mean of items 2, 6, 10 and 14 describes caring responses to other people’s difficulties. Higher values indicate more reported kindness toward others.
- **RU — Подсчёт и интерпретация:** Среднее пунктов 2, 6, 10 и 14 описывает заботливое отношение к трудностям других. Более высокое значение означает больше сообщаемой доброты к другим людям.
- **EN — What to observe:** Notice an opportunity to offer care that the other person actually welcomes and that you can manage.
- **RU — На что обратить внимание:** Заметьте возможность проявить посильную заботу, которую другой человек действительно готов принять.

### Common humanity / Общность человеческого опыта

- **Key:** `resources.cs.common_humanity` · **Range:** 1–5 · **Unit:** response mean.
- **Items:** `cs.04`, `cs.08`, `cs.12`, `cs.16`.
- **Reverse coded:** none.
- **EN — Scoring and interpretation:** The mean of items 4, 8, 12 and 16 describes recognition that difficulty is part of shared human experience. Higher values indicate more reported common humanity.
- **RU — Подсчёт и интерпретация:** Среднее пунктов 4, 8, 12 и 16 описывает признание трудностей частью общего человеческого опыта. Более высокое значение означает более выраженное ощущение этой общности.
- **EN — What to observe:** Reflect on a shared experience of difficulty while respecting the differences between your situation and another person’s.
- **RU — На что обратить внимание:** Подумайте об общем опыте трудностей, сохраняя внимание к различиям между вашей ситуацией и опытом другого человека.

### Mindful attention to others / Внимательное отношение к другим

- **Key:** `resources.cs.mindfulness` · **Range:** 1–5 · **Unit:** response mean.
- **Items:** `cs.01`, `cs.05`, `cs.09`, `cs.13`.
- **Reverse coded:** none.
- **EN — Scoring and interpretation:** The mean of items 1, 5, 9 and 13 describes attentive, balanced awareness of other people’s distress. Higher values indicate more reported mindful attention toward others.
- **RU — Подсчёт и интерпретация:** Среднее пунктов 1, 5, 9 и 13 описывает внимательное, уравновешенное восприятие переживаний других. Более высокое значение означает больше сообщаемого внимательного отношения к другим.
- **EN — What to observe:** In a conversation, notice the other person’s feelings and your own limits before offering a solution.
- **RU — На что обратить внимание:** В разговоре обратите внимание на чувства другого и собственные границы, прежде чем предлагать решение.

### Indifference (reverse-scored: higher means less indifference) / Безразличие (обратный балл: выше — меньше безразличия)

- **Key:** `resources.cs.indifference_reversed` · **Range:** 1–5 · **Unit:** response mean.
- **Items:** `cs.03`, `cs.07`, `cs.11`, `cs.15`.
- **Reverse coded:** `cs.03`, `cs.07`, `cs.11`, `cs.15`.
- **EN — Scoring and interpretation:** This is the REVERSED mean of items 3, 7, 11 and 15: each answer becomes 6 minus the response before averaging. Higher values mean LESS indifference and MORE compassion. This is not the raw indifference score.
- **RU — Подсчёт и интерпретация:** Это ОБРАТНОЕ среднее пунктов 3, 7, 11 и 15: перед усреднением каждый ответ заменяется на 6 минус ответ. Более высокое значение означает МЕНЬШЕ безразличия и БОЛЬШЕ сострадания. Это не прямой балл безразличия.
- **EN — What to observe:** Consider when you can stay connected to someone’s difficulty and when you need rest or a boundary. A higher reversed mean indicates less indifference.
- **RU — На что обратить внимание:** Отметьте, когда удаётся сохранять контакт с чужими трудностями, а когда нужен отдых или граница. Более высокое обратное среднее означает меньше безразличия.

## What you can try

Choose one optional observation above. Consider context and capacity; scores do not judge character or establish a diagnosis. Repeat only when useful, using the same version and language. No author-prescribed retest schedule or reliable-change threshold is claimed.

## Что можно попробовать

Выберите одно добровольное наблюдение выше. Учитывайте ситуацию и доступные силы; баллы не оценивают характер и не устанавливают диагноз. Повторяйте по необходимости в той же версии и на том же языке. Обязательный интервал повторения и порог достоверного изменения не заданы.

## Evidence, permissions and limitations

- **Official researcher index:** https://self-compassion.org/self-compassion-scales-for-researchers/
- **Author sheet:** https://self-compassion.org/wp-content/uploads/2021/03/CS-information.pdf
- **Permission:** https://self-compassion.org/wp-content/uploads/2021/03/CS-information.pdf#page=1 — page 1 explicitly permits use for any purpose, including research, clinical work and teaching. This supports reproduction and electronic administration of the original form with attribution.
- **Exact items and anchors:** page 2.
- **Scoring and limitations:** https://self-compassion.org/wp-content/uploads/2021/03/CS-information.pdf#page=3 — page 3, continued validity discussion on page 4.
- **Citation:** Pommier, E., Neff, K. D., & Tóth-Király, I. (2019). The development and validation of the Compassion Scale. Assessment, 21–39.
- **Source verified:** 2026-10-12.
- **Identity:** `a5cb84ed-75bd-59e0-adba-64bfa1626cca` · **Content hash:** `sha256:0b77d1eb4e39a6a91eb461447dbec57c4b879ecff2c20e80eec36dd2e04578bb`.

The sheet summarizes validation across student, community and meditator samples; this does not create norms for this website. CS measures compassion toward others. It is distinct from SCS-SF self-compassion and from the IPIP compassion personality aspect. Indifference is reversed in both its displayed subscale and total, as the author permits.

The English original is the only questionnaire version offered. Russian UI, labels and report text are original explanations, not a validated Russian adaptation. The adult consent policy is a product boundary, not a claim of population validation. No diagnostic or treatment inference is made. Passing software tests does not establish psychometric or clinical suitability.

Русский интерфейс и текст отчёта — пояснения, а не валидированный перевод опросника. CS исследует сострадание к другим; обратный балл безразличия тем выше, чем меньше сообщаемое безразличие. Клинические нормы, диагнозы и назначения не выводятся.
