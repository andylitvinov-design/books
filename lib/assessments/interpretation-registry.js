import { storedResultInterpretation, STORED_INTERPRETATION_RULES_VERSION } from './interpretation-resolution.js'
import { ipipReportMeaning, localizeIpipDimensionRow, localizeIpipReflectionRow } from './ipip-report-locales.js'
import { HH_SPLIT_V2_KEYS, HH_SPLIT_V2_DIMENSION_ROWS } from '../../data/assessments/hh-split-reflections-v2.js'
import { situationLevelNote, SITUATION_OBSERVATION } from './situational-score-context.js'
import { exactInterpretationDefinition, hasReliableInterpretationDirection, descriptiveInterpretation, interpretationConstruct, interpretationLimitations, scoreLinkedActions } from './interpretation-context.js'
import { IPIP_FIVE_DEFINITIONS, IPIP_FIVE_MEANINGS, IPIP_FIVE_INTERPRETATION_ROWS, IPIP_FIVE_DIMENSION_ROWS } from '../../data/assessments/ipip-five-2026.js'
import { IPIP_THREE_DEFINITIONS, IPIP_THREE_MEANINGS, IPIP_THREE_INTERPRETATION_ROWS, IPIP_THREE_DIMENSION_ROWS } from '../../data/assessments/ipip-three-2026.js'
import { isTraumaResult, traumaClassification } from './trauma-report.js'
import { PERSONALITY_TYPE_DEFINITIONS } from '../../data/assessments/personality-types-original-2026.js'
import { personalityDimensionGuidance } from './personality-type-interpretation.js'
import { RELATIONSHIP_REFLECTION_ROWS, RELATIONSHIP_DIMENSION_ROWS } from '../../data/assessments/relationships-intimacy-v1.js'
import { TANTRIC_REFLECTION_ROWS, TANTRIC_DIMENSION_ROWS } from '../../data/assessments/tantric-reflections-v1.js'
import { OPEN_PROFESSIONAL_INTERPRETATION_ROWS, OPEN_PROFESSIONAL_DIMENSION_ROWS } from '../../data/assessments/open-professional-2026.js'
import { IPIP_VIA_R_COMPLETION_ROWS, IPIP_VIA_R_COMPLETION_DIMENSION_ROWS } from '../../data/assessments/ipip-via-r-completion-2026.js'

import { COMPASSION_INTERPRETATION_ROWS, COMPASSION_DIMENSION_ROWS, COMPASSION_MEANINGS, COMPASSION_DEFINITIONS } from '../../data/assessments/compassion-2026.js'
import { MHC_SF_INTERPRETATION_ROWS, MHC_SF_DIMENSION_ROWS, MHC_SF_MEANINGS, MHC_SF_DEFINITIONS } from '../../data/assessments/mhc-sf-adult-dec2011.js'
import { ASRS6_INTERPRETATION_ROWS, ASRS6_DIMENSION_ROWS, ASRS6_DEFINITIONS } from '../../data/assessments/asrs-v1-6-nyu.js'
import { ADDITIONAL_PROFESSIONAL_INTERPRETATION_ROWS, ADDITIONAL_PROFESSIONAL_DIMENSION_ROWS } from '../../data/assessments/professional-additions-2026.js'

// Published scoring categories are used only for the instrument/subscale/version below.
// All other score positions are DESCRIPTIVE, not clinical categories. This registry is
// designed for exact-version tests in MONITORING_CATALOG; it does not grant test rights.
export const INTERPRETATION_RULES_VERSION = STORED_INTERPRETATION_RULES_VERSION

