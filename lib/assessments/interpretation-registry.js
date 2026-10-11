import { PERSONALITY_TYPE_DEFINITIONS } from '../../data/assessments/personality-types-original-2026.js'
import { personalityDimensionGuidance } from './personality-type-interpretation.js'

// Published scoring categories are used only for the instrument/subscale/version below.
// All other score positions are DESCRIPTIVE, not clinical categories. This registry is
// designed for exact-version tests in MONITORING_CATALOG; it does not grant test rights.
export const INTERPRETATION_RULES_VERSION = '2026-10-11.v3'

// Each runnable instrument has a preauthored subject-specific bilingual reflection step.
// Clinical review is still required before these can be called diagnostic advice.
// The report combines it with direction-aware, non-prescriptive recommendations.
const ROWS = [
  [
    "hh-current-state",
    "general",
    "Pick the strongest difficulty today and note one factor that relieved or increased it.",
    "Выберите главную трудность сегодняшнего дня и отметьте, что её усилило или облегчило."
  ],
  [
    "mini-ipip-20",
    "personality",
    "Compare this personality tendency in two settings where your behaviour naturally differs; no trait needs to be “fixed”.",
    "Сравните проявление этой личностной особенности в двух ситуациях; ни одну черту не нужно «исправлять»."
  ],
  [
    "hh-weekly-pulse",
    "general",
    "Choose one weekly domain that matters to you and note how it affected your everyday choices.",
    "Выберите одну значимую сферу недели и отметьте, как она влияла на повседневные решения."
  ],
  [
    "phq-4",
    "mood",
    "Record how mood and worry separately affected your daily routine during the same two-week period.",
    "Отдельно отметьте, как настроение и беспокойство влияли на обычные дела за эти две недели."
  ],
  [
    "k6",
    "anxiety",
    "Review sleep, responsibilities and support alongside psychological strain across the past 30 days.",
    "Сопоставьте сон, нагрузку и поддержку с психологическим напряжением за последние 30 дней."
  ],
  [
    "phq-9",
    "mood",
    "If low mood, reduced interest or other symptoms persist, review their effect on functioning with a qualified clinician.",
    "Если сниженное настроение, потеря интереса или иные симптомы сохраняются, обсудите влияние на жизнь со специалистом."
  ],
  [
    "gad-7",
    "anxiety",
    "Note the situations in which worry becomes difficult to control and which supportive responses you can choose.",
    "Отмечайте ситуации, когда беспокойством трудно управлять, и доступные вам способы поддержки."
  ],
  [
    "hh-resource-pulse",
    "support",
    "Choose one resource you can access this week—rest, connection, help or a meaningful activity.",
    "Выберите один доступный ресурс на эту неделю: отдых, контакт, помощь или значимое действие."
  ],
  [
    "hh-monthly-profile",
    "general",
    "Review which life area changed most this month and what context might explain the shift.",
    "Посмотрите, какая жизненная сфера сильнее изменилась за месяц и какой контекст мог повлиять."
  ],
  [
    "phq-2",
    "mood",
    "Notice the frequency of low mood and loss of interest, and seek further assessment if the screening signal is raised.",
    "Отметьте частоту снижения настроения и интереса; при повышенном скрининговом сигнале обсудите дальнейшую оценку."
  ],
  [
    "gad-2",
    "anxiety",
    "Note how often nervousness and uncontrollable worry appear; discuss a deeper assessment when indicated.",
    "Отметьте частоту нервозности и неконтролируемого беспокойства; при необходимости обсудите углублённую оценку."
  ],
  [
    "k10",
    "anxiety",
    "Look for patterns in distress, recovery and functioning during the month without assigning a diagnosis from this score.",
    "Ищите связи нагрузки, восстановления и повседневных дел за месяц, не делая вывод о диагнозе по баллу."
  ],
  [
    "hh-social-battery",
    "relationship",
    "Identify a social interaction that restored energy and one that left you needing space.",
    "Вспомните контакт, который придавал силы, и контакт, после которого понадобилось побыть одному."
  ],
  [
    "hh-focus-mode",
    "attention",
    "Test one ten-minute distraction-free task and note what helped you stay engaged.",
    "Попробуйте десять минут работы без отвлечений и отметьте, что помогло удержать внимание."
  ],
  [
    "hh-stress-weather",
    "anxiety",
    "Record one stressful situation, your first body signal, and what happened after a small pause.",
    "Запишите одну напряжённую ситуацию, первый телесный сигнал и изменения после короткой паузы."
  ],
  [
    "hh-recharge-decoder",
    "support",
    "Compare two ordinary recovery activities and note which actually restores your energy.",
    "Сравните два привычных способа отдыха и отметьте, какой действительно восстанавливает силы."
  ],
  [
    "hh-boundary-radar",
    "boundaries",
    "Choose a low-risk moment to express a preference or to ask for time before agreeing.",
    "Выберите безопасную ситуацию, чтобы обозначить предпочтение или попросить время перед согласием."
  ],
  [
    "hh-tiny-joys",
    "mood",
    "Notice one small pleasant moment each day and whether it changes your engagement with the day.",
    "Ежедневно замечайте один небольшой приятный момент и его влияние на включённость в день."
  ],
  [
    "mspss",
    "support",
    "Reflect separately on available support from friends, family and one trusted person; identify whom you can ask for a concrete favour.",
    "Раздельно рассмотрите поддержку друзей, семьи и близкого человека; выберите, у кого можно попросить конкретную помощь."
  ],
  [
    "erq",
    "mood",
    "Notice when reframing a situation helps and when holding feelings inside adds strain; neither strategy is always right or wrong.",
    "Отмечайте, когда переосмысление помогает и когда сдерживание эмоций усиливает нагрузку; обе стратегии зависят от контекста."
  ],
  [
    "phq-15",
    "energy",
    "Track the bodily symptoms most disruptive to daily life and bring persistent or new concerns to a medical professional.",
    "Отметьте телесные симптомы, сильнее мешающие обычным делам; новые или стойкие жалобы обсудите с врачом."
  ],
  [
    "brcs",
    "support",
    "Choose one difficult situation and identify two coping responses you can realistically try, without judging your character.",
    "Выберите одну трудную ситуацию и два посильных варианта совладания без оценки собственной личности."
  ],
  [
    "hh-sleep-reset",
    "sleep",
    "Compare a consistent waking time and a gentler evening transition over several days.",
    "Несколько дней сравнивайте эффект постоянного времени подъёма и более спокойного завершения вечера."
  ],
  [
    "hh-morning-battery",
    "energy",
    "Observe energy on waking and what gentle morning routine supports your first task.",
    "Наблюдайте уровень энергии утром и какой мягкий утренний ритуал помогает начать первое дело."
  ],
  [
    "hh-evening-landing",
    "sleep",
    "Create a brief evening transition that signals the end of work or obligations.",
    "Придумайте небольшой вечерний переход, обозначающий завершение дел."
  ],
  [
    "hh-decision-fog",
    "attention",
    "Break one pending decision into facts, uncertainties and one reversible first step.",
    "Разделите одно решение на известные факты, неопределённости и первый обратимый шаг."
  ],
  [
    "hh-start-button",
    "attention",
    "Begin one delayed task with a two-minute step and note what makes starting easier.",
    "Начните отложенное дело с двух минут и отметьте, что облегчает начало."
  ],
  [
    "hh-screen-saturation",
    "attention",
    "Notice changes in comfort and concentration before and after a short device-free break.",
    "Сравните самочувствие и концентрацию до и после короткой паузы без экранов."
  ],
  [
    "hh-inner-critic",
    "selfcompassion",
    "Write down one harsh self-judgment and rephrase it in a more accurate and compassionate way.",
    "Запишите одну жёсткую мысль о себе и переформулируйте её точнее и доброжелательнее."
  ],
  [
    "hh-inner-ally",
    "selfcompassion",
    "Identify one supportive phrase or action you would genuinely accept from yourself today.",
    "Найдите одну поддерживающую фразу или действие, которые вы готовы принять от себя сегодня."
  ],
  [
    "hh-meaning-compass",
    "general",
    "Select one value that matters now and take a small action aligned with it.",
    "Выберите важную сейчас ценность и одно небольшое действие в её направлении."
  ],
  [
    "hh-motivation-spark",
    "attention",
    "Notice which meaningful task evokes curiosity and reduce it to one doable start.",
    "Отметьте дело, вызывающее интерес, и сократите его до одного посильного начала."
  ],
  [
    "hh-change-readiness",
    "general",
    "Separate what you want to change from what you feel ready to try this week.",
    "Отделите желаемое изменение от того, что вы действительно готовы попробовать на неделе."
  ],
  [
    "hh-workload-weather",
    "work",
    "Mark one avoidable demand and one boundary or adjustment that may improve recovery.",
    "Отметьте одну лишнюю нагрузку и одну границу или поправку, помогающую восстановлению."
  ],
  [
    "hh-body-signals",
    "energy",
    "Describe a body signal without deciding its cause; note when medical advice is appropriate.",
    "Опишите телесный сигнал без вывода о причине и отметьте, когда нужен медицинский совет."
  ],
  [
    "hh-rest-permission",
    "support",
    "Plan a modest guilt-free rest period and reflect on what made it difficult or possible.",
    "Запланируйте небольшую паузу отдыха без чувства вины и отметьте, что помогло или мешало."
  ],
  [
    "hh-closeness-compass",
    "relationship",
    "Clarify one comfortable form of contact and one boundary you wish others to respect.",
    "Уточните одну комфортную форму близости и одну границу, которую важно уважать."
  ],
  [
    "hh-confidence-pulse",
    "selfcompassion",
    "Recall one manageable action you completed and a new small action you would willingly attempt.",
    "Вспомните одно посильное завершённое дело и новый небольшой шаг, который хочется попробовать."
  ],
  [
    "hh-playfulness-pulse",
    "mood",
    "Make room for one low-pressure enjoyable activity without measuring productivity.",
    "Выделите время на одну приятную активность без требования пользы или результата."
  ],
  [
    "hh-daily-rhythm",
    "sleep",
    "Look for repeating energy patterns and consider one sustainable adjustment to your routine.",
    "Заметьте повторяющиеся колебания энергии и одну устойчивую поправку к распорядку."
  ],
  [
    "hh-money-pressure",
    "work",
    "Distinguish controllable financial tasks from worries outside your immediate influence.",
    "Разделите финансовые задачи, на которые можно влиять, и беспокойство вне непосредственного контроля."
  ],
  [
    "hh-overthinking-loop",
    "anxiety",
    "When thoughts cycle, name the question, identify what is knowable and choose a bounded decision time.",
    "При повторяющихся мыслях назовите вопрос, отделите известное и выделите время на решение."
  ],
  [
    "hh-felt-safety",
    "support",
    "Notice one situation where your body feels at ease and identify an optional grounding action.",
    "Заметьте ситуацию телесного спокойствия и доступный добровольный способ заземления."
  ],
  [
    "hh-emotion-clarity",
    "mood",
    "Try naming a feeling, its intensity and an unmet need without judging any response.",
    "Попробуйте назвать чувство, его интенсивность и потребность без осуждения своих реакций."
  ],
  [
    "hh-loss-adjustment",
    "mood",
    "Allow room for grief at your own pace and consider one steady source of support; do not force imagery.",
    "Дайте переживанию утраты собственный темп и найдите источник поддержки; не заставляйте себя визуализировать."
  ],
  [
    "hh-belonging",
    "relationship",
    "Identify a group or person with whom you can be yourself, and one safe point of connection.",
    "Найдите круг или человека, с которым можно быть собой, и один безопасный способ контакта."
  ],
  [
    "hh-conflict-repair",
    "relationship",
    "Reflect on one difficult conversation: what mattered to you and what a safe repair could look like.",
    "Подумайте об одном трудном разговоре: что было важно и как могло бы выглядеть безопасное восстановление контакта."
  ],
  [
    "hh-family-roles",
    "boundaries",
    "Notice an inherited family role and an adult choice that you can make independently today.",
    "Отметьте привычную семейную роль и самостоятельный взрослый выбор, доступный сегодня."
  ],
  [
    "hh-inner-imagery",
    "selfcompassion",
    "If imagination feels comfortable, describe one calming image; stop if imagery feels distressing.",
    "Если воображать комфортно, опишите спокойный образ; прекратите, если это неприятно."
  ],
  [
    "hh-values-direction",
    "general",
    "Connect one personally chosen value to a small observable action this week.",
    "Свяжите одну самостоятельно выбранную ценность с маленьким наблюдаемым действием на неделе."
  ],
  [
    "hh-life-transition",
    "support",
    "Distinguish what remains stable during this change from what genuinely needs support.",
    "Отделите то, что остаётся устойчивым в период перемен, от того, что требует поддержки."
  ],
  [
    "hh-speaking-up",
    "boundaries",
    "Prepare one short sentence expressing a preference in a low-pressure setting.",
    "Подготовьте короткую фразу о своих предпочтениях для спокойной ситуации."
  ],
  [
    "hh-sustainable-pace",
    "work",
    "Look for one sign of overload and a sustainable pace you can repeat without exhaustion.",
    "Отмечайте признак перегрузки и темп, который можно сохранять без истощения."
  ],
  [
    "hh-support-seeking",
    "support",
    "Choose one specific, manageable request to a trusted person; asking is optional, not a duty.",
    "Сформулируйте одну посильную просьбу к надёжному человеку; обращаться за помощью необязательно."
  ],
  [
    "hh-sensory-comfort",
    "energy",
    "Identify a comfortable sound, texture or space and allow yourself to adjust the environment.",
    "Выберите приятный звук, фактуру или место и разрешите себе менять обстановку."
  ],
  [
    "hh-goal-obstacles",
    "attention",
    "Name one real obstacle and a smaller first action that remains within your control.",
    "Назовите одно реальное препятствие и более маленький первый шаг в зоне контроля."
  ],
  [
    "hh-body-mind-context",
    "energy",
    "Observe context, body sensations and concern as separate observations; do not assume a psychological cause.",
    "Наблюдайте контекст, телесное ощущение и беспокойство отдельно; не приписывайте всему психологическую причину."
  ],
  [
    "hh-energy-drains",
    "energy",
    "Find one recurring energy drain and one way of reducing its cost without overextending yourself.",
    "Заметьте повторяющуюся трату сил и способ снизить её без лишнего напряжения."
  ],
  [
    "hh-social-ease",
    "relationship",
    "Notice which social situations feel easiest and what choices help you stay comfortable.",
    "Отмечайте наиболее комфортные ситуации общения и способы сохранять удобный для себя ритм."
  ],
  [
    "hh-solitude-choice",
    "relationship",
    "Distinguish restorative time alone from unwanted isolation and choose contact on your terms.",
    "Различайте восстанавливающее уединение и нежелательную изоляцию; выбирайте общение на своих условиях."
  ],
  [
    "hh-relationship-balance",
    "relationship",
    "Reflect on when giving and receiving support feel balanced, without judging either person.",
    "Подумайте, когда отдавать и получать поддержку удаётся сбалансированно, не оценивая людей."
  ],
  [
    "hh-approval-pressure",
    "boundaries",
    "Notice a moment of seeking approval and consider one safe, respectful independent choice.",
    "Заметьте стремление получить одобрение и один безопасный самостоятельный выбор."
  ],
  [
    "hh-perfectionism-pressure",
    "selfcompassion",
    "Define “good enough” for one task and note how that changes the effort required.",
    "Определите «достаточно хорошо» для одной задачи и отметьте, как это влияет на затраты сил."
  ],
  [
    "hh-uncertainty-flexibility",
    "anxiety",
    "Choose one uncertain situation and practise responding to what is known without forcing certainty.",
    "Выберите неопределённую ситуацию и действуйте исходя из известного, не требуя полной уверенности."
  ],
  [
    "hh-role-freedom",
    "personality",
    "Describe a role that serves you and one choice you can make outside that role.",
    "Опишите роль, которая помогает, и один выбор вне этой роли."
  ],
  [
    "hh-work-boundaries",
    "work",
    "Clarify one realistic work limit and rehearse how to express it respectfully.",
    "Уточните одну реалистичную рабочую границу и как уважительно её выразить."
  ],
  [
    "phq-8",
    "mood",
    "Consider whether reported low mood or interest changes how you function; discuss persistent symptoms with a qualified clinician.",
    "Оцените влияние сниженного настроения или интереса на жизнь; стойкие симптомы обсудите со специалистом."
  ],
  [
    "cbi-personal",
    "burnout",
    "Compare exhaustion with time available for rest, sleep and your personal obligations.",
    "Сопоставьте истощение с возможностью отдыха, сном и личными обязанностями."
  ],
  [
    "cbi-work",
    "burnout",
    "Compare exhaustion during working days and rest days; consider a realistic workload change.",
    "Сравните истощение в рабочие и выходные дни; подумайте о посильном изменении нагрузки."
  ],
  [
    "cbi-client",
    "burnout",
    "Notice exhaustion specifically after supporting clients or other people, and plan recoverable breaks.",
    "Замечайте истощение после работы с клиентами или помощи людям и планируйте восстанавливающие паузы."
  ],
  [
    "rses-10",
    "selfcompassion",
    "Notice what affects self-respect and try one self-supportive action unrelated to achievement.",
    "Заметьте, что влияет на самоуважение, и попробуйте действие самоподдержки без привязки к достижениям."
  ],
  [
    "ces-d-20",
    "mood",
    "Reflect on the frequency and impact of low-mood experiences during the past week; seek clinical context if persistent.",
    "Оцените частоту и влияние переживаний сниженного настроения за неделю; при стойких трудностях обсудите их со специалистом."
  ],
  [
    "cdc-hrqol-4",
    "functioning",
    "Look separately at perceived health, physically/mentally difficult days and days when activities were limited.",
    "Рассмотрите отдельно общую оценку здоровья, трудные физически/психически дни и ограничения обычных дел."
  ],
  [
    "cdc-healthy-days-symptoms",
    "energy",
    "Track which recent days were affected by pain, anxiety, low mood or sleep, without inferring causes from day counts.",
    "Отметьте дни с болью, тревогой, сниженным настроением или трудностями сна, не выводя причины по количеству дней."
  ],
  ["ipip-big-five-50","personality","Compare your five distinct personality tendencies across situations; treat them as flexible descriptions, not diagnoses or improvement targets.","Сопоставляйте пять независимых личностных особенностей в разных ситуациях: это гибкие описания, а не диагнозы и не показатели, которые обязательно нужно улучшать."],
  ["hh-bach-flower-profile","general","Reflect on your responses across 38 traditional Bach emotional themes. Scores show weighted questionnaire matches, not a clinical test or remedy prescription.","Обратите внимание на ответы по 38 традиционным эмоциональным темам Баха. Значения отражают взвешенные совпадения, а не диагноз и не назначение эссенций."],
  ["hh-socionics-32","personality","Compare your preferences across four pairs; uncertain or tied results should stay open to alternatives.","Сравните предпочтения в четырёх парах. При близких или равных значениях рассматривайте альтернативы, а не назначайте себе тип."],
  ["hh-enneagram-36","personality","Explore the nine motivational patterns as possibilities and compare similar top scores with real-life examples.","Исследуйте девять мотивационных тем как возможные описания и сопоставляйте близкие результаты с примерами из жизни."],
  ["hh-disc-style-20","personality","Notice which of the four conversation and work styles you use in different circumstances.","Наблюдайте, какие из четырёх стилей общения и работы проявляются в разных обстоятельствах."],
  ["hh-temperaments-16","personality","Reflect on four historical temperament tendencies and how your responses vary by situation.","Рассмотрите четыре исторических темперамента и то, как ваши реакции меняются в разных обстоятельствах."],
]
export const INTERPRETATION_PLANS = Object.freeze(Object.fromEntries(
  ROWS.map(([key, domain, en, ru]) => [key, Object.freeze({
    key, version: key === 'hh-current-state' ? 'v2' : 'v1',
    supportedVersions: Object.freeze(key === 'hh-current-state' ? ['v1', 'v2'] : ['v1']),
    reviewStatus: 'preauthored-requires-clinical-qa',
    domain, step: Object.freeze({ en, ru }),
  })]),
))

