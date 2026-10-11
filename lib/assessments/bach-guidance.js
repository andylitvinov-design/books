import { rankBachDimensions } from './bach-profile.js'

// Specific, non-prescriptive reflective prompts for every one of the 38 traditional Bach themes.
// Traditional thematic matches are not validated clinical diagnosis or evidence of efficacy.
export const BACH_GUIDANCE = Object.freeze({
  "Agrimony": {
    "en": {
      "title": "Hidden distress behind a cheerful front",
      "step": "Notice one moment when you say everything is fine but feel otherwise; name that feeling privately before deciding whether to share it."
    },
    "ru": {
      "title": "Скрытые переживания за внешним спокойствием",
      "step": "Замечайте ситуации, когда внешне всё хорошо, но внутри иначе; сначала назовите чувство для себя, а потом решайте, делиться ли им."
    }
  },
  "Aspen": {
    "en": {
      "title": "Vague apprehension",
      "step": "When worry has no clear object, describe what your body notices and list what is actually known right now."
    },
    "ru": {
      "title": "Неясные опасения",
      "step": "Когда тревога не имеет ясного предмета, отметьте телесные ощущения и отдельно запишите, что вам достоверно известно сейчас."
    }
  },
  "Beech": {
    "en": {
      "title": "Harsh criticism",
      "step": "Before evaluating another person, note the unmet need or pressure behind your reaction and consider a kinder explanation."
    },
    "ru": {
      "title": "Резкая критичность",
      "step": "Перед критикой другого человека замечайте собственное напряжение или потребность и попробуйте найти более мягкое объяснение."
    }
  },
  "Centaury": {
    "en": {
      "title": "Difficulty setting boundaries",
      "step": "Practice one small and respectful no when you are already overloaded; notice the outcome without judging yourself."
    },
    "ru": {
      "title": "Трудность отстаивать границы",
      "step": "Попробуйте один спокойный и уважительный отказ при перегрузке; отметьте результат без самоосуждения."
    }
  },
  "Cerato": {
    "en": {
      "title": "Doubting personal judgment",
      "step": "Write your first independent choice before asking for reassurance; compare it with what you choose afterward."
    },
    "ru": {
      "title": "Недоверие собственному мнению",
      "step": "Сначала записывайте своё самостоятельное решение, а уже потом спрашивайте совет; сравните оба выбора."
    }
  },
  "Cherry Plum": {
    "en": {
      "title": "Fear of losing emotional control",
      "step": "Notice early signs of rising tension and arrange a short pause before you become overwhelmed."
    },
    "ru": {
      "title": "Страх утраты эмоционального контроля",
      "step": "Отслеживайте ранние признаки нарастания напряжения и делайте короткую паузу до перегрузки."
    }
  },
  "Chestnut Bud": {
    "en": {
      "title": "Repeating the same mistakes",
      "step": "Choose one recurring mistake, identify its trigger, and experiment with one different response this week."
    },
    "ru": {
      "title": "Повторяющиеся ошибки",
      "step": "Выберите одну повторяющуюся ошибку, найдите её привычный пусковой момент и опробуйте один другой способ действия."
    }
  },
  "Chicory": {
    "en": {
      "title": "Wanting more affection or recognition",
      "step": "Notice when you expect appreciation; consider stating your wish clearly instead of waiting for others to guess it."
    },
    "ru": {
      "title": "Потребность в признании и внимании",
      "step": "Замечайте ожидание благодарности и попробуйте спокойно назвать свою потребность вместо ожидания, что её угадают."
    }
  },
  "Clematis": {
    "en": {
      "title": "Drifting away from the present",
      "step": "Use a short sensory grounding exercise and name three things you can see, hear, or feel before the next task."
    },
    "ru": {
      "title": "Уход из настоящего в мысли",
      "step": "Перед следующим делом выполните короткое заземление: назовите три вещи, которые видите, слышите или чувствуете."
    }
  },
  "Crab Apple": {
    "en": {
      "title": "Feeling disturbed by imperfections",
      "step": "Identify one harmless imperfection you can leave alone today and notice how your response changes over time."
    },
    "ru": {
      "title": "Неприятие несовершенства",
      "step": "Найдите одно безвредное несовершенство, которое сегодня можно оставить без исправления, и понаблюдайте за своей реакцией."
    }
  },
  "Elm": {
    "en": {
      "title": "Responsibility overload",
      "step": "Separate genuinely essential duties from tasks that can be shared or postponed; make one realistic adjustment."
    },
    "ru": {
      "title": "Перегрузка ответственностью",
      "step": "Отделите действительно важные обязанности от тех, что можно передать или отложить; внесите одно реалистичное изменение."
    }
  },
  "Gentian": {
    "en": {
      "title": "Discouragement after setbacks",
      "step": "Record one small setback and one fact showing that progress may still be possible; avoid all-or-nothing conclusions."
    },
    "ru": {
      "title": "Уныние после трудностей",
      "step": "После небольшой неудачи запишите один факт, показывающий, что движение всё же возможно; избегайте выводов по принципу всё или ничего."
    }
  },
  "Gorse": {
    "en": {
      "title": "Loss of hope",
      "step": "Focus on a very small action you can influence today and consider sharing your sense of hopelessness with a trusted professional."
    },
    "ru": {
      "title": "Потеря надежды",
      "step": "Выберите маленькое действие в пределах вашего контроля и при устойчивой безнадёжности обсудите её с надёжным специалистом."
    }
  },
  "Heather": {
    "en": {
      "title": "Strong need to be heard",
      "step": "Notice when you need connection and ask for a specific form of attention while leaving space to hear the other person."
    },
    "ru": {
      "title": "Сильная потребность быть услышанным",
      "step": "Замечайте потребность в контакте, прямо просите о конкретной поддержке и оставляйте место для чувств другого."
    }
  },
  "Holly": {
    "en": {
      "title": "Anger and jealousy",
      "step": "Name what feels threatened underneath anger or jealousy and postpone difficult conversations until you can speak clearly."
    },
    "ru": {
      "title": "Гнев и ревность",
      "step": "Попробуйте определить, что ощущается под угрозой за гневом или ревностью, и обсуждайте трудные темы после снижения напряжения."
    }
  },
  "Honeysuckle": {
    "en": {
      "title": "Living in past experiences",
      "step": "Set aside a brief time to acknowledge a past memory, then choose one concrete action in the present."
    },
    "ru": {
      "title": "Привязанность к прошлому",
      "step": "Уделите немного времени важному воспоминанию, а затем выберите одно конкретное действие в настоящем."
    }
  },
  "Hornbeam": {
    "en": {
      "title": "Mental tiredness before starting",
      "step": "Break the first task into a two-minute step, and notice whether difficulty changes after beginning."
    },
    "ru": {
      "title": "Мысленная усталость перед началом",
      "step": "Разделите первое дело на двухминутный шаг и отметьте, меняется ли тяжесть задачи после начала."
    }
  },
  "Impatiens": {
    "en": {
      "title": "Impatience with the pace of events",
      "step": "When waiting frustrates you, notice your breathing and choose one activity that does not require rushing."
    },
    "ru": {
      "title": "Нетерпение к темпу событий",
      "step": "Когда ожидание раздражает, обратите внимание на дыхание и найдите одно действие без спешки."
    }
  },
  "Larch": {
    "en": {
      "title": "Lack of confidence",
      "step": "Try one achievable task that matters to you and record what you actually did rather than rating yourself globally."
    },
    "ru": {
      "title": "Неуверенность в своих силах",
      "step": "Возьмитесь за одно посильное значимое дело и зафиксируйте выполненное, а не общую оценку себя."
    }
  },
  "Mimulus": {
    "en": {
      "title": "Specific, identifiable fears",
      "step": "Name the exact feared situation and a safe, manageable next step; seek support if fear limits daily life."
    },
    "ru": {
      "title": "Конкретные узнаваемые страхи",
      "step": "Назовите конкретную пугающую ситуацию и безопасный посильный следующий шаг; при нарушении обычной жизни ищите поддержку."
    }
  },
  "Mustard": {
    "en": {
      "title": "Sadness without a clear trigger",
      "step": "Track changes in mood, sleep, and daily activity over several days instead of forcing an explanation immediately."
    },
    "ru": {
      "title": "Грусть без очевидной причины",
      "step": "Несколько дней отслеживайте настроение, сон и активность, не требуя от себя немедленного объяснения."
    }
  },
  "Oak": {
    "en": {
      "title": "Pushing through exhaustion out of duty",
      "step": "Choose one obligation where rest or asking for help would be responsible rather than a failure."
    },
    "ru": {
      "title": "Продолжение борьбы через истощение",
      "step": "Найдите одну обязанность, в которой отдых или просьба о помощи будут ответственным выбором, а не неудачей."
    }
  },
  "Olive": {
    "en": {
      "title": "Feeling deeply depleted",
      "step": "Identify what drains your energy most and protect a short, genuine recovery period without adding another obligation."
    },
    "ru": {
      "title": "Глубокое истощение",
      "step": "Отметьте основной источник истощения и защитите короткий период настоящего восстановления без новых обязательств."
    }
  },
  "Pine": {
    "en": {
      "title": "Guilt and self-reproach",
      "step": "Separate what you could reasonably control from what was outside your control, and write a compassionate, factual account."
    },
    "ru": {
      "title": "Вина и самообвинение",
      "step": "Разделите то, на что вы реально влияли, и то, что было вне вашего контроля; опишите ситуацию доброжелательно и по фактам."
    }
  },
  "Red Chestnut": {
    "en": {
      "title": "Worry about loved ones",
      "step": "Notice when caring turns into imagining danger and ask what practical help, if any, the other person actually wants."
    },
    "ru": {
      "title": "Тревога за близких",
      "step": "Отслеживайте, когда забота превращается в ожидание беды, и уточняйте, какая реальная помощь нужна близкому."
    }
  },
  "Rock Rose": {
    "en": {
      "title": "Sudden panic and acute fear",
      "step": "Orient yourself to a safe surrounding and use gentle grounding; seek urgent care when acute symptoms could be medical."
    },
    "ru": {
      "title": "Паника и острый страх",
      "step": "Ориентируйтесь на безопасное окружение и мягкое заземление; при возможных острых медицинских симптомах нужна срочная помощь."
    }
  },
  "Rock Water": {
    "en": {
      "title": "Excessively strict self-discipline",
      "step": "Choose one harmless rule you can soften today and observe whether flexibility supports your wellbeing."
    },
    "ru": {
      "title": "Чрезмерно строгая самодисциплина",
      "step": "Выберите одно безвредное правило, которое сегодня можно смягчить, и проследите, помогает ли гибкость вашему состоянию."
    }
  },
  "Scleranthus": {
    "en": {
      "title": "Difficulty choosing between alternatives",
      "step": "List two realistic options, their essential consequences, and one decision deadline rather than endlessly reconsidering."
    },
    "ru": {
      "title": "Колебания между вариантами",
      "step": "Запишите два реальных варианта, их основные последствия и срок решения вместо бесконечных пересмотров."
    }
  },
  "Star of Bethlehem": {
    "en": {
      "title": "Emotional impact of shock",
      "step": "Notice which reminders still carry strong feelings; consider a supportive, paced conversation without forcing disclosure."
    },
    "ru": {
      "title": "Последствия эмоционального потрясения",
      "step": "Замечайте, какие напоминания ещё вызывают сильные переживания, и ищите бережный разговор без принуждения к подробностям."
    }
  },
  "Sweet Chestnut": {
    "en": {
      "title": "Feeling at the end of one's resources",
      "step": "Name one immediate source of safety and contact a trusted person or professional if despair feels overwhelming."
    },
    "ru": {
      "title": "Чувство безвыходности и предельного напряжения",
      "step": "Назовите один ближайший источник безопасности и обратитесь к близкому или специалисту, если отчаяние становится непереносимым."
    }
  },
  "Vervain": {
    "en": {
      "title": "Overzealous effort",
      "step": "Notice when enthusiasm becomes pressure and experiment with stopping at a sustainable level of effort."
    },
    "ru": {
      "title": "Чрезмерное рвение",
      "step": "Замечайте переход вдохновения в давление и пробуйте останавливаться на устойчивом, а не предельном усилии."
    }
  },
  "Vine": {
    "en": {
      "title": "Need to control outcomes or people",
      "step": "In one conversation, ask rather than direct and notice where the other person's choice deserves space."
    },
    "ru": {
      "title": "Стремление контролировать события и людей",
      "step": "В одном разговоре попробуйте задать вопрос вместо указания и оставьте другому пространство выбора."
    }
  },
  "Walnut": {
    "en": {
      "title": "Sensitivity during transitions",
      "step": "Write down what you want to preserve during change and identify one flexible source of support."
    },
    "ru": {
      "title": "Уязвимость в периоды перемен",
      "step": "Запишите, что важно сохранить при переменах, и найдите один доступный гибкий источник поддержки."
    }
  },
  "Water Violet": {
    "en": {
      "title": "Withdrawal and distance",
      "step": "Choose a low-pressure way to make contact without abandoning your need for personal space."
    },
    "ru": {
      "title": "Отстранённость и дистанция",
      "step": "Выберите мягкий способ контакта с другим человеком, сохраняя нужное вам личное пространство."
    }
  },
  "White Chestnut": {
    "en": {
      "title": "Repetitive intrusive thinking",
      "step": "Set down a recurring thought on paper, distinguish a solvable task from mental repetition, and return attention to the present."
    },
    "ru": {
      "title": "Повторяющийся внутренний диалог",
      "step": "Запишите навязчиво повторяющуюся мысль, отделите решаемую задачу от мысленного круга и верните внимание в настоящее."
    }
  },
  "Wild Oat": {
    "en": {
      "title": "Uncertainty about life direction",
      "step": "Name two values that matter to you and test one small step toward a possible direction before making a large commitment."
    },
    "ru": {
      "title": "Неясность жизненного направления",
      "step": "Назовите две важные для себя ценности и попробуйте маленький шаг в выбранном направлении до крупных решений."
    }
  },
  "Wild Rose": {
    "en": {
      "title": "Apathy and resignation",
      "step": "Choose one small pleasant or meaningful activity and note the difference between exhaustion and lack of interest."
    },
    "ru": {
      "title": "Апатия и пассивное смирение",
      "step": "Выберите одно небольшое приятное или значимое действие и отмечайте разницу между усталостью и потерей интереса."
    }
  },
  "Willow": {
    "en": {
      "title": "Bitterness and perceived unfairness",
      "step": "Acknowledge the hurt, then separate what cannot be changed from one boundary or action still within your control."
    },
    "ru": {
      "title": "Горечь и чувство несправедливости",
      "step": "Признайте обиду, а затем отделите неизменимое от одной границы или действия, которые ещё в вашей власти."
    }
  }
})