// Each runnable instrument has a preauthored subject-specific bilingual reflection step.
// Clinical review is still required before these can be called diagnostic advice.
// The report combines it with direction-aware, non-prescriptive recommendations.
const ROWS = [
  ...IPIP_FIVE_INTERPRETATION_ROWS.map(localizeIpipReflectionRow),
  ...IPIP_THREE_INTERPRETATION_ROWS.map(localizeIpipReflectionRow),
  ['pcl-5', 'general', 'Discuss concerning symptoms and their impact with a qualified professional regardless of the score.', 'Обсудите беспокоящие симптомы и их влияние на жизнь с квалифицированным специалистом независимо от балла.'],
  ['itq-adult', 'general', 'Discuss concerning symptoms and their impact with a qualified professional regardless of the score.', 'Обсудите беспокоящие симптомы и их влияние на жизнь с квалифицированным специалистом независимо от балла.'],
  ...ASRS6_INTERPRETATION_ROWS,
  ...MHC_SF_INTERPRETATION_ROWS,
  ...RELATIONSHIP_REFLECTION_ROWS,
  ...TANTRIC_REFLECTION_ROWS,
  ...COMPASSION_INTERPRETATION_ROWS,
  ...OPEN_PROFESSIONAL_INTERPRETATION_ROWS,
  ...IPIP_VIA_R_COMPLETION_ROWS,
  ...ADDITIONAL_PROFESSIONAL_INTERPRETATION_ROWS,
  ['ipip-via-r-strengths-96', 'personality',
    'Explore your 24 strengths individually and look for everyday examples. These are descriptive IPIP traits, not clinical improvement targets or VIA Institute scores.',
    'Исследуйте каждую из 24 сильных сторон и сопоставьте с примерами из жизни. Это описательные черты IPIP, не клинические цели коррекции и не оценки VIA Institute.'],
  ['cfpb-financial-wellbeing-5', 'resources',
    'Compare your sense of financial security over time and note one practical influence. The CFPB score uses U.S. calibration; it is not a diagnosis or a measure of income.',
    'Сравнивайте ощущение финансовой устойчивости во времени и отмечайте практические факторы. Балл CFPB основан на американской выборке: это не диагноз и не измерение дохода.'],
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
    key, version: key === 'hh-current-state' || key === 'hh-bach-flower-profile' || HH_SPLIT_V2_KEYS.includes(key) ? 'v2' : 'v1',
    supportedVersions: Object.freeze(key === 'hh-current-state' || key === 'hh-bach-flower-profile' || HH_SPLIT_V2_KEYS.includes(key) ? ['v1', 'v2'] : ['v1']),
    reviewStatus: 'preauthored-requires-clinical-qa',
    domain, step: Object.freeze({ en, ru }),
  })]),
))

