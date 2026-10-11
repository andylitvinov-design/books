// Original EN/RU adult relationships and sexual-wellbeing self-reflections.
// Not validated clinical tests, compatibility predictions, sex-function diagnoses, or consent assessments.
// Immutable V1 question hashes preserve provenance for private assessment reports.
import { deepFreeze, canonicalJSON } from '../../lib/assessments/contracts.js'

// Metadata, question text and dimensions are kept together to avoid drift.
const CONFIGS = [
  {
    "key": "hh-love-affection",
    "titles": {
      "en": "Love & Affection",
      "ru": "Любовь и нежность"
    },
    "descriptions": {
      "en": "How comfortably you express warmth and receive affection in relationships or trusted connections. Original self-reflection; not a clinical test.",
      "ru": "Насколько свободно вы выражаете тепло и принимаете нежность в отношениях и доверительном общении. Авторский опросник, не клинический тест."
    },
    "topics": [
      "relationships",
      "intimacy",
      "support"
    ],
    "axes": [
      [
        "relationships",
        0.95
      ],
      [
        "intimacy",
        0.85
      ]
    ],
    "overview": {
      "en": "Reflect on a moment of warmth you gave or received without making it a demand of yourself or someone else.",
      "ru": "Вспомните момент тепла, которое вы проявили или приняли, без обязательств для себя или другого человека."
    },
    "scales": [
      {
        "key": "expressing",
        "axis": "relationships",
        "labels": {
          "en": "Expressing warmth",
          "ru": "Выражение тепла"
        },
        "step": {
          "en": "Choose one gentle, appropriate way to show appreciation this week, with no expectation of a response.",
          "ru": "Выберите один бережный и уместный способ проявить признательность на этой неделе, не ожидая обязательного ответа."
        },
        "en": [
          "I can express appreciation when someone matters to me.",
          "I can communicate care in ways that feel genuine to me.",
          "I can offer warmth while respecting the other person's space."
        ],
        "ru": [
          "Я могу выразить признательность тому, кто мне дорог.",
          "Я могу проявлять заботу способом, который кажется мне искренним.",
          "Я могу проявлять тепло, уважая личное пространство другого человека."
        ]
      },
      {
        "key": "receiving",
        "axis": "intimacy",
        "labels": {
          "en": "Receiving care",
          "ru": "Принятие заботы"
        },
        "step": {
          "en": "Notice one caring gesture you can receive without needing to repay it immediately; accepting is always optional.",
          "ru": "Заметьте жест заботы, который можете принять без необходимости сразу отплатить; принимать заботу необязательно."
        },
        "en": [
          "I can notice when someone offers me sincere care.",
          "I can receive a kind gesture without feeling I owe something in return.",
          "I can say what kind of affection feels comfortable to me."
        ],
        "ru": [
          "Я замечаю, когда кто-то искренне проявляет ко мне заботу.",
          "Я могу принять добрый жест без ощущения, что теперь обязан ответить.",
          "Я могу сказать, какие проявления нежности мне комфортны."
        ]
      }
    ]
  },
  {
    "key": "hh-trust-dialogue",
    "titles": {
      "en": "Trust & Honest Dialogue",
      "ru": "Доверие и честный диалог"
    },
    "descriptions": {
      "en": "Explore communicating needs and recognizing trustworthy behavior, whether dating or in an established relationship. Not a partner rating.",
      "ru": "Исследуйте разговор о потребностях и признаки надёжного общения — в новых или длительных отношениях. Не оценка партнёра."
    },
    "topics": [
      "relationships",
      "intimacy",
      "communication"
    ],
    "axes": [
      [
        "relationships",
        0.95
      ],
      [
        "intimacy",
        0.67
      ]
    ],
    "overview": {
      "en": "Reflect on what makes a conversation feel trustworthy without trying to infer another person's intentions from a score.",
      "ru": "Подумайте, что делает разговор надёжным для вас, не пытаясь судить о намерениях другого человека по баллу."
    },
    "scales": [
      {
        "key": "honesty",
        "axis": "relationships",
        "labels": {
          "en": "Speaking honestly",
          "ru": "Честное выражение потребностей"
        },
        "step": {
          "en": "Write one honest, non-accusatory sentence about what you need, and choose whether sharing it feels safe.",
          "ru": "Сформулируйте одну честную фразу о своей потребности без обвинений и решите, безопасно ли её озвучить."
        },
        "en": [
          "I can describe an important relationship need without blaming another person.",
          "I can ask for clarity when someone's expectations are unclear.",
          "I can respectfully say when I disagree."
        ],
        "ru": [
          "Я могу говорить о важной потребности без обвинений другого человека.",
          "Я могу попросить прояснить неясные ожидания.",
          "Я могу уважительно сказать о несогласии."
        ]
      },
      {
        "key": "discernment",
        "axis": "intimacy",
        "labels": {
          "en": "Noticing reliability",
          "ru": "Распознавание надёжности"
        },
        "step": {
          "en": "Consider one observable behavior that earns your trust over time rather than assuming trust must be immediate.",
          "ru": "Подумайте об одном наблюдаемом поступке, который постепенно укрепляет доверие: доверять сразу необязательно."
        },
        "en": [
          "I pay attention to whether actions and promises match.",
          "I allow trust to develop gradually rather than forcing it.",
          "I can revisit a concern when a conversation did not resolve it."
        ],
        "ru": [
          "Я замечаю, совпадают ли слова и поступки.",
          "Я позволяю доверию развиваться постепенно, не торопя себя.",
          "Я могу вернуться к вопросу, который не удалось прояснить с первого раза."
        ]
      }
    ]
  },
  {
    "key": "hh-emotional-intimacy",
    "titles": {
      "en": "Emotional Intimacy",
      "ru": "Эмоциональная близость"
    },
    "descriptions": {
      "en": "Explore vulnerable communication and closeness at a pace you choose, with no assumption that you have a partner.",
      "ru": "Исследуйте открытость и эмоциональную близость в подходящем вам темпе, без предположения, что у вас есть партнёр."
    },
    "topics": [
      "relationships",
      "intimacy",
      "self-support"
    ],
    "axes": [
      [
        "intimacy",
        0.98
      ],
      [
        "self_support",
        0.55
      ]
    ],
    "overview": {
      "en": "Identify when closeness feels welcome and when you would prefer more space; both are legitimate needs.",
      "ru": "Отметьте, когда хочется близости, а когда — больше пространства; обе потребности допустимы."
    },
    "scales": [
      {
        "key": "opening",
        "axis": "intimacy",
        "labels": {
          "en": "Emotional openness",
          "ru": "Эмоциональная открытость"
        },
        "step": {
          "en": "If it feels safe, name one feeling to a trusted person, or write it privately instead.",
          "ru": "Если безопасно, назовите одно чувство человеку, которому доверяете, или запишите его только для себя."
        },
        "en": [
          "I can notice when I want to share a feeling with someone.",
          "I can express a vulnerable feeling without having to reveal everything.",
          "I can ask for emotional support in words that feel comfortable."
        ],
        "ru": [
          "Я замечаю, когда хочу поделиться с кем-то своим чувством.",
          "Я могу открыться немного, не рассказывая всё сразу.",
          "Я могу попросить об эмоциональной поддержке комфортными словами."
        ]
      },
      {
        "key": "pacing",
        "axis": "intimacy",
        "labels": {
          "en": "Choosing the pace",
          "ru": "Выбор темпа близости"
        },
        "step": {
          "en": "Before an important exchange, check whether you want contact, privacy, or more time; you may change your mind.",
          "ru": "Перед важным разговором проверьте, хотите ли вы контакта, уединения или времени; решение можно изменить."
        },
        "en": [
          "I can recognize when I need more emotional distance.",
          "I can stay connected without agreeing to more intimacy than I want.",
          "I can respect another person's choice to share less."
        ],
        "ru": [
          "Я замечаю, когда мне нужно больше эмоциональной дистанции.",
          "Я могу оставаться в контакте, не соглашаясь на лишнюю для меня близость.",
          "Я могу уважать решение другого человека не открываться."
        ]
      }
    ]
  },
  {
    "key": "hh-intimacy-consent",
    "titles": {
      "en": "Intimacy, Boundaries & Consent",
      "ru": "Близость, границы и согласие"
    },
    "descriptions": {
      "en": "Reflect on freely chosen closeness, asking permission, and the right to change your mind. Original educational questionnaire, not a safety certification.",
      "ru": "Самонаблюдение о добровольности близости, уважении к согласию и праве передумать. Авторская анкета, не сертификат безопасности."
    },
    "topics": [
      "relationships",
      "intimacy",
      "sexuality",
      "boundaries"
    ],
    "axes": [
      [
        "boundaries",
        1
      ],
      [
        "intimacy",
        0.75
      ]
    ],
    "overview": {
      "en": "A score cannot establish safety or whether consent occurred. Notice how to make choice and communication clearer; coercion is never your fault.",
      "ru": "Балл не подтверждает безопасность или наличие согласия. Исследуйте, как сделать выбор и общение яснее; принуждение недопустимо."
    },
    "scales": [
      {
        "key": "agency",
        "axis": "boundaries",
        "labels": {
          "en": "Freedom to say yes or no",
          "ru": "Свобода согласиться или отказаться"
        },
        "step": {
          "en": "Practice a simple sentence such as “I'd like to slow down” in a low-pressure setting. You never owe anyone intimacy.",
          "ru": "Попробуйте в безопасной обстановке фразу «Мне хотелось бы помедленнее». Вы никому не обязаны близостью."
        },
        "en": [
          "I know I can say no to touch or intimacy without giving a reason.",
          "I can pause or change my mind about an intimate interaction.",
          "I can notice when I agree because of pressure rather than genuine choice."
        ],
        "ru": [
          "Я знаю, что могу отказаться от прикосновений или близости без объяснений.",
          "Я могу остановиться или передумать в любой момент близкого контакта.",
          "Я замечаю разницу между свободным выбором и согласием под давлением."
        ]
      },
      {
        "key": "mutuality",
        "axis": "boundaries",
        "labels": {
          "en": "Respecting mutual consent",
          "ru": "Уважение взаимного согласия"
        },
        "step": {
          "en": "Before closeness, try asking what feels welcome; a lack of clear agreement means pause, not persuasion.",
          "ru": "Перед сближением попробуйте спросить, что комфортно; отсутствие ясного согласия — повод остановиться, а не убеждать."
        },
        "en": [
          "I can ask whether a kind of touch or closeness is welcome.",
          "I respect hesitation or a changed mind without trying to persuade.",
          "I can suggest a slower or different form of connection."
        ],
        "ru": [
          "Я могу спросить, желанны ли прикосновения или близость.",
          "Я уважаю сомнение или перемену решения без уговоров.",
          "Я могу предложить более медленный или другой способ контакта."
        ]
      }
    ]
  },
  {
    "key": "hh-desire-dialogue",
    "titles": {
      "en": "Desire & Sexual Communication",
      "ru": "Желание и сексуальный диалог"
    },
    "descriptions": {
      "en": "An inclusive, non-diagnostic reflection on understanding personal desire, including low or absent desire, and talking about preferences without pressure.",
      "ru": "Бережное наблюдение за собственным желанием, включая слабое или отсутствующее, и разговором о предпочтениях без давления. Не диагностика."
    },
    "topics": [
      "sexuality",
      "intimacy",
      "relationships"
    ],
    "axes": [
      [
        "sexual_wellbeing",
        1
      ],
      [
        "boundaries",
        0.72
      ]
    ],
    "overview": {
      "en": "No frequency or level of desire is required. Different experiences, including little or no sexual desire, are not automatically problems.",
      "ru": "Нет обязательной частоты или уровня желания. Разный опыт, включая слабое или отсутствующее сексуальное влечение, сам по себе не проблема."
    },
    "scales": [
      {
        "key": "awareness",
        "axis": "sexual_wellbeing",
        "labels": {
          "en": "Knowing my preferences",
          "ru": "Понимание своих предпочтений"
        },
        "step": {
          "en": "Privately note one condition in which you feel comfortable and one in which you prefer not to engage; no action is required.",
          "ru": "Для себя отметьте одно условие, при котором вам комфортно, и одно, при котором не хочется сближаться; действовать необязательно."
        },
        "en": [
          "I can notice whether I want, do not want, or feel neutral about sexual closeness.",
          "I can distinguish my own preferences from outside expectations.",
          "I allow my level of desire to change without judging myself."
        ],
        "ru": [
          "Я замечаю, хочется ли мне сексуальной близости, не хочется или я нейтрален к ней.",
          "Я могу отличать свои предпочтения от чужих ожиданий.",
          "Я позволяю своему уровню желания меняться без самоосуждения."
        ]
      },
      {
        "key": "dialogue",
        "axis": "sexual_wellbeing",
        "labels": {
          "en": "Talking about comfort",
          "ru": "Разговор о комфорте"
        },
        "step": {
          "en": "Draft a clear, respectful sentence about a preference or boundary; share only if you choose and it feels safe.",
          "ru": "Составьте ясную уважительную фразу о предпочтении или границе; делиться ею стоит только по желанию и в безопасности."
        },
        "en": [
          "I can name a boundary about sexual conversation or intimacy.",
          "I can discuss my comfort level without feeling I must perform.",
          "I can accept that two people may have different preferences without blame."
        ],
        "ru": [
          "Я могу обозначить границу в разговоре о сексе или близости.",
          "Я могу говорить о комфорте без необходимости соответствовать чужим ожиданиям.",
          "Я признаю, что предпочтения двух людей могут различаться, без обвинений."
        ]
      }
    ]
  },
  {
    "key": "hh-sexual-self-kindness",
    "titles": {
      "en": "Sexual Self-Acceptance",
      "ru": "Принятие себя в сексуальности"
    },
    "descriptions": {
      "en": "Explore self-compassion and autonomy around sexual identity, interests and boundaries without labels, diagnosis or performance targets.",
      "ru": "Исследуйте самопринятие и свободу выбора в сфере сексуальности без ярлыков, диагнозов или требований к «результату»."
    },
    "topics": [
      "sexuality",
      "intimacy",
      "self-support"
    ],
    "axes": [
      [
        "sexual_wellbeing",
        0.85
      ],
      [
        "self_support",
        0.85
      ]
    ],
    "overview": {
      "en": "Sexual worth is not measured by desire, experience, identity or activity. This is a private reflection only.",
      "ru": "Ценность человека не определяется влечением, опытом, идентичностью или сексуальной активностью. Это только личная саморефлексия."
    },
    "scales": [
      {
        "key": "kindness",
        "axis": "self_support",
        "labels": {
          "en": "Self-kindness",
          "ru": "Доброжелательность к себе"
        },
        "step": {
          "en": "Notice one unfair comparison or expectation and replace it with a kinder, realistic sentence about your needs.",
          "ru": "Заметьте одно несправедливое сравнение или ожидание и замените его более доброй реалистичной фразой о своих потребностях."
        },
        "en": [
          "I can relate to my sexual feelings without calling myself wrong.",
          "I can avoid comparing my experience to someone else's timeline.",
          "I can treat uncertainty about my preferences with patience."
        ],
        "ru": [
          "Я могу относиться к своим сексуальным чувствам без мысли, что со мной что-то не так.",
          "Я могу не сравнивать свой опыт с чужими сроками и нормами.",
          "Я могу терпеливо относиться к неопределённости своих предпочтений."
        ]
      },
      {
        "key": "choice",
        "axis": "sexual_wellbeing",
        "labels": {
          "en": "Autonomy without pressure",
          "ru": "Свобода без давления"
        },
        "step": {
          "en": "Identify one expectation you would like to release. You are free to choose intimacy, postpone it, or not pursue it.",
          "ru": "Определите одно ожидание, от которого хотели бы освободиться. Вы вправе выбрать близость, отложить её или не стремиться к ней."
        },
        "en": [
          "I can choose not to pursue sex or intimacy without guilt.",
          "I can keep private details private when I want to.",
          "I can decide what feels meaningful to me independent of social pressure."
        ],
        "ru": [
          "Я могу не стремиться к сексу или близости без чувства вины.",
          "Я могу сохранять личные подробности в тайне, когда хочу.",
          "Я могу выбирать, что значимо для меня, независимо от общественного давления."
        ]
      }
    ]
  },
  {
    "key": "hh-tantra-presence",
    "titles": {
      "en": "Tantric Presence & Grounding",
      "ru": "Тантрическое присутствие и заземление"
    },
    "descriptions": {
      "en": "A Tantra-inspired mindful-presence reflection: grounded attention, choice and connection. Spiritual practice, not a clinical assessment or treatment.",
      "ru": "Авторская саморефлексия в духе тантрической практики: внимание к телу, выбор и контакт. Духовная практика, не клиническая оценка или лечение."
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
        1
      ],
      [
        "boundaries",
        0.6
      ]
    ],
    "overview": {
      "en": "Reflect on presence and choice in everyday interactions; Tantra here refers to an optional reflective approach, not a scientific diagnosis.",
      "ru": "Исследуйте присутствие и свободу выбора в повседневных контактах; тантра здесь — необязательный способ саморефлексии, не диагноз."
    },
    "scales": [
      {
        "key": "grounding",
        "axis": "embodiment",
        "labels": {
          "en": "Grounded presence",
          "ru": "Присутствие в теле"
        },
        "step": {
          "en": "For one minute, notice the support of the floor and your natural breathing; stop if uncomfortable.",
          "ru": "Минуту мягко почувствуйте опору под ногами и естественное дыхание; остановитесь, если неприятно."
        },
        "en": [
          "I can notice my breath or posture without forcing a change.",
          "I can recognize when an interaction makes me tense or at ease.",
          "I can return attention to the present moment when I choose."
        ],
        "ru": [
          "Я могу замечать дыхание или позу, не пытаясь их изменить.",
          "Я замечаю, когда контакт вызывает напряжение или расслабление.",
          "Я могу по желанию возвращать внимание в настоящий момент."
        ]
      },
      {
        "key": "choice",
        "axis": "boundaries",
        "labels": {
          "en": "Presence with autonomy",
          "ru": "Присутствие и автономия"
        },
        "step": {
          "en": "Choose one familiar interaction to practice a brief pause before responding; connection does not require surrendering boundaries.",
          "ru": "Выберите привычный контакт и попробуйте короткую паузу перед ответом; для близости не нужно отказываться от границ."
        },
        "en": [
          "I can remain aware of my own needs while connecting with someone.",
          "I can slow down or step away when a practice feels too intense.",
          "I can enjoy presence without an obligation to touch or be touched."
        ],
        "ru": [
          "Я могу помнить о своих потребностях во время контакта.",
          "Я могу замедлиться или уйти, когда практика слишком интенсивна.",
          "Я могу наслаждаться присутствием без обязанности прикасаться или принимать прикосновения."
        ]
      }
    ]
  },
  {
    "key": "hh-sensual-joy",
    "titles": {
      "en": "Sensuality & Everyday Joy",
      "ru": "Чувственность и радость"
    },
    "descriptions": {
      "en": "Notice comfortable sensory pleasure and playfulness without equating sensuality with sex or requiring physical contact.",
      "ru": "Заметить приятные ощущения и живость без отождествления чувственности с сексом и без необходимости телесного контакта."
    },
    "topics": [
      "tantra",
      "sexuality",
      "body",
      "recovery"
    ],
    "axes": [
      [
        "embodiment",
        0.95
      ],
      [
        "sexual_wellbeing",
        0.65
      ]
    ],
    "overview": {
      "en": "Sensuality can mean music, texture, warmth or beauty. Nothing needs to be intensified or shared with others.",
      "ru": "Чувственность может проявляться в музыке, фактуре, тепле или красоте. Ничего не нужно усиливать или разделять с другими."
    },
    "scales": [
      {
        "key": "senses",
        "axis": "embodiment",
        "labels": {
          "en": "Comfortable sensations",
          "ru": "Комфортные ощущения"
        },
        "step": {
          "en": "Notice one pleasant everyday sensory detail for thirty seconds, such as music or a warm drink, if comfortable.",
          "ru": "Если приятно, полминуты замечайте одну обычную радующую деталь — например музыку или тёплый напиток."
        },
        "en": [
          "I can notice a pleasant sound, texture or temperature.",
          "I can recognize when a sensation is too much and adjust it.",
          "I can enjoy an ordinary sensory moment without needing it to be intense."
        ],
        "ru": [
          "Я могу замечать приятный звук, фактуру или температуру.",
          "Я могу заметить, когда ощущений слишком много, и изменить условия.",
          "Я могу радоваться простому ощущению, не делая его интенсивным."
        ]
      },
      {
        "key": "playfulness",
        "axis": "sexual_wellbeing",
        "labels": {
          "en": "Unpressured enjoyment",
          "ru": "Удовольствие без давления"
        },
        "step": {
          "en": "Choose one enjoyable, non-demanding activity and notice what makes it feel voluntary and relaxed.",
          "ru": "Выберите одно приятное действие без обязательств и отметьте, что делает его добровольным и расслабленным."
        },
        "en": [
          "I can give myself permission to enjoy a moment without earning it.",
          "I can choose playfulness without another person's approval.",
          "I can enjoy closeness or solitude without judging either choice."
        ],
        "ru": [
          "Я могу позволить себе приятный момент, не заслуживая его.",
          "Я могу выбирать игру и лёгкость без чужого одобрения.",
          "Я могу радоваться близости или уединению, не осуждая ни один выбор."
        ]
      }
    ]
  }
]
const IDS = {
  "hh-love-affection": {
    "en": "c7a00001-7e2d-4a00-8d11-202610110001",
    "ru": "c7a00001-7e2d-4a00-8d11-202610110002"
  },
  "hh-trust-dialogue": {
    "en": "c7a00002-7e2d-4a00-8d11-202610110001",
    "ru": "c7a00002-7e2d-4a00-8d11-202610110002"
  },
  "hh-emotional-intimacy": {
    "en": "c7a00003-7e2d-4a00-8d11-202610110001",
    "ru": "c7a00003-7e2d-4a00-8d11-202610110002"
  },
  "hh-intimacy-consent": {
    "en": "c7a00004-7e2d-4a00-8d11-202610110001",
    "ru": "c7a00004-7e2d-4a00-8d11-202610110002"
  },
  "hh-desire-dialogue": {
    "en": "c7a00005-7e2d-4a00-8d11-202610110001",
    "ru": "c7a00005-7e2d-4a00-8d11-202610110002"
  },
  "hh-sexual-self-kindness": {
    "en": "c7a00006-7e2d-4a00-8d11-202610110001",
    "ru": "c7a00006-7e2d-4a00-8d11-202610110002"
  },
  "hh-tantra-presence": {
    "en": "c7a00007-7e2d-4a00-8d11-202610110001",
    "ru": "c7a00007-7e2d-4a00-8d11-202610110002"
  },
  "hh-sensual-joy": {
    "en": "c7a00008-7e2d-4a00-8d11-202610110001",
    "ru": "c7a00008-7e2d-4a00-8d11-202610110002"
  }
}
const HASHES = {
  "hh-love-affection": {
    "en": "sha256:e9395e60762e7d06904f65157dfc3e3a67423051704b45077c359e91d796dbf0",
    "ru": "sha256:5385756d5beeed83d1030626561b5eb686f6404c53a65627a94f66cdcc51193a"
  },
  "hh-trust-dialogue": {
    "en": "sha256:797a7700a5fdcc65c79c2f08278662922f462f61133fb78196e68aa87cd20124",
    "ru": "sha256:ab97a313e7cea20bdf91b26eafa0fe539d7b68c1ef185e9bf41b1b486c92fd66"
  },
  "hh-emotional-intimacy": {
    "en": "sha256:85d23c3876b9e38249bf32cbf196134a31966077ad372ac9d68d2cbc32071e25",
    "ru": "sha256:b834bd190b1c50e1f6e1f303adb0c2d287f945c9bb0a3026919e180dffff0952"
  },
  "hh-intimacy-consent": {
    "en": "sha256:8c010dfda8e74a6fa53a1fe7b765c813c67a1678e097abd5e499f27eb44c67d1",
    "ru": "sha256:7c84e8c87751088863466fd70bc1de04da339e84ec7536df45445820ffd20fc7"
  },
  "hh-desire-dialogue": {
    "en": "sha256:0dea33394838c2835912e4aa1feacbd4be9c5fc308a4ef2ed950714305950a5a",
    "ru": "sha256:54abf10bbf8723e2a7e341cb3b7787979882006962a0410c9cbfc672080b1c56"
  },
  "hh-sexual-self-kindness": {
    "en": "sha256:bcd817a3fc97aa8092fcebdfdc357f8ae310875517b63f5d914e4d5ba3f261a7",
    "ru": "sha256:db3d416d33751cb4c75039c0908abf5c510a37f5bb172a8949a70be9bc219881"
  },
  "hh-tantra-presence": {
    "en": "sha256:401bbd8d8f929d46a2841ed63c8db571064b05b992ef23590ae6a06787395550",
    "ru": "sha256:c5b85b2d8c6aaca917a8a8f009472c2b0033821daf857b0d1771fa66fd62ecd6"
  },
  "hh-sensual-joy": {
    "en": "sha256:b9cc026b3fea14ad361f41e946a922aa61abc0f3c614944311b1fd273c74cece",
    "ru": "sha256:df4019f5dc712d028d03c6b9ee4cd6900def4de8c69d4c94f910dc6a72684ca3"
  }
}
const dimensionKey = (cfg,sub) => 'resources.' + cfg.key.replace(/^hh-/, '').replaceAll('-', '_') + '.' + sub.key
function buildDefinition(cfg,locale) {
  const questions = cfg.scales.flatMap(s => s[locale]).map((text,index) => ({
    id: cfg.key + '.' + String(index+1).padStart(2,'0'), text, required:true,
    direction:'higher-reported-resource',
  }))
  const definition = {
    id:IDS[cfg.key][locale], key:cfg.key, version:'v1', instrumentLocale:locale,
    translationVersion:'hh-'+locale+'-v1', timeframe:'past-30-days',
    scoringKey:'configured', scoringVersion:'v1', resultVersion:'v1', title:cfg.titles[locale],
    source:{title:'Holistic House — '+cfg.titles.en,status:'original-non-diagnostic-intimacy-reflection',reviewedAt:'2026-10-11'},
    answerScale:{min:0,max:4},
    responseAnchors:locale==='ru'
      ? ['Совсем нет','Немного','Отчасти','В значительной степени','Очень сильно']
      : ['Not at all','A little','Somewhat','Quite a lot','Very much'],
    scoring:{ dimensions: cfg.scales.map((s,index)=>({
      key:dimensionKey(cfg,s), method:'mean',
      items:questions.slice(index*3,index*3+3).map(q=>q.id),
      min:0,max:4,dimensionClass:'resources',sourceConstruct:s.labels[locale],
      direction:'higher-reported-resource',
    })) },
    questions,optionalContext:[],suggestedRepeatDays:30,
  }
  // This immutable hash is computed at authoring time. Verify that changes
  // require a NEW version/ID instead of silently changing old completed scores.
  return {...definition,contentHash:HASHES[cfg.key][locale]}
}
export const RELATIONSHIPS_INTIMACY_KEYS = deepFreeze(CONFIGS.map(c=>c.key))
export const RELATIONSHIPS_INTIMACY_DEFINITIONS = deepFreeze(CONFIGS.flatMap(cfg=>
  ['en','ru'].map(locale=>buildDefinition(cfg,locale))))
