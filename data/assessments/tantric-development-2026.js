// Holistic House original adult self-reflections. Not a clinical diagnosis, chakra-energy measurement, consent assessment or ranking.
// Immutable v1 definitions; add a new version and database migration rather than changing published question text.
import { deepFreeze } from '../../lib/assessments/contracts.js'

const CONFIGS = [
  {
    "key": "hh-tantric-energy-sensitivity",
    "titles": {
      "en": "Tantric Energy & Sensitivity",
      "ru": "Тантрическая чувствительность и энергия",
      "es": "Energía y sensibilidad tántrica"
    },
    "descriptions": {
      "en": "A 16-item Holistic House reflection on breath, bodily sensation, grounding and self-regulation; “energy” refers to subjective experience, not measured energy.",
      "ru": "16 вопросов о дыхании, телесных ощущениях, заземлении и саморегуляции. «Энергия» означает субъективное переживание, не физическое измерение.",
      "es": "A 16-item Holistic House reflection on breath, bodily sensation, grounding and self-regulation; “energy” refers to subjective experience, not measured energy."
    },
    "topics": [
      "tantra",
      "body",
      "energy",
      "intimacy"
    ],
    "axes": [
      [
        "embodiment",
        1
      ],
      [
        "energy",
        0.85
      ],
      [
        "emotional_regulation",
        0.75
      ]
    ],
    "duration": 5,
    "scales": [
      {
        "key": "breath",
        "axis": "embodiment",
        "label": {
          "en": "Breath awareness",
          "ru": "Осознание дыхания"
        },
        "en": [
          "I notice when my breathing becomes quicker or slower.",
          "I can follow a comfortable breath without trying to control it.",
          "I recognise when I am holding my breath during tension.",
          "I can let my breathing settle at its own pace."
        ],
        "ru": [
          "Я замечаю, когда дыхание ускоряется или замедляется.",
          "Я могу следить за комфортным дыханием, не стараясь им управлять.",
          "Я замечаю задержку дыхания при напряжении.",
          "Я могу позволить дыханию успокоиться в своём темпе."
        ],
        "step": {
          "en": "Notice one ordinary breath in a comfortable setting; do not force deep breathing.",
          "ru": "Заметьте одно обычное дыхание в спокойной обстановке; не форсируйте глубокий вдох."
        }
      },
      {
        "key": "signals",
        "axis": "embodiment",
        "label": {
          "en": "Body signals",
          "ru": "Сигналы тела"
        },
        "en": [
          "I can distinguish physical ease from strain.",
          "I notice where my body is in contact with a chair or the floor.",
          "I can describe a body sensation without immediately judging it.",
          "I recognise when a pleasant sensation becomes overwhelming."
        ],
        "ru": [
          "Я различаю телесный комфорт и перенапряжение.",
          "Я чувствую точки опоры тела на стул или пол.",
          "Я могу описать ощущение тела, не оценивая его сразу.",
          "Я замечаю, когда приятное ощущение становится чрезмерным."
        ],
        "step": {
          "en": "Notice one neutral body sensation and choose whether to continue paying attention.",
          "ru": "Отметьте одно нейтральное ощущение и решите, хотите ли продолжать наблюдение."
        }
      },
      {
        "key": "choice",
        "axis": "boundaries",
        "label": {
          "en": "Choice of intensity",
          "ru": "Выбор интенсивности"
        },
        "en": [
          "I can reduce the intensity of an exercise when I need to.",
          "I notice which sensory environments feel supportive.",
          "I can move or change position when something is uncomfortable.",
          "I can end a practice without feeling obliged to complete it."
        ],
        "ru": [
          "Я могу уменьшить интенсивность упражнения при необходимости.",
          "Я замечаю, какая сенсорная среда меня поддерживает.",
          "Я могу сменить позу, если ощущаю дискомфорт.",
          "Я могу завершить практику без чувства обязанности довести её до конца."
        ],
        "step": {
          "en": "Choose a comfortable pace and keep the option to stop without explanation.",
          "ru": "Выберите комфортный темп и оставьте за собой право остановиться без объяснений."
        }
      },
      {
        "key": "settling",
        "axis": "emotional_regulation",
        "label": {
          "en": "Gentle regulation",
          "ru": "Бережная саморегуляция"
        },
        "en": [
          "I can notice an early sign that I need a pause.",
          "I know at least one ordinary activity that helps me feel steadier.",
          "I can shift attention from intense sensations to the room around me.",
          "I allow myself recovery time after an intense experience."
        ],
        "ru": [
          "Я замечаю первые признаки того, что нужна пауза.",
          "Я знаю хотя бы одно обычное занятие, помогающее восстановить устойчивость.",
          "Я могу перевести внимание с сильных ощущений на пространство вокруг.",
          "Я разрешаю себе восстановиться после интенсивного опыта."
        ],
        "step": {
          "en": "Try a short break with your feet on the floor and notice what changes.",
          "ru": "Попробуйте короткую паузу, ощущая стопы на полу, и отметьте изменения."
        }
      }
    ]
  },
  {
    "key": "hh-tantric-intimacy-connection",
    "titles": {
      "en": "Tantric Intimacy & Connection",
      "ru": "Тантрическая близость и контакт",
      "es": "Intimidad y conexión tántrica"
    },
    "descriptions": {
      "en": "16 questions about presence, communication, mutual pacing and emotional safety in chosen relationships; no partner is required.",
      "ru": "16 вопросов о присутствии, общении, взаимном темпе и эмоциональной безопасности. Наличие партнёра необязательно.",
      "es": "16 questions about presence, communication, mutual pacing and emotional safety in chosen relationships; no partner is required."
    },
    "topics": [
      "tantra",
      "intimacy",
      "relationships",
      "boundaries"
    ],
    "axes": [
      [
        "intimacy",
        0.96
      ],
      [
        "relationships",
        0.93
      ],
      [
        "boundaries",
        0.9
      ]
    ],
    "duration": 5,
    "scales": [
      {
        "key": "presence",
        "axis": "intimacy",
        "label": {
          "en": "Presence with others",
          "ru": "Присутствие рядом с другим"
        },
        "en": [
          "I can notice my feelings while listening to someone.",
          "I can give another person attention without abandoning my own needs.",
          "I recognise when I want closeness and when I need space.",
          "I can enjoy a quiet shared moment without needing to fill it."
        ],
        "ru": [
          "Я замечаю свои чувства, слушая другого человека.",
          "Я могу уделять внимание другому, не забывая о своих потребностях.",
          "Я различаю желание близости и потребность в дистанции.",
          "Я могу наслаждаться общей тишиной, не стараясь её заполнить."
        ],
        "step": {
          "en": "Recall a comfortable conversation and notice what helped you stay present.",
          "ru": "Вспомните комфортный разговор и отметьте, что помогало вам присутствовать."
        }
      },
      {
        "key": "dialogue",
        "axis": "relationships",
        "label": {
          "en": "Open conversation",
          "ru": "Открытый диалог"
        },
        "en": [
          "I can name a feeling without expecting the other person to fix it.",
          "I can ask what another person needs instead of guessing.",
          "I can explain what kind of connection is welcome to me.",
          "I can receive an honest answer without requiring agreement."
        ],
        "ru": [
          "Я могу назвать чувство, не ожидая, что другой обязан его исправить.",
          "Я могу спросить о потребностях другого вместо догадок.",
          "Я могу объяснить, какой контакт мне подходит.",
          "Я могу принять честный ответ без требования согласия."
        ],
        "step": {
          "en": "Use one simple “I feel / I need” sentence in a low-pressure setting.",
          "ru": "Попробуйте одну простую фразу «я чувствую / мне нужно» в спокойной обстановке."
        }
      },
      {
        "key": "boundaries",
        "axis": "boundaries",
        "label": {
          "en": "Clear boundaries",
          "ru": "Ясные границы"
        },
        "en": [
          "I feel permitted to decline a form of touch or closeness.",
          "I can ask before initiating physical or emotional intimacy.",
          "I respect a pause or refusal without trying to persuade.",
          "I can change my mind after initially agreeing to a practice."
        ],
        "ru": [
          "Я разрешаю себе отказаться от прикосновения или близости.",
          "Я могу спросить согласие перед телесным или эмоциональным сближением.",
          "Я уважаю паузу или отказ без попыток переубедить.",
          "Я могу изменить решение после первоначального согласия на практику."
        ],
        "step": {
          "en": "Practise a clear, kind “not now” and honour the same response from others.",
          "ru": "Потренируйте спокойное «не сейчас» и уважайте такой же ответ другого."
        }
      },
      {
        "key": "pacing",
        "axis": "intimacy",
        "label": {
          "en": "Mutual pacing",
          "ru": "Взаимный темп"
        },
        "en": [
          "I can slow a shared exercise when it feels too intense.",
          "I can check whether the other person is still comfortable.",
          "I can be close without assuming physical intimacy is expected.",
          "I allow trust to develop gradually rather than proving it."
        ],
        "ru": [
          "Я могу замедлить совместное упражнение при чрезмерной интенсивности.",
          "Я могу уточнить, комфортно ли другому человеку продолжать.",
          "Я могу быть близко, не считая физическую интимность обязательной.",
          "Я позволяю доверию развиваться постепенно, не доказывая его."
        ],
        "step": {
          "en": "Before a shared practice, agree on an easy signal for pausing or stopping.",
          "ru": "Перед совместной практикой договоритесь о простом сигнале паузы или остановки."
        }
      }
    ]
  },
  {
    "key": "hh-tantric-sexual-freedom",
    "titles": {
      "en": "Sexual Freedom & Self-Acceptance",
      "ru": "Сексуальная свобода и принятие себя",
      "es": "Libertad sexual y autoaceptación"
    },
    "descriptions": {
      "en": "16 non-explicit adult self-reflection questions about choice, shame, enjoyment and freedom from performance pressure. No desired level of sexuality is assumed.",
      "ru": "16 деликатных вопросов для взрослых о свободе выбора, стыде, удовольствии и отсутствии давления результата. Нет обязательной нормы сексуальности.",
      "es": "16 non-explicit adult self-reflection questions about choice, shame, enjoyment and freedom from performance pressure. No desired level of sexuality is assumed."
    },
    "topics": [
      "tantra",
      "sexuality",
      "intimacy",
      "boundaries"
    ],
    "axes": [
      [
        "sexual_wellbeing",
        1
      ],
      [
        "self_support",
        0.87
      ],
      [
        "boundaries",
        0.86
      ]
    ],
    "duration": 5,
    "scales": [
      {
        "key": "kindness",
        "axis": "self_support",
        "label": {
          "en": "Self-kindness",
          "ru": "Бережность к себе"
        },
        "en": [
          "I can view my preferences without calling them wrong.",
          "I can notice embarrassment without attacking myself for it.",
          "I can treat changes in desire as information rather than failure.",
          "I allow myself time to understand what feels right for me."
        ],
        "ru": [
          "Я могу относиться к своим предпочтениям без ярлыка «неправильно».",
          "Я могу замечать смущение, не ругая себя за него.",
          "Я воспринимаю изменения желания как информацию, а не неудачу.",
          "Я даю себе время понять, что мне подходит."
        ],
        "step": {
          "en": "Notice one self-critical thought and replace it with a fairer description.",
          "ru": "Отметьте одну самокритичную мысль и замените её более справедливым описанием."
        }
      },
      {
        "key": "choice",
        "axis": "boundaries",
        "label": {
          "en": "Voluntary choice",
          "ru": "Добровольный выбор"
        },
        "en": [
          "I can distinguish my wishes from another person’s expectations.",
          "I can say “no” without feeling I must provide a long explanation.",
          "I can express curiosity without promising to act on it.",
          "I can avoid a practice that conflicts with my values."
        ],
        "ru": [
          "Я различаю собственные желания и ожидания другого человека.",
          "Я могу сказать «нет» без необходимости долго оправдываться.",
          "Я могу проявлять любопытство без обещания действовать.",
          "Я могу отказаться от практики, противоречащей моим ценностям."
        ],
        "step": {
          "en": "Write down one boundary that protects your choice, even in imagination.",
          "ru": "Сформулируйте одну границу, защищающую ваш выбор, даже мысленно."
        }
      },
      {
        "key": "enjoyment",
        "axis": "sexual_wellbeing",
        "label": {
          "en": "Ease with enjoyment",
          "ru": "Свобода получать удовольствие"
        },
        "en": [
          "I can notice enjoyment in ordinary non-sexual moments.",
          "I can accept pleasant sensations without feeling I owe someone anything.",
          "I can appreciate affection without expecting it to lead further.",
          "I can let enjoyment be subtle instead of intense."
        ],
        "ru": [
          "Я замечаю удовольствие в обычных, не сексуальных моментах.",
          "Я могу принимать приятные ощущения без чувства долга перед кем-либо.",
          "Я ценю нежность без ожидания продолжения.",
          "Я разрешаю удовольствию быть тонким, а не интенсивным."
        ],
        "step": {
          "en": "Notice one comfortable everyday pleasure without making it a task.",
          "ru": "Отметьте одно приятное повседневное ощущение, не превращая его в обязанность."
        }
      },
      {
        "key": "freedom",
        "axis": "sexual_wellbeing",
        "label": {
          "en": "Freedom from performance",
          "ru": "Свобода от оценки результата"
        },
        "en": [
          "I can connect with someone without measuring how well I perform.",
          "I can enjoy affection without treating it as a test.",
          "I can openly name uncertainty about intimacy.",
          "I can stop comparing my experiences with an imagined ideal."
        ],
        "ru": [
          "Я могу общаться и сближаться, не оценивая свою «успешность».",
          "Я могу радоваться нежности, не воспринимая её как экзамен.",
          "Я могу открыто говорить о неопределённости в близости.",
          "Я могу перестать сравнивать свой опыт с воображаемым идеалом."
        ],
        "step": {
          "en": "Notice one expectation that adds pressure and consider setting it aside.",
          "ru": "Заметьте одно ожидание, создающее давление, и попробуйте на время его отпустить."
        }
      }
    ]
  },
  {
    "key": "hh-tantric-chakra-reflection",
    "titles": {
      "en": "Seven Chakras: Symbolic Self-Reflection",
      "ru": "Семь чакр: символический профиль",
      "es": "Siete chakras: perfil simbólico"
    },
    "descriptions": {
      "en": "21 original questions using seven chakra themes as symbols for everyday experience. Not a measurement of chakras, physiology or physical energy.",
      "ru": "21 авторский вопрос: семь чакр используются как символические темы для самопознания. Опросник не измеряет чакры, физиологию или физическую энергию.",
      "es": "21 original questions using seven chakra themes as symbols for everyday experience. Not a measurement of chakras, physiology or physical energy."
    },
    "topics": [
      "tantra",
      "body",
      "resources",
      "meaning"
    ],
    "axes": [
      [
        "embodiment",
        0.82
      ],
      [
        "self_support",
        0.81
      ],
      [
        "meaning",
        0.78
      ]
    ],
    "duration": 7,
    "scales": [
      {
        "key": "root",
        "axis": "embodiment",
        "label": {
          "en": "Root: steadiness",
          "ru": "Корень: устойчивость"
        },
        "en": [
          "I can find at least one place where I feel settled.",
          "I can notice when I need practical support.",
          "I can give myself permission to slow down."
        ],
        "ru": [
          "Я могу найти хотя бы одно место, где чувствую устойчивость.",
          "Я замечаю, когда нужна практическая поддержка.",
          "Я могу позволить себе замедлиться."
        ],
        "step": {
          "en": "Name one practical condition that helps you feel grounded.",
          "ru": "Назовите одно практическое условие, которое придаёт устойчивость."
        }
      },
      {
        "key": "sacral",
        "axis": "sexual_wellbeing",
        "label": {
          "en": "Sacral: feeling and joy",
          "ru": "Сакральная тема: чувства и радость"
        },
        "en": [
          "I give ordinary enjoyment a place in my routine.",
          "I can notice creative impulses without having to pursue them.",
          "I respect my preferences around comfort and pleasure."
        ],
        "ru": [
          "Я оставляю место обычной радости в повседневности.",
          "Я замечаю творческие импульсы без обязанности их реализовать.",
          "Я уважаю свои предпочтения в комфорте и удовольствии."
        ],
        "step": {
          "en": "Recall one harmless activity that brings enjoyment without pressure.",
          "ru": "Вспомните занятие, приносящее радость без давления."
        }
      },
      {
        "key": "solar",
        "axis": "self_support",
        "label": {
          "en": "Solar: agency",
          "ru": "Солнечная тема: воля"
        },
        "en": [
          "I can make a small decision for myself.",
          "I recognise when a boundary protects my priorities.",
          "I can take action without needing absolute confidence."
        ],
        "ru": [
          "Я могу принимать небольшие решения самостоятельно.",
          "Я понимаю, когда граница защищает мои приоритеты.",
          "Я могу действовать без абсолютной уверенности."
        ],
        "step": {
          "en": "Choose one manageable decision and notice what supports it.",
          "ru": "Выберите одно посильное решение и отметьте, что помогает его принять."
        }
      },
      {
        "key": "heart",
        "axis": "intimacy",
        "label": {
          "en": "Heart: connection",
          "ru": "Сердце: контакт"
        },
        "en": [
          "I can express sincere appreciation.",
          "I can receive kindness without having to repay it.",
          "I can offer warmth while respecting another person’s independence."
        ],
        "ru": [
          "Я могу искренне выразить признательность.",
          "Я могу принять доброту без необходимости сразу отплатить.",
          "Я могу проявлять тепло, уважая независимость другого."
        ],
        "step": {
          "en": "Recall one safe moment of receiving or offering care.",
          "ru": "Вспомните безопасный момент проявления или принятия заботы."
        }
      },
      {
        "key": "throat",
        "axis": "boundaries",
        "label": {
          "en": "Throat: expression",
          "ru": "Горло: выражение"
        },
        "en": [
          "I can state a need in simple words.",
          "I can pause before answering a difficult question.",
          "I can express disagreement without humiliation or attack."
        ],
        "ru": [
          "Я могу выразить потребность простыми словами.",
          "Я могу сделать паузу перед ответом на трудный вопрос.",
          "Я могу выразить несогласие без унижения и нападения."
        ],
        "step": {
          "en": "Write one clear, respectful sentence about a personal need.",
          "ru": "Запишите одну ясную уважительную фразу о своей потребности."
        }
      },
      {
        "key": "brow",
        "axis": "clarity",
        "label": {
          "en": "Brow: reflection",
          "ru": "Межбровье: осмысление"
        },
        "en": [
          "I can distinguish an observation from an assumption.",
          "I can revise an interpretation when I learn more.",
          "I can reflect without treating every thought as a fact."
        ],
        "ru": [
          "Я различаю наблюдение и предположение.",
          "Я могу пересмотреть трактовку, получив новые сведения.",
          "Я могу размышлять, не принимая каждую мысль за факт."
        ],
        "step": {
          "en": "Write one observation and one possible interpretation separately.",
          "ru": "Отдельно запишите одно наблюдение и одну возможную интерпретацию."
        }
      },
      {
        "key": "crown",
        "axis": "meaning",
        "label": {
          "en": "Crown: meaning",
          "ru": "Макушка: смысл"
        },
        "en": [
          "I can identify an activity that feels personally meaningful.",
          "I can leave room for uncertainty about spiritual questions.",
          "I can choose practices based on my own values."
        ],
        "ru": [
          "Я могу назвать занятие, которое кажется мне значимым.",
          "Я допускаю неопределённость в духовных вопросах.",
          "Я могу выбирать практики исходя из собственных ценностей."
        ],
        "step": {
          "en": "Consider what one spiritual or secular value means in daily life.",
          "ru": "Подумайте, как одна духовная или светская ценность проявляется в повседневности."
        }
      }
    ]
  },
  {
    "key": "hh-tantric-development-levels",
    "titles": {
      "en": "Tantra L1–L5: Practice Portrait",
      "ru": "Тантра L1–L5: профиль практики",
      "es": "Tantra L1–L5: perfil de práctica"
    },
    "descriptions": {
      "en": "20 questions across five Holistic House workshop themes. Scores describe current experiences, not levels earned, spiritual rank or course eligibility.",
      "ru": "20 вопросов по пяти темам семинаров Holistic House. Баллы описывают опыт, а не присвоенный уровень, духовный ранг или допуск к практике.",
      "es": "20 questions across five Holistic House workshop themes. Scores describe current experiences, not levels earned, spiritual rank or course eligibility."
    },
    "topics": [
      "tantra",
      "intimacy",
      "body",
      "relationships"
    ],
    "axes": [
      [
        "embodiment",
        0.86
      ],
      [
        "intimacy",
        0.85
      ],
      [
        "self_support",
        0.75
      ]
    ],
    "duration": 6,
    "scales": [
      {
        "key": "l1_safety",
        "axis": "boundaries",
        "label": {
          "en": "L1: Safety & boundaries",
          "ru": "L1: безопасность и границы"
        },
        "en": [
          "I recognise when I need to pause an exercise.",
          "I can find a stable position that feels comfortable.",
          "I can communicate a clear limit.",
          "I feel free to skip a group activity."
        ],
        "ru": [
          "Я замечаю, когда нужна пауза в упражнении.",
          "Я могу найти комфортную устойчивую позу.",
          "Я могу обозначить ясную границу.",
          "Я разрешаю себе пропустить групповое упражнение."
        ],
        "step": {
          "en": "Make consent and a clear stopping option the foundation of any exercise.",
          "ru": "Сделайте согласие и право остановиться основой любого упражнения."
        }
      },
      {
        "key": "l2_heart",
        "axis": "intimacy",
        "label": {
          "en": "L2: Heart & connection",
          "ru": "L2: сердце и контакт"
        },
        "en": [
          "I can notice whether contact feels welcome.",
          "I can offer appreciation without demanding closeness.",
          "I can ask for emotional support honestly.",
          "I can receive another person’s care at my own pace."
        ],
        "ru": [
          "Я замечаю, желателен ли мне контакт.",
          "Я могу проявлять признательность, не требуя близости.",
          "Я могу честно попросить эмоциональную поддержку.",
          "Я могу принимать заботу другого в собственном темпе."
        ],
        "step": {
          "en": "Choose an optional, non-demanding gesture of care in a safe context.",
          "ru": "Выберите необязательный жест заботы в безопасном контексте."
        }
      },
      {
        "key": "l3_liberation",
        "axis": "self_support",
        "label": {
          "en": "L3: Expression & freedom",
          "ru": "L3: самовыражение и освобождение"
        },
        "en": [
          "I can identify a role I play to please others.",
          "I can notice fear of disapproval without automatically obeying it.",
          "I can express a feeling in a respectful way.",
          "I can choose whether to participate in symbolic rituals."
        ],
        "ru": [
          "Я замечаю роль, которую играю ради одобрения.",
          "Я могу заметить страх неодобрения и не следовать ему автоматически.",
          "Я могу выразить чувство уважительно.",
          "Я могу сам выбирать участие в символических ритуалах."
        ],
        "step": {
          "en": "Notice one expectation you can question gently and safely.",
          "ru": "Заметьте ожидание, которое можно мягко и безопасно поставить под вопрос."
        }
      },
      {
        "key": "l4_softening",
        "axis": "emotional_regulation",
        "label": {
          "en": "L4: Softening tension",
          "ru": "L4: смягчение напряжения"
        },
        "en": [
          "I can feel a change in muscle tension without forcing release.",
          "I can adjust a practice when emotions intensify.",
          "I can pause and reorient to my surroundings.",
          "I can recover after emotionally demanding experiences."
        ],
        "ru": [
          "Я могу замечать изменение мышечного напряжения, не заставляя себя расслабиться.",
          "Я могу изменить упражнение при усилении эмоций.",
          "Я могу остановиться и переключиться на окружающее пространство.",
          "Я могу восстанавливаться после эмоционально сложного опыта."
        ],
        "step": {
          "en": "Prefer gentle and reversible grounding over intense body-release techniques.",
          "ru": "Предпочитайте мягкое обратимое заземление интенсивным техникам телесного высвобождения."
        }
      },
      {
        "key": "l5_flow",
        "axis": "embodiment",
        "label": {
          "en": "L5: Free flow & integration",
          "ru": "L5: свободный поток и интеграция"
        },
        "en": [
          "I can move in a way that feels natural rather than impressive.",
          "I can let an experience unfold without chasing a special state.",
          "I can integrate insights into ordinary choices.",
          "I can stay connected to my needs during a group practice."
        ],
        "ru": [
          "Я могу двигаться естественно, а не ради впечатления на других.",
          "Я могу позволить опыту разворачиваться без погони за особым состоянием.",
          "Я могу переносить осознания в обычные решения.",
          "Я могу помнить о своих потребностях во время групповой практики."
        ],
        "step": {
          "en": "Try gentle free movement or quiet rest with no performance goal.",
          "ru": "Попробуйте свободное мягкое движение или спокойный отдых без цели выступить."
        }
      }
    ]
  },
  {
    "key": "hh-tantric-personality-portrait",
    "titles": {
      "en": "Tantric Personality & Development Portrait",
      "ru": "Тантрический портрет личности и развития",
      "es": "Retrato tántrico personal"
    },
    "descriptions": {
      "en": "64 original questions across eight separate dimensions of body awareness, connection, choice, pleasure, attention, agency and meaning. Descriptive self-reflection only.",
      "ru": "64 оригинальных вопроса по восьми независимым шкалам телесности, близости, выбора, удовольствия, внимания, воли и смысла. Только описательное самопознание.",
      "es": "64 original questions across eight separate dimensions of body awareness, connection, choice, pleasure, attention, agency and meaning. Descriptive self-reflection only."
    },
    "topics": [
      "tantra",
      "sexuality",
      "intimacy",
      "body",
      "personality",
      "meaning"
    ],
    "axes": [
      [
        "embodiment",
        0.93
      ],
      [
        "intimacy",
        0.93
      ],
      [
        "sexual_wellbeing",
        0.85
      ],
      [
        "self_support",
        0.83
      ]
    ],
    "duration": 17,
    "scales": [
      {
        "key": "body",
        "axis": "embodiment",
        "label": {
          "en": "Embodied presence",
          "ru": "Телесное присутствие"
        },
        "en": [
          "I notice when my shoulders relax.",
          "I can recognise bodily tiredness before exhaustion.",
          "I can tell which movements feel easeful.",
          "I notice differences between warmth and tension.",
          "I can rest attention on a neutral sensation.",
          "I am aware of changes in my posture.",
          "I can sense when I need physical distance.",
          "I can describe a bodily feeling without interpreting its cause."
        ],
        "ru": [
          "Я замечаю, когда плечи расслабляются.",
          "Я замечаю телесную усталость до полного истощения.",
          "Я различаю движения, которые даются легко.",
          "Я замечаю разницу между теплом и напряжением.",
          "Я могу обратить внимание на нейтральное ощущение.",
          "Я замечаю изменения своей осанки.",
          "Я чувствую, когда нужна физическая дистанция.",
          "Я могу описать ощущение тела, не трактуя его причину."
        ],
        "step": {
          "en": "Notice how your body feels in one ordinary, safe activity this week.",
          "ru": "На этой неделе заметьте телесные ощущения в одном обычном безопасном занятии."
        }
      },
      {
        "key": "emotions",
        "axis": "emotional_regulation",
        "label": {
          "en": "Emotional flexibility",
          "ru": "Эмоциональная гибкость"
        },
        "en": [
          "I can identify a feeling before acting on it.",
          "I allow myself to experience mixed emotions.",
          "I can ask for a pause during a difficult conversation.",
          "I can show sadness without judging it as weakness.",
          "I can recognise when excitement becomes too intense.",
          "I can name disappointment without blaming someone.",
          "I know a gentle way to steady myself when upset.",
          "I give myself time after a strong emotion."
        ],
        "ru": [
          "Я могу распознать чувство прежде, чем действовать.",
          "Я допускаю смешанные эмоции.",
          "Я могу попросить паузу во время сложного разговора.",
          "Я могу проявить грусть, не считая её слабостью.",
          "Я замечаю, когда возбуждение становится чрезмерным.",
          "Я могу назвать разочарование без обвинений другого.",
          "Я знаю мягкий способ вернуть устойчивость при волнении.",
          "Я даю себе время после сильной эмоции."
        ],
        "step": {
          "en": "Describe one feeling and one need separately without rating either.",
          "ru": "Назовите одно чувство и одну потребность отдельно, не оценивая их."
        }
      },
      {
        "key": "connection",
        "axis": "intimacy",
        "label": {
          "en": "Authentic connection",
          "ru": "Подлинный контакт"
        },
        "en": [
          "I can listen while staying aware of my own experience.",
          "I can show warmth without expecting a particular reply.",
          "I can ask someone how they prefer to be supported.",
          "I respect different comfort levels with touch.",
          "I can enjoy company without constant conversation.",
          "I can ask for reassurance without making it an obligation.",
          "I can recognize when a relationship feels reciprocal.",
          "I can appreciate another person while accepting our differences."
        ],
        "ru": [
          "Я могу слушать, сохраняя внимание к себе.",
          "Я могу проявлять тепло без ожидания определённого ответа.",
          "Я могу спросить, какая поддержка человеку подходит.",
          "Я уважаю разные уровни комфорта с прикосновениями.",
          "Я могу наслаждаться компанией без постоянного разговора.",
          "Я могу попросить заверения, не превращая его в обязанность.",
          "Я замечаю взаимность в отношениях.",
          "Я могу ценить человека, принимая наши различия."
        ],
        "step": {
          "en": "Consider one small way to make a connection more mutual and optional.",
          "ru": "Подумайте об одном мягком способе сделать контакт более взаимным и добровольным."
        }
      },
      {
        "key": "boundaries",
        "axis": "boundaries",
        "label": {
          "en": "Consent & autonomy",
          "ru": "Согласие и автономия"
        },
        "en": [
          "I can say what I am comfortable sharing.",
          "I can decline a ritual without defending my choice.",
          "I check for agreement before offering touch.",
          "I can change plans if they stop feeling safe.",
          "I can leave a conversation that becomes disrespectful.",
          "I make room for another person to disagree.",
          "I can notice when I am acting to avoid disapproval.",
          "I value informed choice over pressure to participate."
        ],
        "ru": [
          "Я могу сказать, чем мне комфортно делиться.",
          "Я могу отказаться от ритуала, не оправдывая свой выбор.",
          "Я уточняю согласие перед прикосновением.",
          "Я могу изменить планы, если перестаю чувствовать безопасность.",
          "Я могу завершить неуважительный разговор.",
          "Я допускаю несогласие другого человека.",
          "Я замечаю, когда действую ради избежания неодобрения.",
          "Я ценю осознанный выбор выше давления участвовать."
        ],
        "step": {
          "en": "Write down one “yes”, one “no” and one “not yet” that feel authentic.",
          "ru": "Запишите по одному искреннему «да», «нет» и «пока нет»."
        }
      },
      {
        "key": "pleasure",
        "axis": "sexual_wellbeing",
        "label": {
          "en": "Pleasure without pressure",
          "ru": "Удовольствие без давления"
        },
        "en": [
          "I can notice what makes ordinary experiences enjoyable.",
          "I allow myself to prefer subtle pleasure to intensity.",
          "I can receive affection without needing to escalate intimacy.",
          "I can name a sensory preference without embarrassment.",
          "I can enjoy creativity without worrying about productivity.",
          "I allow desire to vary rather than forcing consistency.",
          "I can recognise when closeness feels genuinely inviting.",
          "I can appreciate rest as a valid source of enjoyment."
        ],
        "ru": [
          "Я замечаю, что делает обычный опыт приятным.",
          "Я разрешаю себе тонкое удовольствие вместо интенсивности.",
          "Я могу принимать нежность без необходимости усиливать интимность.",
          "Я могу без смущения назвать сенсорное предпочтение.",
          "Я могу заниматься творчеством без тревоги о продуктивности.",
          "Я допускаю изменения желания, не требуя постоянства.",
          "Я различаю момент, когда близость действительно привлекательна.",
          "Я могу ценить отдых как полноценный источник радости."
        ],
        "step": {
          "en": "Notice enjoyment without converting it into a performance target.",
          "ru": "Замечайте удовольствие, не превращая его в оценку собственной успешности."
        }
      },
      {
        "key": "attention",
        "axis": "focus",
        "label": {
          "en": "Meditative attention",
          "ru": "Медитативное внимание"
        },
        "en": [
          "I can notice when my attention drifts.",
          "I can return to a chosen focus without scolding myself.",
          "I can remain curious about an unfamiliar experience.",
          "I can take a mindful pause during ordinary activities.",
          "I can observe a thought without treating it as a command.",
          "I can tell when a practice is becoming mentally tiring.",
          "I can adjust the length of meditation to my needs.",
          "I am willing to pause if concentration feels overwhelming."
        ],
        "ru": [
          "Я замечаю, когда внимание уходит в сторону.",
          "Я могу вернуть фокус без упрёков к себе.",
          "Я сохраняю любопытство к новому опыту.",
          "Я могу сделать осознанную паузу в обычных делах.",
          "Я могу наблюдать мысль, не считая её приказом.",
          "Я замечаю, когда практика утомляет ум.",
          "Я могу менять длительность медитации под свои потребности.",
          "Я готов сделать паузу, если концентрация становится чрезмерной."
        ],
        "step": {
          "en": "Try a very brief voluntary observation of sound or light around you.",
          "ru": "Попробуйте короткое добровольное наблюдение звука или света вокруг."
        }
      },
      {
        "key": "agency",
        "axis": "self_support",
        "label": {
          "en": "Personal agency",
          "ru": "Личная воля и опора"
        },
        "en": [
          "I can choose a small action aligned with my priorities.",
          "I can admit when I need assistance.",
          "I can begin imperfectly rather than waiting for certainty.",
          "I notice when other people’s expectations obscure my wishes.",
          "I can express a preference respectfully.",
          "I can revise a goal when my circumstances change.",
          "I can celebrate effort without requiring a dramatic result.",
          "I can protect time for restoration."
        ],
        "ru": [
          "Я могу выбрать небольшой шаг в направлении своих приоритетов.",
          "Я могу признать, что мне нужна помощь.",
          "Я могу начать несовершенно, не дожидаясь полной определённости.",
          "Я замечаю, когда чужие ожидания заслоняют мои желания.",
          "Я могу уважительно выразить предпочтение.",
          "Я могу пересмотреть цель при изменении обстоятельств.",
          "Я могу ценить усилие без требования яркого результата.",
          "Я могу защищать время для восстановления."
        ],
        "step": {
          "en": "Choose one voluntary action that expresses your own priorities.",
          "ru": "Выберите одно добровольное действие, выражающее ваши приоритеты."
        }
      },
      {
        "key": "meaning",
        "axis": "meaning",
        "label": {
          "en": "Values & integration",
          "ru": "Ценности и интеграция"
        },
        "en": [
          "I can explain why a practice matters to me personally.",
          "I can question a tradition while still respecting it.",
          "I can translate an insight into an everyday choice.",
          "I allow my understanding of spirituality to evolve.",
          "I can participate in meaningful rituals without claiming proof of supernatural effects.",
          "I can choose a secular approach if it fits me better.",
          "I can separate my values from someone else’s approval.",
          "I can integrate experiences without needing a fixed label for myself."
        ],
        "ru": [
          "Я могу объяснить, почему практика важна лично для меня.",
          "Я могу задавать вопросы традиции, продолжая уважать её.",
          "Я могу переводить осознание в повседневный выбор.",
          "Я допускаю изменение своего понимания духовности.",
          "Я могу участвовать в значимых ритуалах без утверждений о доказанных сверхъестественных эффектах.",
          "Я могу выбирать светский подход, если он подходит больше.",
          "Я могу отделять свои ценности от чужого одобрения.",
          "Я могу интегрировать опыт без жёсткого ярлыка для себя."
        ],
        "step": {
          "en": "Choose one value and one ordinary action that can express it.",
          "ru": "Выберите одну ценность и обычное действие, выражающее её."
        }
      }
    ]
  }
]
const IDS = {
  "hh-tantric-energy-sensitivity": {
    "en": "c7a0000a-7e2d-4a00-8d11-202610170001",
    "ru": "c7a0000a-7e2d-4a00-8d11-202610170002"
  },
  "hh-tantric-intimacy-connection": {
    "en": "c7a0000b-7e2d-4a00-8d11-202610170001",
    "ru": "c7a0000b-7e2d-4a00-8d11-202610170002"
  },
  "hh-tantric-sexual-freedom": {
    "en": "c7a0000c-7e2d-4a00-8d11-202610170001",
    "ru": "c7a0000c-7e2d-4a00-8d11-202610170002"
  },
  "hh-tantric-chakra-reflection": {
    "en": "c7a0000d-7e2d-4a00-8d11-202610170001",
    "ru": "c7a0000d-7e2d-4a00-8d11-202610170002"
  },
  "hh-tantric-development-levels": {
    "en": "c7a0000e-7e2d-4a00-8d11-202610170001",
    "ru": "c7a0000e-7e2d-4a00-8d11-202610170002"
  },
  "hh-tantric-personality-portrait": {
    "en": "c7a0000f-7e2d-4a00-8d11-202610170001",
    "ru": "c7a0000f-7e2d-4a00-8d11-202610170002"
  }
}
const HASHES = {
  "hh-tantric-energy-sensitivity": {
    "en": "sha256:909ec5d5353c2c04c73767cf47d14e4355057ce06b70575229e89f94909affb8",
    "ru": "sha256:f87e033d03e0c2c4ebd2e62ebf502d21ae18703af1a94ceb32953cdfde68604b"
  },
  "hh-tantric-intimacy-connection": {
    "en": "sha256:90c0c5471c51f929793dff00cffd82ee58462d2803b5bafb6f865fbbc5e60e1f",
    "ru": "sha256:d1dbcd0c904003f585fb538466b7ca68c9ead6634792a987a6f40739155944b1"
  },
  "hh-tantric-sexual-freedom": {
    "en": "sha256:d7c2635f594b090555fc520c21602f37d04a5ba1cce3fd69bff929c9f1be67af",
    "ru": "sha256:58ae0bfc10214e20cc78a6b862f29c08a45d1b98731c124f4cf6b445d86e725c"
  },
  "hh-tantric-chakra-reflection": {
    "en": "sha256:6334a9e227e0a986648e0c2f24b02cd2190814e6155da8d3d2cf7c5e0576922e",
    "ru": "sha256:2dba8eb72fccc86df5c5d895a04a5eae637118821be625e5fa920239637595a2"
  },
  "hh-tantric-development-levels": {
    "en": "sha256:e1feea09f5770d59422e9bc038f6639601566b84ec28d6c1cdf50f5d1808d284",
    "ru": "sha256:665dd2b29ce06ca8c5b54596af576b974bfb169340cc7a578d2b44a27f69eb59"
  },
  "hh-tantric-personality-portrait": {
    "en": "sha256:4c67772ab348caff6185bec5306145bd5e058269e8d9650636949f4db2fa8d4d",
    "ru": "sha256:7b65ec48ac0b62bb7e85ccb616ebf0df3ef98b3d042935730c551916a08730c9"
  }
}

