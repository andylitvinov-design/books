// Published scoring categories are used only for the instrument/subscale/version below.
// All other score positions are DESCRIPTIVE, not clinical categories. This registry is
// designed for exact-version tests in MONITORING_CATALOG; it does not grant test rights.
export const INTERPRETATION_RULES_VERSION = '2026-10-11.v1'

// Each runnable instrument has a human-reviewed subject-specific, bilingual reflection step.
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
  ]
]
export const INTERPRETATION_PLANS = Object.freeze(Object.fromEntries(
  ROWS.map(([key, domain, en, ru]) => [key, Object.freeze({
    key, version: 'v1', domain, step: Object.freeze({ en, ru }),
  })]),
))

// Only cutoffs with source-backed scoring guidance. Missing entries are not
// silently transformed into diagnostic thresholds.
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
        "mild",
        "moderate",
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

export function interpretationPlan(key) {
  return Object.hasOwn(INTERPRETATION_PLANS, key) ? INTERPRETATION_PLANS[key] : null
}

export function interpretationForDimension(result, dimension, locale = 'en') {
  const ru = locale === 'ru'
  const value = Number(dimension?.value)
  const min = Number(dimension?.min)
  const max = Number(dimension?.max)
  const invalid = () => ({
    basis: 'unavailable', code: 'invalid', label: ru ? 'Недостаточно данных' : 'Not enough valid data',
    meaning: ru ? 'Значение вне допустимого диапазона или недоступно. Выводы делать нельзя.' : 'This measure is absent or outside its permitted range; no interpretation can be given.',
    source: null, recommendedReview: false,
  })
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) ||
      min >= max || value < min || value > max) return invalid()

  const rule = result?.definitionVersion === 'v1' || !result?.definitionVersion
    ? PUBLISHED_BANDS[result?.definitionKey]?.[dimension?.key] : null
  if (rule && rule.min === min && rule.max === max) {
    const index = rule.starts.reduce((picked, start, current) => value >= start ? current : picked, 0)
    const code = rule.labels[index]
    const label = LABELS[code][ru ? 1 : 0]
    const rangeEnd = index + 1 < rule.starts.length ? rule.starts[index + 1] - 1 : rule.max
    const range = rule.starts[index] + '–' + rangeEnd
    const isHigh = code === 'screen_signal' || ['moderate','moderately_severe','severe','high'].includes(code)
    const meaning = ru
      ? 'Ваш результат попадает в опубликованный диапазон ' + range + ' баллов: ' + label + '. Это скрининговая интерпретация ответов, не диагноз и не оценка причины.'
      : 'Your score falls within the published ' + range + ' point band: ' + label + '. This interprets self-reported responses; it does not diagnose a condition or establish its cause.'
    return {
      basis: rule.kind, code, label, meaning, source: rule.url,
      recommendedReview: rule.kind === 'screening' && isHigh,
    }
  }

  // A value can be continuous (mean/capped score); inclusive comparisons leave no gaps.
  const relative = (value - min) / (max - min)
  const code = relative < 1 / 3 ? 'lower' : relative > 2 / 3 ? 'upper' : 'middle'
  const direction = dimension.direction || 'non-normative'
  const resource = direction === 'higher-reported-resource'
  const difficulty = direction === 'lower-reported-difficulty'
  const position = ru
    ? { lower:'нижней', middle:'средней', upper:'верхней' }[code]
    : { lower:'lower', middle:'middle', upper:'upper' }[code]
  const type = ru
    ? resource ? 'ресурсов' : difficulty ? 'сообщаемых трудностей' : 'описательных значений'
    : resource ? 'reported resources' : difficulty ? 'reported difficulties' : 'descriptive responses'
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
  const uncovered = [...new Set(runnable)].filter(key => !interpretationPlan(key))
  const obsolete = Object.keys(INTERPRETATION_PLANS).filter(key => !runnable.includes(key))
  return { total: new Set(runnable).size, registered: Object.keys(INTERPRETATION_PLANS).length, uncovered, obsolete }
}