export const RELATIONSHIPS_INTIMACY_CATALOG = deepFreeze(CONFIGS.map(cfg=>({
  key:cfg.key,version:'v1',instrumentLocale:'dynamic',axis:'resources',resultAxes:['resources'],
  topics:cfg.topics,moodAffinities:['neutral','happy','sad'],categoryAffinities:['relationships','emotions'],
  questionCount:6,durationMinutes:2,testStyle:'engaging',testLength:'medium',
  suggestedRepeatDays:30,cooldownDays:14,startable:true,starterEligible:false,
  access:'account',rightsStatus:'cleared',guestEligible:true,free:true,
  analysisAxes:cfg.axes.map(([key,weight])=>({key,weight})),title:cfg.titles,description:cfg.descriptions,
})))
export const RELATIONSHIP_REFLECTION_ROWS = deepFreeze(CONFIGS.map(cfg=>
  [cfg.key,'relationship',cfg.overview.en,cfg.overview.ru]))
export const RELATIONSHIP_DIMENSION_ROWS = deepFreeze(CONFIGS.flatMap(cfg=>
  cfg.scales.map(s=>[cfg.key,dimensionKey(cfg,s),'relationship',s.labels.en,s.labels.ru,s.step.en,s.step.ru])))
export const RELATIONSHIP_DIMENSION_AXES = deepFreeze(Object.fromEntries(CONFIGS.flatMap(cfg=>
  cfg.scales.map(s=>[dimensionKey(cfg,s),s.axis]))))
export const RELATIONSHIP_CONTEXT_COPY = deepFreeze({
  en:'These Holistic House reflections are original, non-diagnostic self-checks for adults. Scores describe your answers, not your worth, sexual functioning, compatibility, consent or anyone else. Skip any test you do not wish to answer; seek qualified help if you have health or safety concerns.',
  ru:'Это авторские тесты самонаблюдения для взрослых, не диагностика. Баллы описывают ответы, а не вашу ценность, сексуальную функцию, совместимость, согласие или другого человека. Вы вправе не проходить тест; при вопросах здоровья и безопасности обращайтесь к профильным специалистам.',
})