const SECTIONS = {
  en: { situation: 'current situation', character: 'recurring patterns', control: 'cross-check' },
  ru: { situation: 'текущая ситуация', character: 'повторяющиеся паттерны', control: 'контрольный срез' },
}

export function buildBachResultReport(result, locale = 'en') {
  const language = locale === 'ru' ? 'ru' : 'en'
  const ru = language === 'ru'
  const ranked = rankBachDimensions(Array.isArray(result?.dimensions) ? result.dimensions : [])
  const marked = ranked.filter(item => item.value > 0)
  const sections = ranked.map((dimension, index) => {
    const guide = BACH_GUIDANCE[dimension.sourceConstruct]?.[language]
    const fallback = ru ? 'Эмоциональная тема для самостоятельного наблюдения' : 'An emotional theme for self-reflection'
    const title = guide?.title || fallback
    const endorsed = dimension.value > 0
    const sources = (dimension.sections || []).map(section => SECTIONS[language][section]).filter(Boolean)
    const tier = endorsed ? index < 3 ? 'main' : index < 7 ? 'support' : 'review' : 'not-marked'
    const theme = guide?.step || (ru ? 'Наблюдайте за контекстом своих переживаний.' : 'Observe the context surrounding this feeling.')
    return {
      key: dimension.key, domain: 'bach', group: tier,
      title: dimension.sourceConstruct + ' — ' + title,
      construct: title, value: dimension.value, max: dimension.max,
      meaning: endorsed
        ? ru
          ? `Вы отметили ${dimension.evidenceCount || 0} утверждений из разделов: ${sources.join(', ') || 'опросник'}. Суммарный вес совпадений — ${dimension.value}. Это относительная выраженность традиционной темы Баха, а не клиническая шкала или показание к лечению.`
          : `You endorsed ${dimension.evidenceCount || 0} statements in: ${sources.join(', ') || 'the questionnaire'}. Weighted match: ${dimension.value}. This describes the relative presence of a traditional Bach theme, not clinical severity or an indication for treatment.`
        : ru
          ? 'Вы не отметили утверждений этой темы в данном прохождении. Нулевое значение не доказывает ни наличие, ни отсутствие психологического состояния.'
          : 'You did not endorse statements related to this theme in this run. A zero is not evidence that a psychological condition is present or absent.',
      steps: [
        (ru ? 'В ближайшую неделю: ' : 'Over the next week: ') + theme,
        ru
          ? `После ситуаций, связанных с темой «${title}», делайте короткую запись: что произошло, что вы почувствовали и что действительно помогло. Не оценивайте себя по одному дню.`
          : `After a situation related to “${title}”, briefly note what happened, how you felt, and what actually helped. Look for patterns across days instead of judging yourself by one moment.`,
      ],
      followUp: ru
        ? 'При повторном прохождении через две недели сравнивайте собственные ответы и контекст, а не предполагаемый лечебный эффект эссенций.'
        : 'When you repeat this reflection in two weeks, compare your answers and context, not any presumed treatment effect of the essences.',
    }
  })
  return {
    title: ru ? 'Ваш эмоциональный профиль по системе Баха' : 'Your Bach Flower Emotional Profile',
    intro: marked.length
      ? ru
        ? 'Основные темы показаны первыми; ниже — дополнительные совпадения и темы для уточнения. Это ориентир для размышлений, а не назначение препаратов.'
        : 'Your strongest themes appear first, followed by supporting matches and themes for further reflection. This is not a prescription for flower remedies.'
      : ru
        ? 'В этом прохождении не выделилось ни одной выраженной темы. Это нормальный возможный результат; не нужно выбирать эссенции искусственно.'
        : 'No specific theme stood out in this run. That is a valid outcome; there is no need to force a flower-essence match.',
    purpose: ru
      ? '115 утверждений из трёх разделов: текущая ситуация, характерные эмоциональные реакции и контрольный срез. Сопоставление с традиционными описаниями 38 эссенций.'
      : '115 statements across present situation, recurring emotional patterns and a cross-check, compared with traditional descriptions of 38 flower essences.',
    sections,
    highlightedCount: Math.min(7, marked.length),
    note: ru
      ? 'Это не клинический порог и не диагноз. Тест не является стандартизированной психологической диагностикой, медицинской рекомендацией, назначением эссенций или доказательством их эффективности. При стойких трудностях обсудите состояние с квалифицированным специалистом.'
      : 'This is not a clinical cutoff or a standardized psychological diagnosis, a medical recommendation, a flower-essence prescription, or evidence of efficacy. For persistent difficulties, consult a qualified professional.',
    seekSupport: marked.some(item => ['Sweet Chestnut','Rock Rose','Gorse'].includes(item.sourceConstruct))
      ? ru
        ? 'Если отчаяние, острые симптомы или страх за безопасность усиливаются, обратитесь за профессиональной, а при непосредственной опасности — срочной помощью.'
        : 'If overwhelming despair, acute symptoms, or immediate safety concerns occur, seek professional or urgent help as appropriate.'
      : null,
  }
}
