// Report-only explanations; no scoring, thresholds, diagnosis or treatment rules.
// Primary construct/item sources, checked 2026-10-17:
// https://www.ptsd.va.gov/professional/assessment/adult-sr/ptsd-checklist.asp
// https://www.ptsd.va.gov/PTSD/professional/assessment/documents/PCL5_criterionA_form.PDF
// https://www.traumameasuresglobal.com/ptsd
// https://cdn.prod.website-files.com/686e835a5683f56bbfc4c3a4/68b0694afb8eccbc37bb76c0_ITQ_English.docx
// Russian prose is HH explanatory localization, not an instrument adaptation.
const SCALES = Object.freeze({
  'symptoms.pcl5.total': {
    en: ['Reported post-traumatic symptoms: overall sum', 'Combines 20 responses about intrusions, avoidance, changes in thoughts and mood, and arousal or reactivity. The same total can reflect different patterns.', 'If useful, choose which reported difficulties most affect daily life to discuss with a professional; you do not need to retell the event.'],
    ru: ['Сообщаемые посттравматические симптомы: общая сумма', 'Объединяет 20 ответов о непроизвольных переживаниях, избегании, изменениях мыслей и настроения, возбуждении и реактивности. Одинаковая сумма может соответствовать разным сочетаниям ответов.', 'Если вам подходит, выберите трудности, которые больше всего влияют на повседневную жизнь, для обсуждения со специалистом; пересказывать событие не обязательно.'],
  },
  'symptoms.pcl5.b': {
    en: ['Intrusions and reactions to reminders', 'Summarizes items 1–5: unwanted memories, dreams, reliving, and emotional or bodily reactions to reminders.', 'You may note how these experiences affect sleep or everyday activities, without deliberately seeking reminders.'],
    ru: ['Непроизвольные переживания и реакции на напоминания', 'Суммирует пункты 1–5: нежелательные воспоминания, сны, повторное переживание и эмоциональные или телесные реакции на напоминания.', 'Можно отметить влияние этих переживаний на сон или обычные дела, не вызывая напоминания намеренно.'],
  },
  'symptoms.pcl5.c': {
    en: ['Avoidance of reminders', 'Summarizes items 6–7 about avoiding internal experiences and external reminders of the event.', 'If helpful, note where avoidance limits daily choices. The score is not an instruction to confront reminders on your own.'],
    ru: ['Избегание напоминаний', 'Суммирует пункты 6–7 об избегании внутренних переживаний и внешних напоминаний о событии.', 'Если полезно, отметьте, где избегание ограничивает повседневный выбор. Балл не предписывает самостоятельно сталкиваться с напоминаниями.'],
  },
  'symptoms.pcl5.d': {
    en: ['Changes in thoughts and mood', 'Summarizes items 8–14 about memory, beliefs, blame, feelings, interest, connection and positive emotion.', 'You may identify one change in interest or connection that you want help with; these responses do not define your character.'],
    ru: ['Изменения мыслей и настроения', 'Суммирует пункты 8–14 о памяти, убеждениях, обвинении, чувствах, интересе, близости и положительных эмоциях.', 'Можно выбрать изменение интереса или близости, с которым хочется получить поддержку; ответы не определяют ваш характер.'],
  },
  'symptoms.pcl5.e': {
    en: ['Arousal and reactivity', 'Summarizes items 15–20 about irritability, risky behavior, alertness, startle, concentration and sleep.', 'If useful, note which difficulty disrupts ordinary tasks or rest, and what support feels accessible.'],
    ru: ['Возбуждение и реактивность', 'Суммирует пункты 15–20 о раздражительности, рискованном поведении, настороженности, испуге, концентрации и сне.', 'Если полезно, отметьте, какая трудность мешает обычным делам или отдыху и какая поддержка вам доступна.'],
  },
  'symptoms.itq.ptsd': {
    en: ['Reported post-traumatic symptoms', 'Combines P1–P6: re-experiencing, avoidance and a sense of current threat. The sum does not establish whether diagnostic requirements are met.', 'You may choose which of these experiences most affects daily life to discuss with a professional, without recounting the event.'],
    ru: ['Сообщаемые посттравматические симптомы', 'Объединяет P1–P6: повторное переживание, избегание и ощущение текущей угрозы. Сумма не устанавливает выполнение диагностических требований.', 'Можно выбрать переживания, которые больше всего влияют на обычную жизнь, для обсуждения со специалистом, не пересказывая событие.'],
  },
  'symptoms.itq.dso': {
    en: ['Emotional regulation, self-view and relationships', 'Combines C1–C6 about emotional regulation, negative self-view and difficulties with closeness. These are reported experiences, not a verdict about identity or relationship quality.', 'If helpful, separate the areas where support is wanted: feelings, self-treatment or connection with others.'],
    ru: ['Регуляция эмоций, отношение к себе и отношения', 'Объединяет C1–C6 о регуляции эмоций, негативном отношении к себе и трудностях близости. Это сообщаемый опыт, а не заключение о личности или качестве отношений.', 'Если полезно, разделите области, где хочется поддержки: чувства, отношение к себе или контакт с другими.'],
  },
  'symptoms.itq.re_experiencing': {
    en: ['Re-experiencing in the present', 'Summarizes P1–P2 about distressing dreams or memories and images with a sense that the event is happening again.', 'You may note effects on rest or daily activities without trying to recreate the experience.'],
    ru: ['Повторное переживание в настоящем', 'Суммирует P1–P2 о тревожащих снах, воспоминаниях или образах с ощущением, что событие происходит снова.', 'Можно отметить влияние на отдых или повседневные дела, не пытаясь заново вызвать переживание.'],
  },
  'symptoms.itq.avoidance': {
    en: ['Avoidance of internal and external reminders', 'Summarizes P3–P4 about avoiding feelings, thoughts or sensations and external reminders.', 'If helpful, note practical limitations to discuss with a professional; facing reminders alone is not required.'],
    ru: ['Избегание внутренних и внешних напоминаний', 'Суммирует P3–P4 об избегании чувств, мыслей или ощущений и внешних напоминаний.', 'Если полезно, отметьте практические ограничения для обсуждения со специалистом; самостоятельно встречаться с напоминаниями не требуется.'],
  },
  'symptoms.itq.current_threat': {
    en: ['Sense of current threat', 'Summarizes P5–P6 about watchfulness and being easily startled. It describes a felt response and does not determine whether the environment is safe.', 'You may distinguish actual current safety needs from the reported sense of alertness, with support if needed.'],
    ru: ['Ощущение текущей угрозы', 'Суммирует P5–P6 о настороженности и лёгком испуге. Описывает переживаемую реакцию и не определяет безопасность обстановки.', 'Можно отдельно рассмотреть реальные потребности в безопасности сейчас и отмеченное ощущение настороженности, при необходимости с поддержкой.'],
  },
  'symptoms.itq.affective_dysregulation': {
    en: ['Difficulty settling emotions or feeling emotionally shut down', 'Summarizes C1–C2 about taking a long time to calm down and feeling emotionally numb. These different experiences can produce the same sum.', 'If useful, distinguish prolonged upset from numbness when describing what kind of support you want.'],
    ru: ['Трудности успокоения или эмоциональное онемение', 'Суммирует C1–C2 о долгом успокоении и эмоциональном онемении. Эти разные переживания могут давать одинаковую сумму.', 'Если полезно, различайте длительное волнение и онемение, описывая, какая поддержка вам нужна.'],
  },
  'symptoms.itq.negative_self_concept': {
    en: ['Negative feelings about oneself', 'Summarizes C3–C4 about feeling unsuccessful or without worth. The score describes those feelings; it does not establish that they are true.', 'You may name a self-critical feeling as an experience rather than a fact about your worth, and discuss it with someone qualified to help.'],
    ru: ['Негативные чувства по отношению к себе', 'Суммирует C3–C4 об ощущении неуспешности или отсутствия собственной ценности. Балл описывает эти чувства, а не подтверждает их истинность.', 'Можно назвать самокритичное чувство переживанием, а не фактом о своей ценности, и обсудить его со специалистом.'],
  },
  'symptoms.itq.disturbed_relationships': {
    en: ['Difficulty feeling connected and emotionally close', 'Summarizes C5–C6 about distance from others and difficulty maintaining emotional closeness. It does not judge another person or require greater intimacy.', 'If useful, consider a form of contact or support that respects your boundaries; closeness is not an obligation.'],
    ru: ['Трудности контакта и эмоциональной близости', 'Суммирует C5–C6 об отдалённости от других и трудностях эмоциональной близости. Не оценивает другого человека и не требует большей близости.', 'Если полезно, подумайте о контакте или поддержке, которые учитывают ваши границы; близость не является обязанностью.'],
  },
})

export function traumaScaleGuidance(dimension, locale = 'en') {
  const ru = locale === 'ru'
  const entry = SCALES[dimension?.key]?.[ru ? 'ru' : 'en']
  if (!entry) return null
  const [construct, explanation, observation] = entry
  const typical = dimension.timeframe === 'typical-patterns'
  const direction = ru
    ? typical ? 'Большая сумма означает большее согласие с описанием привычных переживаний.' : 'Большая сумма отражает большую сообщаемую выраженность этих переживаний за последний месяц.'
    : typical ? 'A larger sum means greater endorsement of these typical experiences.' : 'A larger sum reflects greater reported intensity of these experiences over the past month.'
  const boundaries = ru
    ? 'Диапазон показывает возможную сумму ответов, а не категории тяжести. Балл не устанавливает диагноз, причину, вероятность заболевания или лечение. Вопросы были на английском; русское пояснение не является валидированной адаптацией опросника.'
    : 'The range shows possible response sums, not severity categories. The score does not establish a diagnosis, cause, probability of illness or treatment. The questionnaire was in its original English; explanatory localization is not a validated questionnaire adaptation.'
  return { construct, summary: `${explanation} ${direction}`, meaning: `${explanation} ${direction} ${boundaries}`, observation }
}
