// Original EN/RU Holistic House adult tantra-themed self-reflections, not clinical tests.
// Traditional chakra / kundalini concepts are explicitly symbolic; no physical energy is measured.
// Immutable versioned content hashes protect saved reports; change questions only in a NEW version.
import { deepFreeze } from '../../lib/assessments/contracts.js'
const CONFIGS = [
  {
    "key": "hh-tantric-energy-sensitivity",
    "name": [
      "Tantric Energy & Sensitivity",
      "Тантрическая чувствительность и энергия"
    ],
    "description": [
      "Explore body signals, gentle breath awareness and choice without treating subjective energy as a medical measurement.",
      "Исследуйте телесные сигналы, мягкое внимание к дыханию и свободу выбора. Субъективная «энергия» не является медицинским измерением."
    ],
    "topics": [
      "tantra",
      "body",
      "energy",
      "self-support"
    ],
    "domain": "support",
    "minutes": 4,
    "d": [
      {
        "key": "sensations",
        "axis": "embodiment",
        "labels": {
          "en": "Recognising sensations",
          "ru": "Распознавание ощущений"
        },
        "step": {
          "en": "Notice one comfortable sensation for 30 seconds, then return attention to the room.",
          "ru": "Заметьте комфортное ощущение на полминуты, затем верните внимание к окружающему."
        },
        "en": [
          "I notice a change in body tension before it becomes strong.",
          "I can distinguish a comfortable sensation from an overwhelming one.",
          "I notice where my body feels supported when sitting or standing.",
          "I can describe a bodily sensation without assigning it a hidden meaning."
        ],
        "ru": [
          "Я замечаю изменение телесного напряжения до того, как оно становится сильным.",
          "Я отличаю комфортные ощущения от чрезмерно интенсивных.",
          "Я замечаю, где моё тело чувствует опору сидя или стоя.",
          "Я могу описать ощущение, не приписывая ему скрытый смысл."
        ]
      },
      {
        "key": "breath",
        "axis": "embodiment",
        "labels": {
          "en": "Breath and attention",
          "ru": "Дыхание и внимание"
        },
        "step": {
          "en": "Observe the natural rhythm of breathing without holding or forcing it.",
          "ru": "Понаблюдайте за естественным ритмом дыхания без задержек и усилий."
        },
        "en": [
          "I can notice my ordinary breathing without trying to control it.",
          "I can redirect attention away from breath if focusing on it feels uncomfortable.",
          "I recognise when slowing down helps me feel more present.",
          "I can choose a comfortable posture for a short mindful pause."
        ],
        "ru": [
          "Я могу замечать обычное дыхание, не пытаясь им управлять.",
          "Я могу переключить внимание с дыхания, если наблюдать его некомфортно.",
          "Я распознаю моменты, когда замедление помогает мне присутствовать.",
          "Я могу выбрать удобное положение для короткой осознанной паузы."
        ]
      },
      {
        "key": "choice",
        "axis": "boundaries",
        "labels": {
          "en": "Sensitivity with boundaries",
          "ru": "Чувствительность и границы"
        },
        "step": {
          "en": "Choose the amount of sensory stimulation that feels right and pause when needed.",
          "ru": "Выберите комфортную интенсивность ощущений и сделайте паузу, когда нужно."
        },
        "en": [
          "I can turn down sensory stimulation without apologising.",
          "I can name the sensations that help me feel settled.",
          "I allow a pleasant experience to stay simple rather than making it intense.",
          "I can stop a body-awareness practice whenever I choose."
        ],
        "ru": [
          "Я могу уменьшить интенсивность стимуляции без необходимости оправдываться.",
          "Я могу назвать ощущения, помогающие мне почувствовать устойчивость.",
          "Я позволяю приятному переживанию оставаться простым, не усиливая его.",
          "Я могу остановить телесную практику в любой момент по своему выбору."
        ]
      }
    ],
    "index": 1
  },
  {
    "key": "hh-tantric-intimacy-connection",
    "name": [
      "Tantric Intimacy & Connection",
      "Тантрическая близость и контакт"
    ],
    "description": [
      "Reflect on authentic contact, emotional openness and mutual boundaries; a score never indicates another person's consent.",
      "Исследуйте искренний контакт, эмоциональную открытость и взаимные границы; балл не означает согласия другого человека."
    ],
    "topics": [
      "tantra",
      "intimacy",
      "relationships",
      "boundaries"
    ],
    "domain": "relationship",
    "minutes": 4,
    "d": [
      {
        "key": "presence",
        "axis": "intimacy",
        "labels": {
          "en": "Being present with another",
          "ru": "Присутствие рядом с другим"
        },
        "step": {
          "en": "Notice whether a comfortable conversation allows both listening and pauses.",
          "ru": "Заметьте, допускает ли комфортный разговор и слушание, и паузы."
        },
        "en": [
          "I can listen without immediately preparing my response.",
          "I recognise when I am distracted during a close conversation.",
          "I can stay curious about another person's experience without assuming I know it.",
          "I can enjoy a quiet moment together without needing to fill the silence."
        ],
        "ru": [
          "Я могу слушать, не готовя немедленно ответ.",
          "Я замечаю, когда отвлекаюсь во время близкого разговора.",
          "Я могу интересоваться опытом другого, не предполагая, что уже его знаю.",
          "Я могу наслаждаться спокойным совместным моментом, не заполняя тишину."
        ]
      },
      {
        "key": "openness",
        "axis": "relationships",
        "labels": {
          "en": "Emotional openness",
          "ru": "Эмоциональная открытость"
        },
        "step": {
          "en": "Share one modest feeling with someone trustworthy, only if that feels safe.",
          "ru": "Если безопасно, поделитесь небольшим переживанием с человеком, которому доверяете."
        },
        "en": [
          "I can describe a feeling without demanding a particular reaction.",
          "I can ask someone what kind of support they prefer.",
          "I can receive warmth without immediately needing to repay it.",
          "I can say when I need time to understand my feelings."
        ],
        "ru": [
          "Я могу назвать чувство, не требуя определённой реакции.",
          "Я могу спросить, какая поддержка человеку предпочтительна.",
          "Я могу принимать тепло без необходимости немедленно отвечать тем же.",
          "Я могу сказать, что мне нужно время разобраться в чувствах."
        ]
      },
      {
        "key": "consent",
        "axis": "boundaries",
        "labels": {
          "en": "Mutual choice and consent",
          "ru": "Взаимный выбор и согласие"
        },
        "step": {
          "en": "Practise a clear low-stakes yes, no or pause, remembering consent is specific and reversible.",
          "ru": "Потренируйте ясные «да», «нет» или «пауза» в простой ситуации, помня, что согласие конкретно и может быть отозвано."
        },
        "en": [
          "I can ask rather than assume whether contact is welcome.",
          "I accept that another person's no needs no explanation.",
          "I can change my mind about closeness without feeling I owe compliance.",
          "I can name the pace of contact that feels comfortable to me."
        ],
        "ru": [
          "Я могу спросить, желателен ли контакт, вместо предположений.",
          "Я принимаю отказ другого человека без требования объяснений.",
          "Я могу передумать насчёт близости без ощущения обязанности соглашаться.",
          "Я могу обозначить комфортный для себя темп контакта."
        ]
      }
    ],
    "index": 2
  },
  {
    "key": "hh-sexual-freedom-inhibition",
    "name": [
      "Sexual Freedom & Self-Acceptance",
      "Сексуальная свобода и самопринятие"
    ],
    "description": [
      "Non-judgmental reflection on body acceptance, shame and freely chosen preferences. Desire and sexual activity are never required.",
      "Бережная саморефлексия о принятии тела, стыде и свободном выборе. Желание и сексуальная активность не являются обязательными."
    ],
    "topics": [
      "tantra",
      "sexuality",
      "intimacy",
      "boundaries"
    ],
    "domain": "boundaries",
    "minutes": 4,
    "d": [
      {
        "key": "body_comfort",
        "axis": "sexual_wellbeing",
        "labels": {
          "en": "Comfort with my body",
          "ru": "Комфорт в своём теле"
        },
        "step": {
          "en": "Notice one neutral or kind thing you can say about your body today.",
          "ru": "Отметьте одну нейтральную или добрую мысль о своём теле сегодня."
        },
        "en": [
          "I can appreciate my body's needs without comparing its appearance.",
          "I can recognise physical comfort as a valid reason to slow down.",
          "I can treat my body respectfully even when I feel self-conscious.",
          "I can choose clothing and environments that support my comfort."
        ],
        "ru": [
          "Я могу уважать потребности тела, не сравнивая свою внешность с другими.",
          "Я могу считать телесный комфорт достаточной причиной замедлиться.",
          "Я могу относиться к телу с уважением, даже когда стесняюсь.",
          "Я могу выбирать одежду и обстановку, в которых мне комфортно."
        ]
      },
      {
        "key": "shame",
        "axis": "self_support",
        "labels": {
          "en": "Responding kindly to embarrassment",
          "ru": "Бережное отношение к смущению"
        },
        "step": {
          "en": "Describe one moment of embarrassment without turning it into a judgement of yourself.",
          "ru": "Опишите момент смущения, не превращая его в оценку себя."
        },
        "en": [
          "I can notice embarrassment without calling myself defective.",
          "I can recognise when fear of judgement shapes my choices.",
          "I can speak to myself kindly after an awkward intimate conversation.",
          "I can allow my preferences to evolve without shame."
        ],
        "ru": [
          "Я могу замечать смущение, не называя себя неправильным.",
          "Я могу распознавать, когда страх оценки влияет на мой выбор.",
          "Я могу поддержать себя после неловкого разговора о близости.",
          "Я могу позволять предпочтениям меняться без стыда."
        ]
      },
      {
        "key": "autonomy",
        "axis": "boundaries",
        "labels": {
          "en": "Personal agency",
          "ru": "Личный выбор"
        },
        "step": {
          "en": "Consider one way of stating a preference or limit without pressure.",
          "ru": "Подумайте, как обозначить предпочтение или ограничение без давления."
        },
        "en": [
          "I know I can choose not to pursue sexual activity.",
          "I can distinguish my own preference from another person's expectations.",
          "I can speak about a limit without needing to justify it.",
          "I respect that enjoyable intimacy can take many forms, including none."
        ],
        "ru": [
          "Я знаю, что могу выбирать отсутствие сексуальной активности.",
          "Я могу отличать собственное предпочтение от ожиданий другого.",
          "Я могу говорить об ограничении без необходимости его оправдывать.",
          "Я уважаю, что приятная близость бывает разной и может вовсе отсутствовать."
        ]
      }
    ],
    "index": 3
  },
  {
    "key": "hh-chakra-kundalini-profile",
    "name": [
      "Chakra & Kundalini Symbolic Profile",
      "Символический профиль чакр и кундалини"
    ],
    "description": [
      "Seven symbolic themes for self-reflection, not a measurement of chakras, kundalini activation or medical energy.",
      "Семь символических тем для саморефлексии; не измерение чакр, активации кундалини или медицинской энергии."
    ],
    "topics": [
      "tantra",
      "body",
      "energy",
      "meaning",
      "resources"
    ],
    "domain": "support",
    "minutes": 6,
    "d": [
      {
        "key": "root",
        "axis": "self_support",
        "labels": {
          "en": "Root: stability",
          "ru": "Корень: устойчивость"
        },
        "step": {
          "en": "Notice what feels reliably supportive in an ordinary day.",
          "ru": "Отметьте, что даёт ощущение устойчивости в обычном дне."
        },
        "en": [
          "I can recognise when I need rest or practical support.",
          "I notice ordinary conditions that help me feel grounded.",
          "I can return to a simple routine after an unsettling moment."
        ],
        "ru": [
          "Я могу распознать потребность в отдыхе или практической поддержке.",
          "Я замечаю обычные условия, дающие ощущение опоры.",
          "Я могу вернуться к простой привычной деятельности после волнения."
        ]
      },
      {
        "key": "sacral",
        "axis": "sexual_wellbeing",
        "labels": {
          "en": "Sacral: pleasure and choice",
          "ru": "Сакральный центр: удовольствие и выбор"
        },
        "step": {
          "en": "Recall an everyday pleasant experience without demanding intensity.",
          "ru": "Вспомните приятный обычный момент без требования сильных ощущений."
        },
        "en": [
          "I can notice an activity that genuinely brings me enjoyment.",
          "I respect my own changing preferences.",
          "I can accept pleasure without making it a performance."
        ],
        "ru": [
          "Я замечаю занятия, которые действительно приносят удовольствие.",
          "Я уважаю свои меняющиеся предпочтения.",
          "Я могу принимать удовольствие, не превращая его в достижение."
        ]
      },
      {
        "key": "solar",
        "axis": "self_support",
        "labels": {
          "en": "Solar plexus: agency",
          "ru": "Солнечное сплетение: воля"
        },
        "step": {
          "en": "Choose one small action aligned with your needs.",
          "ru": "Выберите небольшой поступок в соответствии со своими потребностями."
        },
        "en": [
          "I can make a small decision without excessive approval seeking.",
          "I can state a need in clear words.",
          "I notice when I have a genuine choice."
        ],
        "ru": [
          "Я могу принять небольшое решение без постоянного поиска одобрения.",
          "Я могу ясно выразить потребность.",
          "Я замечаю ситуации, когда у меня есть реальный выбор."
        ]
      },
      {
        "key": "heart",
        "axis": "intimacy",
        "labels": {
          "en": "Heart: warmth and connection",
          "ru": "Сердце: тепло и контакт"
        },
        "step": {
          "en": "Remember a moment of mutual care with no expectation of reciprocity.",
          "ru": "Вспомните момент взаимной заботы без требования ответного действия."
        },
        "en": [
          "I recognise when someone offers sincere care.",
          "I can express appreciation without expecting a reward.",
          "I can hold care and boundaries at the same time."
        ],
        "ru": [
          "Я распознаю искреннюю заботу со стороны другого.",
          "Я могу выразить признательность без ожидания награды.",
          "Я могу сочетать заботу и личные границы."
        ]
      },
      {
        "key": "throat",
        "axis": "boundaries",
        "labels": {
          "en": "Throat: authentic voice",
          "ru": "Горло: подлинный голос"
        },
        "step": {
          "en": "Find one clear, respectful sentence that expresses your own view.",
          "ru": "Найдите ясную уважительную фразу, выражающую вашу позицию."
        },
        "en": [
          "I can voice a preference without attacking anyone.",
          "I can say when something does not suit me.",
          "I can ask for time before answering an important question."
        ],
        "ru": [
          "Я могу высказать предпочтение без нападок на других.",
          "Я могу сказать, когда что-то мне не подходит.",
          "Я могу попросить время перед ответом на важный вопрос."
        ]
      },
      {
        "key": "brow",
        "axis": "clarity",
        "labels": {
          "en": "Brow: reflection and insight",
          "ru": "Межбровье: осмысление"
        },
        "step": {
          "en": "Separate what you observed from what you inferred in one situation.",
          "ru": "Разделите наблюдение и предположение в одной ситуации."
        },
        "en": [
          "I can notice an assumption and reconsider it.",
          "I make room for uncertainty when interpreting experiences.",
          "I can reflect on a pattern without treating it as a fact about others."
        ],
        "ru": [
          "Я могу заметить предположение и пересмотреть его.",
          "Я допускаю неопределённость при толковании переживаний.",
          "Я могу рассматривать закономерность, не считая её фактом о других."
        ]
      },
      {
        "key": "crown",
        "axis": "meaning",
        "labels": {
          "en": "Crown: personal meaning",
          "ru": "Макушка: личный смысл"
        },
        "step": {
          "en": "Name a personally meaningful value without comparing spiritual status.",
          "ru": "Назовите личную ценность, не сравнивая духовный статус людей."
        },
        "en": [
          "I can describe what gives my practices personal meaning.",
          "I can respect spiritual views different from my own.",
          "I can bring a meaningful insight into ordinary daily action."
        ],
        "ru": [
          "Я могу назвать, что придаёт моим практикам личный смысл.",
          "Я могу уважать духовные взгляды, отличные от моих.",
          "Я могу воплощать значимое понимание в обычном действии."
        ]
      }
    ],
    "index": 4
  },
  {
    "key": "hh-tantra-development-levels",
    "name": [
      "Tantra Practice: Five Development Themes",
      "Тантра: пять направлений практики"
    ],
    "description": [
      "Reflect on the Holistic House L1–L5 workshop themes: safety, heart, freedom, softening defences and embodied expression. Not a certification or rank.",
      "Исследуйте темы семинаров Holistic House L1–L5: безопасность, сердце, освобождение, смягчение защит и телесное выражение. Не аттестация и не рейтинг."
    ],
    "topics": [
      "tantra",
      "body",
      "intimacy",
      "boundaries",
      "resources"
    ],
    "domain": "support",
    "minutes": 6,
    "d": [
      {
        "key": "l1_safety",
        "axis": "self_support",
        "labels": {
          "en": "L1 · Somatic safety",
          "ru": "L1 · Телесная безопасность"
        },
        "step": {
          "en": "Choose one simple action that increases your sense of choice and safety.",
          "ru": "Выберите простое действие, укрепляющее ощущение выбора и безопасности."
        },
        "en": [
          "I can identify conditions in which I feel more at ease.",
          "I know I may leave a group exercise at any time.",
          "I can find a comfortable way to reconnect with my surroundings.",
          "I can tell a facilitator when an exercise does not suit me."
        ],
        "ru": [
          "Я распознаю условия, в которых мне спокойнее.",
          "Я знаю, что могу выйти из группового упражнения в любой момент.",
          "Я могу найти комфортный способ вернуть внимание к окружению.",
          "Я могу сказать ведущему, что упражнение мне не подходит."
        ]
      },
      {
        "key": "l2_heart",
        "axis": "intimacy",
        "labels": {
          "en": "L2 · Heart connection",
          "ru": "L2 · Сердечный контакт"
        },
        "step": {
          "en": "Notice what makes a caring connection genuinely mutual.",
          "ru": "Отметьте, что делает заботливый контакт по-настоящему взаимным."
        },
        "en": [
          "I can show warmth without assuming closeness is owed.",
          "I can receive a kind gesture without pressure.",
          "I can express appreciation directly.",
          "I respect another person's preferred distance."
        ],
        "ru": [
          "Я могу проявлять тепло, не считая близость обязанностью.",
          "Я могу принимать добрый жест без давления.",
          "Я могу прямо выразить признательность.",
          "Я уважаю предпочитаемую другим человеком дистанцию."
        ]
      },
      {
        "key": "l3_liberation",
        "axis": "self_support",
        "labels": {
          "en": "L3 · Freedom of choice",
          "ru": "L3 · Свобода выбора"
        },
        "step": {
          "en": "Identify one expectation you are free to question.",
          "ru": "Найдите одно ожидание, которое вы вправе пересмотреть."
        },
        "en": [
          "I can recognise inherited rules that no longer suit me.",
          "I can make room for a new choice without rushing.",
          "I can notice shame without letting it decide everything.",
          "I can decline a ritual that conflicts with my values."
        ],
        "ru": [
          "Я могу распознавать усвоенные правила, которые мне больше не подходят.",
          "Я могу допустить новый выбор, не торопясь.",
          "Я могу замечать стыд, не позволяя ему решать всё за меня.",
          "Я могу отказаться от ритуала, противоречащего моим ценностям."
        ]
      },
      {
        "key": "l4_softening",
        "axis": "embodiment",
        "labels": {
          "en": "L4 · Softening defences",
          "ru": "L4 · Смягчение защит"
        },
        "step": {
          "en": "Observe one area of tension without forcing the body to relax.",
          "ru": "Понаблюдайте за напряжением в теле, не заставляя себя расслабляться."
        },
        "en": [
          "I can recognise when my body needs a pause.",
          "I can explore a gentle movement without pushing past discomfort.",
          "I can allow tension to be present without fighting it.",
          "I can ask for support instead of forcing myself through an exercise."
        ],
        "ru": [
          "Я могу распознать, когда телу нужна пауза.",
          "Я могу исследовать мягкое движение, не преодолевая дискомфорт силой.",
          "Я могу позволить напряжению быть, не борясь с ним.",
          "Я могу попросить поддержки, а не принуждать себя продолжать упражнение."
        ]
      },
      {
        "key": "l5_expression",
        "axis": "embodiment",
        "labels": {
          "en": "L5 · Free embodied expression",
          "ru": "L5 · Свободное телесное выражение"
        },
        "step": {
          "en": "Choose a voluntary gesture or movement that feels authentic.",
          "ru": "Выберите добровольное движение или жест, который кажется подлинным."
        },
        "en": [
          "I can move in a way that feels natural to me.",
          "I can enjoy expression without needing an audience.",
          "I can improvise gently and stop when I want.",
          "I can remain myself even when others express themselves differently."
        ],
        "ru": [
          "Я могу двигаться способом, который мне естественен.",
          "Я могу радоваться выражению себя без зрителей.",
          "Я могу мягко импровизировать и останавливаться по желанию.",
          "Я могу оставаться собой, когда другие выражают себя иначе."
        ]
      }
    ],
    "index": 5
  },
  {
    "key": "hh-tantric-personality-portrait",
    "name": [
      "Tantric Personality & Development Portrait",
      "Тантрический личностный портрет и развитие"
    ],
    "description": [
      "An in-depth 64-item portrait of embodied presence, emotional connection, boundaries, sexuality, meaning and integration. Independent descriptive dimensions, never a spiritual ranking or clinical diagnosis.",
      "Развёрнутый портрет из 64 вопросов: телесное присутствие, близость, границы, сексуальность, смысл и интеграция. Независимые описательные шкалы, не духовный рейтинг и не клинический диагноз."
    ],
    "topics": [
      "tantra",
      "body",
      "intimacy",
      "sexuality",
      "boundaries",
      "meaning",
      "personality"
    ],
    "domain": "personality",
    "minutes": 18,
    "d": [
      {
        "key": "grounded",
        "axis": "self_support",
        "labels": {
          "en": "Groundedness and steadiness",
          "ru": "Устойчивость и опора"
        },
        "step": {
          "en": "Compare situations that support a feeling of steadiness.",
          "ru": "Сопоставьте ситуации, в которых появляется ощущение устойчивости."
        },
        "en": [
          "I can notice when I am becoming overwhelmed.",
          "I can name a practical resource that helps me settle.",
          "I know when I need a break from a demanding situation.",
          "I can return attention to ordinary tasks after a strong feeling.",
          "I can choose a supportive environment for myself.",
          "I recognise how rest influences my sense of stability.",
          "I can ask for simple practical help when needed.",
          "I can slow my pace without treating it as failure."
        ],
        "ru": [
          "Я замечаю, когда переживания становятся чрезмерно интенсивными.",
          "Я могу назвать практический ресурс, который меня успокаивает.",
          "Я понимаю, когда мне нужна пауза в трудной ситуации.",
          "Я могу вернуть внимание к обычным делам после сильного чувства.",
          "Я могу выбрать поддерживающую меня обстановку.",
          "Я замечаю, как отдых влияет на ощущение устойчивости.",
          "Я могу попросить простую практическую помощь при необходимости.",
          "Я могу замедлиться, не считая это неудачей."
        ]
      },
      {
        "key": "body_awareness",
        "axis": "embodiment",
        "labels": {
          "en": "Embodied awareness",
          "ru": "Телесное осознавание"
        },
        "step": {
          "en": "Notice what is comfortable in the body without attaching fixed interpretations.",
          "ru": "Замечайте комфортные телесные ощущения без неизменных толкований."
        },
        "en": [
          "I notice physical tension before it becomes exhausting.",
          "I can describe a sensation without guessing its cause.",
          "I can tell when a position is comfortable for me.",
          "I notice bodily signals that indicate I need rest.",
          "I can shift attention away from sensations if needed.",
          "I can enjoy simple pleasant sensory experiences.",
          "I can adjust the intensity of a body practice.",
          "I respect physical limits during group activities."
        ],
        "ru": [
          "Я замечаю телесное напряжение до сильного истощения.",
          "Я могу описать ощущение, не угадывая его причину.",
          "Я понимаю, когда положение тела мне удобно.",
          "Я замечаю телесные сигналы потребности в отдыхе.",
          "Я могу переключить внимание с ощущений при необходимости.",
          "Я могу радоваться простым приятным ощущениям.",
          "Я могу регулировать интенсивность телесной практики.",
          "Я уважаю физические ограничения в групповых занятиях."
        ]
      },
      {
        "key": "emotional_openness",
        "axis": "intimacy",
        "labels": {
          "en": "Emotional openness and warmth",
          "ru": "Эмоциональная открытость и тепло"
        },
        "step": {
          "en": "Name a feeling with compassion before deciding whether to share it.",
          "ru": "Бережно назовите чувство, прежде чем решать, делиться ли им."
        },
        "en": [
          "I can recognise what I am feeling in a close interaction.",
          "I can communicate warmth without expecting a particular response.",
          "I can ask for empathy in clear words.",
          "I can recognise when I would rather keep a feeling private.",
          "I can hear another person's emotions without taking responsibility for fixing them.",
          "I can accept care when it feels welcome.",
          "I can acknowledge vulnerability without self-criticism.",
          "I can appreciate quiet connection without forcing emotional intensity."
        ],
        "ru": [
          "Я могу распознать своё чувство во время близкого общения.",
          "Я могу проявлять тепло, не требуя определённого ответа.",
          "Я могу ясно попросить о сочувствии.",
          "Я могу понять, когда предпочитаю оставить чувство при себе.",
          "Я могу слышать чувства другого, не считая себя обязанным их исправить.",
          "Я могу принимать желательную для меня заботу.",
          "Я могу признавать уязвимость без самокритики.",
          "Я могу ценить тихий контакт без принуждения к сильным эмоциям."
        ]
      },
      {
        "key": "mutuality",
        "axis": "boundaries",
        "labels": {
          "en": "Dialogue, consent and mutuality",
          "ru": "Диалог, согласие и взаимность"
        },
        "step": {
          "en": "Think of a recent conversation in which both sides could choose freely.",
          "ru": "Вспомните разговор, где обе стороны могли свободно выбирать."
        },
        "en": [
          "I ask before assuming physical contact is welcome.",
          "I can express my no in an appropriate situation.",
          "I treat another person's no as enough.",
          "I can ask clarifying questions about expectations.",
          "I can change my mind about an activity.",
          "I can respect different needs for space or touch.",
          "I can discuss a boundary without blaming someone.",
          "I understand that past agreement never guarantees present consent."
        ],
        "ru": [
          "Я спрашиваю, прежде чем считать физический контакт желательным.",
          "Я могу сказать «нет» в подходящей ситуации.",
          "Я воспринимаю отказ другого как достаточный ответ.",
          "Я могу уточнять ожидания собеседника.",
          "Я могу передумать участвовать в занятии.",
          "Я могу уважать разные потребности в дистанции и прикосновении.",
          "Я могу обсудить границу без обвинения другого.",
          "Я понимаю, что прошлое согласие не означает согласия сейчас."
        ]
      },
      {
        "key": "sexual_agency",
        "axis": "sexual_wellbeing",
        "labels": {
          "en": "Sexual self-acceptance and choice",
          "ru": "Сексуальное самопринятие и выбор"
        },
        "step": {
          "en": "Identify one preference you can respect without judging yourself or others.",
          "ru": "Найдите предпочтение, которое можно уважать без осуждения себя или других."
        },
        "en": [
          "I can recognise what feels comfortable to me in an intimate context.",
          "I do not treat any level of sexual desire as obligatory.",
          "I can accept that my preferences may change over time.",
          "I can set a limit even when I care deeply for someone.",
          "I can value my body without comparing it with others.",
          "I can describe a personal preference without feeling obliged to act on it.",
          "I respect different choices about intimacy, including abstinence.",
          "I can notice feelings of shame without defining myself by them."
        ],
        "ru": [
          "Я могу распознавать комфортные для себя условия близости.",
          "Я не считаю какой-либо уровень сексуального желания обязательным.",
          "Я могу принимать изменение предпочтений со временем.",
          "Я могу устанавливать границу даже с очень близким человеком.",
          "Я могу ценить тело, не сравнивая его с другими.",
          "Я могу описать предпочтение без обязанности воплощать его.",
          "Я уважаю разные решения о близости, включая воздержание.",
          "Я могу замечать стыд, не определяя им свою личность."
        ]
      },
      {
        "key": "presence",
        "axis": "embodiment",
        "labels": {
          "en": "Mindful presence and flexibility",
          "ru": "Осознанное присутствие и гибкость"
        },
        "step": {
          "en": "Notice one present-moment detail and then reconnect with ordinary activity.",
          "ru": "Заметьте деталь настоящего момента и вернитесь к обычному занятию."
        },
        "en": [
          "I can notice when my attention has wandered.",
          "I can return attention gently without scolding myself.",
          "I can tolerate a short quiet pause without needing a result.",
          "I can notice thoughts without treating each as a fact.",
          "I can choose not to meditate when it feels unsuitable.",
          "I can be curious about an experience without exaggerating it.",
          "I can accept that different days bring different levels of focus.",
          "I can end a practice and return to daily life comfortably."
        ],
        "ru": [
          "Я могу заметить, когда внимание отвлеклось.",
          "Я могу мягко вернуть внимание без самоосуждения.",
          "Я могу выдержать короткую тихую паузу без требования результата.",
          "Я могу замечать мысли, не считая каждую фактом.",
          "Я могу не медитировать, когда практика мне не подходит.",
          "Я могу интересоваться опытом, не преувеличивая его.",
          "Я могу принимать разную концентрацию в разные дни.",
          "Я могу завершить практику и спокойно вернуться к повседневности."
        ]
      },
      {
        "key": "creative_expression",
        "axis": "resource",
        "labels": {
          "en": "Expression and exploration",
          "ru": "Самовыражение и исследование"
        },
        "step": {
          "en": "Choose a small creative experiment without a performance goal.",
          "ru": "Выберите небольшой творческий эксперимент без цели выступить идеально."
        },
        "en": [
          "I can try a gentle new movement if I want to.",
          "I can express myself creatively without seeking approval.",
          "I can experiment within boundaries that feel safe.",
          "I accept that others may enjoy different forms of expression.",
          "I can let an activity be playful without making it a test.",
          "I can recognise when I prefer stillness to movement.",
          "I can offer an idea without needing everyone to like it.",
          "I can stop an exploration that no longer suits me."
        ],
        "ru": [
          "Я могу по желанию попробовать новое мягкое движение.",
          "Я могу творчески выражаться без поиска одобрения.",
          "Я могу экспериментировать в комфортных для себя границах.",
          "Я принимаю, что другим нравятся иные способы выражения.",
          "Я могу относиться к занятию как к игре, а не экзамену.",
          "Я могу замечать предпочтение неподвижности движению.",
          "Я могу предложить идею без необходимости всем понравиться.",
          "Я могу остановить исследование, которое мне больше не подходит."
        ]
      },
      {
        "key": "meaning",
        "axis": "meaning",
        "labels": {
          "en": "Meaning, symbolism and integration",
          "ru": "Смысл, символы и интеграция"
        },
        "step": {
          "en": "Translate one meaningful impression into a small everyday action.",
          "ru": "Превратите значимое впечатление в небольшой повседневный поступок."
        },
        "en": [
          "I can name a personal value guiding my practice.",
          "I can enjoy symbolism without confusing it with physical measurement.",
          "I can respect spiritual interpretations different from mine.",
          "I can reflect on an experience without claiming it proves hidden forces.",
          "I can recognise practical changes that matter to me.",
          "I can choose a practice because it fits my values.",
          "I can compare how I feel over time without demanding progress every day.",
          "I can keep meaningful insights connected to ordinary responsibilities."
        ],
        "ru": [
          "Я могу назвать личную ценность, направляющую практику.",
          "Я могу ценить символы, не путая их с физическим измерением.",
          "Я могу уважать духовные толкования, отличающиеся от моих.",
          "Я могу осмысливать опыт, не считая его доказательством скрытых сил.",
          "Я могу распознавать важные для себя практические изменения.",
          "Я могу выбирать практику по соответствию ценностям.",
          "Я могу сравнивать своё состояние со временем без требования ежедневного прогресса.",
          "Я могу связывать значимые выводы с обычными обязанностями."
        ]
      }
    ],
    "index": 6
  }
]
const HASHES = {
  "hh-tantric-energy-sensitivity": {
    "en": "sha256:dc8ff80af7ff0d26908a9b0bc1ae2cca1176526e1cceabfb5de9273ee339fc71",
    "ru": "sha256:947d65a45d8e05d2f2beab205911c0391fb5bbbcbb24e6fd0d4db0c1754eda79"
  },
  "hh-tantric-intimacy-connection": {
    "en": "sha256:a482aef276e9b3e99eeba51f9125ddf46acd5f680b9ea4e6d9b42974e7c04119",
    "ru": "sha256:e43de52cece11624c135b9e1018a50c6451d0541b08e5ee9520816b0513229d3"
  },
  "hh-sexual-freedom-inhibition": {
    "en": "sha256:94e321bd42efcf92cb1b67bf162fc3fb68a5ef299d9c5899f5cd4efd6b91150a",
    "ru": "sha256:f5e3f17e3be0aeb9f7dbfbda997dabe0ebb0641ebe4a4e840e5cc973c4e1eeef"
  },
  "hh-chakra-kundalini-profile": {
    "en": "sha256:6a3bd3085f0639cc68348db29bae530092bf511da0b459d519ee16b3880694a2",
    "ru": "sha256:727278452bbaa5f894842d5a013438d733483f15d6577a7d0d85d5faf9cb5e11"
  },
  "hh-tantra-development-levels": {
    "en": "sha256:06bb5a75d1da52c47c09be97b37a02683d9266e5693760349fb1ef297e3082de",
    "ru": "sha256:62fa36d09f15fa6bd0119295f617510f6c25239e7f0d1b525134823d64a0cd2a"
  },
  "hh-tantric-personality-portrait": {
    "en": "sha256:72316429e24db82e55ab88b7f85b2ac33e36dd0a380a40d9e54597f79d04287e",
    "ru": "sha256:f756b30d6f23cfc027e78d2b0eba18ec8a7343cb52165192e4538e376694aba5"
  }
}
function makeBaseDefinition(c,locale) {
 const questions=c.d.flatMap(d=>d[locale]).map((text,index)=>({id:c.key+'.'+String(index+1).padStart(2,'0'),text,required:true,direction:'higher-reported-resource'}));
 let start=0;
 const dimensions=c.d.map(d=>{const subset=questions.slice(start,start+d[locale].length);start+=d[locale].length;return {key:'resources.tantric.'+c.key.replace(/^hh-/,'').replaceAll('-','_')+'.'+d.key,method:'mean',items:subset.map(q=>q.id),min:0,max:4,dimensionClass:'resources',sourceConstruct:d.labels[locale],direction:'higher-reported-resource'}});
 return {id:'c7b2'+String(c.index).padStart(4,'0')+'-1710-4a00-8d11-20261017000'+(locale==='en'?'1':'2'),key:c.key,version:'v1',instrumentLocale:locale,translationVersion:'hh-'+locale+'-v1',timeframe:'past-30-days',scoringKey:'configured',scoringVersion:'v1',resultVersion:'v1',title:c.name[locale==='en'?0:1],source:{title:'Holistic House — '+c.name[0],status:'original-non-diagnostic-tantric-reflection',reviewedAt:'2026-10-17'},answerScale:{min:0,max:4},responseAnchors:locale==='ru'?['Совсем нет','Немного','Отчасти','В значительной степени','Очень сильно']:['Not at all','A little','Somewhat','Quite a lot','Very much'],scoring:{dimensions},questions,optionalContext:[],suggestedRepeatDays:30};
}
const keyOf=(cfg,dimension)=>'resources.tantric.'+cfg.key.replace(/^hh-/,'').replaceAll('-','_')+'.'+dimension.key
export const TANTRIC_REFLECTION_KEYS=deepFreeze(CONFIGS.map(cfg=>cfg.key))
export const TANTRIC_REFLECTION_DEFINITIONS=deepFreeze(CONFIGS.flatMap(cfg=>['en','ru'].map(locale=>({...makeBaseDefinition(cfg,locale),contentHash:HASHES[cfg.key][locale]}))))
export const TANTRIC_REFLECTION_CATALOG=deepFreeze(CONFIGS.map(cfg=>({
  key:cfg.key,version:'v1',instrumentLocale:'dynamic',axis:'resources',resultAxes:['resources'],
  topics:cfg.topics,moodAffinities:['neutral','happy','sad'],categoryAffinities:['body','relationships','emotions','energy'],
  questionCount:cfg.d.reduce((sum,dim)=>sum+dim.en.length,0),durationMinutes:cfg.minutes,
  testStyle:'engaging',testLength:'comprehensive',suggestedRepeatDays:30,cooldownDays:14,
  startable:true,starterEligible:false,access:'account',rightsStatus:'cleared',guestEligible:true,free:true,
  analysisAxes:[...new Set(cfg.d.map(dim=>dim.axis))].map(axis=>({key:axis,weight:0.9})),
  title:{en:cfg.name[0],ru:cfg.name[1]},description:{en:cfg.description[0],ru:cfg.description[1]},
})))
export const TANTRIC_REFLECTION_ROWS=deepFreeze(CONFIGS.map(cfg=>[cfg.key,cfg.domain,
  'Reflect on each dimension independently. No score ranks people, verifies energy or proves consent. Consider gentle choices relevant to your daily life.',
  'Рассматривайте шкалы отдельно. Баллы не ранжируют людей, не подтверждают энергию и не определяют согласие. Выбирайте подходящие бережные действия в повседневной жизни.']))