// Only cutoffs with source-backed scoring guidance. Missing entries are not
// silently transformed into diagnostic thresholds.
// Explicit interpretation context for every subscale in multi-dimensional tools.
// These exact keys are checked against the versioned scorer by unit tests.
const DIMENSION_ROWS = [
  [
    "hh-current-state",
    "state.problem_intensity",
    "general",
    "Present difficulty",
    "Текущая трудность",
    "Write down what makes the main difficulty stronger, and one condition in which it eases.",
    "Запишите, что усиливает основную трудность, и одно условие, при котором она ослабевает."
  ],
  [
    "hh-current-state",
    "state.resource",
    "support",
    "Energy and inner support",
    "Ресурс и внутренняя опора",
    "Name one accessible source of support and whether you can use it today.",
    "Назовите один доступный источник поддержки и возможность опереться на него сегодня."
  ],
  [
    "hh-current-state",
    "state.tension",
    "anxiety",
    "Inner tension",
    "Внутреннее напряжение",
    "Note when tension rises and try a brief comfortable grounding pause without forcing your breathing.",
    "Отметьте, когда нарастает напряжение, и попробуйте короткое комфортное заземление без управления дыханием через усилие."
  ],
  [
    "hh-current-state",
    "state.fatigue",
    "energy",
    "Fatigue",
    "Усталость",
    "Compare fatigue with sleep, tasks and rest, and seek medical advice if it is new or persistent.",
    "Сопоставьте усталость со сном, нагрузкой и отдыхом; при новой или стойкой усталости обратитесь к врачу."
  ],
  [
    "hh-current-state",
    "state.life_impact",
    "functioning",
    "Impact on daily life",
    "Влияние на повседневную жизнь",
    "Identify one daily activity affected and what modest practical support would make it easier.",
    "Выберите одно затронутое повседневное дело и небольшую практическую помощь, которая могла бы облегчить его."
  ],
  [
    "hh-weekly-pulse",
    "weekly.mood",
    "mood",
    "Emotional wellbeing",
    "Эмоциональное состояние",
    "Notice one event that improved or reduced your sense of wellbeing this week.",
    "Отметьте событие недели, повлиявшее на эмоциональное самочувствие."
  ],
  [
    "hh-weekly-pulse",
    "weekly.tension",
    "anxiety",
    "Anxiety and tension",
    "Тревога и напряжение",
    "Notice the main triggers of tension and when you were able to regain comfort.",
    "Отметьте основные поводы для напряжения и моменты, когда удавалось вернуть комфорт."
  ],
  [
    "hh-weekly-pulse",
    "weekly.load",
    "anxiety",
    "Stress and load",
    "Стресс и нагрузка",
    "Choose one demand you can reduce or share without creating more pressure.",
    "Выберите одну нагрузку, которую можно уменьшить или разделить без дополнительного давления."
  ],
  [
    "hh-weekly-pulse",
    "weekly.recovery",
    "sleep",
    "Sleep and recovery",
    "Сон и восстановление",
    "Observe whether a gentler evening routine supports feeling rested the next morning.",
    "Понаблюдайте, помогает ли более спокойный вечер лучше восстановиться к утру."
  ],
  [
    "hh-weekly-pulse",
    "weekly.energy",
    "energy",
    "Usable energy",
    "Доступная энергия",
    "Notice your strongest and weakest energy periods and protect one restorative pause.",
    "Отметьте периоды большей и меньшей энергии и одну восстанавливающую паузу."
  ],
  [
    "hh-weekly-pulse",
    "weekly.clarity",
    "attention",
    "Mental clarity",
    "Ясность мышления",
    "Try a manageable distraction-free task and notice the conditions that support clearer thinking.",
    "Попробуйте посильную задачу без отвлечений и отметьте условия более ясного мышления."
  ],
  [
    "hh-weekly-pulse",
    "weekly.connection",
    "support",
    "Connection and support",
    "Контакт и поддержка",
    "Identify one person or place where connection has felt safe and accessible.",
    "Вспомните человека или место, где контакт ощущается безопасным и доступным."
  ],
  [
    "hh-weekly-pulse",
    "weekly.functioning",
    "functioning",
    "Daily functioning",
    "Повседневные дела",
    "Notice which ordinary task needs adjustment, not a harsher demand on yourself.",
    "Отметьте повседневное дело, требующее поддержки или адаптации, а не усиления давления на себя."
  ],
  [
    "hh-resource-pulse",
    "resource.energy",
    "energy",
    "Energy",
    "Энергия",
    "Choose one small activity with realistic energy demands and plan recovery afterwards.",
    "Выберите небольшое дело по силам и предусмотрите время на восстановление."
  ],
  [
    "hh-resource-pulse",
    "resource.self_support",
    "selfcompassion",
    "Inner support",
    "Внутренняя опора",
    "Practice one fair, compassionate sentence to yourself when something is difficult.",
    "Попробуйте одно справедливое поддерживающее высказывание себе в трудной ситуации."
  ],
  [
    "hh-resource-pulse",
    "resource.support",
    "support",
    "Available support",
    "Доступная поддержка",
    "List one person, place or service you can turn to if support is needed.",
    "Назовите человека, место или службу, куда можно обратиться при необходимости."
  ],
  [
    "hh-resource-pulse",
    "resource.connection",
    "relationship",
    "Connection",
    "Близость и контакт",
    "Identify a small form of social connection you would genuinely welcome.",
    "Выберите небольшую форму общения, которая вам действительно подходит."
  ],
  [
    "hh-resource-pulse",
    "resource.agency",
    "functioning",
    "Ability to act",
    "Возможность действовать",
    "Identify one part of your next step that remains within your control.",
    "Отметьте одну часть следующего шага, которая остаётся под вашим влиянием."
  ],
  [
    "hh-resource-pulse",
    "resource.meaning",
    "general",
    "Meaning and direction",
    "Смысл и направление",
    "Choose one value you care about and a small action consistent with it.",
    "Выберите важную ценность и одно небольшое действие в её направлении."
  ],
  [
    "hh-resource-pulse",
    "resources.overall",
    "support",
    "Overall resources",
    "Общие ресурсы",
    "Review which resource feels available now and which one would be helpful to develop.",
    "Рассмотрите, какой ресурс уже доступен и какой хотелось бы укрепить."
  ],
  [
    "hh-monthly-profile",
    "resources.monthly.self",
    "selfcompassion",
    "Relationship with self",
    "Отношение к себе",
    "Reflect on your capacity for self-care and a realistic way to support yourself.",
    "Оцените возможность бережно относиться к себе и реальный способ самоподдержки."
  ],
  [
    "hh-monthly-profile",
    "resources.monthly.relationships",
    "relationship",
    "Relationships",
    "Отношения",
    "Notice where you can ask for support or set a respectful boundary.",
    "Отметьте отношения, в которых можно попросить поддержки или обозначить границу."
  ],
  [
    "hh-monthly-profile",
    "resources.monthly.body",
    "energy",
    "Body and recovery",
    "Тело и восстановление",
    "Distinguish physical comfort, sleep and energy; seek medical help for persistent symptoms.",
    "Разделите ощущения тела, восстановление после сна и уровень сил; стойкие симптомы обсудите с врачом."
  ],
  [
    "hh-monthly-profile",
    "resources.monthly.work",
    "work",
    "Work and activity",
    "Работа и деятельность",
    "Identify one adjustment to workload, focus or recovery that is actually within reach.",
    "Выберите доступную корректировку нагрузки, внимания или восстановления."
  ],
  [
    "hh-monthly-profile",
    "resources.monthly.meaning",
    "general",
    "Meaning and direction",
    "Смысл и направление",
    "Choose one meaningful direction and a small choice that could express it this month.",
    "Выберите значимое направление и небольшой выбор, который может проявить его в этом месяце."
  ],
  [
    "hh-monthly-profile",
    "resources.monthly.support",
    "support",
    "Practical and emotional support",
    "Практическая и эмоциональная поддержка",
    "Consider who could provide practical or emotional support if you decide to ask.",
    "Подумайте, кто мог бы помочь делом или эмоционально, если решите обратиться."
  ],
  [
    "hh-monthly-profile",
    "resources.monthly.overall",
    "general",
    "Overall monthly profile",
    "Общий профиль месяца",
    "Review differences across life areas; an average can hide both strengths and difficulties.",
    "Посмотрите различия между сферами жизни: общий балл может скрывать сильные стороны и трудности."
  ],
  [
    "mini-ipip-20",
    "trait.extraversion",
    "personality",
    "Extraversion",
    "Экстраверсия",
    "Notice whether quieter or more social environments better suit you in different situations.",
    "Замечайте, когда вам больше подходит спокойная обстановка, а когда — общение."
  ],
  [
    "mini-ipip-20",
    "trait.agreeableness",
    "personality",
    "Agreeableness",
    "Доброжелательность и сотрудничество",
    "Observe how cooperation and personal boundaries work together in different relationships.",
    "Наблюдайте, как сочетаются сотрудничество и личные границы в разных отношениях."
  ],
  [
    "mini-ipip-20",
    "trait.conscientiousness",
    "personality",
    "Conscientiousness",
    "Организованность",
    "Consider which planning habits support you and when flexibility is more useful.",
    "Подумайте, какие способы планирования поддерживают вас и когда полезнее гибкость."
  ],
  [
    "mini-ipip-20",
    "trait.neuroticism",
    "personality",
    "Emotional reactivity",
    "Эмоциональная реактивность",
    "Notice when feelings change under stress without labelling emotional sensitivity a defect.",
    "Отмечайте изменения чувств при стрессе, не называя эмоциональную чувствительность недостатком."
  ],
  [
    "mini-ipip-20",
    "trait.intellect_imagination",
    "personality",
    "Imagination and intellectual interests",
    "Воображение и интеллектуальные интересы",
    "Reflect on when abstract ideas and imagination enrich your choices and when practical details matter.",
    "Подумайте, когда идеи и воображение обогащают решения, а когда важнее практические детали."
  ],
  [
    "phq-4",
    "symptoms.phq4.total",
    "mood",
    "Mood and anxiety screening",
    "Скрининг настроения и тревоги",
    "Review mood and anxiety symptoms separately; the combined score alone does not explain which area needs attention.",
    "Рассмотрите симптомы настроения и тревоги отдельно: суммарный балл не показывает, какой сфере нужна поддержка."
  ],
  [
    "phq-4",
    "symptoms.phq4.depression",
    "mood",
    "Mood screening subscale",
    "Подшкала настроения",
    "If reduced interest or low mood is frequent, consider discussing it with a qualified clinician.",
    "Если снижение интереса или настроения бывает часто, обсудите это с квалифицированным специалистом."
  ],
  [
    "phq-4",
    "symptoms.phq4.anxiety",
    "anxiety",
    "Anxiety screening subscale",
    "Подшкала тревоги",
    "Observe when worry is hard to control; consider further evaluation when the screening signal is elevated.",
    "Наблюдайте, когда беспокойством трудно управлять; при повышенном скрининговом сигнале рассмотрите дальнейшую оценку."
  ],
  [
    "mspss",
    "resources.mspss.significant_other",
    "support",
    "Support from a close person",
    "Поддержка близкого человека",
    "Reflect on whether a trusted person is reachable when you need concrete emotional support.",
    "Подумайте, доступен ли близкий человек, когда нужна конкретная эмоциональная поддержка."
  ],
  [
    "mspss",
    "resources.mspss.family",
    "support",
    "Family support",
    "Поддержка семьи",
    "Notice which family contacts feel supportive and what expectations or boundaries matter.",
    "Отметьте поддерживающие семейные контакты и важные ожидания или границы."
  ],
  [
    "mspss",
    "resources.mspss.friends",
    "support",
    "Support from friends",
    "Поддержка друзей",
    "Identify a friend with whom you can share a concern or enjoyable moment, if appropriate.",
    "Вспомните друга, с которым уместно разделить трудность или приятный момент."
  ],
  [
    "mspss",
    "resources.mspss.overall",
    "support",
    "Overall perceived social support",
    "Общая воспринимаемая поддержка",
    "Compare the three sources of support rather than relying only on their average.",
    "Сопоставьте три источника поддержки, а не только их среднее значение."
  ],
  [
    "erq",
    "resources.erq.reappraisal",
    "mood",
    "Cognitive reappraisal",
    "Когнитивная переоценка",
    "Notice whether reframing an event creates a new choice without denying what you feel.",
    "Отмечайте, помогает ли переосмысление события увидеть выбор, не отрицая чувства."
  ],
  [
    "erq",
    "resources.erq.suppression",
    "mood",
    "Expressive suppression",
    "Подавление выражения эмоций",
    "Reflect on situations where keeping feelings private feels useful, and those where expression would be safer.",
    "Подумайте, когда сдерживать внешнее выражение чувств полезно, а когда безопаснее ими поделиться."
  ],
  [
    "cdc-hrqol-4",
    "function.hrqol4.general_health",
    "energy",
    "Self-rated general health",
    "Самооценка здоровья",
    "Describe what informs your health rating; the answer does not identify any medical cause.",
    "Опишите, на чём основана ваша оценка здоровья; ответ не определяет медицинскую причину."
  ],
  [
    "cdc-hrqol-4",
    "symptoms.hrqol4.physically_unhealthy_days",
    "energy",
    "Physically difficult days",
    "Дни физического недомогания",
    "Count the days physical health affected daily life and consider medical evaluation for ongoing symptoms.",
    "Отметьте дни физического недомогания и при стойких жалобах рассмотрите медицинскую оценку."
  ],
  [
    "cdc-hrqol-4",
    "symptoms.hrqol4.mentally_unhealthy_days",
    "mood",
    "Mentally difficult days",
    "Дни психологического неблагополучия",
    "Review when emotional strain affected the day, alongside available coping support.",
    "Отметьте дни психологического напряжения и доступную поддержку."
  ],
  [
    "cdc-hrqol-4",
    "function.hrqol4.activity_limitation_days",
    "functioning",
    "Days with activity limitations",
    "Дни ограничения активности",
    "Notice which activities were affected and what practical adjustments may help.",
    "Отметьте затронутые повседневные дела и возможные практические адаптации."
  ],
  [
    "cdc-hrqol-4",
    "symptoms.hrqol4.unhealthy_days_index",
    "energy",
    "Unhealthy days index",
    "Суммарные дни недомогания",
    "Remember this index is capped at 30 overlapping calendar days, not a sum of different diagnoses.",
    "Помните, что показатель ограничен 30 календарными днями с возможным наложением жалоб, а не является суммой диагнозов."
  ],
  [
    "cdc-hrqol-4",
    "resources.hrqol4.healthy_days_index",
    "energy",
    "Estimated healthier days",
    "Оценка более благополучных дней",
    "Use this count to reflect on days of relative wellbeing, without assuming all other days were symptom-free.",
    "Используйте показатель для наблюдения за днями относительного благополучия, не предполагая отсутствия любых симптомов."
  ],
  [
    "cdc-healthy-days-symptoms",
    "symptoms.cdc_healthy_days.pain_days",
    "energy",
    "Days affected by pain",
    "Дни с болью",
    "If pain occurs repeatedly or worsens, discuss it with a healthcare professional.",
    "Если боль повторяется или усиливается, обсудите её с врачом."
  ],
  [
    "cdc-healthy-days-symptoms",
    "symptoms.cdc_healthy_days.sad_days",
    "mood",
    "Days with low mood",
    "Дни сниженного настроения",
    "Notice what was happening on low-mood days and whether support would be useful.",
    "Отметьте контекст дней сниженного настроения и необходимость поддержки."
  ],
  [
    "cdc-healthy-days-symptoms",
    "symptoms.cdc_healthy_days.anxiety_days",
    "anxiety",
    "Days affected by worry",
    "Дни тревоги",
    "Track whether anxiety days coincide with specific demands or reduce your functioning.",
    "Отметьте, совпадают ли дни тревоги с нагрузкой или ограничивают обычные дела."
  ],
  [
    "cdc-healthy-days-symptoms",
    "symptoms.cdc_healthy_days.sleep_days",
    "sleep",
    "Days with inadequate rest",
    "Дни недостаточного отдыха",
    "Observe sleep regularity and speak to a clinician if problems persist or affect daytime safety.",
    "Понаблюдайте за регулярностью сна; при стойких проблемах или дневных рисках обратитесь к специалисту."
  ],
  [
    "cdc-healthy-days-symptoms",
    "resources.cdc_healthy_days.vitality_days",
    "energy",
    "Days with enough energy",
    "Дни с достаточной энергией",
    "Notice which ordinary activities or conditions coincide with more energetic days.",
    "Отмечайте занятия или условия, совпадающие с более энергичными днями."
  ],
  ["ipip-big-five-50","trait.ipip50.extraversion","personality","Extraversion","Экстраверсия","Notice settings where interaction feels invigorating and where quieter time feels right.","Отмечайте, когда общение придаёт силы, а когда подходит спокойная обстановка."],
  ["ipip-big-five-50","trait.ipip50.agreeableness","personality","Agreeableness","Доброжелательность","Consider how empathy, cooperation and healthy boundaries work together for you.","Подумайте, как сочетаются сопереживание, сотрудничество и личные границы."],
  ["ipip-big-five-50","trait.ipip50.conscientiousness","personality","Conscientiousness","Добросовестность и организованность","Observe which planning habits support your goals without requiring perfection.","Отметьте способы планирования, помогающие достигать целей без перфекционизма."],
  ["ipip-big-five-50","trait.ipip50.emotional_stability","personality","Emotional stability","Эмоциональная устойчивость","Reflect on what supports steadiness during stress without treating sensitivity as a disorder.","Подумайте, что поддерживает равновесие при стрессе, не считая чувствительность расстройством."],
  ["ipip-big-five-50","trait.ipip50.intellect_imagination","personality","Intellect and imagination","Интеллектуальные интересы и воображение","Notice which settings benefit from curiosity and imagination and which benefit from practical focus.","Замечайте, когда помогают любознательность и воображение, а когда — практическая сосредоточенность."],
  // Distinct, original Holistic House trait scales with explicit EN/RU construct names and authored steps.
  ...PERSONALITY_TYPE_DEFINITIONS
    .filter(def => def.instrumentLocale === 'en')
    .flatMap(def => {
      const counterpart = PERSONALITY_TYPE_DEFINITIONS.find(item => item.key === def.key && item.instrumentLocale === 'ru')
      if (!counterpart) throw new Error('MISSING_PERSONALITY_TRANSLATION')
      return def.scoring.dimensions.map(dimension => {
        const translation = counterpart.scoring.dimensions.find(item => item.key === dimension.key)
        const enGuide = personalityDimensionGuidance(dimension, 'en')
        const ruGuide = personalityDimensionGuidance(translation, 'ru')
        if (!translation || !enGuide || !ruGuide) throw new Error('MISSING_PERSONALITY_SCALE_GUIDANCE')
        return [def.key, dimension.key, 'personality',
          dimension.sourceConstruct, translation.sourceConstruct,
          enGuide.steps[0], ruGuide.steps[0]]
      })
    }),

]
const EXPLICIT_DIMENSION_PLANS = Object.freeze(Object.fromEntries(
  Object.keys(INTERPRETATION_PLANS).map(key => [key, Object.freeze(Object.fromEntries(
    DIMENSION_ROWS.filter(row => row[0] === key).map(([,dimensionKey,domain,enLabel,ruLabel,en,ru]) =>
      [dimensionKey, Object.freeze({
        domain,
        label: Object.freeze({en: enLabel, ru: ruLabel}),
        step: Object.freeze({en, ru}),
        explicit: true,
      })])
  ))])
))

