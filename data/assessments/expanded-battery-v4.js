import { deepFreeze } from '../../lib/assessments/contracts.js'
import { buildFunDefinitions } from './expanded-battery-v2-helper.js'

// 10 original, non-diagnostic bilingual self-reflections; stable immutable provenance.
const CONFIGS = [
  {
    "key": "hh-body-mind-context",
    "titles": {
      "en": "Body–Mind Context Notes",
      "ru": "Контекст телесных ощущений"
    },
    "descriptions": {
      "en": "Notice when physical discomfort appears, without assuming its cause.",
      "ru": "Наблюдение за телесным дискомфортом без предположений о его причине."
    },
    "axis": "state",
    "topics": [
      "body",
      "stress",
      "clarity"
    ],
    "categoryAffinities": [
      "body",
      "emotions"
    ],
    "analysisAxes": [
      {
        "key": "stress",
        "weight": 0.73
      },
      {
        "key": "clarity",
        "weight": 0.64
      },
      {
        "key": "functioning",
        "weight": 0.48
      }
    ],
    "testLength": "medium",
    "en": [
      "I can describe a body sensation without deciding what caused it.",
      "I notice what happens around me when discomfort begins.",
      "I can tell how strong a sensation feels apart from how worried I am.",
      "I can notice when a physical sensation changes.",
      "I notice whether discomfort affects an ordinary activity.",
      "I know when to seek medical assessment instead of interpreting symptoms alone."
    ],
    "ru": [
      "Я могу описать телесное ощущение, не решая, что его вызвало.",
      "Я замечаю, что происходит вокруг, когда появляется дискомфорт.",
      "Я могу отличить силу ощущения от тревоги по его поводу.",
      "Я могу замечать изменения телесного ощущения.",
      "Я замечаю, влияет ли дискомфорт на обычные дела.",
      "Я понимаю, когда стоит обратиться за медицинской оценкой, а не объяснять симптомы самому."
    ],
    "negative": false,
    "timeframe": "past-7-days",
    "reviewedAt": "2026-10-08",
    "ids": {
      "en": "f6e11a76-d3d4-52ec-a634-7d73f20e2d3b",
      "ru": "c896ca86-5ca0-5e53-aa85-1f165b964efb"
    },
    "hashes": {
      "en": "sha256:d6a019b3ef40f97d5330a002126e7d76d55f52164eddb2ec7926466b97c09c92",
      "ru": "sha256:cb27f8609c2bf25f2f8a9eb455915703772def9ea2496e4b5f56d421e621d064"
    }
  },
  {
    "key": "hh-energy-drains",
    "titles": {
      "en": "Where My Energy Goes",
      "ru": "Куда уходит моя энергия"
    },
    "descriptions": {
      "en": "Explore energy demands and recovery opportunities during the week.",
      "ru": "Исследование затрат сил и возможностей восстановления за неделю."
    },
    "axis": "resources",
    "topics": [
      "energy",
      "work",
      "recovery"
    ],
    "categoryAffinities": [
      "energy",
      "work-money"
    ],
    "analysisAxes": [
      {
        "key": "energy",
        "weight": 0.93
      },
      {
        "key": "resource",
        "weight": 0.7
      },
      {
        "key": "functioning",
        "weight": 0.59
      }
    ],
    "testLength": "medium",
    "en": [
      "I can name two activities that cost a lot of energy.",
      "I notice when task switching tires me.",
      "I know one activity that often restores my energy.",
      "I can plan demanding tasks for times when I have more capacity.",
      "I recognise an early sign that I need a break.",
      "I can choose a lighter task when my energy is limited."
    ],
    "ru": [
      "Я могу назвать два занятия, отнимающие много сил.",
      "Я замечаю, когда переключение между делами утомляет.",
      "Я знаю занятие, которое часто восстанавливает силы.",
      "Я могу планировать сложные дела на время, когда сил больше.",
      "Я распознаю ранний признак того, что мне нужна пауза.",
      "Я могу выбрать более лёгкое дело, когда сил мало."
    ],
    "negative": false,
    "timeframe": "past-7-days",
    "reviewedAt": "2026-10-08",
    "ids": {
      "en": "878ae27c-f7fe-563a-adf8-90687afb1c27",
      "ru": "836b4d07-cd9b-5bd6-a769-c83edf415371"
    },
    "hashes": {
      "en": "sha256:9ff345ab11edf7054752049b239477cc677c6bd6b069b932d953ddf60ba2f77e",
      "ru": "sha256:1829a338458f88313ebf7f0fdb6691976bc2352e9dea4c725ba003d4bc21bf53"
    }
  },
  {
    "key": "hh-social-ease",
    "titles": {
      "en": "Ease Around Other People",
      "ru": "Комфорт среди людей"
    },
    "descriptions": {
      "en": "Reflect on everyday social comfort and choice; not an anxiety diagnosis.",
      "ru": "Повседневный комфорт в общении и свобода выбора; не диагностика тревоги."
    },
    "axis": "resources",
    "topics": [
      "relationships",
      "anxiety",
      "self-support"
    ],
    "categoryAffinities": [
      "relationships",
      "emotions"
    ],
    "analysisAxes": [
      {
        "key": "relationships",
        "weight": 0.77
      },
      {
        "key": "anxiety",
        "weight": 0.81
      },
      {
        "key": "self_support",
        "weight": 0.55
      }
    ],
    "testLength": "medium",
    "en": [
      "I can join a conversation without needing to be perfect.",
      "I can ask a question even when I feel uncertain.",
      "I can show curiosity about another person instead of always evaluating myself.",
      "I can take a break from a group without judging myself.",
      "I can recall a social moment that felt comfortable.",
      "I can choose a form of contact that fits my energy."
    ],
    "ru": [
      "Я могу вступить в разговор без необходимости быть идеальным.",
      "Я могу задать вопрос, даже если немного волнуюсь.",
      "Я могу интересоваться другим, а не постоянно оценивать себя.",
      "Я могу выйти ненадолго из группы без самоосуждения.",
      "Я могу вспомнить момент общения, в котором мне было комфортно.",
      "Я могу выбрать форму общения, соответствующую запасу моих сил."
    ],
    "negative": false,
    "timeframe": "past-7-days",
    "reviewedAt": "2026-10-08",
    "ids": {
      "en": "3820ebab-56be-51b4-a38d-f61ecc470507",
      "ru": "21e1b782-21a9-5545-ae01-c0f8502e6b7c"
    },
    "hashes": {
      "en": "sha256:e50aad3439aada2300370251b42d211efd9cfeb7d86b0868953ddadadb3c8d77",
      "ru": "sha256:f0189c2401d7b0ab6ef6f36fdbf0b414cd955f992df864b9f33bb7d231366b4a"
    }
  },
  {
    "key": "hh-solitude-choice",
    "titles": {
      "en": "Solitude, Space & Connection",
      "ru": "Уединение, пространство и контакт"
    },
    "descriptions": {
      "en": "Distinguish restorative solitude from unwanted disconnection.",
      "ru": "Как отличать восстанавливающее уединение от нежелательной изоляции."
    },
    "axis": "resources",
    "topics": [
      "relationships",
      "support",
      "recovery"
    ],
    "categoryAffinities": [
      "relationships",
      "emotions"
    ],
    "analysisAxes": [
      {
        "key": "relationships",
        "weight": 0.88
      },
      {
        "key": "resource",
        "weight": 0.71
      },
      {
        "key": "self_support",
        "weight": 0.44
      }
    ],
    "testLength": "medium",
    "en": [
      "I can recognise when I genuinely want time alone.",
      "I notice when being alone stops feeling restorative.",
      "I know a way to reach someone when I want connection.",
      "I can enjoy quiet time without treating it as isolation.",
      "I can tell someone when I need company.",
      "I can keep a connection while asking for personal space."
    ],
    "ru": [
      "Я могу понять, когда действительно хочу побыть один.",
      "Я замечаю, когда одиночество перестаёт восстанавливать.",
      "Я знаю, как связаться с кем-то, когда мне нужен контакт.",
      "Я могу наслаждаться тишиной, не считая её изоляцией.",
      "Я могу сказать другому, когда мне нужна компания.",
      "Я могу сохранять контакт и просить личное пространство."
    ],
    "negative": false,
    "timeframe": "past-7-days",
    "reviewedAt": "2026-10-08",
    "ids": {
      "en": "bf2c2015-a1e7-5776-acfa-80b9e50557d3",
      "ru": "3cd2035a-64d9-5e8e-abcc-e0fb37221f92"
    },
    "hashes": {
      "en": "sha256:a65d4973b04ad7c4a98c3a0c09ef00dcf24f014fcd72844bb9a54a25dbd0627e",
      "ru": "sha256:53c5a84336232f35791f550278d4f9d377d5aa5a284e4085446e51e16af195d4"
    }
  },
  {
    "key": "hh-relationship-balance",
    "titles": {
      "en": "Giving & Receiving",
      "ru": "Баланс отдачи и принятия"
    },
    "descriptions": {
      "en": "Explore mutuality and the balance of giving and receiving in relationships.",
      "ru": "Исследование взаимности, отдачи и принятия в отношениях."
    },
    "axis": "resources",
    "topics": [
      "relationships",
      "support",
      "self-support"
    ],
    "categoryAffinities": [
      "relationships"
    ],
    "analysisAxes": [
      {
        "key": "relationships",
        "weight": 0.98
      },
      {
        "key": "self_support",
        "weight": 0.68
      },
      {
        "key": "resource",
        "weight": 0.56
      }
    ],
    "testLength": "medium",
    "en": [
      "I can see when I am always the one initiating contact.",
      "I can express a wish instead of expecting others to guess it.",
      "I can receive kindness without immediately feeling indebted.",
      "I can support someone without ignoring my own limits.",
      "I can notice which relationships feel mutual.",
      "I can suggest a change when an arrangement feels one-sided."
    ],
    "ru": [
      "Я замечаю, когда всегда первым выхожу на связь.",
      "Я могу сказать о желании, не ожидая, что о нём догадаются.",
      "Я могу принимать доброту без немедленного чувства долга.",
      "Я могу поддержать другого, не игнорируя собственные границы.",
      "Я замечаю, в каких отношениях есть взаимность.",
      "Я могу предложить изменения, если договорённость ощущается односторонней."
    ],
    "negative": false,
    "timeframe": "past-7-days",
    "reviewedAt": "2026-10-08",
    "ids": {
      "en": "62341fe0-0d11-5085-a644-5bd0f0555a26",
      "ru": "52fcebef-7eb1-5e78-a775-ce95365676d3"
    },
    "hashes": {
      "en": "sha256:5773507974e8a7041a1caa0b26a47602b048bc731874494b103cd656941b9815",
      "ru": "sha256:6f7985c4e76029bf2406c5f30873640a90dfe90d1ab9713edee1e853456156e1"
    }
  },
  {
    "key": "hh-approval-pressure",
    "titles": {
      "en": "Pressure to Be Liked",
      "ru": "Давление необходимости нравиться"
    },
    "descriptions": {
      "en": "Notice the difference between kindness and pressure to please.",
      "ru": "Различение доброжелательности и давления всем нравиться."
    },
    "axis": "state",
    "topics": [
      "relationships",
      "stress",
      "self-support"
    ],
    "categoryAffinities": [
      "relationships",
      "emotions"
    ],
    "analysisAxes": [
      {
        "key": "self_support",
        "weight": 0.87
      },
      {
        "key": "stress",
        "weight": 0.71
      },
      {
        "key": "relationships",
        "weight": 0.7
      }
    ],
    "testLength": "medium",
    "en": [
      "I can notice when I agree mainly to avoid disapproval.",
      "I can name my preference when someone wants something else.",
      "I can tolerate someone having another opinion of me.",
      "I can distinguish kindness from needing to please everyone.",
      "I can reconsider an earlier yes when circumstances change.",
      "I know respectful disagreement need not end a relationship."
    ],
    "ru": [
      "Я замечаю, когда соглашаюсь главным образом из страха неодобрения.",
      "Я могу назвать своё предпочтение, когда другой хочет иного.",
      "Я могу выдержать чужое мнение обо мне.",
      "Я отличаю доброту от необходимости нравиться всем.",
      "Я могу пересмотреть своё согласие, если обстоятельства изменились.",
      "Я понимаю, что уважительное несогласие не обязано разрушать отношения."
    ],
    "negative": false,
    "timeframe": "past-7-days",
    "reviewedAt": "2026-10-08",
    "ids": {
      "en": "e7d0c40d-dba1-52cd-a35f-7c7cb23cd9d3",
      "ru": "35c70f76-820f-5cbe-ac76-df2003c1910f"
    },
    "hashes": {
      "en": "sha256:e8d9b02b92f2963e60b9b0380352e3aff90e23c8b0c97865bb4a4f18abb3b19f",
      "ru": "sha256:6e7b59c171522b117123a8a2836bd46af527bf963f1600eef99bd1d57bd4f4ac"
    }
  },
  {
    "key": "hh-perfectionism-pressure",
    "titles": {
      "en": "Enough Is Enough",
      "ru": "Достаточно хорошо"
    },
    "descriptions": {
      "en": "Reflect on high standards, mistakes and everyday flexibility.",
      "ru": "Размышление о высоких стандартах, ошибках и гибкости."
    },
    "axis": "function",
    "topics": [
      "work",
      "stress",
      "self-support",
      "function"
    ],
    "categoryAffinities": [
      "work-money",
      "emotions"
    ],
    "analysisAxes": [
      {
        "key": "functioning",
        "weight": 0.85
      },
      {
        "key": "stress",
        "weight": 0.77
      },
      {
        "key": "self_support",
        "weight": 0.6
      }
    ],
    "testLength": "medium",
    "en": [
      "I can finish a task without polishing every detail.",
      "I can decide what level of quality is truly needed.",
      "I can notice when high standards stop me from starting.",
      "I can allow a harmless mistake without prolonged self-blame.",
      "I can ask for feedback before the work feels perfect.",
      "I can stop when extra effort no longer adds much value."
    ],
    "ru": [
      "Я могу завершить дело, не доводя каждую деталь до идеала.",
      "Я могу решить, какой уровень качества действительно нужен.",
      "Я замечаю, когда завышенные требования мешают начать.",
      "Я могу допустить безобидную ошибку без долгого самообвинения.",
      "Я могу попросить обратную связь до идеального завершения работы.",
      "Я могу остановиться, если дополнительные усилия мало что меняют."
    ],
    "negative": false,
    "timeframe": "past-7-days",
    "reviewedAt": "2026-10-08",
    "ids": {
      "en": "bc2621b7-5037-55ab-a338-9f3eeb49773c",
      "ru": "8cbbaa9b-7920-5e76-a8ca-62767f8114e4"
    },
    "hashes": {
      "en": "sha256:fd57fd8304918582f865d69da053b5a93a88d57fa5a1634aefb75e6ad718d3bd",
      "ru": "sha256:1ff3b8aaa14ed1afc05dc47d0b22534ce445da1b3a3d91dfdcce186f665f5bf5"
    }
  },
  {
    "key": "hh-uncertainty-flexibility",
    "titles": {
      "en": "Grounded in Uncertainty",
      "ru": "Опора в неопределённости"
    },
    "descriptions": {
      "en": "Reflect on practical flexibility when outcomes are uncertain.",
      "ru": "Практическая гибкость, когда исход событий неопределён."
    },
    "axis": "resources",
    "topics": [
      "anxiety",
      "stress",
      "clarity",
      "recovery"
    ],
    "categoryAffinities": [
      "emotions",
      "other"
    ],
    "analysisAxes": [
      {
        "key": "anxiety",
        "weight": 0.78
      },
      {
        "key": "emotional_regulation",
        "weight": 0.87
      },
      {
        "key": "clarity",
        "weight": 0.57
      }
    ],
    "testLength": "medium",
    "en": [
      "I can take a step without knowing the final outcome.",
      "I can notice when I am looking for an impossible guarantee.",
      "I can plan without preparing for every possible scenario.",
      "I can distinguish questions I can answer now from those needing time.",
      "I can return my attention to what is happening today.",
      "I can update my plan as new information arrives."
    ],
    "ru": [
      "Я могу сделать шаг, не зная итог заранее.",
      "Я замечаю, когда ищу невозможную гарантию.",
      "Я могу планировать без разбора всех возможных сценариев.",
      "Я могу отличить вопросы, на которые можно ответить сейчас, от тех, которым нужно время.",
      "Я могу вернуть внимание к происходящему сегодня.",
      "Я могу изменять план при появлении новой информации."
    ],
    "negative": false,
    "timeframe": "past-7-days",
    "reviewedAt": "2026-10-08",
    "ids": {
      "en": "db2fb3e4-3ec6-5dd0-afad-6d5c445cd34f",
      "ru": "0a2d7e40-5b6e-5ce5-a239-0e85289cd58d"
    },
    "hashes": {
      "en": "sha256:1014945c034dc30499bd722b6cabd5f48ff81857e63fc194874bbf1ccb5d5bea",
      "ru": "sha256:1a229262ae2d54b2564339a860616ea43bc8b672c5fe8f15e0a30b32f5192a7b"
    }
  },
  {
    "key": "hh-role-freedom",
    "titles": {
      "en": "More Than My Roles",
      "ru": "Больше, чем мои роли"
    },
    "descriptions": {
      "en": "Explore identity beyond work, family and expectations, without diagnostic claims.",
      "ru": "Исследование себя за пределами работы, семьи и ожиданий; без диагностики."
    },
    "axis": "resources",
    "topics": [
      "personality",
      "meaning",
      "self-support"
    ],
    "categoryAffinities": [
      "emotions",
      "work-money",
      "other"
    ],
    "analysisAxes": [
      {
        "key": "personality",
        "weight": 0.74
      },
      {
        "key": "meaning",
        "weight": 0.89
      },
      {
        "key": "self_support",
        "weight": 0.68
      }
    ],
    "testLength": "medium",
    "en": [
      "I can describe myself beyond my jobs and obligations.",
      "I have interests that matter without outside praise.",
      "I notice when a familiar role feels too narrow.",
      "I can choose my response rather than follow a role automatically.",
      "I can imagine different ways of expressing myself.",
      "I can value myself even when I am not useful to anyone."
    ],
    "ru": [
      "Я могу описать себя не только через работу и обязанности.",
      "У меня есть интересы, важные без чужой похвалы.",
      "Я замечаю, когда привычная роль становится тесной.",
      "Я могу выбирать реакцию, а не автоматически следовать роли.",
      "Я могу представить разные способы самовыражения.",
      "Я могу ценить себя, даже когда никому не полезен."
    ],
    "negative": false,
    "timeframe": "past-7-days",
    "reviewedAt": "2026-10-08",
    "ids": {
      "en": "a2e82773-bf51-5cb4-a1b5-c51915b28fa1",
      "ru": "1b38d89b-4ada-54e6-a7bd-67119d468db6"
    },
    "hashes": {
      "en": "sha256:5431485146aac7704a9cf1e9a366429170562be1f8ce8df8f8ddfc49e8704599",
      "ru": "sha256:eec5b2928344d94be83d755dad9a999d17528689d8f9f38a223f810d78385772"
    }
  },
  {
    "key": "hh-work-boundaries",
    "titles": {
      "en": "Boundaries at Work",
      "ru": "Границы в работе"
    },
    "descriptions": {
      "en": "Reflect on workload, communication and clear expectations at work or in studies.",
      "ru": "Размышление о нагрузке и договорённостях на работе или учёбе."
    },
    "axis": "function",
    "topics": [
      "work",
      "stress",
      "self-support",
      "function"
    ],
    "categoryAffinities": [
      "work-money",
      "energy"
    ],
    "analysisAxes": [
      {
        "key": "functioning",
        "weight": 0.89
      },
      {
        "key": "self_support",
        "weight": 0.8
      },
      {
        "key": "stress",
        "weight": 0.73
      }
    ],
    "testLength": "medium",
    "en": [
      "I can clarify expectations before accepting a task.",
      "I can say when a deadline is unrealistic.",
      "I can protect a short period for focused work.",
      "I can take an appropriate break without always being available.",
      "I can distinguish my responsibilities from someone else's.",
      "I can renegotiate priorities when everything is called urgent."
    ],
    "ru": [
      "Я могу уточнить ожидания, прежде чем взять новую задачу.",
      "Я могу сказать, когда срок выглядит нереалистичным.",
      "Я могу выделить короткое время для сосредоточенной работы.",
      "Я могу сделать уместный перерыв без обязанности быть доступным всегда.",
      "Я могу отличать свои обязанности от чужих.",
      "Я могу пересогласовать приоритеты, когда всё называют срочным."
    ],
    "negative": false,
    "timeframe": "past-7-days",
    "reviewedAt": "2026-10-08",
    "ids": {
      "en": "1adbf123-844a-5889-a127-d00c32c749e4",
      "ru": "a5765ab7-c063-5dfc-a5f7-34946fbe86f7"
    },
    "hashes": {
      "en": "sha256:6254cba308b9b9b58f603d72a3fc7a2b35a89e1215d0d634eb1dd4fa5849a751",
      "ru": "sha256:22583980189fec762b0745f3b87b108e729d6d84439409541b98645db8cc6ffa"
    }
  }
]

export const EXPANDED_BATTERY_V4_DEFINITIONS = buildFunDefinitions(CONFIGS)
export const EXPANDED_BATTERY_V4_KEYS = Object.freeze(CONFIGS.map(({key}) => key))
export const EXPANDED_CATALOG_V4 = deepFreeze(CONFIGS.map((item) => ({
  key: item.key, version: 'v1', instrumentLocale: 'dynamic', axis: item.axis, resultAxes: [item.axis],
  topics: item.topics, moodAffinities: ['sad','neutral','happy'], categoryAffinities: item.categoryAffinities,
  questionCount: item.en.length, durationMinutes: 2, testStyle: 'engaging', testLength: item.testLength,
  suggestedRepeatDays: 14, cooldownDays: 7, startable: true, access: 'account', rightsStatus: 'cleared',
  guestEligible: true, free: true, analysisAxes: item.analysisAxes, title: item.titles, description: item.descriptions,
})))