export const TANTRIC_DIMENSION_ROWS=deepFreeze(CONFIGS.flatMap(cfg=>cfg.d.map(dim=>[cfg.key,keyOf(cfg,dim),
  cfg.domain,dim.labels.en,dim.labels.ru,dim.step.en,dim.step.ru])))
export const TANTRIC_DIMENSION_AXES=deepFreeze(Object.fromEntries(CONFIGS.flatMap(cfg=>cfg.d.map(dim=>[keyOf(cfg,dim),dim.axis]))))
export const TANTRIC_CONTEXT_COPY=deepFreeze({
  en:'Original experimental Holistic House tantra-themed self-reflections for adults (2026). Not clinically validated, diagnostic or normed. Colours represent descriptive answer positions only. Chakra and kundalini themes are symbolic, not measured energies. Scores do not evaluate sexual functioning, spiritual worth, consent or another person; participation and all practices are optional.',
  ru:'Экспериментальные авторские тантрические анкеты Holistic House для взрослых (2026). Не прошли клиническую валидацию, не являются диагностикой и не имеют нормативных порогов. Цвета отражают только положение ответов на шкале. Чакры и кундалини здесь — символические темы, не измерение энергии. Баллы не оценивают сексуальную функцию, духовную ценность, согласие или другого человека; участие и практики добровольны.'
})