export function interpretationDimensionPlan(result, dimensionKey) {
  const plan = interpretationPlan(result?.definitionKey, result?.definitionVersion)
  if (!plan) return null
  return EXPLICIT_DIMENSION_PLANS[plan.key]?.[dimensionKey] || Object.freeze({
    domain: plan.domain, label: null, step: plan.step, explicit: false,
  })
}

const PUBLISHED_BANDS = Object.freeze({
  "phq-2": {
    "symptoms.phq2.total": {
      "min": 0,
      "max": 6,
      "starts": [
        0,
        3
      ],
      "labels": [
        "below_screen",
        "screen_signal"
      ],
      "kind": "screening",
      "url": "https://pubmed.ncbi.nlm.nih.gov/19616305/"
    }
  },
  "gad-2": {
    "symptoms.gad2.total": {
      "min": 0,
      "max": 6,
      "starts": [
        0,
        3
      ],
      "labels": [
        "below_screen",
        "screen_signal"
      ],
      "kind": "screening",
      "url": "https://pubmed.ncbi.nlm.nih.gov/19616305/"
    }
  },
  "phq-4": {
    "symptoms.phq4.total": {
      "min": 0,
      "max": 12,
      "starts": [
        0,
        3,
        6,
        9
      ],
      "labels": [
        "minimal",
        "mild",
        "moderate",
        "severe"
      ],
      "kind": "screening",
      "url": "https://pubmed.ncbi.nlm.nih.gov/19616305/"
    },
    "symptoms.phq4.depression": {
      "min": 0,
      "max": 6,
      "starts": [
        0,
        3
      ],
      "labels": [
        "below_screen",
        "screen_signal"
      ],
      "kind": "screening",
      "url": "https://pubmed.ncbi.nlm.nih.gov/19616305/"
    },
    "symptoms.phq4.anxiety": {
      "min": 0,
      "max": 6,
      "starts": [
        0,
        3
      ],
      "labels": [
        "below_screen",
        "screen_signal"
      ],
      "kind": "screening",
      "url": "https://pubmed.ncbi.nlm.nih.gov/19616305/"
    }
  },
  "phq-9": {
    "symptoms.phq9.total": {
      "min": 0,
      "max": 27,
      "starts": [
        0,
        5,
        10,
        15,
        20
      ],
      "labels": [
        "minimal",
        "mild",
        "moderate",
        "moderately_severe",
        "severe"
      ],
      "kind": "screening",
      "url": "https://www.phqscreeners.com/"
    }
  },
  "phq-8": {
    "symptoms.phq_8.total": {
      "min": 0,
      "max": 24,
      "starts": [
        0,
        5,
        10,
        15,
        20
      ],
      "labels": [
        "minimal",
        "mild",
        "moderate",
        "moderately_severe",
        "severe"
      ],
      "kind": "screening",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3108293/"
    }
  },
  "gad-7": {
    "symptoms.gad7.total": {
      "min": 0,
      "max": 21,
      "starts": [
        0,
        5,
        10,
        15
      ],
      "labels": [
        "minimal",
        "mild",
        "moderate",
        "severe"
      ],
      "kind": "screening",
      "url": "https://jamanetwork.com/journals/jamainternalmedicine/fullarticle/410326"
    }
  },
  "k6": {
    "symptoms.k6.total": {
      "min": 0,
      "max": 24,
      "starts": [
        0,
        13
      ],
      "labels": [
        "below_screen",
        "screen_signal"
      ],
      "kind": "screening",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/mid/NIHMS447801/"
    }
  },
  "phq-15": {
    "symptoms.phq15.total": {
      "min": 0,
      "max": 30,
      "starts": [
        0,
        5,
        10,
        15
      ],
      "labels": [
        "minimal",
        "low",
        "medium",
        "high"
      ],
      "kind": "screening",
      "url": "https://pubmed.ncbi.nlm.nih.gov/11914441/"
    }
  },
  "brcs": {
    "resources.brcs.total": {
      "min": 4,
      "max": 20,
      "starts": [
        4,
        14,
        17
      ],
      "labels": [
        "low_coping",
        "mid_coping",
        "high_coping"
      ],
      "kind": "published-reference",
      "url": "https://cih.jhu.edu/measurement/brief-resilient-coping-scale-brcs/"
    }
  }
})
const LABELS = Object.freeze({
  minimal: ['minimal reported symptoms', 'минимально выраженные симптомы'],
  mild: ['mild reported symptoms', 'слабо выраженные симптомы'],
  low: ['low reported somatic symptom severity', 'невысокая выраженность сообщаемых телесных симптомов'],
  medium: ['medium reported somatic symptom severity', 'средняя выраженность сообщаемых телесных симптомов'],
  moderate: ['moderate reported symptoms', 'умеренно выраженные симптомы'],
  moderately_severe: ['moderately severe reported symptoms', 'значительно выраженные симптомы'],
  severe: ['severe reported symptoms', 'сильно выраженные симптомы'],
  high: ['high reported symptom burden', 'высокая выраженность сообщаемых симптомов'],
  below_screen: ['below the usual screening threshold', 'ниже принятого скринингового порога'],
  screen_signal: ['at or above a common screening threshold', 'на уровне или выше принятого скринингового порога'],
  low_coping: ['lower resilient-coping range', 'нижний диапазон устойчивого совладания'],
  mid_coping: ['middle resilient-coping range', 'средний диапазон устойчивого совладания'],
  high_coping: ['higher resilient-coping range', 'верхний диапазон устойчивого совладания'],
})