// Only cutoffs with source-backed scoring guidance. Missing entries are not
// silently transformed into diagnostic thresholds.
// Explicit interpretation context for every subscale in multi-dimensional tools.
// These exact keys are checked against the versioned scorer by unit tests.
const DIMENSION_ROWS = [
  ...HH_SPLIT_V2_DIMENSION_ROWS,
  ...ASRS6_DIMENSION_ROWS,
  ...MHC_SF_DIMENSION_ROWS,
  ...RELATIONSHIP_DIMENSION_ROWS,
  ...TANTRIC_DIMENSION_ROWS,
  ...COMPASSION_DIMENSION_ROWS,
  ...IPIP_THREE_DIMENSION_ROWS.map(localizeIpipDimensionRow),
  ...IPIP_FIVE_DIMENSION_ROWS.map(localizeIpipDimensionRow),
  ...OPEN_PROFESSIONAL_DIMENSION_ROWS,
  ...IPIP_VIA_R_COMPLETION_DIMENSION_ROWS,
  ...ADDITIONAL_PROFESSIONAL_DIMENSION_ROWS,
  // Reuse the 24 published bilingual strength-specific interpretations for the
  // single new 96-question version; do not treat the three core composites as strengths.
  ...[...OPEN_PROFESSIONAL_DIMENSION_ROWS, ...IPIP_VIA_R_COMPLETION_DIMENSION_ROWS]
    .filter(([key, dimension]) => /^ipip-via-r-.*-4$/.test(key) && dimension.startsWith('trait.via.'))
    .map(([, ...rest]) => ['ipip-via-r-strengths-96', ...rest]),
  ['cfpb-financial-wellbeing-5', 'resources.financial_wellbeing.cfpb_short', 'resources',
    'Financial well-being (CFPB calibrated)', 'Финансовое благополучие (CFPB)',
    'Consider what contributes to financial security and choice. Interpret the U.S.-calibrated score as one self-report measure, not a prescription or income grade.',
    'Отметьте, что поддерживает финансовую устойчивость и свободу выбора. Это один показатель самооценки по американской шкале, а не диагноз, назначение или оценка дохода.'],
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
      "url": "https://www.phqscreeners.com/images/sites/g/files/g10016261/f/201412/instructions.pdf"
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
      "url": "https://www.phqscreeners.com/images/sites/g/files/g10016261/f/201412/instructions.pdf"
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
      "url": "https://pubmed.ncbi.nlm.nih.gov/19996233/"
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
      "url": "https://www.phqscreeners.com/images/sites/g/files/g10016261/f/201412/instructions.pdf"
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
      "url": "https://www.phqscreeners.com/images/sites/g/files/g10016261/f/201412/instructions.pdf"
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
      "url": "https://www.phqscreeners.com/images/sites/g/files/g10016261/f/201412/instructions.pdf"
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
      "url": "https://www.phqscreeners.com/images/sites/g/files/g10016261/f/201412/instructions.pdf"
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
      "url": "https://www.phqscreeners.com/images/sites/g/files/g10016261/f/201412/instructions.pdf"
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
      "url": "https://www.hcp.med.harvard.edu/ncs/ftpdir/k6/Scoring_K6_K10.pdf"
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
      "url": "https://www.phqscreeners.com/images/sites/g/files/g10016261/f/201412/instructions.pdf"
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
// Explicitly reviewed immutable English versions. A future translation, scorer,
// content hash or definition ID needs a separate source review before inheriting
// categories. The report locale never selects the instrument's thresholds.
const PUBLISHED_IDENTITIES = Object.freeze({
  'phq-2': ['3718f80f-470c-5924-88ca-9a973d1d2cbb', 'sha256:2cd80bebd2ac1ca94bd435453ce8e21013961e49e9d8998261c37c57030c32a4'],
  'gad-2': ['6f9c0e14-46f0-5ac9-9b36-a8ad2a7c6675', 'sha256:ee059226263689325c949adefcda6e3b7c6f4779218a246c9154e8173e7be878'],
  'phq-4': ['2c1c78ad-b4f1-4d15-8b18-37e3f2f55a41', 'sha256:a18df8048a4b70fd34ab27e8344efea51e538deab3f1f37219171e34d31d4bcf'],
  'phq-9': ['a251ab33-c65a-4eaf-a74c-43e4cb219c4c', 'sha256:04e213b6b64ccc7534d493d3c567d3adc7ca7a5e606c8ef2990449c4ee812b58'],
  'phq-8': ['d0e6183c-0dbd-50ba-a2a6-81fe3887a677', 'sha256:0abed0977cfc5fa7ef2a2ae2064a0147c4ccf66b9b8ae5ba7f5d590f8a553f8f'],
  'gad-7': ['b60ae0a9-7cf6-44d8-9e18-3e8d9cbcdd29', 'sha256:e94b48a147790054e4b114402e855e56e732238a67a18b2f74945d80244f6db1'],
  'k6': ['531f52bf-39df-4149-a0e1-03b89f90aa85', 'sha256:1cdfc9c4f7b67fa0218062a1393b51aa89154f1ef50e3bd02b44336379445f46'],
  'phq-15': ['20f3b56b-262e-5712-a0e3-62c365aab031', 'sha256:6f1a2bbd823baffceebc8016985fa13f823686440b1b6433a16a58de38a4b4bf'],
  'brcs': ['f6a8cc1b-7f05-5034-985c-139e4b91fb64', 'sha256:36909454f6d0151efeb26e7e253194548dc1683e2db579f68ba1b186a7739a44'],
})
function publishedRule(result, dimension, definition) {
  const pinned = PUBLISHED_IDENTITIES[result?.definitionKey]
  if (!definition || !pinned || definition.id !== pinned[0] || definition.contentHash !== pinned[1] ||
      definition.version !== 'v1' || definition.instrumentLocale !== 'en' ||
      definition.translationVersion !== 'official-en-v1' || definition.scoringKey !== 'configured' ||
      definition.scoringVersion !== 'v1' || definition.resultVersion !== 'v1') return null
  const rule = PUBLISHED_BANDS[definition.key]?.[dimension?.key]
  return rule && rule.min === dimension.min && rule.max === dimension.max ? rule : null
}
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

const ASRS6_PROVENANCE_FIELDS = Object.freeze({
  definitionId: 'id', definitionKey: 'key', definitionVersion: 'version',
  instrumentLocale: 'instrumentLocale', translationVersion: 'translationVersion',
  contentHash: 'contentHash', scoringKey: 'scoringKey', scoringVersion: 'scoringVersion',
  resultVersion: 'resultVersion', timeframe: 'timeframe',
})

function exactAsrs6Dimension(dimension, definition) {
  const spec = definition?.scoring?.dimensions?.[0]
  if (!spec || !dimension) return false
  return dimension.key === spec.key && dimension.min === 0 && dimension.max === 6 &&
    dimension.direction === spec.direction && dimension.dimensionClass === spec.dimensionClass &&
    dimension.unit === 'qualifying-responses' && dimension.timeframe === definition.timeframe &&
    dimension.displayKind === 'screening-count' &&
    dimension.sourceConstruct === spec.sourceConstruct &&
    Number.isInteger(dimension.value) && dimension.value >= 0 && dimension.value <= 6
}

// This screening threshold belongs only to the pinned six-item classic scorer.
// No missing, mutated, legacy, continuous-sum or ASRS-5 provenance may inherit it.
export function exactAsrs6DefinitionForResult(result) {
  const definition = ASRS6_DEFINITIONS.find(candidate =>
    Object.entries(ASRS6_PROVENANCE_FIELDS).every(([resultKey, definitionKey]) =>
      candidate[definitionKey] !== undefined && result?.[resultKey] === candidate[definitionKey]))
  if (!definition || !Array.isArray(result?.dimensions) || result.dimensions.length !== 1 ||
      !exactAsrs6Dimension(result.dimensions[0], definition)) return null
  return definition
}

function classifyDimension(result, dimension, locale = 'en') {
  if (isTraumaResult(result, dimension)) return traumaClassification(result, dimension, locale)
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

  // Keep the patient-form shaded count separate from every other ASRS algorithm.
  // Recognize its dimension/scorer even when the definition key was tampered with,
  // so invalid provenance cannot fall through to generic descriptive thirds.
  if (result?.definitionKey === 'asrs-6' || result?.scoringKey === 'asrs-v1-6-classic' ||
      dimension?.key === 'symptoms.asrs6.shaded_count') {
    const definition = exactAsrs6DefinitionForResult(result)
    if (!definition || !exactAsrs6Dimension(dimension, definition)) return invalid()
    const positive = value >= 4
    const languageNote = definition.instrumentLocale === 'ru'
      ? ru
        ? ' Использован официальный русский перевод, распространяемый NYU; валидация именно этой русской формулировки не подтверждена.'
        : ' The questionnaire uses the official Russian translation distributed by NYU; validation of this exact Russian wording has not been established.'
      : ru
        ? ' Использован оригинальный английский опросник; русский язык отчёта не меняет язык вопросов.'
        : ' The questionnaire uses the original English form.'
    return {
      basis: 'screening', code: positive ? 'screen_signal' : 'below_screen',
      label: ru
        ? positive ? 'На уровне или выше скринингового порога' : 'Ниже скринингового порога'
        : positive ? 'At or above the screening threshold' : 'Below the screening threshold',
      summary: ru
        ? (positive
          ? 'Результат на уровне или выше скринингового порога: симптомы могут соответствовать СДВГ у взрослых. '
          : 'Результат ниже скринингового порога, но не исключает СДВГ. ') +
          'Это не диагноз или оценка тяжести. Беспокоящие симптомы можно обсудить с квалифицированным специалистом независимо от балла.'
        : (positive
          ? 'The result is at or above the screening threshold: symptoms may be consistent with adult ADHD. '
          : 'The result is below the screening threshold but does not rule out ADHD. ') +
          'This is not a diagnosis or severity rating. Discuss concerning symptoms with a qualified professional regardless of the score.',
      meaning: (ru
        ? `Пояснение Holistic House: ${value} из 6 ответов попали в заштрихованные клетки по классическому правилу ASRS-v1.1 за последние 6 месяцев. ` +
          (positive
            ? 'Результат 4–6 означает, что симптомы могут соответствовать СДВГ у взрослых. Возможно, будет полезно обсудить оценку с квалифицированным медицинским специалистом. '
            : 'Результат 0–3 ниже скринингового порога, но не исключает СДВГ. ') +
          'Это не диагноз, не оценка тяжести и не вероятность заболевания. Независимо от результата обсудите беспокоящие вас симптомы с квалифицированным медицинским специалистом.'
        : `Holistic House explanation: ${value} of 6 answers fall in the shaded cells under the classic ASRS-v1.1 rule for the past 6 months. ` +
          (positive
            ? 'A result of 4–6 indicates symptoms that may be consistent with adult ADHD. It may be helpful to discuss an evaluation with a qualified healthcare professional. '
            : 'A result of 0–3 is below the screening threshold but does not rule out ADHD. ') +
          'This is not a diagnosis, severity rating or probability of a condition. Discuss any concerns with a qualified healthcare professional regardless of the result.') + languageNote,
      source: definition.source.scoringUrl || definition.source.url,
      recommendedReview: positive, displayKind: 'screening-count',
    }
  }

  const exactDefinition = exactInterpretationDefinition(result, dimension)
  if (!exactDefinition) return invalid()

  // Exact English IPIP versions use continuous sums, never invented bands.
  const ipipDefinitions = [...IPIP_THREE_DEFINITIONS, ...IPIP_FIVE_DEFINITIONS]
  const ipipMeanings = { ...IPIP_THREE_MEANINGS, ...IPIP_FIVE_MEANINGS }
  if (ipipDefinitions.some(d => d.key === result?.definitionKey) ||
      Object.hasOwn(ipipMeanings, dimension?.key || '')) {
    const fields = { definitionId:'id', definitionKey:'key', definitionVersion:'version',
      instrumentLocale:'instrumentLocale', translationVersion:'translationVersion',
      contentHash:'contentHash', scoringKey:'scoringKey', scoringVersion:'scoringVersion',
      resultVersion:'resultVersion', timeframe:'timeframe' }
    const def = ipipDefinitions.find(d => Object.entries(fields).every(([a,b]) => result?.[a] === d[b]))
    const spec = def?.scoring.dimensions[0]
    if (!spec || result.dimensions?.length !== 1 || dimension.key !== spec.key ||
        min !== spec.min || max !== spec.max || !Number.isInteger(value) ||
        dimension.direction !== spec.direction || dimension.dimensionClass !== 'trait' ||
        dimension.unit !== 'points' || dimension.timeframe !== def.timeframe ||
        dimension.sourceConstruct !== spec.sourceConstruct) return invalid()
    return { basis:'descriptive', code:'continuous',
      label:ru ? `Сумма ответов (${min}–${max})` : `Response sum (${min}–${max})`,
      meaning:ipipReportMeaning(dimension.key, ru ? 'ru' : 'en') + (ru
        ? ' Вопросы сохранены в английском оригинале. Русское пояснение не является валидированной русской адаптацией опросника.' : ''),
      source:def.source.scoringUrl, recommendedReview:false }
  }

  // The adult December 2011 MHC-SF uses continuous sums, not categorical diagnoses.
  const mhc = MHC_SF_DEFINITIONS.find(d => d.key === result?.definitionKey &&
    d.version === result?.definitionVersion && d.instrumentLocale === result?.instrumentLocale &&
    d.translationVersion === result?.translationVersion && d.contentHash === result?.contentHash)
  const mhcScale = mhc?.scoring.dimensions.find(d => d.key === dimension.key && d.min === min && d.max === max)
  if (result?.definitionKey === 'mhc-sf' && !mhcScale) return invalid()
  if (mhcScale) return {
    basis: 'descriptive', code: 'continuous', label: ru ? `Сумма ответов (0–${max})` : `Response sum (0–${max})`,
    meaning: MHC_SF_MEANINGS[dimension.key][ru ? 'ru' : 'en'],
    source: mhc.source.scoringUrl, recommendedReview: false,
  }

  // Continuous source-specific means, without ad hoc bands or normative claims.
  const compassion = COMPASSION_DEFINITIONS.find(d => d.key === result?.definitionKey &&
    d.version === result?.definitionVersion && d.instrumentLocale === result?.instrumentLocale)
  const compassionMeaning = compassion?.scoring.dimensions.some(d => d.key === dimension.key) &&
    min === 1 && max === 5 ? COMPASSION_MEANINGS[dimension.key] : null
  if (compassionMeaning) return {
    basis: 'descriptive', code: 'continuous', label: ru ? 'Среднее ответов (1–5)' : 'Response mean (1–5)',
    meaning: compassionMeaning[ru ? 'ru' : 'en'] + (ru
      ? ' Диапазон 1–5; это не диагноз и не клиническая норма. Категории и пороги не присваиваются. Вопросы — английский оригинал; русский отчёт не является валидированной русской адаптацией.'
      : ' Range 1–5; this is not a diagnosis or clinical norm. No categories or cutoffs are assigned. Items are the English original; Russian report text is not a validated Russian adaptation.'),
    source: compassion.source.scoringUrl, recommendedReview: false,
  }

  const rule = publishedRule(result, dimension, exactDefinition)
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

  return descriptiveInterpretation(result, dimension, exactDefinition,
    interpretationDimensionPlan(result, dimension.key), locale)
}

export function interpretationForDimension(result, dimension, locale = 'en') {
  const classification = classifyDimension(result, dimension, locale)
  const definition = exactInterpretationDefinition(result, dimension)
  const plan = interpretationDimensionPlan(result, dimension?.key)
  const construct = classification.construct || interpretationConstruct(result, dimension, definition, plan, locale)
  const limitations = interpretationLimitations(result, definition, classification, locale)
  const valid = classification.basis !== 'unavailable'
  const scorePrefix = valid && !classification.meaning.startsWith(construct + ':')
    ? `${construct}: ${dimension.value} (${dimension.min}–${dimension.max}). ` : ''
  // Keep the clinically important translation/polarity caveats in the actual
  // explanation too, including consumers that do not yet render limitations.
  const contextNotes = limitations.slice(1)
  return {
    ...classification, construct,
    summary: classification.summary || classification.meaning,
    meaning: scorePrefix + classification.meaning + (contextNotes.length ? ' ' + contextNotes.join(' ') : ''),
    actions: isTraumaResult(result, dimension) ? [] : scoreLinkedActions(result, dimension, definition, plan, classification, locale),
    reliableDirection: valid && hasReliableInterpretationDirection(definition),
    presentationDirection: valid && hasReliableInterpretationDirection(definition) ? classificationDirection(dimension) : 'neutral',
    limitations,
  }
}

export function interpretationBandModel(result, dimension, locale = 'en') {
  const stored = storedResultInterpretation(result, dimension, locale)
  if (stored) return stored
  const classification = interpretationForDimension(result, dimension, locale)
  const definition = exactInterpretationDefinition(result, dimension)
  const bands = []
  let rule = publishedRule(result, dimension, definition)
  const asrs = exactAsrs6DefinitionForResult(result)
  if (asrs && exactAsrs6Dimension(dimension, asrs)) rule = {
    min: 0, max: 6, starts: [0, 4], labels: ['below_screen', 'screen_signal'],
    url: asrs.source.scoringUrl || asrs.source.url,
  }
  if (rule && ['screening', 'published-reference'].includes(classification.basis)) {
    rule.starts.forEach((from, index) => bands.push({
      code: rule.labels[index], from,
      to: index + 1 < rule.starts.length ? rule.starts[index + 1] - 1 : rule.max,
      includeFrom: true, includeTo: true,
      label: asrs
        ? (locale === 'ru'
          ? index ? 'На уровне или выше скринингового порога' : 'Ниже скринингового порога'
          : index ? 'At or above the screening threshold' : 'Below the screening threshold')
        : LABELS[rule.labels[index]][locale === 'ru' ? 1 : 0],
      source: rule.url,
    }))
  }
  const currentBand = bands.find(band => dimension.value >= band.from && dimension.value <= band.to) || null
  // For source-verified original HH mean scales, the *questionnaire's own*
  // response anchors offer a useful reading of an average. These are rounding
  // zones around answer options, never psychometric/clinical cutoffs or norms.
  // Other continuous and neutral instruments intentionally retain no sectors.
  const spec = definition?.scoring?.dimensions?.find(item => item.key === dimension?.key)
  const anchors = definition?.responseAnchors
  const hasAnswerGuide = classification.basis === 'descriptive' &&
    classification.presentationDirection === 'resource' &&
    result?.definitionKey?.startsWith('hh-') &&
    definition?.source?.status?.startsWith('original-') &&
    spec?.method === 'mean' && Array.isArray(anchors) &&
    Number.isInteger(dimension.min) && Number.isInteger(dimension.max) &&
    anchors.length >= 3 && anchors.length === dimension.max - dimension.min + 1 &&
    anchors.every(item => typeof item === 'string' && item.trim().length > 0)
  const language = locale === 'ru' ? 'ru' : 'en'
  const scalePlan = hasAnswerGuide ? interpretationDimensionPlan(result, dimension.key) : null
  // The verified per-dimension construct takes precedence over a playful title.
  // For example, low approval-coping is not evidence of little approval pressure.
  const scaleName = classification.construct || scalePlan?.label?.[language] ||
    (definition?.instrumentLocale === language ? spec?.sourceConstruct : null) ||
    dimension.sourceConstruct || dimension.key
  // A five-position grid explains the original answer anchors for THIS scored
  // construct. It is not a percentile, diagnosis or tantric development rank.
  const levelNames = language === 'ru'
    ? ['Почти не отмечается', 'Отмечается редко', 'Зависит от ситуации', 'Отмечается часто', 'Отмечается устойчиво']
    : ['Rarely reported', 'Occasionally reported', 'Depends on context', 'Often reported', 'Consistently reported']
  const notes = language === 'ru'
    ? [
      `В этих ответах «${scaleName}» почти не отмечается. Это не недостаток или диагноз; можно исследовать тему без давления.`,
      `В этих ответах «${scaleName}» отмечается редко. Замечайте безопасные ситуации, когда это всё же становится доступно.`,
      `В этих ответах «${scaleName}» проявляется по-разному. Сопоставьте, в каких обстоятельствах это ощущается легче, а в каких сложнее.`,
      `В этих ответах «${scaleName}» отмечается часто. Условия, усталость и стресс могут влиять на это; постоянства не требуется.`,
      `В этих ответах «${scaleName}» отмечается устойчиво. Это не духовный уровень и не гарантия во всех ситуациях; выбор и границы остаются важными.`,
    ]
    : [
      `In these answers, “${scaleName}” is seldom reported. That is not a defect or diagnosis; explore the theme without pressure.`,
      `In these answers, “${scaleName}” is reported occasionally. Notice safe situations in which it becomes available.`,
      `In these answers, “${scaleName}” varies by context. Compare situations where it feels easier with those where it feels harder.`,
      `In these answers, “${scaleName}” is often reported. Conditions, fatigue and stress can still make it variable; consistency is not required.`,
      `In these answers, “${scaleName}” is consistently reported. This is not a spiritual rank or a promise about every situation; choice and boundaries still matter.`,
    ]
  const optionalPractice = scalePlan?.step?.[language] || null
  const answerBands = hasAnswerGuide ? anchors.map((label, index) => {
    const from = index === 0 ? dimension.min : dimension.min + index - 0.5
    const to = index === anchors.length - 1 ? dimension.max : dimension.min + index + 0.5
    return {
      code: 'answer-' + index, label, from, to,
      levelLabel: anchors.length === 5 ? levelNames[index] : null,
      optionalPractice,
      displayRange: String(from) + '–' + (index === anchors.length - 1 ? String(to) : '<' + String(to)),
      note: anchors.length === 5 && (SITUATION_OBSERVATION[dimension.key] || SITUATION_OBSERVATION[result.definitionKey])
        ? situationLevelNote({ mode: 'resource', construct: scaleName, index, locale })
        : anchors.length === 5 ? notes[index]
        : (locale === 'ru'
          ? 'Близость среднего балла к выбранному варианту ответа, не клиническая категория.'
          : 'Average score nearest to this response option, not a clinical category.'),
    }
  }) : []
  const currentAnswerBand = answerBands.find((band, index) =>
    dimension.value >= band.from &&
    (index === answerBands.length - 1 ? dimension.value <= band.to : dimension.value < band.to)) || null
  return {
    ...classification, bands, currentBand, answerBands, currentAnswerBand, registrySource: 'code', interpretationVersion: INTERPRETATION_RULES_VERSION,
    continuous: classification.basis === 'descriptive' && bands.length === 0,
    verified: classification.basis !== 'unavailable',
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
