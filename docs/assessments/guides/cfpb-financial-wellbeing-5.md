# Финансовое благополучие CFPB — краткая шкала · EN / CFPB Financial Well-Being — Abbreviated Scale

**Instrument ID:** `cfpb-financial-wellbeing-5` · **Version:** `v1` · **Questionnaire language:** official English · **Questions:** 7 (5 statements + 2 scoring qualifiers) · **Time:** ~3 min

## Что исследует тест / What this test explores

**RU:** Краткая шкала CFPB описывает финансовое благополучие по самоотчёту: ощущение финансовой устойчивости и свободы выбора. Пять утверждений дополняются двумя обязательными вопросами для расчёта: возрастная группа и способ прохождения. Это ресурсный показатель, а не диагноз, сумма дохода, кредитный рейтинг или финансовая рекомендация.

**EN:** The abbreviated CFPB scale describes self-reported financial well-being, including a sense of financial security and choice. Five statements are followed by two mandatory scoring questions: age group and administration mode. This is a reported-resource measure, not a diagnosis, income amount, credit rating or financial recommendation.

## Подсчёт и ограничения / Scoring and limits

- **Five scored statements:** `cfpb5.01`–`cfpb5.05`, each with response codes 0–4 in the original displayed order. / Пять утверждений кодируются от 0 до 4 в исходном порядке вариантов ответа.
- **Age group:** `cfpb5.06`: 0 = 18–61; 1 = 62+. / Возрастная группа обязательна; в этой версии нет категории младше 18 лет.
- **Administration mode:** `cfpb5.07`: 0 = self-read; 1 = someone read the questions to the respondent. / Способ прохождения обязателен: самостоятельное чтение или чтение вопросов другим человеком.
- **Response total:** `cfpb5.01 + cfpb5.02 + cfpb5.03 + (4 − cfpb5.04) + cfpb5.05`, from 0 to 20. The fourth, positively worded statement is reverse-coded relative to its displayed answer order. Age and mode are not added to this total. / Четвёртый положительно сформулированный пункт пересчитывается обратно; возраст и способ прохождения не входят в сумму.
- **Final score:** The response total selects a row in the official 2017 abbreviated age/mode lookup; age and administration mode select its column. The implemented method is `official-age-mode-lookup`, not the raw sum or a linear conversion to percent. / Итоговый балл получается по официальной таблице краткой формы CFPB 2017 года с учётом возраста и способа прохождения, а не из простой суммы или линейного процента.
- **Scale range:** 0–100 is the defined reporting scale. The short-form lookup does not produce every integer or either endpoint; its current four calibration columns collectively return values from 19 to 90. / Диапазон отображаемой шкалы — 0–100, но таблица краткой формы не выдаёт каждый целый балл или крайние значения; значения по четырём группам в этой реализации в совокупности лежат от 19 до 90.

**RU:** Чем выше показатель, тем выше заявленный финансовый ресурс (`resources`, `higher-reported-resource`). Это не процентиль, не процент финансового успеха и не оценка личной ценности. Калибровка относится к американскому контексту; её нельзя представлять как подтверждённые местные нормы для другой страны или русскоязычной выборки. В этой реализации нет клинических порогов или диагностических категорий.

**EN:** A higher score means higher reported financial well-being (`resources`, `higher-reported-resource`). It is not a percentile, a percentage of financial success or a measure of personal worth. Calibration comes from the U.S. reference context and must not be presented as validated local norms for another country or a Russian-speaking population. This implementation adds no clinical cutoffs or diagnostic categories.

## Шкалы, наблюдение и добровольная работа / Scales, monitoring and optional practice

### Финансовое благополучие (CFPB) / Financial well-being (CFPB calibrated)

- **Scale ID:** `resources.financial_wellbeing.cfpb_short`
- **Категория / area:** Ресурс и устойчивость / Reported resources and financial well-being
- **Что наблюдать / what to notice:** Замечайте, как реальные обстоятельства, обязательства и доступная поддержка влияют на ощущение устойчивости и свободы выбора. / Notice how circumstances, obligations and available support affect your sense of security and choice.
- **Как читать значение / interpreting the score:** Один калиброванный показатель самоотчёта; он не измеряет фактический доход и сам по себе не объясняет причины трудностей. / One calibrated self-report measure; it does not measure actual income or by itself explain the causes of financial difficulty.
- **Добровольное направление / optional practice:** Развитие доступной поддержки без обязательной цели по баллам. / Explore accessible support without making a score a mandatory target.

## Что можно попробовать / What you can try

**RU:** Отметьте один конкретный фактор, который сейчас поддерживает или ограничивает ощущение финансовой устойчивости. Если полезно, выберите небольшой посильный шаг, например прояснить одно обязательство или доступный источник поддержки. Упражнение добровольно; результат не назначает финансовых продуктов, покупок, курса или лечения.

**EN:** Identify one concrete factor that currently supports or limits your sense of financial security. If useful, choose one manageable step, such as clarifying an obligation or an available source of support. This is optional; the result does not prescribe financial products, purchases, a course or treatment.

## После теста / After the test

**RU:** Определение предлагает повтор примерно через 30 дней; это не обязательство. Для динамики сохраняйте ту же версию и язык, учитывайте реальные изменения обстоятельств, возрастной группы и способа прохождения. Не подставляйте возраст или способ прохождения ради желаемого балла; небольшое изменение не доказывает значимый эффект.

**EN:** The definition suggests a repeat after about 30 days; repeating is optional. For comparison, keep the same version and language and account for actual changes in circumstances, age group and administration mode. Do not choose age or mode to obtain a desired score; a small change alone does not establish a meaningful effect.

**Implementation references:** `lib/assessments/cfpb-short-scoring.js`, `lib/assessments/scoring.js`, `lib/assessments/interpretation-registry.js`.

## Источники и язык / Sources, rights & language

The links, permission description and review date below reproduce the existing definition's source metadata. This guide does not record a new independent source or rights review. / Ссылки, описание разрешения и дата проверки перенесены из существующего определения; этот документ не является новой независимой проверкой источников или прав.

- **Recorded source:** Consumer Financial Protection Bureau — Abbreviated Financial Well-Being Scale (2017)
- **Original source:** https://www.consumerfinance.gov/data-research/research-reports/financial-well-being-scale/
- **Scoring reference:** https://files.consumerfinance.gov/f/documents/bcfp_fin-well-being_short-scorecard.pdf
- **Permission evidence:** https://www.consumerfinance.gov/consumer-tools/financial-well-being/about/
- **Recorded permission statement:** CFPB states anyone may reproduce, publish or use the questionnaire without permission, including commercial contexts; no CFPB endorsement or logo.
- **Recorded citation:** Consumer Financial Protection Bureau (2017). CFPB Financial Well-Being Scale: Scale development technical report and Abbreviated scoring worksheet.
- **Review date recorded in definition:** 2026-10-15
- **Definition:** `data/assessments/cfpb-financial-wellbeing-short-v1.js`
- **Translation note / язык:** Only the original English questionnaire is offered. Russian headings and explanatory guidance are not a validated Russian translation or adaptation of the instrument. / Опросник предлагается только в оригинальной английской версии. Русские заголовки и пояснения не являются валидированным русским переводом или адаптацией инструмента.
