# CDC Healthy Days — симптомы и энергия · EN / CDC Healthy Days — Symptoms

**Instrument ID:** `cdc-healthy-days-symptoms` · **Version:** `v1` · **Status:** source-backed-questionnaire · **Questions:** 5 · **Time:** ~3 min

## Что исследует тест / What this test explores

**RU:** Пять оригинальных вопросов CDC за 30 дней: боль, настроение, тревога, сон и энергия. Без искусственного общего балла; EN.

**EN:** Five original CDC 30-day day-count questions about pain, low mood, worry, sleep and energy. No synthetic total score.

**Important:** Баллы описывают ответы, а не устанавливают диагноз. Скрининговые пороги используются только там, где подтверждены источником. / Scores describe answers, not diagnoses. Screening thresholds are used only where supported by sources.

## Шкалы, наблюдение и добровольная работа / Scales, monitoring and optional practice

Ни одна шкала сама по себе не является «дефектом», который нужно исправить. Выбирайте навык, а не обязательную цель по баллам. / A scale is not a defect to fix; choose an optional skill, not a mandatory target score.

### Дни с болью / Days affected by pain

- **Scale ID:** `symptoms.cdc_healthy_days.pain_days`
- **Категория / area:** Энергия и тело / Energy & body
- **Что наблюдать / what to notice:** Наблюдайте изменения сил и телесных ощущений, не предполагая их психологическую причину. / Notice energy or physical discomfort during the day; do not assume a psychological cause.
- **Что можно попробовать / one practical step:** Если боль повторяется или усиливается, обсудите её с врачом. / If pain occurs repeatedly or worsens, discuss it with a healthcare professional.
- **Как читать значение / interpreting the score:** Описательное положение в шкале, без придуманной нормы или клинического порога. / Descriptive position in this scale; no invented norms or clinical thresholds.
- **Добровольное направление / optional skill:** Посильная нагрузка, отдых и медицинская оценка при необходимости / Pacing, rest and asking for appropriate medical advice

### Дни сниженного настроения / Days with low mood

- **Scale ID:** `symptoms.cdc_healthy_days.sad_days`
- **Категория / area:** Настроение и чувства / Mood & feelings
- **Что наблюдать / what to notice:** Наблюдайте изменения настроения и их контекст без самооценки. / Notice mood changes and what happened around them, without judging yourself.
- **Что можно попробовать / one practical step:** Отметьте контекст дней сниженного настроения и необходимость поддержки. / Notice what was happening on low-mood days and whether support would be useful.
- **Как читать значение / interpreting the score:** Описательное положение в шкале, без придуманной нормы или клинического порога. / Descriptive position in this scale; no invented norms or clinical thresholds.
- **Добровольное направление / optional skill:** Поддерживающие привычки и осознание чувств / Supportive routines and emotional awareness

### Дни тревоги / Days affected by worry

- **Scale ID:** `symptoms.cdc_healthy_days.anxiety_days`
- **Категория / area:** Тревога и напряжение / Anxiety & tension
- **Что наблюдать / what to notice:** Замечайте, что вызывает беспокойство, как долго оно длится и что помогает успокоиться. / Notice what starts worry, how long it lasts and what helps you feel steadier.
- **Что можно попробовать / one practical step:** Отметьте, совпадают ли дни тревоги с нагрузкой или ограничивают обычные дела. / Track whether anxiety days coincide with specific demands or reduce your functioning.
- **Как читать значение / interpreting the score:** Описательное положение в шкале, без придуманной нормы или клинического порога. / Descriptive position in this scale; no invented norms or clinical thresholds.
- **Добровольное направление / optional skill:** Заземление и гибкость реакций / Grounding and flexible responses

### Дни недостаточного отдыха / Days with inadequate rest

- **Scale ID:** `symptoms.cdc_healthy_days.sleep_days`
- **Категория / area:** Сон и восстановление / Sleep & recovery
- **Что наблюдать / what to notice:** Замечайте качество отдыха, режим сна и влияние на следующий день. / Notice restfulness, sleep patterns and their effect on the next day.
- **Что можно попробовать / one practical step:** Понаблюдайте за регулярностью сна; при стойких проблемах или дневных рисках обратитесь к специалисту. / Observe sleep regularity and speak to a clinician if problems persist or affect daytime safety.
- **Как читать значение / interpreting the score:** Описательное положение в шкале, без придуманной нормы или клинического порога. / Descriptive position in this scale; no invented norms or clinical thresholds.
- **Добровольное направление / optional skill:** Бережный режим восстановления / A gentler recovery routine

### Дни с достаточной энергией / Days with enough energy

- **Scale ID:** `resources.cdc_healthy_days.vitality_days`
- **Категория / area:** Энергия и тело / Energy & body
- **Что наблюдать / what to notice:** Наблюдайте изменения сил и телесных ощущений, не предполагая их психологическую причину. / Notice energy or physical discomfort during the day; do not assume a psychological cause.
- **Что можно попробовать / one practical step:** Отмечайте занятия или условия, совпадающие с более энергичными днями. / Notice which ordinary activities or conditions coincide with more energetic days.
- **Как читать значение / interpreting the score:** Описательное положение в шкале, без придуманной нормы или клинического порога. / Descriptive position in this scale; no invented norms or clinical thresholds.
- **Добровольное направление / optional skill:** Посильная нагрузка, отдых и медицинская оценка при необходимости / Pacing, rest and asking for appropriate medical advice

## После теста / After the test

**RU:** Получите индивидуальное объяснение каждой шкалы, безопасные рекомендации и при необходимости предложение обсудить результат со специалистом. Для динамики сравнивайте только одинаковые версии опросника и совместимые условия. Никакого обязательного курса или назначения.

**EN:** Your saved report explains each scored scale and gives non-prescriptive practical options. Compare only compatible instrument versions and measurement windows. There is no automatic therapy enrollment or prescription.

**Source of scoring / registry:** `data/assessments/`, `lib/assessments/scoring.js`, `lib/assessments/interpretation-registry.js` (rules 2026-10-11.v3).

