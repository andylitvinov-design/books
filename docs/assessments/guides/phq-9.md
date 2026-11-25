# Глубокая проверка настроения · EN / Mood Deep Dive

**Instrument ID:** `phq-9` · **Version:** `v1` · **Status:** source-backed-questionnaire · **Questions:** 9 · **Time:** ~2 min

## Что исследует тест / What this test explores

**RU:** Более глубокая шкала PHQ-9 с прямым вопросом безопасности. Не диагноз; вопросы на английском.

**EN:** A deeper PHQ-9 mood symptom check with an explicit safety question. Not a diagnosis.

**Important:** Баллы описывают ответы, а не устанавливают диагноз. Скрининговые пороги используются только там, где подтверждены источником. / Scores describe answers, not diagnoses. Screening thresholds are used only where supported by sources.

## Шкалы, наблюдение и добровольная работа / Scales, monitoring and optional practice

Ни одна шкала сама по себе не является «дефектом», который нужно исправить. Выбирайте навык, а не обязательную цель по баллам. / A scale is not a defect to fix; choose an optional skill, not a mandatory target score.

### Глубокая проверка настроения · EN — основной показатель / Mood Deep Dive — main score

- **Scale ID:** `symptoms.phq9.total`
- **Категория / area:** Настроение и чувства / Mood & feelings
- **Что наблюдать / what to notice:** Наблюдайте изменения настроения и их контекст без самооценки. / Notice mood changes and what happened around them, without judging yourself.
- **Что можно попробовать / one practical step:** Если сниженное настроение, потеря интереса или иные симптомы сохраняются, обсудите влияние на жизнь со специалистом. / If low mood, reduced interest or other symptoms persist, review their effect on functioning with a qualified clinician.
- **Как читать значение / interpreting the score:** 0–4: минимально выраженные симптомы; 5–9: слабо выраженные симптомы; 10–14: умеренно выраженные симптомы; 15–19: значительно выраженные симптомы; 20–27: сильно выраженные симптомы. Скрининг не устанавливает диагноз. / 0–4: minimal reported symptoms; 5–9: mild reported symptoms; 10–14: moderate reported symptoms; 15–19: moderately severe reported symptoms; 20–27: severe reported symptoms. Screening is not a diagnosis.
- **Добровольное направление / optional skill:** Поддерживающие привычки и осознание чувств / Supportive routines and emotional awareness

## После теста / After the test

**RU:** Получите индивидуальное объяснение каждой шкалы, безопасные рекомендации и при необходимости предложение обсудить результат со специалистом. Для динамики сравнивайте только одинаковые версии опросника и совместимые условия. Никакого обязательного курса или назначения.

**EN:** Your saved report explains each scored scale and gives non-prescriptive practical options. Compare only compatible instrument versions and measurement windows. There is no automatic therapy enrollment or prescription.

**Source of scoring / registry:** `data/assessments/`, `lib/assessments/scoring.js`, `lib/assessments/interpretation-registry.js` (rules 2026-10-11.v3).

