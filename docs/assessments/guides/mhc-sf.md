# Adult Mental Health Continuum Short Form (MHC-SF) / Психическое благополучие взрослых

**Instrument ID:** `mhc-sf`

## What this test explores / Что исследует тест

Positive feelings and emotional, social and psychological functioning during the past month. One questionnaire provides a total and three domain sums.

Положительные чувства и эмоциональное, социальное и психологическое функционирование за последний месяц. Один опросник даёт общий балл и три суммы по областям.

## Instrument identity and permission / Версия и разрешение

**MHC-SF © Corey L. M. Keyes.** Keyes, C. L. M. (2009). *Brief description of the mental health continuum short form (MHC-SF).* Atlanta. This implementation pins the **December 2011** document's printed **adult form, page 4**, with its revised item 6, not the earlier wording cited in the footnote. Retrieved 2026-10-12.

Author sheet: https://peplab.web.unc.edu/wp-content/uploads/sites/18901/2018/11/MHC-SFoverview.pdf

Page 1 permits use with proper credit without individual permission. Page 4 supplies the adult English items and response categories; page 6 supplies coding and sum formulas. Author credit appears in the catalog description, source title and every report scale explanation. The English items are retained; the Russian navigation and explanations are original product copy, not a validated Russian questionnaire or permission to translate it.

Используется взрослая форма **18+**, напечатанная на странице 4 документа декабря 2011 года. Разрешение автора с обязательным указанием авторства — на странице 1; ключи и суммы — на странице 6. Пункт 6 — исправленная печатная версия о хорошем или улучшающемся обществе для всех людей. Ранний вариант «для людей вроде вас» не подставляется. Русская карточка помечена **EN**: русские пояснения не являются валидированной русской адаптацией.

## Administration / Прохождение

Adults aged 18 or older; the site's existing adult consent gate is unchanged. Report on the **past month**. The common English stem remains visible above the items: “During the past month, how often did you feel …”. Item fragments and the printed response wording are preserved. The original paper instruction referring to a check mark is retained as source wording; the existing Quick and Guided controls select the same coded responses.

Для взрослых от 18 лет, после существующего согласия. Период — **последний месяц**, а не сегодняшний день или общее привычное состояние. Вопросы и варианты ответа остаются на английском. Режимы Quick и Guided используют один ключ.

| Code / Код | Original response / Оригинальный ответ |
| --- | --- |
| 0 | Never |
| 1 | Once or twice |
| 2 | About once a week |
| 3 | About 2 or 3 times a week |
| 4 | Almost every day |
| 5 | Every day |

All 14 integer responses are required as a conservative **product rule**. Zero is a valid answer, not missing. Null/omitted answers produce no completed score; no imputation or prorating is performed. There are **no reverse-coded items**.

Все 14 целочисленных ответов обязательны по правилу продукта. Ноль — действительный ответ, не пропуск. Пропуск и null не заменяются нулём; результат не рассчитывается до полного ответа. Обратного кодирования, восстановления пропусков и пересчёта неполных сумм нет.

## Scores / Баллы

| Reported score / Шкала | Source items / Пункты | Calculation / Расчёт | Range / Диапазон |
| --- | --- | --- | --- |
| Positive mental wellbeing / Общее психическое благополучие (`resources.mhc_sf.total`) | 1–14 | Sum / Сумма | 0–70 |
| Emotional wellbeing / Эмоциональное благополучие (`resources.mhc_sf.emotional`) | 1–3 | Sum / Сумма | 0–15 |
| Social wellbeing / Социальное благополучие (`resources.mhc_sf.social`) | 4–8 | Sum / Сумма | 0–25 |
| Psychological wellbeing / Психологическое благополучие (`resources.mhc_sf.psychological`) | 9–14 | Sum / Сумма | 0–30 |

The three subscale sums add to the total. Raw sums remain integers. Higher scores describe more frequent reported wellbeing experiences; they are not percentiles or probabilities. The raw ranges differ, so subscale magnitudes should not be compared as though they had the same number of items. The total and three subscales belong to **one instrument**, not four tests. Individual item facets are not separate scored subscales.