const dimensionKey = (cfg, sub) => 'resources.' + cfg.key.replace(/^hh-/, '').replaceAll('-', '_') + '.' + sub.key
function buildDefinition(cfg, locale) {
  const questions = cfg.scales.flatMap(s => s[locale]).map((text, index) => ({
    id: cfg.key + '.' + String(index + 1).padStart(3, '0'), text, required: true,
    direction: 'higher-reported-resource',
  }))
  let offset = 0
  const dimensions = cfg.scales.map(scale => {
    const items = questions.slice(offset, offset + scale[locale].length).map(question => question.id)
    offset += scale[locale].length
    return {key: dimensionKey(cfg, scale), method: 'mean', items,
      min: 0, max: 4, dimensionClass: 'resources',
      sourceConstruct: scale.label[locale], direction: 'higher-reported-resource'}
  })
  return {
    id: IDS[cfg.key][locale], key: cfg.key, version: 'v1', instrumentLocale: locale,
    translationVersion: 'hh-' + locale + '-v1',
    timeframe: cfg.key === 'hh-tantric-personality-portrait' ? 'general-self-description' : 'past-30-days',
    scoringKey: 'configured', scoringVersion: 'v1', resultVersion: 'v1', title: cfg.titles[locale],
    source: {title: 'Holistic House — ' + cfg.titles.en,
      status: 'original-non-diagnostic-tantric-reflection', reviewedAt: '2026-10-17'},
    answerScale: {min: 0, max: 4},
    responseAnchors: locale === 'ru'
      ? ['Совсем не похоже','Скорее не похоже','Иногда / частично','В основном похоже','Очень похоже']
      : ['Not at all like me','Not much like me','Sometimes / partly','Mostly like me','Very much like me'],
    scoring: {dimensions}, questions, optionalContext: [], suggestedRepeatDays: 30,
    contentHash: HASHES[cfg.key][locale],
  }
}
export const TANTRIC_KEYS = deepFreeze(CONFIGS.map(cfg => cfg.key))
export const TANTRIC_DEFINITIONS = deepFreeze(CONFIGS.flatMap(cfg => ['en', 'ru'].map(locale => buildDefinition(cfg, locale))))
export const TANTRIC_CATALOG = deepFreeze(CONFIGS.map(cfg => ({
  key: cfg.key, version: 'v1', instrumentLocale: 'dynamic', axis: 'resources', resultAxes: ['resources'],
  topics: cfg.topics, moodAffinities: ['neutral','happy','sad'],
  categoryAffinities: ['body','energy','relationships','emotions'],
  questionCount: cfg.scales.reduce((count, scale) => count + scale.en.length, 0),
  durationMinutes: cfg.duration, testStyle: 'engaging', testLength: cfg.duration >= 8 ? 'comprehensive' : 'medium',
  suggestedRepeatDays: 30, cooldownDays: 14,
  startable: true, starterEligible: false, explicitOptIn: true,
  access: 'account', rightsStatus: 'cleared', guestEligible: true, free: true,
  analysisAxes: cfg.axes.map(([key, weight]) => ({key, weight})),
  title: cfg.titles, description: cfg.descriptions,
})))
export const TANTRIC_REFLECTION_ROWS = deepFreeze(CONFIGS.map(cfg => [
  cfg.key, 'relationship',
  'Reflect on the eight or fewer distinct themes of your experience at your own pace; no higher score is required.',
  'Рассмотрите разные стороны собственного опыта в комфортном темпе; высокие баллы не являются обязательной целью.',
]))
export const TANTRIC_DIMENSION_ROWS = deepFreeze(CONFIGS.flatMap(cfg => cfg.scales.map(scale => [
  cfg.key, dimensionKey(cfg, scale), 'relationship', scale.label.en, scale.label.ru, scale.step.en, scale.step.ru,
])))
export const TANTRIC_DIMENSION_AXES = deepFreeze(Object.fromEntries(CONFIGS.flatMap(cfg => cfg.scales.map(scale => [dimensionKey(cfg,scale), scale.axis]))))
export const TANTRIC_CONTEXT_COPY = deepFreeze({
  en: 'Original Holistic House exploratory self-reflection for adults (2026), without independent psychometric validation. Descriptive 0–4 response means are not clinical ranges, chakra measurements, earned tantra levels, sexual-function scores, proof of consent or a rating of personal worth. Sexuality and relationships are optional. Skip anything you do not want to answer; stop an exercise at any time.',
  ru: 'Авторская экспериментальная саморефлексия Holistic House для взрослых (2026), без независимой психометрической валидации. Описательные средние 0–4 не являются клиническими нормами, измерением чакр, присвоенными ступенями тантры, оценкой сексуальной функции, доказательством согласия или ценности личности. Сексуальные отношения необязательны. Любой тест можно не проходить, любую практику — остановить.',
})