export function interpretationPlan(key, version = null) {
  const plan = Object.hasOwn(INTERPRETATION_PLANS, key) ? INTERPRETATION_PLANS[key] : null
  if (plan && version && !plan.supportedVersions.includes(version)) return null
  return plan
}

export function classificationDirection(dimension) {
  const direction = typeof dimension?.direction === 'string' ? dimension.direction : ''
  if (direction.startsWith('higher-reported-')) return 'resource'
  if (direction.startsWith('lower-reported-')) return 'difficulty'
  return 'neutral'
}

export function interpretationForDimension(result, dimension, locale = 'en') {
  const ru = locale === 'ru'
  const value = dimension?.value
  const min = dimension?.min
  const max = dimension?.max
  const invalid = () => ({
    basis: 'unavailable', code: 'invalid', label: ru ? 'Недостаточно данных' : 'Not enough valid data',
    meaning: ru ? 'Значение вне допустимого диапазона или недоступно. Выводы делать нельзя.' : 'This measure is absent or outside its permitted range; no interpretation can be given.',
    source: null, recommendedReview: false,
  })
  if (typeof value !== 'number' || typeof min !== 'number' || typeof max !== 'number' ||
      !Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) ||
      min >= max || value < min || value > max) return invalid()

  const rule = result?.definitionVersion === 'v1'
    ? PUBLISHED_BANDS[result?.definitionKey]?.[dimension?.key] : null
  if (rule && rule.min === min && rule.max === max) {
    // These published instruments are sum scores. Fractions cannot be genuine
    // outputs of their registered scorers, so do not present a clinical band.
    if (!Number.isInteger(value)) return invalid()
    const index = rule.starts.reduce((picked, start, current) => value >= start ? current : picked, 0)
    const code = rule.labels[index]
    const label = LABELS[code][ru ? 1 : 0]
    const rangeEnd = index + 1 < rule.starts.length ? rule.starts[index + 1] - 1 : rule.max
    const range = rule.starts[index] + '–' + rangeEnd
    const isHigh = code === 'screen_signal' || ['moderate','moderately_severe','severe','high'].includes(code)
    const type = rule.kind === 'screening'
      ? ru ? 'скрининговая категория' : 'screening category'
      : ru ? 'опубликованный описательный диапазон' : 'published descriptive reference range'
    const meaning = ru
      ? 'Ваш результат попадает в диапазон ' + range + ' баллов (' + type + '): ' + label + '. Ответы не устанавливают диагноз и не доказывают причину.'
      : 'Your score falls within the published ' + range + ' point range (' + type + '): ' + label + '. Self-reports do not diagnose a condition or establish its cause.'
    return {
      basis: rule.kind, code, label, meaning, source: rule.url,
      recommendedReview: rule.kind === 'screening' && isHigh,
    }
  }

  // A value can be continuous (mean/capped score); inclusive comparisons leave no gaps.
  const relative = (value - min) / (max - min)
  const code = relative < 1 / 3 ? 'lower' : relative > 2 / 3 ? 'upper' : 'middle'
  const direction = dimension.direction || 'non-normative'
  const resource = direction.startsWith('higher-reported-')
  const difficulty = direction.startsWith('lower-reported-')
  const position = ru
    ? { lower:'нижней', middle:'средней', upper:'верхней' }[code]
    : { lower:'lower', middle:'middle', upper:'upper' }[code]
  const type = ru
    ? resource ? 'сообщаемых ресурсов/благополучия' : difficulty ? 'сообщаемых трудностей' : 'описательных значений'
    : resource ? 'reported resources/wellbeing' : difficulty ? 'reported difficulties' : 'descriptive responses'
  return {
    basis: 'descriptive', code, label: ru ? position + ' части шкалы' : position + ' part of the scale',
    meaning: ru
      ? 'Ваш показатель находится в ' + position + ' части шкалы ' + type + '. Это только описательное положение внутри доступных баллов, а не клинический порог, норма или диагноз.'
      : 'Your answers fall in the ' + position + ' part of this ' + type + ' scale. This is only a descriptive position within its possible scores, not a clinical cutoff, norm or diagnosis.',
    source: null, recommendedReview: false,
  }
}

export function interpretationRegistryCoverage(activeCatalog) {
  const runnable = activeCatalog.filter(item => item.startable).map(item => item.key)
  const uncovered = activeCatalog.filter(item => item.startable && !interpretationPlan(item.key, item.version))
    .map(item => item.key + ':' + item.version)
  const obsolete = Object.values(INTERPRETATION_PLANS)
    .filter(plan => !activeCatalog.some(item => item.startable && item.key === plan.key && plan.supportedVersions.includes(item.version)))
    .map(plan => plan.key + ':' + plan.version)
  return { total: new Set(runnable).size, registered: Object.keys(INTERPRETATION_PLANS).length, uncovered, obsolete }
}