Три подшкалы в сумме дают общий балл. Суммы целочисленные; более высокий балл означает более частый опыт благополучия по ответам. Это не процентили и не вероятности. Подшкалы содержат разное число пунктов, поэтому их суммы нельзя напрямую ранжировать между собой. Общий балл и три подшкалы — **одна методика**. Отдельные пункты не выдаются за самостоятельные тесты.

## Шкалы, наблюдение и добровольная работа

### Что можно попробовать / Optional reflection

Emotional wellbeing covers positive feelings, interest and satisfaction. Social wellbeing covers contribution, belonging and views of society. Psychological wellbeing covers self-acceptance, daily responsibilities, relationships, growth, autonomy and purpose. For reflection, consider concrete experiences and context in each domain; optional next steps are not prescribed treatments.

Эмоциональная подшкала описывает положительные чувства, интерес и удовлетворённость. Социальная — вклад, принадлежность и восприятие общества. Психологическая — самопринятие, обязанности, отношения, развитие, самостоятельность и смысл. Для размышления полезны конкретные примеры и контекст; предлагаемые действия добровольны и не являются лечением.

## Interpretation limits / Ограничения

Only continuous sums are implemented. No automatic flourishing/languishing labels, the sheet's categorical diagnostic algorithm, optional 10-point categories, clinical cutoffs, norms or diagnostic conclusions are assigned. A high wellbeing score **does not rule out mental illness**; wellbeing and mental illness are related but distinct constructs. This is not a safety assessment or reassurance that care is unnecessary.

Показываются только суммы. Категории flourishing/languishing, категориальный алгоритм автора, необязательные интервалы по 10 баллов, клинические пороги, нормы и диагнозы не применяются. Высокое благополучие **не исключает психическое расстройство** и не означает, что помощь не нужна. Эта методика не оценивает безопасность.

Evidence for the MHC-SF family must not be presented as validation of this site's exact printed form, delivery mode, population or Russian explanations. Lamers et al. (2011) support three related wellbeing domains and their distinction from illness in a Dutch sample. PHAC (2017) reported concerns about the social subscale in Canadian population surveys. Interpret social scores with attention to cultural and social context; the site has not established local norms or measurement equivalence.

Данные о семействе MHC-SF не доказывают валидность конкретной печатной версии, цифрового интерфейса, местной популяции или русских пояснений. Lamers и соавт. (2011) исследовали три области благополучия и их отличие от психического расстройства в нидерландской выборке. PHAC (2017) указало ограничения социальной подшкалы в канадских популяционных опросах. Учитывайте культуру и социальный контекст; локальные нормы и эквивалентность измерения не установлены.

- Lamers, S. M. A., Westerhof, G. J., Bohlmeijer, E. T., ten Klooster, P. M., & Keyes, C. L. M. (2011). *Evaluating the psychometric properties of the Mental Health Continuum-Short Form (MHC-SF).* Journal of Clinical Psychology, 67(1), 99–110. https://research.utwente.nl/en/publications/evaluating-the-psychometric-properties-of-the-mental-health-conti/
- PHAC (2017). *Measuring positive mental health in Canada: construct validation of the Mental Health Continuum–Short Form.* https://www.canada.ca/en/public-health/services/reports-publications/health-promotion-chronic-disease-prevention-canada-research-policy-practice/vol-37-no-4-2017/measuring-positive-mental-health-canada-construct-validation-mental-health-continuum-short-form.html

## Immutable registration / Неизменяемая регистрация

Key `mhc-sf`, version `v1`, language `en`, source form `original-en-adult-dec2011-v1`.

ID: `fe2feb75-6428-52a1-a9a6-ea45f0e43242`.

Content hash: `sha256:c70b5b61ad92d2daad15dbaf4e145d27262abe94cc9f2a64eda275c257b6a853`.

The existing private result pipeline preserves these identities in account/guest saves, history, Insights and PDF interpretation. Only compatible versions should be compared over time. Changing wording, response coding or scoring requires a new immutable version; never relabel older results.

Версия и hash сохраняются в гостевых и личных результатах, истории, Insights и PDF. Во времени сравниваются только совместимые версии. Изменение формулировок или подсчёта требует новой версии; прежние результаты не переименовываются.
