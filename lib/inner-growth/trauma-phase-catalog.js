// OPORA TRAUMA-1.3: version-pinned educational descriptors for AS1/AS3/AS5/AS6.
// Source: approved daily plans §§6.1/6.3/6.5/6.6; §10 governs outcomes and evidence.
// The existing interaction shape is transport only. No legacy route content is imported.
// Pure data/resolvers: no network, persistence, scoring, treatment claims or completion gates.
// AS2 lesson content is deliberately absent; its optional §10.2 checks are supplemental.
// AS4 has no self-guided lesson, interaction or checkpoint descriptors.
export const VERSION = 'opora-trauma-1.3-20261015'
const SOURCE_DOCUMENT = 'https://docs.google.com/document/d/10Je2F-a54NCkmZPr0uAFPyeHkRgAxYOJoBoNWcnCnew/edit'
const SECTIONS = Object.freeze({ AS1: '6.1', AS3: '6.3', AS5: '6.5', AS6: '6.6' })
const deepFreeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}
const read = (value, locale) => value[locale === 'ru' ? 'ru' : 'en']

const DAYS = deepFreeze({
  "AS1": [
    {
      "day": 1,
      "title": {
        "ru": "Я могу начать по-своему",
        "en": "I can begin in my own way"
      },
      "sourceHash": "4de42172e87984fc4b121a0025ae40b3f7be787efe888b1ad61344a8d2beee27",
      "practice": {
        "ru": "открыть три спокойных сценария начала (чтение / неподвижное фото / без медиа), выбрать один; самостоятельно поставить практику на паузу через 15–30 секунд.",
        "en": "Explore three quiet starting formats: reading, a still photo, or no media. Choose one and try pausing after 15–30 seconds; stopping sooner is always allowed."
      },
      "transfer": {
        "ru": "выбрать другое условие участия для вымышленного персонажа.",
        "en": "Choose a different participation condition for a fictional person."
      },
      "artifact": {
        "ru": "«Подходящее для меня начало».",
        "en": "A starting format that suits me."
      },
      "alternative": {
        "ru": "только чтение и немедленный выход.",
        "en": "Read only and leave immediately if preferred."
      },
      "choices": [
        {
          "ru": "Чтение",
          "en": "Reading"
        },
        {
          "ru": "Неподвижное фото, если доступно",
          "en": "A still photo, if available"
        },
        {
          "ru": "Без медиа",
          "en": "No media"
        },
        {
          "ru": "Поставить на паузу сейчас",
          "en": "Pause now"
        }
      ],
      "fields": [
        {
          "ru": "Условие начала",
          "en": "Starting condition"
        },
        {
          "ru": "Когда я могу остановиться",
          "en": "When I may stop"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: Ира открывает короткую инструкцию и сама выбирает формат и момент паузы.",
        "en": "Fictional scene: Ira opens a short instruction and chooses its format and when to pause."
      },
      "newScenario": {
        "ru": "Новая сцена: Лев не хочет смотреть изображения и располагает только короткой паузой. Какое условие начала и остановки ему доступно?",
        "en": "New scene: Lev does not want images and has only a brief break. What starting and stopping conditions are available?"
      },
      "probeFields": [
        {
          "ru": "Формат для Льва",
          "en": "A format for Lev"
        },
        {
          "ru": "Его право закончить раньше",
          "en": "His option to finish early"
        }
      ]
    },
    {
      "day": 2,
      "title": {
        "ru": "Моё “нет” имеет значение",
        "en": "My no matters"
      },
      "sourceHash": "8e324bd9dbc5399b154a1624ee08b1ef64afdadf379eaaa9e3c690ebac6eae67",
      "practice": {
        "ru": "попробовать тренажёр «продолжить — сделать короче — отложить — закончить» без штрафа; увидеть, что выбор сохраняется.",
        "en": "Explore continue, shorten, postpone and finish without a penalty. Choose an option, then change it if needed."
      },
      "transfer": {
        "ru": "на иной учебной сцене решить, как отказаться от лишнего задания.",
        "en": "In another fictional scene, decide how to decline an extra task."
      },
      "artifact": {
        "ru": "личная фраза «Сейчас остановлюсь».",
        "en": "A personal phrase: I will stop now."
      },
      "alternative": {
        "ru": "прочитать 4 кнопки, не нажимая их.",
        "en": "Read the four options without selecting them."
      },
      "choices": [
        {
          "ru": "Продолжить",
          "en": "Continue"
        },
        {
          "ru": "Сделать короче",
          "en": "Shorten"
        },
        {
          "ru": "Отложить",
          "en": "Postpone"
        },
        {
          "ru": "Закончить",
          "en": "Finish"
        }
      ],
      "fields": [
        {
          "ru": "Мой вариант сейчас",
          "en": "My option now"
        },
        {
          "ru": "Если передумаю",
          "en": "If I change my mind"
        },
        {
          "ru": "Фраза остановки",
          "en": "A stopping phrase"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: у Саши осталось необязательное упражнение; можно изменить решение без объяснений.",
        "en": "Fictional scene: Sasha has an optional exercise left and may change their choice without an explanation."
      },
      "newScenario": {
        "ru": "Новая сцена: Дане предлагают ещё один необязательный список, когда она уже решила закончить. Как отказаться или отложить?",
        "en": "New scene: Dana is offered another optional list after deciding to finish. How could she decline or postpone it?"
      },
      "probeFields": [
        {
          "ru": "Ответ Даны",
          "en": "Dana’s response"
        },
        {
          "ru": "Что она может оставить на потом",
          "en": "What she may leave for later"
        }
      ]
    },
    {
      "day": 3,
      "title": {
        "ru": "Я замечаю настоящее вокруг",
        "en": "I notice the present around me"
      },
      "sourceHash": "e46fa3d60eca235e1729b03ae63bd461cb74fae3746916b28bc883e4eb97a972",
      "practice": {
        "ru": "с открытыми глазами выбрать один нейтральный предмет вокруг себя; описать его цвет/форму или сделать то же на статичной фотографии.",
        "en": "With eyes open, choose one neutral object nearby and describe its colour or shape, or use a still photo. There is no need to focus on body sensations or memories."
      },
      "transfer": {
        "ru": "сменить ориентир и вернуться к первому, если удобно.",
        "en": "Choose another anchor and return to the first if comfortable."
      },
      "artifact": {
        "ru": "«Мой предмет-ориентир».",
        "en": "My external object anchor."
      },
      "alternative": {
        "ru": "готовый список нейтральных слов.",
        "en": "Use a ready-made list of neutral words."
      },
      "choices": [
        {
          "ru": "Цвет обычного предмета",
          "en": "The colour of an ordinary object"
        },
        {
          "ru": "Форма предмета",
          "en": "The shape of an object"
        },
        {
          "ru": "Слова: стол, чашка, окно",
          "en": "Words: table, cup, window"
        }
      ],
      "fields": [
        {
          "ru": "Первый предмет",
          "en": "First object"
        },
        {
          "ru": "Цвет или форма",
          "en": "Colour or shape"
        },
        {
          "ru": "Другой ориентир",
          "en": "Another anchor"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: на столе стоят чашка и коробка. Можно описать только видимый цвет или форму.",
        "en": "Fictional scene: a cup and a box are on a table. Only a visible colour or shape needs describing."
      },
      "newScenario": {
        "ru": "Новая сцена: в другой комнате видны полка и дверь. Выберите второй ориентир; при желании вернитесь к первому.",
        "en": "New scene: a shelf and a door are visible in another room. Choose a second anchor and return to the first if preferred."
      },
      "probeFields": [
        {
          "ru": "Первый новый ориентир",
          "en": "First new anchor"
        },
        {
          "ru": "На что переключусь",
          "en": "What to switch to"
        },
        {
          "ru": "К чему можно вернуться",
          "en": "What I may return to"
        }
      ]
    },
    {
      "day": 4,
      "title": {
        "ru": "Я могу ориентироваться в другой обстановке",
        "en": "I can orient in another setting"
      },
      "sourceHash": "ef60b95bf83e66a45fb33a537795aa467e2172007d39c9f880665fed5c9a05aa",
      "practice": {
        "ru": "в новой панораме комнаты найти двери/окно/устойчивые объекты без необходимости искать угрозы; выбрать спокойный визуальный ориентир.",
        "en": "In a new room panorama, find a door, window or stable object without searching for threats. Choose a neutral visual anchor; a flat room plan is an equal alternative."
      },
      "transfer": {
        "ru": "самостоятельно выбрать из двух изображений удобное для внимания.",
        "en": "Choose which of two views is more comfortable for attention."
      },
      "artifact": {
        "ru": "план «Где я могу посмотреть, чтобы вспомнить настоящее».",
        "en": "Where I can look to reconnect with the present."
      },
      "alternative": {
        "ru": "плоская схема вместо панорамы.",
        "en": "Use a flat plan or its text description instead of a panorama."
      },
      "choices": [
        {
          "ru": "Дверь на схеме",
          "en": "A door on the plan"
        },
        {
          "ru": "Окно на схеме",
          "en": "A window on the plan"
        },
        {
          "ru": "Устойчивый стол на схеме",
          "en": "A stable table on the plan"
        }
      ],
      "fields": [
        {
          "ru": "Выбранный вид комнаты",
          "en": "Chosen room view"
        },
        {
          "ru": "Один внешний ориентир",
          "en": "One external anchor"
        }
      ],
      "scene": {
        "ru": "Текстовая схема А: дверь слева, стол в центре, окно справа. Схема Б: дверь справа, полка слева, окно впереди. Искать угрозы не нужно.",
        "en": "Text plan A: door left, table centre, window right. Plan B: door right, shelf left, window ahead. There is no need to search for threats."
      },
      "newScenario": {
        "ru": "Новая сцена: схема читального зала показывает дверь впереди и неподвижный стеллаж справа. Что удобнее выбрать ориентиром, и нужен ли более простой вид?",
        "en": "New scene: a reading-room plan shows a door ahead and a fixed bookcase on the right. Which anchor fits, and would a simpler view help?"
      },
      "probeFields": [
        {
          "ru": "Выбранный ориентир нового зала",
          "en": "Chosen anchor in the new room"
        },
        {
          "ru": "Предпочтительный вид или текст",
          "en": "Preferred view or text"
        }
      ]
    },
    {
      "day": 5,
      "title": {
        "ru": "Чувство опасности и реальная ситуация — не одно и то же",
        "en": "A sense of danger and the actual situation can differ"
      },
      "sourceHash": "1a6b2afeafeda26f65bae6dcf741006d36439dd8eca8f35d14224f00b97a0edd",
      "practice": {
        "ru": "три вымышленных ситуации — безопасное, неопределённое и явно небезопасное пространство; сопоставить действие: ориентироваться / запросить информацию / уйти и получить поддержку.",
        "en": "Compare three fictional settings: safe, uncertain and clearly unsafe. Match them with orienting, requesting information, or leaving and obtaining support. Do not dismiss real danger."
      },
      "transfer": {
        "ru": "в дополнительной нейтральной сцене ответить «проверить факт или сделать защитный шаг?».",
        "en": "In an additional neutral scene, decide whether to check a fact or take a protective step."
      },
      "artifact": {
        "ru": "различение «сигнал — факт — действие».",
        "en": "Signal, fact and action kept distinct."
      },
      "alternative": {
        "ru": "только готовые решения; не спрашивать о личном насилии.",
        "en": "Read ready-made responses only; no account of personal violence is requested."
      },
      "choices": [
        {
          "ru": "Безопасная сцена → внешний ориентир",
          "en": "Safe scene → an external anchor"
        },
        {
          "ru": "Неопределённость → уточнить информацию",
          "en": "Uncertainty → request information"
        },
        {
          "ru": "Реальная опасность → уйти и получить поддержку",
          "en": "Actual danger → leave and obtain support"
        }
      ],
      "fields": [
        {
          "ru": "Действие в безопасной сцене",
          "en": "Action in the safe scene"
        },
        {
          "ru": "Что уточнить при неопределённости",
          "en": "What to clarify when uncertain"
        },
        {
          "ru": "Защитный шаг при опасности",
          "en": "Protective step for danger"
        }
      ],
      "scene": {
        "ru": "Три вымышленные сцены: тихий открытый читальный зал; кабинет с табличкой «вход временно закрыт» без объяснения; проход с видимым дымом. В третьей сцене приоритет — отойти от опасного места и обратиться к доступной помощи.",
        "en": "Three fictional scenes: a quiet open reading room; an office marked temporarily closed with no explanation; a passage with visible smoke. In the third scene, move away from danger and seek available help."
      },
      "newScenario": {
        "ru": "Новая нейтральная сцена: на двери библиотеки новая табличка о часах работы. Видимых признаков опасности нет. Какой факт можно уточнить, сохраняя право уйти?",
        "en": "New neutral scene: the library door has a new opening-hours notice, with no visible sign of danger. What fact could be checked while keeping the option to leave?"
      },
      "probeFields": [
        {
          "ru": "Что известно из таблички",
          "en": "What the notice says"
        },
        {
          "ru": "Какой факт ещё нужен",
          "en": "What fact is still needed"
        },
        {
          "ru": "Доступный выбор действия",
          "en": "An available action"
        }
      ]
    },
    {
      "day": 6,
      "title": {
        "ru": "Я могу менять условия, а не себя",
        "en": "I can change the conditions around me"
      },
      "sourceHash": "d95254840951dce136f0613306b43456871d79ae67fd7817f5f8b6b52fad56c3",
      "practice": {
        "ru": "конструктор «слишком шумно/много сообщений/неудобное место» с действиями уменьшить шум, закрыть экран, отойти, попросить время, прекратить контакт.",
        "en": "Explore too much noise, too many messages or an uncomfortable place. Choose to reduce noise, close a screen, move away, ask for time or end contact."
      },
      "transfer": {
        "ru": "выбрать один вариант изменения для новой сцены.",
        "en": "Choose one environmental change for a new scene."
      },
      "artifact": {
        "ru": "«Что я могу изменить вокруг».",
        "en": "What I can change around me."
      },
      "alternative": {
        "ru": "заменить симуляцию списком.",
        "en": "Use a list instead of a simulation."
      },
      "choices": [
        {
          "ru": "Уменьшить шум",
          "en": "Reduce noise"
        },
        {
          "ru": "Закрыть экран сообщений",
          "en": "Close the message screen"
        },
        {
          "ru": "Отойти в другое место",
          "en": "Move to another place"
        },
        {
          "ru": "Попросить время или прекратить контакт",
          "en": "Ask for time or end contact"
        }
      ],
      "fields": [
        {
          "ru": "Какое условие мешает",
          "en": "Which condition gets in the way"
        },
        {
          "ru": "Что можно изменить",
          "en": "What can change"
        },
        {
          "ru": "Если изменение недоступно",
          "en": "If that change is unavailable"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: во время необязательного чтения приходят уведомления, рядом играет музыка. Можно изменить условия или закончить.",
        "en": "Fictional scene: notifications and nearby music interrupt optional reading. The conditions may be changed, or reading may end."
      },
      "newScenario": {
        "ru": "Новая сцена: у Миши неудобное место для просмотра расписания. Какие условия можно изменить, если другой стул недоступен?",
        "en": "New scene: Misha has an uncomfortable place to check a timetable. What could change if another chair is unavailable?"
      },
      "probeFields": [
        {
          "ru": "Одно изменение условий",
          "en": "One change to the conditions"
        },
        {
          "ru": "Запасной вариант",
          "en": "A backup option"
        }
      ]
    },
    {
      "day": 7,
      "title": {
        "ru": "Мои реальные внешние опоры",
        "en": "My real external supports"
      },
      "sourceHash": "95c5d3ced55d5a72ea14c8a192fc4d1678786d0df09ff8492c62e575787781a0",
      "practice": {
        "ru": "карта ресурсов «предмет — место — время — информация — человек — организация»; выбрать один реально доступный тип опоры либо отметить отсутствие.",
        "en": "Explore support categories: object, place, time, information, person and organisation. Choose one genuinely available support or note that none is available."
      },
      "transfer": {
        "ru": "в другой обстановке подобрать резервный вариант.",
        "en": "Choose a backup support in another setting."
      },
      "artifact": {
        "ru": "карта доступных опор.",
        "en": "A map of available supports."
      },
      "alternative": {
        "ru": "выбрать нейтральный ресурс без личных данных; если опоры нет, не считать провалом.",
        "en": "Use a neutral resource without personal details. No available support is a valid response."
      },
      "choices": [
        {
          "ru": "Предмет или место",
          "en": "Object or place"
        },
        {
          "ru": "Время для отдыха",
          "en": "Time for rest"
        },
        {
          "ru": "Нужная информация",
          "en": "Useful information"
        },
        {
          "ru": "Человек или организация без имён",
          "en": "Person or organisation without names"
        },
        {
          "ru": "Сейчас опоры нет",
          "en": "No support available now"
        }
      ],
      "fields": [
        {
          "ru": "Тип действительно доступной опоры",
          "en": "Type of genuinely available support"
        },
        {
          "ru": "Что доступно сейчас",
          "en": "What is available now"
        },
        {
          "ru": "Резерв в другой обстановке",
          "en": "Backup in another setting"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: в библиотеке есть обычный стол, время до следующего дела и справочная стойка. Выберите лишь то, что реально доступно персонажу.",
        "en": "Fictional scene: a library has an ordinary table, time before the next task and an information desk. Choose only what is actually available to the character."
      },
      "newScenario": {
        "ru": "Новая сцена: в небольшом зале справочная стойка закрыта, но есть расписание и возможность выйти на паузу. Какой резерв остаётся?",
        "en": "New scene: an information desk is closed in a small hall, but a timetable and the option to take a break are available. What backup remains?"
      },
      "probeFields": [
        {
          "ru": "Что исчезло",
          "en": "What is unavailable"
        },
        {
          "ru": "Что действительно осталось",
          "en": "What genuinely remains"
        }
      ]
    },
    {
      "day": 8,
      "title": {
        "ru": "Мой план, когда поддержки мало",
        "en": "My plan when support is limited"
      },
      "sourceHash": "de901c87d4e5b539bdb7fd41919215ce3722b483e1fba443d0bae71593383542",
      "practice": {
        "ru": "выбрать сценарий «основной ресурс недоступен» и составить два варианта: безопасный отдых и источник практической помощи/консультации.",
        "en": "Choose a fictional situation where the main support is unavailable. Build two alternatives: safe rest and a source of practical help or advice."
      },
      "transfer": {
        "ru": "выбрать, что делать сначала, если план А недоступен.",
        "en": "Choose what to do first if plan A is unavailable."
      },
      "artifact": {
        "ru": "резервный маршрут.",
        "en": "A backup route."
      },
      "alternative": {
        "ru": "карточка контактов общих служб, без имён близких.",
        "en": "Use categories of general services without naming people close to you."
      },
      "choices": [
        {
          "ru": "Безопасный отдых",
          "en": "Safe rest"
        },
        {
          "ru": "Практическая помощь",
          "en": "Practical help"
        },
        {
          "ru": "Общая справочная или консультационная служба",
          "en": "A general information or advice service"
        }
      ],
      "fields": [
        {
          "ru": "Основная опора недоступна",
          "en": "Unavailable main support"
        },
        {
          "ru": "Вариант безопасного отдыха",
          "en": "Safe-rest option"
        },
        {
          "ru": "Тип практической помощи",
          "en": "Type of practical help"
        },
        {
          "ru": "Что выбрать сначала",
          "en": "What to choose first"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: знакомое тихое место временно закрыто. У персонажа есть возможность отложить дело и узнать об альтернативном месте у справочной службы.",
        "en": "Fictional scene: a familiar quiet place is temporarily closed. The character may postpone the task and ask an information service about another place."
      },
      "newScenario": {
        "ru": "Новая сцена: справочная служба отвечает только завтра. Какой доступный отдых выбрать первым и где позже проверить другую помощь?",
        "en": "New scene: the information service replies tomorrow. What available rest comes first, and where could other help be checked later?"
      },
      "probeFields": [
        {
          "ru": "Первый доступный вариант",
          "en": "First available option"
        },
        {
          "ru": "Резерв помощи позже",
          "en": "A later backup source of help"
        }
      ]
    },
    {
      "day": 9,
      "title": {
        "ru": "Моя комфортная дистанция",
        "en": "My comfortable distance"
      },
      "sourceHash": "f0bae5830d62fc0d656f6d51795dae5e1e2facb73bc170385a8cd0f8489aef1c",
      "practice": {
        "ru": "в нейтральной социальной иллюстрации настроить дистанцию: читать сейчас/позже, остаться/отойти, отвечать/не отвечать.",
        "en": "In a neutral social scene, choose distance: read now or later, stay or step away, respond or not respond. Contact is optional."
      },
      "transfer": {
        "ru": "выбрать подходящее расстояние в другом контексте.",
        "en": "Choose a comfortable distance in another context."
      },
      "artifact": {
        "ru": "личный принцип «я могу увеличить дистанцию».",
        "en": "I may increase distance."
      },
      "alternative": {
        "ru": "текстовый выбор; не требовать контакта.",
        "en": "Use text choices without making contact."
      },
      "choices": [
        {
          "ru": "Прочитать позже",
          "en": "Read later"
        },
        {
          "ru": "Отойти",
          "en": "Step away"
        },
        {
          "ru": "Не отвечать сейчас",
          "en": "Do not respond now"
        },
        {
          "ru": "Остаться, если удобно",
          "en": "Stay if comfortable"
        }
      ],
      "fields": [
        {
          "ru": "Дистанция от информации",
          "en": "Distance from information"
        },
        {
          "ru": "Дистанция от общения",
          "en": "Distance from contact"
        },
        {
          "ru": "Что можно изменить позже",
          "en": "What may change later"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: в групповом чате обсуждают необязательную встречу. Можно читать позже или не отвечать.",
        "en": "Fictional scene: a group chat discusses an optional meeting. Reading later or not replying are available choices."
      },
      "newScenario": {
        "ru": "Новая сцена: знакомый предлагает продолжить разговор у выхода после занятия. Какую дистанцию выбрать без обязательного объяснения?",
        "en": "New scene: an acquaintance offers to continue talking after a class. What distance could be chosen without a required explanation?"
      },
      "probeFields": [
        {
          "ru": "Удобная дистанция в новой сцене",
          "en": "Comfortable distance in the new scene"
        },
        {
          "ru": "Право не продолжать",
          "en": "Option not to continue"
        }
      ]
    },
    {
      "day": 10,
      "title": {
        "ru": "Мои границы времени и внимания",
        "en": "My limits on time and attention"
      },
      "sourceHash": "08a8d2ef0c2c46a3f24f286b50073819dc6b00fa89c39454c5c1d38f09a52ca1",
      "practice": {
        "ru": "конструктор коротких сообщений «Сейчас не могу», «Вернусь позже», «Предпочитаю другой способ», «Мне нужна пауза» без отправки адресатам.",
        "en": "Build an unsent boundary phrase: I cannot now, I will return later, I prefer another format, or I need a break."
      },
      "transfer": {
        "ru": "для новой сцены выбрать спокойный ответ.",
        "en": "Choose a calm response for a new scene."
      },
      "artifact": {
        "ru": "одна готовая фраза границы.",
        "en": "One ready-to-use boundary phrase."
      },
      "alternative": {
        "ru": "просто сохранить одну шаблонную фразу.",
        "en": "Keep a template phrase without adding personal details."
      },
      "choices": [
        {
          "ru": "Сейчас не могу",
          "en": "I cannot now"
        },
        {
          "ru": "Вернусь позже",
          "en": "I will return later"
        },
        {
          "ru": "Предпочитаю другой способ",
          "en": "I prefer another format"
        },
        {
          "ru": "Мне нужна пауза",
          "en": "I need a break"
        }
      ],
      "fields": [
        {
          "ru": "Фраза границы без адресата",
          "en": "Boundary phrase without a recipient"
        },
        {
          "ru": "Удобный срок или формат, если нужен",
          "en": "A workable time or format, if needed"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: знакомый просит сразу прочитать длинную необязательную заметку. Составьте ответ без отправки.",
        "en": "Fictional scene: an acquaintance asks for an immediate reading of a long optional note. Draft an answer without sending it."
      },
      "newScenario": {
        "ru": "Новая сцена: вам предлагают обсудить бытовой вопрос голосом, а текст сейчас удобнее. Как выразить границу?",
        "en": "New scene: someone suggests discussing a household matter by voice, but text is more workable. How could the boundary be expressed?"
      },
      "probeFields": [
        {
          "ru": "Спокойная фраза для новой сцены",
          "en": "A calm phrase for the new scene"
        },
        {
          "ru": "Другой формат или пауза",
          "en": "Another format or a pause"
        }
      ]
    },
    {
      "day": 11,
      "title": {
        "ru": "Кто и что может быть безопасной поддержкой",
        "en": "What can make support safer"
      },
      "sourceHash": "c2d5629b602b2244274ac093cbadc8f0ed513026bf3c679d82365243a2157c26",
      "practice": {
        "ru": "карточки критериев безопасного взаимодействия — уважает отказ, не торопит, не требует подробностей, соблюдает границы; сравнить два вымышленных предложения.",
        "en": "Compare two fictional offers using these criteria: respects refusal, does not rush, does not demand details, and honours boundaries."
      },
      "transfer": {
        "ru": "выбрать, какие вопросы стоит задать человеку/службе до обращения.",
        "en": "Choose questions to ask a person or service before seeking support."
      },
      "artifact": {
        "ru": "два критерия безопасной помощи.",
        "en": "Two criteria for safer help."
      },
      "alternative": {
        "ru": "список профессиональных служб, без личных контактов.",
        "en": "Consider professional-service categories without personal contacts."
      },
      "choices": [
        {
          "ru": "Уважает отказ",
          "en": "Respects refusal"
        },
        {
          "ru": "Не торопит",
          "en": "Does not rush"
        },
        {
          "ru": "Не требует подробностей",
          "en": "Does not demand details"
        },
        {
          "ru": "Соблюдает границы",
          "en": "Honours boundaries"
        }
      ],
      "fields": [
        {
          "ru": "Первый критерий",
          "en": "First criterion"
        },
        {
          "ru": "Второй критерий",
          "en": "Second criterion"
        },
        {
          "ru": "Вопрос перед обращением",
          "en": "A question before seeking help"
        }
      ],
      "scene": {
        "ru": "Предложение А: «Можно обсудить только нужный вопрос и остановиться». Предложение Б: «Расскажите всё прямо сейчас, иначе не помогу». Сравните условия, не выбирая личный контакт.",
        "en": "Offer A: We can discuss only the relevant question and stop. Offer B: Tell me everything now or I will not help. Compare the conditions without choosing a personal contact."
      },
      "newScenario": {
        "ru": "Новая сцена: служба предлагает короткую консультацию, но правила ещё неизвестны. Какие вопросы о праве отказаться и объёме рассказа стоит задать?",
        "en": "New scene: a service offers a short consultation but its rules are unknown. What could be asked about refusal and the amount of detail needed?"
      },
      "probeFields": [
        {
          "ru": "Вопрос о праве остановиться",
          "en": "Question about stopping"
        },
        {
          "ru": "Вопрос о личных подробностях",
          "en": "Question about personal detail"
        }
      ]
    },
    {
      "day": 12,
      "title": {
        "ru": "Я могу попросить поддержку",
        "en": "I can ask for support"
      },
      "sourceHash": "77828351b866ade4b9fd981975176eb822e7a8605f44c86cbadc8b06b42a57cb",
      "practice": {
        "ru": "составить из блоков просьбу «Мне сейчас трудно. Можно…», варианты: информация, тихое присутствие, помощь с задачей, профессиональная консультация.",
        "en": "Build an unsent request: Things are difficult right now; could you… Choose information, quiet company, practical task help or a professional consultation."
      },
      "transfer": {
        "ru": "выбрать резервный адресат типа службы при отказе основного варианта.",
        "en": "Choose a backup type of service if the first support is unavailable."
      },
      "artifact": {
        "ru": "скрипт просьбы и резерв.",
        "en": "A request script and a backup."
      },
      "alternative": {
        "ru": "оставить только письменный шаблон.",
        "en": "Keep only a written template."
      },
      "choices": [
        {
          "ru": "Можно уточнить информацию?",
          "en": "Could I ask for information?"
        },
        {
          "ru": "Можно тихо побыть рядом?",
          "en": "Could you quietly keep me company?"
        },
        {
          "ru": "Можно помочь с одной задачей?",
          "en": "Could you help with one task?"
        },
        {
          "ru": "Можно узнать о консультации?",
          "en": "Could I ask about a consultation?"
        }
      ],
      "fields": [
        {
          "ru": "Начало просьбы",
          "en": "Start of the request"
        },
        {
          "ru": "Вид помощи",
          "en": "Type of help"
        },
        {
          "ru": "Резервный тип службы",
          "en": "Backup type of service"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: персонажу трудно разобраться с обычной анкетой. Можно попросить информацию или помощь с одним пунктом, не раскрывая переживания.",
        "en": "Fictional scene: a character finds an ordinary form difficult. They may ask for information or help with one item without disclosing feelings."
      },
      "newScenario": {
        "ru": "Новая сцена: первый справочный пункт закрыт. Как обратиться к другой подходящей службе без автоматической отправки сообщения?",
        "en": "New scene: the first information desk is closed. How could another suitable service be approached without sending a message automatically?"
      },
      "probeFields": [
        {
          "ru": "Запасной адресат как тип службы",
          "en": "Backup recipient as a type of service"
        },
        {
          "ru": "Черновик просьбы без личных данных",
          "en": "Request draft without personal data"
        }
      ]
    },
    {
      "day": 13,
      "title": {
        "ru": "Я выбираю первую помощь себе в новой ситуации",
        "en": "I choose my first support in a new situation"
      },
      "sourceHash": "b56d953bc7b1ea5e98ef3530b7d8313cdf4bd877a72fa10fccd105dade0b7247",
      "practice": {
        "ru": "на незнакомой учебной сцене выбрать одно: внешняя ориентировка, смена условий, пауза, граница, помощь. Затем по желанию выполнить короткую пробу.",
        "en": "In an unfamiliar everyday scene, choose external orientation, a change of conditions, a pause, a boundary or help. A brief attempt is optional."
      },
      "transfer": {
        "ru": "поменять решение, если первый вариант не подходит.",
        "en": "Change the decision if the first option does not fit."
      },
      "artifact": {
        "ru": "«Что предпочитаю делать сначала».",
        "en": "What I prefer to try first."
      },
      "alternative": {
        "ru": "выбрать отдых и завершение.",
        "en": "Choose rest and finish."
      },
      "choices": [
        {
          "ru": "Внешний ориентир",
          "en": "An external anchor"
        },
        {
          "ru": "Изменить условия",
          "en": "Change conditions"
        },
        {
          "ru": "Пауза",
          "en": "Pause"
        },
        {
          "ru": "Граница",
          "en": "A boundary"
        },
        {
          "ru": "Помощь",
          "en": "Help"
        }
      ],
      "fields": [
        {
          "ru": "Первый выбранный вариант",
          "en": "First chosen option"
        },
        {
          "ru": "Что позволит остановиться",
          "en": "What allows stopping"
        },
        {
          "ru": "Если вариант не подходит",
          "en": "If the option does not fit"
        }
      ],
      "scene": {
        "ru": "Незнакомая учебная сцена: вы пришли раньше в читальный зал; на столе лежит длинная инструкция, её можно отложить. Выберите доступную первую поддержку.",
        "en": "Unfamiliar fictional scene: you arrive early in a reading room. A long instruction is on the table and may be set aside. Choose an available first support."
      },
      "newScenario": {
        "ru": "Новая сцена: в другой комнате выбранный стол занят. Как изменить первый вариант, сохранив возможность закончить?",
        "en": "New scene: in another room the chosen table is occupied. How could the first option change while keeping the option to finish?"
      },
      "probeFields": [
        {
          "ru": "Что перестало подходить",
          "en": "What no longer fits"
        },
        {
          "ru": "Другое решение или отдых",
          "en": "Another choice or rest"
        }
      ]
    },
    {
      "day": 14,
      "title": {
        "ru": "Моя карта безопасности и первой опоры",
        "en": "My safety and first-support map"
      },
      "sourceHash": "9c116b892ecfc33d0bc4a4dc749e4989a7bc6621963d3dba51d83d6a23c4ec9e",
      "practice": {
        "ru": "составить карту из 4 полей «мой ориентир → моя граница → моя опора → запасной маршрут помощи», используя лишь реально выбранные варианты.",
        "en": "Build four optional fields from choices actually made: my anchor, my boundary, my support and a backup route to help."
      },
      "transfer": {
        "ru": "прокрутить вымышленную ситуацию по карте без драматизации.",
        "en": "Use the map in a fictional everyday situation without dramatisation."
      },
      "artifact": {
        "ru": "личная карточка К1.",
        "en": "My course 1 support card."
      },
      "alternative": {
        "ru": "готовый нейтральный шаблон без собственных деталей.",
        "en": "Use a neutral template with no personal details."
      },
      "choices": [
        {
          "ru": "Внешний ориентир",
          "en": "An external anchor"
        },
        {
          "ru": "Моя граница",
          "en": "My boundary"
        },
        {
          "ru": "Доступная опора",
          "en": "Available support"
        },
        {
          "ru": "Резервный маршрут помощи",
          "en": "A backup route to help"
        }
      ],
      "fields": [
        {
          "ru": "Мой ориентир",
          "en": "My anchor"
        },
        {
          "ru": "Моя граница",
          "en": "My boundary"
        },
        {
          "ru": "Моя опора",
          "en": "My support"
        },
        {
          "ru": "Запасной маршрут помощи",
          "en": "Backup route to help"
        }
      ],
      "scene": {
        "ru": "Соберите только доступные звенья карты; пустое поле допустимо. Карта — черновик до отдельного действия сохранения.",
        "en": "Include only available links in the map; blank fields are allowed. The map remains a draft until a separate save action."
      },
      "newScenario": {
        "ru": "Новая сцена: в общественном зале поменяли порядок очереди; рядом видна стойка, можно отойти и спросить информацию. Как пройти по карте, если первая опора недоступна?",
        "en": "New scene: the queue arrangement in a public hall has changed. A counter is visible; stepping away and asking for information are possible. How could the map be used if the first support is unavailable?"
      },
      "probeFields": [
        {
          "ru": "Ориентир новой сцены",
          "en": "Anchor in the new scene"
        },
        {
          "ru": "Пауза или отказ",
          "en": "Pause or refusal"
        },
        {
          "ru": "Доступный резерв помощи/отдыха",
          "en": "Available help or rest backup"
        }
      ]
    }
  ],
  "AS3": [
    {
      "day": 1,
      "title": {
        "ru": "Мне разрешено чувствовать по-разному",
        "en": "I may feel in different ways"
      },
      "sourceHash": "287f385efca3a959fce298b71e3733abffc7bed7959525b9ff609b34b1caa168",
      "practice": {
        "ru": "на спокойных сценках выбрать слова «радость, грусть, тревога, злость, растерянность, нейтрально, не знаю» и отметить, что однозначного ответа может не быть.",
        "en": "For quiet fictional scenes, choose joy, sadness, anxiety, anger, confusion, neutral or not sure. There need not be one clear answer."
      },
      "transfer": {
        "ru": "назвать возможное чувство другого вымышленного героя.",
        "en": "Name a possible feeling for a different fictional person."
      },
      "artifact": {
        "ru": "личный словарь из 2–3 приемлемых слов или «не знаю».",
        "en": "Two or three acceptable feeling words, or not sure."
      },
      "alternative": {
        "ru": "только работа с персонажем.",
        "en": "Work only with fictional characters."
      },
      "choices": [
        {
          "ru": "Радость",
          "en": "Joy"
        },
        {
          "ru": "Грусть",
          "en": "Sadness"
        },
        {
          "ru": "Тревога",
          "en": "Anxiety"
        },
        {
          "ru": "Злость",
          "en": "Anger"
        },
        {
          "ru": "Растерянность",
          "en": "Confusion"
        },
        {
          "ru": "Нейтрально",
          "en": "Neutral"
        },
        {
          "ru": "Не знаю",
          "en": "Not sure"
        }
      ],
      "fields": [
        {
          "ru": "Возможное слово для героя",
          "en": "Possible word for the character"
        },
        {
          "ru": "Другое допустимое слово",
          "en": "Another acceptable word"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: Оля получила приглашение на необязательную выставку. Её чувства неизвестны; возможны разные слова или «не знаю».",
        "en": "Fictional scene: Olya receives an invitation to an optional exhibition. Her feelings are unknown; different words or not sure may fit."
      },
      "newScenario": {
        "ru": "Новая сцена: Рома завершил обычный рисунок и убирает карандаши. Назовите возможное чувство или осознанно выберите «не знаю».",
        "en": "New scene: Roma finishes an ordinary drawing and puts the pencils away. Name a possible feeling or deliberately choose not sure."
      },
      "probeFields": [
        {
          "ru": "Чувство другого героя или «не знаю»",
          "en": "The other character’s feeling or not sure"
        }
      ]
    },
    {
      "day": 2,
      "title": {
        "ru": "У одного события могут быть разные чувства",
        "en": "One event can bring different feelings"
      },
      "sourceHash": "297e8ec0a457cd2af902283ec879317495375f1987ffb325d5de1951d2b09da2",
      "practice": {
        "ru": "в рассказе о неожиданном приглашении расположить две разные эмоции одновременно, например любопытство и осторожность; сравнить два возможных ответа.",
        "en": "In a story about an unexpected invitation, place two possible feelings together, such as curiosity and caution, and compare two possible responses."
      },
      "transfer": {
        "ru": "самостоятельно назвать альтернативную эмоцию в новой сцене.",
        "en": "Name an alternative emotion in a new scene."
      },
      "artifact": {
        "ru": "карта «оба чувства могут быть правдой».",
        "en": "Both feelings may be true."
      },
      "alternative": {
        "ru": "готовые варианты без ответа о себе.",
        "en": "Use ready-made options without answering about yourself."
      },
      "choices": [
        {
          "ru": "Любопытство и осторожность",
          "en": "Curiosity and caution"
        },
        {
          "ru": "Радость и растерянность",
          "en": "Joy and confusion"
        },
        {
          "ru": "Нейтрально и интерес",
          "en": "Neutral and interested"
        },
        {
          "ru": "Не знаю",
          "en": "Not sure"
        }
      ],
      "fields": [
        {
          "ru": "Первое возможное чувство",
          "en": "First possible feeling"
        },
        {
          "ru": "Второе возможное чувство",
          "en": "Second possible feeling"
        },
        {
          "ru": "Один возможный ответ",
          "en": "One possible response"
        },
        {
          "ru": "Другой возможный ответ",
          "en": "Another possible response"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: Нину неожиданно пригласили на открытое занятие. Она может одновременно интересоваться и хотеть уточнить условия.",
        "en": "Fictional scene: Nina is unexpectedly invited to an open class. She may be interested and also want to clarify the conditions."
      },
      "newScenario": {
        "ru": "Новая сцена: Макс узнал, что библиотека начала выдавать новый вид книг. Какие два разных чувства возможны без единственно верного ответа?",
        "en": "New scene: Max learns that the library now lends a new kind of book. Which two different feelings are possible without one correct answer?"
      },
      "probeFields": [
        {
          "ru": "Одна возможная эмоция",
          "en": "One possible emotion"
        },
        {
          "ru": "Альтернативная эмоция",
          "en": "An alternative emotion"
        }
      ]
    },
    {
      "day": 3,
      "title": {
        "ru": "Как понять, насколько сильное чувство",
        "en": "Noticing how strong a feeling is"
      },
      "sourceHash": "e9fe2989c7a2f058c8f5e6d9f38b5657370828a7320c59a650f9db7ed6d1b7b1",
      "practice": {
        "ru": "мягкая шкала 0–10 для эмоции персонажа; выбрать, где нужна пауза и внешняя опора.",
        "en": "Use low, moderate or high intensity, or an optional 0–10 scale, for a fictional character’s emotion. Choose a point for pausing and an external anchor; do not provoke your own anxiety."
      },
      "transfer": {
        "ru": "другой сюжет с другой эмоцией.",
        "en": "Consider another story with a different emotion."
      },
      "artifact": {
        "ru": "свой ориентир «когда лучше не углубляться».",
        "en": "An optional sign to stop rather than go deeper."
      },
      "alternative": {
        "ru": "словесные категории вместо цифр.",
        "en": "Use words instead of numbers."
      },
      "choices": [
        {
          "ru": "Низкая интенсивность",
          "en": "Low intensity"
        },
        {
          "ru": "Умеренная интенсивность",
          "en": "Moderate intensity"
        },
        {
          "ru": "Высокая: можно выбрать паузу",
          "en": "High: a pause is available"
        },
        {
          "ru": "Не определять интенсивность",
          "en": "Leave intensity unspecified"
        }
      ],
      "fields": [
        {
          "ru": "Словесная интенсивность героя",
          "en": "The character’s intensity in words"
        },
        {
          "ru": "Когда выбрать паузу",
          "en": "When to choose a pause"
        },
        {
          "ru": "Внешний ориентир",
          "en": "External anchor"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: Илья слегка разочарован, что обычный журнал пока не привезли. Можно использовать словесную категорию, не оценивая себя.",
        "en": "Fictional scene: Ilya is slightly disappointed that an ordinary magazine has not arrived. Use a word category without rating yourself."
      },
      "newScenario": {
        "ru": "Новая сцена: Зоя заинтересовалась новой головоломкой, но хочет прерваться. Как описать интенсивность интереса и оставить право на паузу?",
        "en": "New scene: Zoya is interested in a new puzzle but wants a break. How could the intensity of interest be described while keeping the right to pause?"
      },
      "probeFields": [
        {
          "ru": "Интенсивность другой эмоции",
          "en": "Intensity of the other emotion"
        },
        {
          "ru": "Пауза и внешний ориентир",
          "en": "Pause and external anchor"
        }
      ]
    },
    {
      "day": 4,
      "title": {
        "ru": "Я могу выбрать дистанцию от переживания",
        "en": "I can choose distance from a feeling"
      },
      "sourceHash": "2f1f80996eb1c91a272d8b61495376fa30c16da242117a24082f574d1f58c1b8",
      "practice": {
        "ru": "для нейтрального или слегка окрашенного чувства выбрать «заметить на секунду / посмотреть вокруг / отдохнуть»; внимание направляется по разрешению самого участника.",
        "en": "For a neutral or mildly coloured feeling, choose noticing briefly, looking around or resting. Participation and attention remain your choice."
      },
      "transfer": {
        "ru": "самому выбрать удобное расстояние в новой истории.",
        "en": "Choose a comfortable distance in a new story."
      },
      "artifact": {
        "ru": "сценарий «если много — вернуться к внешнему предмету».",
        "en": "If it is too much, return to an external object."
      },
      "alternative": {
        "ru": "только наблюдать картинку, не фокусироваться на эмоциях.",
        "en": "Only observe a neutral picture or its text description without focusing on emotion."
      },
      "choices": [
        {
          "ru": "Заметить на секунду",
          "en": "Notice briefly"
        },
        {
          "ru": "Посмотреть вокруг",
          "en": "Look around"
        },
        {
          "ru": "Отдохнуть",
          "en": "Rest"
        },
        {
          "ru": "Остаться только с описанием предмета",
          "en": "Stay with an object description only"
        }
      ],
      "fields": [
        {
          "ru": "Допустимая дистанция",
          "en": "A workable distance"
        },
        {
          "ru": "Внешний предмет для возвращения",
          "en": "External object to return to"
        },
        {
          "ru": "Право закончить",
          "en": "Option to finish"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: герой немного растерялся при выборе блокнота. Можно оставить чувство без разбора и посмотреть на полку.",
        "en": "Fictional scene: a character feels a little unsure choosing a notebook. The feeling may be left unexplored while looking at a shelf."
      },
      "newScenario": {
        "ru": "Новая сцена: Мила выбирает между двумя открытками и не хочет обсуждать чувства. Какую дистанцию и внешнюю опору можно выбрать?",
        "en": "New scene: Mila is choosing between two postcards and does not want to discuss feelings. What distance and external anchor are available?"
      },
      "probeFields": [
        {
          "ru": "Дистанция для Милы",
          "en": "Distance for Mila"
        },
        {
          "ru": "Внешний ориентир или отдых",
          "en": "External anchor or rest"
        }
      ]
    },
    {
      "day": 5,
      "title": {
        "ru": "Чувство, мысль и действие — разные вещи",
        "en": "Feeling, thought and action are different"
      },
      "sourceHash": "11a595630eaa1426d19d033d787b38ebbbfa6083144dc3fd279bd375a1efd4ab",
      "practice": {
        "ru": "в учебном комиксе рассортировать фразы «мне обидно», «меня не уважают» и «я могу попросить время» по категориям чувство/предположение/действие.",
        "en": "Sort I feel hurt, they do not respect me and I can ask for time into feeling, assumption and action in a fictional comic or its text equivalent."
      },
      "transfer": {
        "ru": "другая короткая сцена без подсказок.",
        "en": "Try another short scene with less guidance."
      },
      "artifact": {
        "ru": "мини-схема различения.",
        "en": "A small distinction map: feeling, assumption, action."
      },
      "alternative": {
        "ru": "карточки вымышленного героя.",
        "en": "Use cards about a fictional character."
      },
      "choices": [
        {
          "ru": "«Мне обидно» → чувство",
          "en": "I feel hurt → feeling"
        },
        {
          "ru": "«Меня не уважают» → предположение",
          "en": "They do not respect me → assumption"
        },
        {
          "ru": "«Я могу попросить время» → действие",
          "en": "I can ask for time → action"
        }
      ],
      "fields": [
        {
          "ru": "Чувство",
          "en": "Feeling"
        },
        {
          "ru": "Предположение",
          "en": "Assumption"
        },
        {
          "ru": "Доступное действие",
          "en": "Available action"
        }
      ],
      "scene": {
        "ru": "Учебная сценка: ответ на предложение героя задержался. Карточки: «мне обидно», «меня не уважают», «я могу попросить время». Причина задержки неизвестна.",
        "en": "Fictional scene: a reply to a character’s suggestion is delayed. Cards: I feel hurt, they do not respect me, I can ask for time. The reason for the delay is unknown."
      },
      "newScenario": {
        "ru": "Новая сцена: встречу перенесли. Карточки: «я разочарован», «моё время никому не важно», «уточню новый срок». Разделите чувство, предположение и действие.",
        "en": "New scene: a meeting is rescheduled. Cards: I feel disappointed, my time matters to nobody, I can ask about the new time. Separate feeling, assumption and action."
      },
      "probeFields": [
        {
          "ru": "Чувство в новой сцене",
          "en": "Feeling in the new scene"
        },
        {
          "ru": "Предположение в новой сцене",
          "en": "Assumption in the new scene"
        },
        {
          "ru": "Действие в новой сцене",
          "en": "Action in the new scene"
        }
      ]
    },
    {
      "day": 6,
      "title": {
        "ru": "Чувства могут меняться, и это нормально",
        "en": "Feelings can change or stay"
      },
      "sourceHash": "e6e2531ce72164aeda82790985881500d14839f906941d0da521b3f9f0f69b2f",
      "practice": {
        "ru": "выбрать несколько правдоподобных продолжений спокойной истории: усталость меняется на интерес или сохраняется; нет «правильного» эмоционального финала.",
        "en": "Choose plausible endings to a quiet story: tiredness changes to interest or remains. There is no required emotional ending."
      },
      "transfer": {
        "ru": "указать нейтральное действие независимо от эмоционального исхода.",
        "en": "Choose a neutral action regardless of the emotional outcome."
      },
      "artifact": {
        "ru": "фраза «мне не нужно специально менять чувство».",
        "en": "I do not have to deliberately change a feeling."
      },
      "alternative": {
        "ru": "читать без интерактива.",
        "en": "Read without interacting."
      },
      "choices": [
        {
          "ru": "Усталость сохранилась",
          "en": "Tiredness remains"
        },
        {
          "ru": "Появился интерес",
          "en": "Interest appears"
        },
        {
          "ru": "Чувства смешанные",
          "en": "Feelings are mixed"
        },
        {
          "ru": "Исход неизвестен",
          "en": "The outcome is unknown"
        }
      ],
      "fields": [
        {
          "ru": "Первое правдоподобное продолжение",
          "en": "First plausible continuation"
        },
        {
          "ru": "Другое правдоподобное продолжение",
          "en": "Another plausible continuation"
        },
        {
          "ru": "Действие без требования изменить чувство",
          "en": "Action without requiring emotional change"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: герой устал и открывает короткий рассказ. Интерес может появиться или не появиться; закрыть книгу можно в любом случае.",
        "en": "Fictional scene: a tired character opens a short story. Interest may or may not appear; closing the book is allowed either way."
      },
      "newScenario": {
        "ru": "Новая сцена: у Ани смешанные чувства перед выбором комнатного растения. Какое обычное действие доступно, даже если чувства не изменятся?",
        "en": "New scene: Anya has mixed feelings about choosing a houseplant. What ordinary action is available even if the feelings stay the same?"
      },
      "probeFields": [
        {
          "ru": "Нейтральное действие",
          "en": "Neutral action"
        },
        {
          "ru": "Право сохранить прежнее чувство",
          "en": "Permission for the feeling to remain"
        }
      ]
    },
    {
      "day": 7,
      "title": {
        "ru": "Я замечаю эмоцию, но не обязан(а) усиливать её",
        "en": "I can notice a feeling without intensifying it"
      },
      "sourceHash": "8fe531edb49a32978bf204b7d5c1fdbacbdf2be17476855bd3643aa000a2c5d9",
      "practice": {
        "ru": "выбрать комфортное слово для текущей мягкой эмоции ИЛИ работать с чувствами персонажа; затем добровольно переключиться на нейтральный внешний ориентир.",
        "en": "Choose a comfortable word for a mild current feeling, or use a fictional character’s feeling. Then optionally shift attention to a neutral external anchor."
      },
      "transfer": {
        "ru": "повторить переключение с меньшей подсказкой в другой нейтральной обстановке.",
        "en": "Try switching in another neutral setting with less guidance."
      },
      "artifact": {
        "ru": "отмеченный личный предел приемлемости.",
        "en": "My chosen limit of participation."
      },
      "alternative": {
        "ru": "полностью внешняя ориентировка.",
        "en": "Use external orientation only."
      },
      "choices": [
        {
          "ru": "Слово для мягкого чувства по желанию",
          "en": "A word for a mild feeling, if wanted"
        },
        {
          "ru": "Только чувство персонажа",
          "en": "Only the character’s feeling"
        },
        {
          "ru": "Сразу внешний ориентир",
          "en": "Go straight to an external anchor"
        }
      ],
      "fields": [
        {
          "ru": "Допустимое слово или пропуск",
          "en": "A workable word or no word"
        },
        {
          "ru": "Внешний ориентир",
          "en": "External anchor"
        },
        {
          "ru": "Мой предел участия",
          "en": "My participation limit"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: герой слегка удивился новой обложке книги. Можно назвать слово или сразу описать край стола.",
        "en": "Fictional scene: a character is mildly surprised by a new book cover. Naming a word or describing the table edge directly are both options."
      },
      "newScenario": {
        "ru": "Новая сцена: на полке появился незнакомый блокнот. При желании назовите мягкое чувство героя, затем выберите внешнюю деталь полки; эмоциональный шаг можно пропустить.",
        "en": "New scene: an unfamiliar notebook appears on a shelf. If wanted, name the character’s mild feeling and choose an external shelf detail; the emotion step may be skipped."
      },
      "probeFields": [
        {
          "ru": "Слово или отказ от эмоционального шага",
          "en": "A word or declining the emotion step"
        },
        {
          "ru": "Выбранная внешняя деталь",
          "en": "Chosen external detail"
        }
      ]
    },
    {
      "day": 8,
      "title": {
        "ru": "Мой путь обратно к опоре",
        "en": "My route back to support"
      },
      "sourceHash": "4a1672dbc9765399276fa092586d7adfaf098464d27aa7de64818191a5074758",
      "practice": {
        "ru": "в упражнении «эмоция героя → пауза → нейтральная деталь комнаты» участник самостоятельно регулирует длительность и может закончить на любом шаге.",
        "en": "Explore character’s emotion, pause, neutral room detail. You control the duration and may finish at any step."
      },
      "transfer": {
        "ru": "выбрать иной безопасный выход — текст, предмет, просьба о поддержке.",
        "en": "Choose another safe exit: text, an object or a request for support."
      },
      "artifact": {
        "ru": "личный план мягкого возвращения.",
        "en": "A flexible return-to-support plan."
      },
      "alternative": {
        "ru": "не начинать эмоциональный шаг, сразу выбрать опору.",
        "en": "Skip the emotion step and start with an external support."
      },
      "choices": [
        {
          "ru": "Пауза после слова об эмоции",
          "en": "Pause after the feeling word"
        },
        {
          "ru": "Сразу деталь комнаты",
          "en": "Go directly to a room detail"
        },
        {
          "ru": "Текст вместо эмоционального шага",
          "en": "Text instead of the emotion step"
        },
        {
          "ru": "Просьба о поддержке",
          "en": "A request for support"
        }
      ],
      "fields": [
        {
          "ru": "Необязательный эмоциональный шаг",
          "en": "Optional emotion step"
        },
        {
          "ru": "Как остановиться",
          "en": "How to stop"
        },
        {
          "ru": "Нейтральная деталь комнаты",
          "en": "Neutral room detail"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: герой немного огорчён, что открытка закончилась. Последовательность можно начать с паузы или с описания стола.",
        "en": "Fictional scene: a character is mildly disappointed that a postcard is unavailable. The sequence may start with a pause or with describing the table."
      },
      "newScenario": {
        "ru": "Новая сцена: в комнате нельзя удобно смотреть на выбранный предмет. Что выбрать вместо него: короткий текст, другую внешнюю деталь или просьбу о поддержке?",
        "en": "New scene: the chosen object is awkward to view. What could replace it: a short text, another external detail or a request for support?"
      },
      "probeFields": [
        {
          "ru": "Другой безопасный выход",
          "en": "Another safe exit"
        },
        {
          "ru": "Момент завершения",
          "en": "A point to finish"
        }
      ]
    },
    {
      "day": 9,
      "title": {
        "ru": "О чём чувство может сообщать",
        "en": "What a feeling might suggest"
      },
      "sourceHash": "b425694047f030ea85ad0e1ed2eb8ad654966b6f369bd0a0d2267afa85477619",
      "practice": {
        "ru": "сопоставить усталость героя с отдыхом, тревогу — с информацией/поддержкой, досаду — с границей; допустимы несколько объяснений.",
        "en": "Pair a character’s tiredness with possible rest, anxiety with information or support, and frustration with a possible boundary. Several explanations may fit; emotions are not diagnostic labels."
      },
      "transfer": {
        "ru": "выбрать другую возможную потребность того же героя.",
        "en": "Choose another possible need for the same character."
      },
      "artifact": {
        "ru": "карточка «чувство может говорить о…».",
        "en": "A feeling might be connected with…"
      },
      "alternative": {
        "ru": "готовый набор вариантов.",
        "en": "Use ready-made options."
      },
      "choices": [
        {
          "ru": "Усталость → возможный отдых",
          "en": "Tiredness → possible rest"
        },
        {
          "ru": "Тревога → информация или поддержка",
          "en": "Anxiety → information or support"
        },
        {
          "ru": "Досада → возможная граница",
          "en": "Frustration → a possible boundary"
        },
        {
          "ru": "Причина неизвестна",
          "en": "The reason is unknown"
        }
      ],
      "fields": [
        {
          "ru": "Чувство героя",
          "en": "Character’s feeling"
        },
        {
          "ru": "Одна возможная потребность",
          "en": "One possible need"
        },
        {
          "ru": "Другая возможная потребность",
          "en": "Another possible need"
        }
      ],
      "scene": {
        "ru": "Учебные карточки: герой устал после обычного дня, тревожится из-за неясного расписания или досадует на повторную просьбу. Связь с потребностью — предположение.",
        "en": "Fictional cards: a character is tired after an ordinary day, anxious about an unclear timetable or frustrated by a repeated request. Any link to a need is tentative."
      },
      "newScenario": {
        "ru": "Новая сцена: персонаж тревожится перед новой библиотечной процедурой. Кроме информации, какая поддержка может быть уместной без утверждения причины чувства?",
        "en": "New scene: a character is anxious about a new library procedure. Apart from information, what support might fit without claiming to know the cause?"
      },
      "probeFields": [
        {
          "ru": "Другой возможный ответ на потребность",
          "en": "Another possible response to a need"
        },
        {
          "ru": "Что остаётся неизвестным",
          "en": "What remains unknown"
        }
      ]
    },
    {
      "day": 10,
      "title": {
        "ru": "Как поддержать себя, когда есть чувство",
        "en": "Supporting myself when a feeling is present"
      },
      "sourceHash": "eeba09112839ac2beb64ba94886f852ab1d946716033344ed68aed0d9056736f",
      "practice": {
        "ru": "конструктор «я замечаю … → сейчас мне может помочь …»: отдых, пауза, внешняя ориентировка, мягкая фраза, разговор с безопасным человеком; выбор не обязан облегчить эмоцию.",
        "en": "Build I notice…; what may help now is… Choose rest, a pause, external orientation, a gentle phrase or a safe conversation. Relief is not required."
      },
      "transfer": {
        "ru": "подобрать помощь другой эмоции в новом сюжете.",
        "en": "Choose support for a different feeling in a new story."
      },
      "artifact": {
        "ru": "«моя допустимая форма поддержки».",
        "en": "An acceptable form of support."
      },
      "alternative": {
        "ru": "готовая фраза для героя.",
        "en": "Use a ready-made phrase for a character."
      },
      "choices": [
        {
          "ru": "Отдых или пауза",
          "en": "Rest or a pause"
        },
        {
          "ru": "Внешняя ориентировка",
          "en": "External orientation"
        },
        {
          "ru": "Мягкая реалистичная фраза",
          "en": "A gentle realistic phrase"
        },
        {
          "ru": "Разговор с безопасным человеком",
          "en": "A conversation with a safe person"
        }
      ],
      "fields": [
        {
          "ru": "Я замечаю…",
          "en": "I notice…"
        },
        {
          "ru": "Сейчас может помочь…",
          "en": "What may help now…"
        },
        {
          "ru": "Если помощь не подходит",
          "en": "If the support does not fit"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: персонаж растерялся, выбирая обычный подарок. Можно заметить растерянность и оставить паузу без требования облегчения.",
        "en": "Fictional scene: a character feels unsure choosing an ordinary gift. They may notice uncertainty and allow a pause without requiring relief."
      },
      "newScenario": {
        "ru": "Новая сцена: другой герой слегка раздосадован изменением времени кружка. Какая поддержка возможна для этой эмоции?",
        "en": "New scene: another character is mildly frustrated by a class time change. What support is available for this feeling?"
      },
      "probeFields": [
        {
          "ru": "Другая эмоция",
          "en": "The other feeling"
        },
        {
          "ru": "Подходящий бережный ответ",
          "en": "A fitting gentle response"
        }
      ]
    },
    {
      "day": 11,
      "title": {
        "ru": "Злость может подсказать границу",
        "en": "Anger may point towards a boundary"
      },
      "sourceHash": "3a11c68707be56a7825f92aecf64690924e6d5c59a68638198687e769dec0d40",
      "practice": {
        "ru": "на вымышленной истории о нарушенном расписании разделить эмоцию, возможную потребность и уважительную границу.",
        "en": "In a fictional story about a disrupted schedule, separate the emotion, a possible need and a respectful boundary. No strong anger needs to be provoked, suppressed or expressed."
      },
      "transfer": {
        "ru": "выбрать из фраз «мне нужен перерыв / этот вариант не подходит / вернёмся позже».",
        "en": "Choose I need a break, this option does not fit, or let us return later."
      },
      "artifact": {
        "ru": "один безопасный способ обозначить границу.",
        "en": "One safe boundary phrase."
      },
      "alternative": {
        "ru": "карточка, без ролевого напряжения.",
        "en": "Use a card without role-play pressure."
      },
      "choices": [
        {
          "ru": "Мне нужен перерыв",
          "en": "I need a break"
        },
        {
          "ru": "Этот вариант не подходит",
          "en": "This option does not fit"
        },
        {
          "ru": "Вернёмся позже",
          "en": "Let us return later"
        }
      ],
      "fields": [
        {
          "ru": "Эмоция в истории",
          "en": "Emotion in the story"
        },
        {
          "ru": "Возможная потребность",
          "en": "Possible need"
        },
        {
          "ru": "Уважительная граница",
          "en": "Respectful boundary"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: время необязательной встречи поменяли без предупреждения. Персонаж раздражён; его реакция не обязывает к действию.",
        "en": "Fictional scene: an optional meeting time changes without notice. The character is irritated; the emotion does not require an action."
      },
      "newScenario": {
        "ru": "Новая сцена: знакомый снова просит уделить время, когда герой запланировал отдых. Какую уважительную фразу выбрать?",
        "en": "New scene: an acquaintance asks for time again when the character has planned rest. Which respectful phrase fits?"
      },
      "probeFields": [
        {
          "ru": "Граница в новой сцене",
          "en": "Boundary in the new scene"
        },
        {
          "ru": "Право на перерыв",
          "en": "Option to take a break"
        }
      ]
    },
    {
      "day": 12,
      "title": {
        "ru": "Когда появляется стыд или вина",
        "en": "When shame or guilt appears"
      },
      "sourceHash": "308c48dc6558d180aa7b71ea9dbd49b4dedb2f358601ceace688bbeee84b30ce",
      "practice": {
        "ru": "в нетравматической истории персонаж ошибся; выбрать между «я плохой целиком», «я сделал ошибку» и «нужна поддержка/исправление»; без навязывания моральной оценки.",
        "en": "In a non-traumatic fictional mistake, compare I am entirely bad, I made a mistake and support or repair may help. Separate the action from the person without imposing a moral judgement."
      },
      "transfer": {
        "ru": "бережная фраза для другого героя.",
        "en": "Choose a gentle phrase for another character."
      },
      "artifact": {
        "ru": "«я могу отличать поступок от ценности личности».",
        "en": "An action can be distinguished from a person’s worth."
      },
      "alternative": {
        "ru": "наблюдать варианты без самоописания.",
        "en": "Observe the options without describing yourself."
      },
      "choices": [
        {
          "ru": "Я сделал ошибку",
          "en": "I made a mistake"
        },
        {
          "ru": "Можно исправить доступную часть",
          "en": "A manageable part may be repaired"
        },
        {
          "ru": "Можно попросить поддержку",
          "en": "Support may be requested"
        },
        {
          "ru": "Не давать оценку человеку целиком",
          "en": "Do not judge the whole person"
        }
      ],
      "fields": [
        {
          "ru": "Что сделал герой",
          "en": "What the character did"
        },
        {
          "ru": "Что можно исправить, если доступно",
          "en": "What can be repaired, if possible"
        },
        {
          "ru": "Фраза без оценки личности",
          "en": "A phrase without judging the person"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: герой перепутал дату возврата обычной книги. Карточки противопоставляют «я плохой целиком» конкретному факту ошибки и доступной помощи.",
        "en": "Fictional scene: a character mixes up an ordinary library return date. Cards compare I am entirely bad with the specific mistake and available support."
      },
      "newScenario": {
        "ru": "Новая сцена: другой герой указал неверный номер страницы в списке. Как назвать поступок и выбрать бережную фразу без глобальной оценки?",
        "en": "New scene: another character writes the wrong page number in a list. How could the action be named and a gentle phrase chosen without judging the whole person?"
      },
      "probeFields": [
        {
          "ru": "Конкретный поступок",
          "en": "The specific action"
        },
        {
          "ru": "Бережная фраза другому герою",
          "en": "Gentle phrase for the other character"
        }
      ]
    },
    {
      "day": 13,
      "title": {
        "ru": "Выбираю ответ, а не борюсь с чувством",
        "en": "I can choose a response without fighting the feeling"
      },
      "sourceHash": "6147810657addcdf09960e6bef286eeca31559bc9ca4b74397596a6d55cf5946",
      "practice": {
        "ru": "в новой бытовой сцене самостоятельно выбрать возможную эмоцию, её допустимую интенсивность, потребность и способ ответа с доступной внешней опорой.",
        "en": "In a new everyday scene, choose a possible emotion, a workable intensity, a possible need and a response with an available external anchor."
      },
      "transfer": {
        "ru": "изменить решение, если оно не подошло.",
        "en": "Revise the choice if it does not fit."
      },
      "artifact": {
        "ru": "индивидуальная короткая последовательность.",
        "en": "A short optional response sequence."
      },
      "alternative": {
        "ru": "сценарий только для персонажа.",
        "en": "Work only with a fictional character."
      },
      "choices": [
        {
          "ru": "Назвать возможную эмоцию",
          "en": "Name a possible emotion"
        },
        {
          "ru": "Выбрать дистанцию и паузу",
          "en": "Choose distance and a pause"
        },
        {
          "ru": "Найти возможную потребность",
          "en": "Consider a possible need"
        },
        {
          "ru": "Выбрать ответ и внешнюю опору",
          "en": "Choose a response and external anchor"
        }
      ],
      "fields": [
        {
          "ru": "Возможная эмоция или «не знаю»",
          "en": "Possible emotion or not sure"
        },
        {
          "ru": "Словесная интенсивность и дистанция",
          "en": "Intensity in words and distance"
        },
        {
          "ru": "Возможная потребность",
          "en": "Possible need"
        },
        {
          "ru": "Ответ и внешняя опора",
          "en": "Response and external anchor"
        }
      ],
      "scene": {
        "ru": "Новая бытовая сцена: объявление о небольшом мастер-классе изменилось. Герой может не знать своих чувств, проверить информацию, отдохнуть или выбрать границу.",
        "en": "New everyday scene: an announcement for a small workshop has changed. The character may be unsure of feelings, check information, rest or choose a boundary."
      },
      "newScenario": {
        "ru": "Другая сцена: выбранный информационный стенд недоступен. Как пересмотреть последовательность, если уточнить расписание сейчас нельзя?",
        "en": "Different scene: the chosen information board is unavailable. How could the sequence change if the schedule cannot be checked now?"
      },
      "probeFields": [
        {
          "ru": "Что в первом ответе не подошло",
          "en": "What did not fit in the first response"
        },
        {
          "ru": "Другой ответ или пауза",
          "en": "Another response or a pause"
        }
      ]
    },
    {
      "day": 14,
      "title": {
        "ru": "Моя карта эмоциональной поддержки",
        "en": "My emotional-support map"
      },
      "sourceHash": "9d6c1505059476cf8bbb686972e12ecbb9df33577f9027dd100ddf16dd46951c",
      "practice": {
        "ru": "собрать карту «как узнаю чувство → когда нужна пауза → что может быть нужно → какая поддержка или граница доступна».",
        "en": "Build an optional map: how I recognise a feeling, when a pause is needed, what may be needed, and what support or boundary is available."
      },
      "transfer": {
        "ru": "использовать карту на безопасной сценке самостоятельно.",
        "en": "Use the map in a safe fictional scene with less guidance."
      },
      "artifact": {
        "ru": "карточка К3.",
        "en": "My course 3 emotional-support card."
      },
      "alternative": {
        "ru": "шаблон без чувств или личных деталей.",
        "en": "Use a template without feelings or personal details."
      },
      "choices": [
        {
          "ru": "Узнать чувство или выбрать «не знаю»",
          "en": "Name a feeling or choose not sure"
        },
        {
          "ru": "Оставить паузу",
          "en": "Keep a pause available"
        },
        {
          "ru": "Отметить возможную потребность",
          "en": "Note a possible need"
        },
        {
          "ru": "Выбрать поддержку или границу",
          "en": "Choose support or a boundary"
        }
      ],
      "fields": [
        {
          "ru": "Как узнаю чувство",
          "en": "How I recognise a feeling"
        },
        {
          "ru": "Когда нужна пауза",
          "en": "When a pause is needed"
        },
        {
          "ru": "Что может быть нужно",
          "en": "What may be needed"
        },
        {
          "ru": "Доступная поддержка или граница",
          "en": "Available support or boundary"
        }
      ],
      "scene": {
        "ru": "Соберите только подходящие поля карты. Слова о чувстве необязательны; можно начать с внешнего ориентира.",
        "en": "Complete only workable map fields. Feeling words are optional; start with an external anchor if preferred."
      },
      "newScenario": {
        "ru": "Новая сцена: в тихом зале изменилось место выдачи книг. У героя могут быть разные чувства; можно отойти и посмотреть на окно. Как воспользоваться картой?",
        "en": "New scene: a quiet hall has changed its book-collection point. The character may have different feelings, step away and look at a window. How could the map be used?"
      },
      "probeFields": [
        {
          "ru": "Чувство или осознанное «не знаю»",
          "en": "A feeling or deliberate not sure"
        },
        {
          "ru": "Комфортная дистанция",
          "en": "Comfortable distance"
        },
        {
          "ru": "Возврат к внешнему ориентиру",
          "en": "Return to an external anchor"
        }
      ]
    }
  ],
  "AS5": [
    {
      "day": 1,
      "title": {
        "ru": "Я — больше, чем трудное состояние",
        "en": "I am more than a difficult state"
      },
      "sourceHash": "f4ab1b7f36a2f35c6286953b97781ec3e103eb6e24eea50ee7da328dede1cd71",
      "practice": {
        "ru": "пазл из карточек «я могу быть человеком с интересами, привычками, отношениями, навыками, сомнениями», выбрать минимум две стороны себя, которые приемлемо назвать.",
        "en": "Explore cards about interests, habits, relationships, skills and doubts. Choose two aspects that feel acceptable to name, or work only with a fictional person."
      },
      "transfer": {
        "ru": "выбрать качество персонажа, не связанное с его проблемой.",
        "en": "Choose a quality of a character unrelated to the character’s difficulty."
      },
      "artifact": {
        "ru": "«другие стороны моей жизни».",
        "en": "Other sides of my life."
      },
      "alternative": {
        "ru": "только персонаж/карточки.",
        "en": "Use fictional characters or ready-made cards only."
      },
      "choices": [
        {
          "ru": "Интересы",
          "en": "Interests"
        },
        {
          "ru": "Привычки",
          "en": "Habits"
        },
        {
          "ru": "Отношения",
          "en": "Relationships"
        },
        {
          "ru": "Навыки",
          "en": "Skills"
        },
        {
          "ru": "Сомнения тоже допустимы",
          "en": "Doubts are allowed too"
        }
      ],
      "fields": [
        {
          "ru": "Одна приемлемая сторона",
          "en": "One acceptable aspect"
        },
        {
          "ru": "Другая приемлемая сторона",
          "en": "Another acceptable aspect"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: герой устал, но также любит музыку, умеет ухаживать за растением и иногда сомневается. Выберите любые приемлемые стороны без ранжирования.",
        "en": "Fictional scene: a character is tired and also likes music, can care for a plant and sometimes has doubts. Choose acceptable aspects without ranking them."
      },
      "newScenario": {
        "ru": "Новая сцена: персонаж не успел закончить рисунок, но замечает цвета и интересуется книгами. Какое качество не сводится к незавершённому заданию?",
        "en": "New scene: a character did not finish a drawing but notices colours and enjoys books. Which quality is separate from the unfinished task?"
      },
      "probeFields": [
        {
          "ru": "Качество вне трудности героя",
          "en": "A quality beyond the character’s difficulty"
        },
        {
          "ru": "Другая сторона его жизни",
          "en": "Another part of their life"
        }
      ]
    },
    {
      "day": 2,
      "title": {
        "ru": "У меня могут быть разные роли",
        "en": "I may have different roles"
      },
      "sourceHash": "d5624ab634e5072edd33dd1240a582473ad9e739c94ae15508d81f4fd5bd6056",
      "practice": {
        "ru": "карта возможных ролей (учусь, отдыхаю, дружу, забочусь о себе, исследую, творю) с правом ничего не утверждать про себя.",
        "en": "Explore roles such as learning, resting, friendship, self-care, exploring and creating. There is no requirement to claim a role for yourself."
      },
      "transfer": {
        "ru": "выбрать одну роль для новой вымышленной ситуации.",
        "en": "Choose a role in a new fictional situation."
      },
      "artifact": {
        "ru": "личный список ролей без оценочного ранга.",
        "en": "An unranked list of possible roles."
      },
      "alternative": {
        "ru": "готовая нейтральная карта.",
        "en": "Use a ready-made neutral role map."
      },
      "choices": [
        {
          "ru": "Учусь",
          "en": "Learning"
        },
        {
          "ru": "Отдыхаю",
          "en": "Resting"
        },
        {
          "ru": "Дружу",
          "en": "Being a friend"
        },
        {
          "ru": "Забочусь о себе",
          "en": "Caring for myself"
        },
        {
          "ru": "Исследую",
          "en": "Exploring"
        },
        {
          "ru": "Творю",
          "en": "Creating"
        }
      ],
      "fields": [
        {
          "ru": "Возможная роль",
          "en": "Possible role"
        },
        {
          "ru": "Другая роль без оценки",
          "en": "Another unranked role"
        },
        {
          "ru": "Что можно оставить неопределённым",
          "en": "What may stay undecided"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: персонаж читает новую инструкцию, затем отдыхает. Эти роли могут соседствовать без требования уверенности.",
        "en": "Fictional scene: a character reads a new instruction and then rests. These roles can coexist without requiring confidence."
      },
      "newScenario": {
        "ru": "Новая сцена: человек пробует составить простой узор и делает перерыв. Какую роль можно назвать или оставить неназванной?",
        "en": "New scene: someone tries a simple pattern and takes a break. Which role could be named or left unnamed?"
      },
      "probeFields": [
        {
          "ru": "Роль в новой ситуации",
          "en": "Role in the new situation"
        },
        {
          "ru": "Право не утверждать роль",
          "en": "Option not to claim a role"
        }
      ]
    },
    {
      "day": 3,
      "title": {
        "ru": "Как со мной разговаривает внутренний голос",
        "en": "Noticing the tone of inner speech"
      },
      "sourceHash": "ede9e7c7559dd983cc0c0c44d82866c146c75159ce1b3c7ba3fd8c77e93f93d5",
      "practice": {
        "ru": "в повседневной сцене выбрать между обвиняющим, нейтральным и бережно-реалистичным ответом герою; понять разницу без принуждения чувствовать доброту к себе.",
        "en": "In an ordinary fictional scene, compare blaming, neutral and gently realistic responses. Kind feelings towards yourself are not required."
      },
      "transfer": {
        "ru": "переписать одну нейтральную фразу в более уважительную.",
        "en": "Rewrite a neutral phrase in a more respectful way."
      },
      "artifact": {
        "ru": "словарь приемлемой поддержки.",
        "en": "A vocabulary of acceptable support."
      },
      "alternative": {
        "ru": "выбрать готовую фразу.",
        "en": "Choose a ready-made phrase."
      },
      "choices": [
        {
          "ru": "Нейтрально: «Задание осталось незавершённым»",
          "en": "Neutral: The task is unfinished"
        },
        {
          "ru": "Уважительно: «Можно выбрать посильную часть»",
          "en": "Respectful: A manageable part can be chosen"
        },
        {
          "ru": "Не оценивать человека целиком",
          "en": "Do not judge the whole person"
        }
      ],
      "fields": [
        {
          "ru": "Нейтральный факт",
          "en": "Neutral fact"
        },
        {
          "ru": "Уважительная фраза",
          "en": "Respectful phrase"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: герой забыл купить блокнот. Сравните «ты всё портишь», «блокнот не куплен» и «можно решить, нужен ли он сейчас». Оценка личности не требуется.",
        "en": "Fictional scene: a character forgets a notebook. Compare you ruin everything, the notebook was not bought, and we can decide whether it is needed now. No judgement of the person is needed."
      },
      "newScenario": {
        "ru": "Новая сцена: персонаж оставил часть обычного списка незаполненной. Как сделать фразу «список не закончен» более уважительной без обещания успеха?",
        "en": "New scene: a character leaves part of an ordinary list blank. How could the phrase the list is unfinished become more respectful without promising success?"
      },
      "probeFields": [
        {
          "ru": "Исходная нейтральная фраза",
          "en": "Original neutral phrase"
        },
        {
          "ru": "Более уважительный вариант",
          "en": "A more respectful version"
        }
      ]
    },
    {
      "day": 4,
      "title": {
        "ru": "Поддержка без самообмана",
        "en": "Support without pretending"
      },
      "sourceHash": "b6bc1bb47ef67e2cbb9fe83959f10ca9c44b03b016d325ea0970b0a9d5c4a5eb",
      "practice": {
        "ru": "конструктор «сейчас трудно → я могу уменьшить требования / обратиться за помощью / сделать паузу»; сравнить две версии для вымышленного героя.",
        "en": "Build things are difficult now; I may reduce demands, seek help or pause. Compare two realistic versions for a fictional character."
      },
      "transfer": {
        "ru": "выбрать собственный нейтральный вариант, если фраза «я молодец» раздражает.",
        "en": "Choose a neutral alternative if enthusiastic praise does not fit."
      },
      "artifact": {
        "ru": "одна правдоподобная поддерживающая фраза.",
        "en": "One believable support phrase."
      },
      "alternative": {
        "ru": "только чтение.",
        "en": "Read only."
      },
      "choices": [
        {
          "ru": "Сейчас трудно; можно уменьшить требования",
          "en": "Things are difficult; demands can be reduced"
        },
        {
          "ru": "Можно обратиться за помощью",
          "en": "Help can be sought"
        },
        {
          "ru": "Можно сделать паузу",
          "en": "A pause is available"
        },
        {
          "ru": "Оставить нейтральную фразу",
          "en": "Keep a neutral phrase"
        }
      ],
      "fields": [
        {
          "ru": "Что сейчас трудно без подробностей",
          "en": "What is difficult, without details"
        },
        {
          "ru": "Реалистичный ответ",
          "en": "A realistic response"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: герой устал от сортировки вещей. Сравните «обязательно всё получится» и «можно разобрать меньше или остановиться». Обещать результат не нужно.",
        "en": "Fictional scene: a character is tired from sorting belongings. Compare everything will definitely work out with sorting less or stopping is allowed. No result needs promising."
      },
      "newScenario": {
        "ru": "Новая сцена: персонажу не нравится фраза «я молодец». Какой нейтральный вариант поддержки оставить при незавершённой обычной задаче?",
        "en": "New scene: a character dislikes saying I am wonderful. What neutral support phrase could fit an unfinished ordinary task?"
      },
      "probeFields": [
        {
          "ru": "Приемлемая нейтральная поддержка",
          "en": "Acceptable neutral support"
        },
        {
          "ru": "Допустимое снижение требований",
          "en": "A permissible reduction in demands"
        }
      ]
    },
    {
      "day": 5,
      "title": {
        "ru": "Моя история включает и обычную жизнь",
        "en": "My story includes ordinary life"
      },
      "sourceHash": "44320023700d5cf6f49167497dd99fcfd4a5735e01146fc9a7015e1a7048ec15",
      "practice": {
        "ru": "на нейтральной линии «вчера — сегодня — ближайшее будущее» выбрать обычные факты из безопасной повседневной жизни либо на истории персонажа; ничего о травме не спрашивать.",
        "en": "On a yesterday, today and near-future line, choose ordinary safe facts about daily life or a fictional character. No traumatic memories are requested."
      },
      "transfer": {
        "ru": "отметить один факт «сегодня я здесь».",
        "en": "Name one ordinary fact about being here today."
      },
      "artifact": {
        "ru": "маленькая карта повседневной непрерывности.",
        "en": "A small map of everyday continuity."
      },
      "alternative": {
        "ru": "три нейтральных слова вместо биографии.",
        "en": "Use three neutral words instead of a biography."
      },
      "choices": [
        {
          "ru": "Вчера: обычный факт",
          "en": "Yesterday: an ordinary fact"
        },
        {
          "ru": "Сегодня: нейтральный факт",
          "en": "Today: a neutral fact"
        },
        {
          "ru": "Ближайшее будущее: изменяемый план",
          "en": "Near future: a changeable plan"
        }
      ],
      "fields": [
        {
          "ru": "Вчера",
          "en": "Yesterday"
        },
        {
          "ru": "Сегодня",
          "en": "Today"
        },
        {
          "ru": "Ближайшее будущее",
          "en": "Near future"
        }
      ],
      "scene": {
        "ru": "Нейтральная история: вчера герой читал, сегодня выбирает чай, завтра может открыть книгу. Личную биографию добавлять не нужно.",
        "en": "Neutral story: yesterday a character read, today they choose tea, tomorrow they may open a book. Personal biography is unnecessary."
      },
      "newScenario": {
        "ru": "Новая сцена: другой персонаж сидит у обычного стола и пишет дату на листке. Какой один проверяемый факт относится к «сегодня я здесь»?",
        "en": "New scene: another character sits at an ordinary table and writes the date on paper. Which observable fact belongs to I am here today?"
      },
      "probeFields": [
        {
          "ru": "Один обычный факт настоящего",
          "en": "One ordinary present-day fact"
        }
      ]
    },
    {
      "day": 6,
      "title": {
        "ru": "Я могу выбирать, что о себе рассказывать",
        "en": "I choose what to share about myself"
      },
      "sourceHash": "b66b979a97314cea7cd3d0e053546944c70f89d0b0ddd53c506ba25dd581a94c",
      "practice": {
        "ru": "разобрать сценарий «знакомый спрашивает о моей жизни»: выбрать, какие безопасные темы назвать, какие отложить, как сказать «не готов обсуждать».",
        "en": "In a scene where an acquaintance asks about your life, choose safe topics, what to defer and how to say I am not ready to discuss that."
      },
      "transfer": {
        "ru": "создать один вариант рассказа о своём настоящем без травматического содержания.",
        "en": "Create an optional description of the present without traumatic content."
      },
      "artifact": {
        "ru": "граница личного раскрытия.",
        "en": "A boundary for personal disclosure."
      },
      "alternative": {
        "ru": "шаблон отказа без рассказа.",
        "en": "Use a refusal template without telling a story."
      },
      "choices": [
        {
          "ru": "Назвать нейтральную тему",
          "en": "Name a neutral topic"
        },
        {
          "ru": "Отложить рассказ",
          "en": "Defer the story"
        },
        {
          "ru": "Не готов обсуждать",
          "en": "I am not ready to discuss that"
        },
        {
          "ru": "Оставить ответ без подробностей",
          "en": "Answer without details"
        }
      ],
      "fields": [
        {
          "ru": "Безопасная тема по желанию",
          "en": "Safe topic, if wanted"
        },
        {
          "ru": "Что останется личным",
          "en": "What stays private"
        },
        {
          "ru": "Фраза границы раскрытия",
          "en": "A disclosure boundary phrase"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: знакомый спрашивает «что у тебя нового?». Можно говорить только о книге или не рассказывать ничего.",
        "en": "Fictional scene: an acquaintance asks what is new. Talking only about a book or sharing nothing are both options."
      },
      "newScenario": {
        "ru": "Новая сцена: на необязательной встрече предлагают коротко представиться. Как рассказать только о настоящем интересе или отказаться без объяснений?",
        "en": "New scene: an optional gathering invites a short introduction. How could only a present interest be mentioned, or the introduction declined without an explanation?"
      },
      "probeFields": [
        {
          "ru": "Короткий нейтральный вариант или отказ",
          "en": "A short neutral version or refusal"
        },
        {
          "ru": "Граница личных подробностей",
          "en": "Limit on personal details"
        }
      ]
    },
    {
      "day": 7,
      "title": {
        "ru": "Что мне действительно важно",
        "en": "What matters to me"
      },
      "sourceHash": "bb0392183e1b7c25d487ddd45698598e5bf5e8e4ff6f845c8161b856ad7aa685",
      "practice": {
        "ru": "визуальный «компас» из направлений забота, честность, свобода, учёба, связь, творчество, отдых; выбрать 1–2 направления без оценки «правильности».",
        "en": "Explore a values compass of care, honesty, freedom, learning, connection, creativity and rest. Choose one or two directions without a right answer."
      },
      "transfer": {
        "ru": "подобрать к ценности одно безопасное намерение.",
        "en": "Pair a value with one safe intention."
      },
      "artifact": {
        "ru": "карта ценностей.",
        "en": "A personal values map."
      },
      "alternative": {
        "ru": "выбрать всего одно нейтральное слово.",
        "en": "Choose a single neutral word."
      },
      "choices": [
        {
          "ru": "Забота",
          "en": "Care"
        },
        {
          "ru": "Честность",
          "en": "Honesty"
        },
        {
          "ru": "Свобода",
          "en": "Freedom"
        },
        {
          "ru": "Учёба",
          "en": "Learning"
        },
        {
          "ru": "Связь",
          "en": "Connection"
        },
        {
          "ru": "Творчество",
          "en": "Creativity"
        },
        {
          "ru": "Отдых",
          "en": "Rest"
        }
      ],
      "fields": [
        {
          "ru": "Одно важное направление",
          "en": "One meaningful direction"
        },
        {
          "ru": "Второе направление по желанию",
          "en": "Second direction, if wanted"
        },
        {
          "ru": "Безопасное намерение",
          "en": "A safe intention"
        }
      ],
      "scene": {
        "ru": "Текстовый компас: забота, честность, свобода, учёба, связь, творчество, отдых. Направления не ранжируются, изображение необязательно.",
        "en": "Text compass: care, honesty, freedom, learning, connection, creativity, rest. Directions are unranked; an image is optional."
      },
      "newScenario": {
        "ru": "Новая сцена: герой выбрал ценность учёбы, но сегодня мало сил. Какое безопасное намерение может сочетать учёбу и доступный отдых?",
        "en": "New scene: a character values learning but has little energy today. What safe intention could fit both learning and available rest?"
      },
      "probeFields": [
        {
          "ru": "Ценность в новом примере",
          "en": "Value in the new example"
        },
        {
          "ru": "Посильное намерение или отдых",
          "en": "A manageable intention or rest"
        }
      ]
    },
    {
      "day": 8,
      "title": {
        "ru": "Мои ресурсы не обязаны быть большими",
        "en": "My resources do not have to be large"
      },
      "sourceHash": "0e3f5897166e190da7aef09c7788e0f4086e56ec657c09c6c08e4fa64d737177",
      "practice": {
        "ru": "два набора карточек «мне доступно / пока недоступно», чтобы найти хотя бы один маленький ресурс: время отдыха, музыка, доступная вещь, профессиональная поддержка, место.",
        "en": "Sort available and not-yet-available resources: rest time, music, an accessible object, professional support or a place. It is valid not to see a resource now."
      },
      "transfer": {
        "ru": "выбрать другой ресурс, если первый исчез.",
        "en": "Choose another resource if the first disappears."
      },
      "artifact": {
        "ru": "карта без идеализации.",
        "en": "A realistic resource map."
      },
      "alternative": {
        "ru": "«сейчас ресурса не вижу» — допустимый ответ, без оценки.",
        "en": "Choose I do not see a resource now without grading it."
      },
      "choices": [
        {
          "ru": "Время для отдыха",
          "en": "Time for rest"
        },
        {
          "ru": "Музыка или доступная вещь",
          "en": "Music or an accessible object"
        },
        {
          "ru": "Место",
          "en": "A place"
        },
        {
          "ru": "Профессиональная поддержка, если доступна",
          "en": "Professional support, if available"
        },
        {
          "ru": "Сейчас ресурса не вижу",
          "en": "I do not see a resource now"
        }
      ],
      "fields": [
        {
          "ru": "Мне доступно",
          "en": "Available to me"
        },
        {
          "ru": "Пока недоступно",
          "en": "Not available yet"
        },
        {
          "ru": "Другой возможный ресурс",
          "en": "Another possible resource"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: у персонажа есть свободная короткая пауза и обычная книга, а выбранное место закрыто. Можно отметить и наличие, и ограничение.",
        "en": "Fictional scene: a character has a short break and an ordinary book, but the preferred place is closed. Both available resources and limits can be noted."
      },
      "newScenario": {
        "ru": "Новая сцена: музыка стала недоступна. Можно ли выбрать другой реальный ресурс или честно оставить поле пустым?",
        "en": "New scene: music becomes unavailable. Is another actual resource available, or should the field honestly stay blank?"
      },
      "probeFields": [
        {
          "ru": "Что больше недоступно",
          "en": "What is no longer available"
        },
        {
          "ru": "Реальная замена или отсутствие",
          "en": "An actual alternative or none"
        }
      ]
    },
    {
      "day": 9,
      "title": {
        "ru": "Моё достоинство не равно результату",
        "en": "My dignity is not my result"
      },
      "sourceHash": "4f99ffa6761823e856360647aa29620cb06d2aaf8c90f5137a36fde44afc6786",
      "practice": {
        "ru": "безопасная история человека, у которого не вышло задание; выбрать уважительный ответ вместо самоунижения или требовательного «надо стараться сильнее».",
        "en": "In a safe story about an unfinished task, choose a respectful response rather than humiliation or demands to try harder."
      },
      "transfer": {
        "ru": "сопоставить личную границу и достоинство на втором примере.",
        "en": "Connect a personal boundary with dignity in a second example."
      },
      "artifact": {
        "ru": "фраза «моя ценность не определяется сегодняшним успехом».",
        "en": "My worth is not defined by today’s success."
      },
      "alternative": {
        "ru": "только готовые карточки.",
        "en": "Use ready-made cards only."
      },
      "choices": [
        {
          "ru": "Результат не определяет достоинство",
          "en": "A result does not determine dignity"
        },
        {
          "ru": "Можно остановиться без унижения",
          "en": "Stopping does not require humiliation"
        },
        {
          "ru": "Можно выбрать посильную помощь",
          "en": "Manageable help may be chosen"
        }
      ],
      "fields": [
        {
          "ru": "Факт результата без оценки личности",
          "en": "A result stated without judging the person"
        },
        {
          "ru": "Уважительный ответ",
          "en": "Respectful response"
        },
        {
          "ru": "Граница",
          "en": "Boundary"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: у героя не сложился бумажный макет. Можно признать результат и сохранить уважительное отношение к человеку.",
        "en": "Fictional scene: a character’s paper model does not work. The result can be acknowledged while retaining respect for the person."
      },
      "newScenario": {
        "ru": "Новая сцена: персонаж не хочет показывать незавершённый рисунок знакомому. Какую границу можно выбрать, не связывая достоинство с качеством рисунка?",
        "en": "New scene: a character does not want to show an unfinished drawing. What boundary is available without tying dignity to the drawing’s quality?"
      },
      "probeFields": [
        {
          "ru": "Граница во втором примере",
          "en": "Boundary in the second example"
        },
        {
          "ru": "Фраза о достоинстве без оценки результата",
          "en": "Dignity phrase independent of the result"
        }
      ]
    },
    {
      "day": 10,
      "title": {
        "ru": "Я могу иметь границы и сохранять отношения",
        "en": "I can have boundaries in relationships"
      },
      "sourceHash": "bbe6f9f7f318e9d125a396675a20e7069c76b90da8faa41c465805d3b1b68b5b",
      "practice": {
        "ru": "нейтральная репетиция «да / нет / не сейчас / мне нужен другой формат» в отношении просьбы знакомого.",
        "en": "Rehearse yes, no, not now or I need another format for a neutral request. Reconciliation and contact with unsafe people are not required."
      },
      "transfer": {
        "ru": "выбрать дистанцию и вариант заботы о себе при повторной просьбе.",
        "en": "Choose distance and self-care if the request is repeated."
      },
      "artifact": {
        "ru": "фраза собственной границы.",
        "en": "A personal boundary phrase."
      },
      "alternative": {
        "ru": "письменный выбор без ролевого диалога; небезопасные связи не включать.",
        "en": "Use a written choice without a role-play conversation."
      },
      "choices": [
        {
          "ru": "Да, если подходит",
          "en": "Yes, if it fits"
        },
        {
          "ru": "Нет",
          "en": "No"
        },
        {
          "ru": "Не сейчас",
          "en": "Not now"
        },
        {
          "ru": "Мне нужен другой формат",
          "en": "I need another format"
        }
      ],
      "fields": [
        {
          "ru": "Фраза собственной границы",
          "en": "My boundary phrase"
        },
        {
          "ru": "Комфортная дистанция",
          "en": "Comfortable distance"
        },
        {
          "ru": "Забота о себе при повторной просьбе",
          "en": "Self-care if the request repeats"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: знакомый просит помочь с необязательным списком. Можно согласиться в доступном объёме, отказаться или изменить формат.",
        "en": "Fictional scene: an acquaintance asks for help with an optional list. Agreement within available limits, refusal or a different format are options."
      },
      "newScenario": {
        "ru": "Новая сцена: просьбу повторяют после «не сейчас». Как сохранить дистанцию и выбрать доступную заботу о себе без обязательного диалога?",
        "en": "New scene: the request repeats after not now. How could distance and available self-care be kept without a required conversation?"
      },
      "probeFields": [
        {
          "ru": "Ответ на повторную просьбу",
          "en": "Response to a repeated request"
        },
        {
          "ru": "Дистанция и забота о себе",
          "en": "Distance and self-care"
        }
      ]
    },
    {
      "day": 11,
      "title": {
        "ru": "Какие связи поддерживают меня",
        "en": "Which connections support me"
      },
      "sourceHash": "6d9150ea7482e7cd836e792fe879d8f91c9aa861c9d94b333c0af0f757cc1279",
      "practice": {
        "ru": "карта видов связей «люди, сообщества, природа, занятия, профессиональные службы», отметить комфортный/некомфортный тип.",
        "en": "Map types of connection: people, communities, nature, activities and professional services. Mark comfortable or uncomfortable types without a duty to contact anyone or disclose the past."
      },
      "transfer": {
        "ru": "выбрать, как безопасно увеличить поддержку без обязательного контакта.",
        "en": "Choose how support might become more available without compulsory contact."
      },
      "artifact": {
        "ru": "личные категории связи.",
        "en": "My connection categories."
      },
      "alternative": {
        "ru": "только символическая карта.",
        "en": "Use a symbolic map only."
      },
      "choices": [
        {
          "ru": "Люди, если контакт безопасен",
          "en": "People, if contact is safe"
        },
        {
          "ru": "Сообщества",
          "en": "Communities"
        },
        {
          "ru": "Природа",
          "en": "Nature"
        },
        {
          "ru": "Занятия",
          "en": "Activities"
        },
        {
          "ru": "Профессиональные службы",
          "en": "Professional services"
        },
        {
          "ru": "Сейчас ничего подходящего",
          "en": "Nothing fits now"
        }
      ],
      "fields": [
        {
          "ru": "Комфортный тип связи",
          "en": "Comfortable connection type"
        },
        {
          "ru": "Некомфортный тип или граница",
          "en": "Uncomfortable type or boundary"
        },
        {
          "ru": "Как увеличить поддержку без контакта",
          "en": "How support might increase without contact"
        }
      ],
      "scene": {
        "ru": "Учебная карта предлагает категории без имён и адресов. Для героя наблюдение за деревом может быть приемлемее общения.",
        "en": "The educational map offers categories without names or addresses. Observing a tree may fit the character better than a conversation."
      },
      "newScenario": {
        "ru": "Новая сцена: знакомое занятие временно недоступно. Какой другой тип связи можно рассмотреть без обязанности обращаться к человеку?",
        "en": "New scene: a familiar activity is temporarily unavailable. What other connection type could be considered without having to contact a person?"
      },
      "probeFields": [
        {
          "ru": "Другой потенциально приемлемый тип",
          "en": "Another potentially workable type"
        },
        {
          "ru": "Граница или отсутствие контакта",
          "en": "A boundary or no contact"
        }
      ]
    },
    {
      "day": 12,
      "title": {
        "ru": "У меня есть право на будущее без идеального прошлого",
        "en": "A future does not require a perfect past"
      },
      "sourceHash": "be43e73c0a96b0380bb9dde1790444f543f4e75f8a3ae4b65c3f6a2b3661f501",
      "practice": {
        "ru": "выбрать из настоящих маленьких интересов и ценностей одно направление на ближайшие недели; обозначить неизвестность и право изменить план.",
        "en": "Choose one direction from present small interests or values for the coming weeks. Keep uncertainty and the right to change the plan."
      },
      "transfer": {
        "ru": "представить не образ «исцелённого себя», а обычную, достижимую будущую ситуацию или текстовую альтернативу.",
        "en": "Consider an ordinary achievable future situation or a text alternative, without imagining a healed self."
      },
      "artifact": {
        "ru": "один ориентир будущего.",
        "en": "One changeable future direction."
      },
      "alternative": {
        "ru": "обойтись без образов.",
        "en": "Use words without imagery."
      },
      "choices": [
        {
          "ru": "Небольшой интерес",
          "en": "A small interest"
        },
        {
          "ru": "Важная ценность",
          "en": "A meaningful value"
        },
        {
          "ru": "Обычная достижимая ситуация",
          "en": "An ordinary achievable situation"
        },
        {
          "ru": "Пока оставить будущее открытым",
          "en": "Leave the future open for now"
        }
      ],
      "fields": [
        {
          "ru": "Нынешний интерес или ценность",
          "en": "Present interest or value"
        },
        {
          "ru": "Обычная будущая ситуация",
          "en": "Ordinary future situation"
        },
        {
          "ru": "Что можно изменить или не знать",
          "en": "What may change or remain unknown"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: персонажу интересно узнать о комнатном растении. Он может наметить обычное чтение и передумать; особого смысла трудностей искать не нужно.",
        "en": "Fictional scene: a character is curious about a houseplant. Ordinary reading can be considered and the plan changed; no special meaning in hardship is required."
      },
      "newScenario": {
        "ru": "Новая сцена: выбранная книга оказалась недоступна. Как сохранить направление интереса, изменив будущую ситуацию или отложив её?",
        "en": "New scene: the chosen book is unavailable. How could the direction of interest remain while the future situation changes or is postponed?"
      },
      "probeFields": [
        {
          "ru": "Достижимый текстовый вариант",
          "en": "Achievable text-only option"
        },
        {
          "ru": "Право изменить план",
          "en": "Option to change the plan"
        }
      ]
    },
    {
      "day": 13,
      "title": {
        "ru": "Что во мне уже соединяется",
        "en": "Connecting what is available to me"
      },
      "sourceHash": "9884b85e310a943750f80d8b0b9ed33dbdd77a847b24919216289a28c357f9fd",
      "practice": {
        "ru": "из прежних собственных карточек выбрать «мой ориентир / поддерживающая фраза / граница / ценность»; если человек начинал сразу с К5, заполнить только доступное.",
        "en": "From previously chosen cards, connect an anchor, support phrase, boundary and value. Starting directly with course 5 is allowed; fill only what is available."
      },
      "transfer": {
        "ru": "применить связку к новой обычной трудности.",
        "en": "Use the combination in a new ordinary difficulty."
      },
      "artifact": {
        "ru": "мини-карта целостности.",
        "en": "A small integration map."
      },
      "alternative": {
        "ru": "заполнить одно поле.",
        "en": "Complete one field only."
      },
      "choices": [
        {
          "ru": "Мой ориентир",
          "en": "My anchor"
        },
        {
          "ru": "Поддерживающая фраза",
          "en": "Support phrase"
        },
        {
          "ru": "Моя граница",
          "en": "My boundary"
        },
        {
          "ru": "Моя ценность",
          "en": "My value"
        },
        {
          "ru": "Заполнить только доступное",
          "en": "Complete only what is available"
        }
      ],
      "fields": [
        {
          "ru": "Мой ориентир",
          "en": "My anchor"
        },
        {
          "ru": "Поддерживающая фраза",
          "en": "Support phrase"
        },
        {
          "ru": "Граница",
          "en": "Boundary"
        },
        {
          "ru": "Ценность",
          "en": "Value"
        }
      ],
      "scene": {
        "ru": "Возьмите только действительно выбранные материалы. Если прежних карточек нет, можно выбрать одно новое нейтральное поле; проходить другие курсы не требуется.",
        "en": "Use only actually chosen material. If no earlier cards exist, choose one new neutral field; other courses are not prerequisites."
      },
      "newScenario": {
        "ru": "Новая сцена: герой не успел закончить обычную задачу до перерыва. Как сочетать доступную фразу, границу или ценность, не заполняя недоступные поля?",
        "en": "New scene: a character does not finish an ordinary task before a break. How could an available phrase, boundary or value be combined without filling unavailable fields?"
      },
      "probeFields": [
        {
          "ru": "Доступная часть связки",
          "en": "An available part of the combination"
        },
        {
          "ru": "Применение к новой трудности",
          "en": "Use in the new difficulty"
        }
      ]
    },
    {
      "day": 14,
      "title": {
        "ru": "Моя карта Я и моей поддержки",
        "en": "My self-and-support map"
      },
      "sourceHash": "85e11231371dc8b003518d87af375ddab6f92e174393dd76fc37cf1ca41ca008",
      "practice": {
        "ru": "создать четыре блока «я шире сложностей → мне важно → я могу поддержать себя → у меня есть граница/помощь» из действительно выбранных материалов.",
        "en": "Build four optional blocks from choices actually made: I am more than difficulties, what matters to me, how I can support myself, and a boundary or source of help."
      },
      "transfer": {
        "ru": "воспользоваться картой в вымышленном сюжете о неудачном дне.",
        "en": "Use the map in a fictional story about a day that did not go to plan."
      },
      "artifact": {
        "ru": "личная карточка К5.",
        "en": "My course 5 self-and-support card."
      },
      "alternative": {
        "ru": "нейтральный шаблон без личных подробностей.",
        "en": "Use a neutral template without personal details."
      },
      "choices": [
        {
          "ru": "Я шире сложностей",
          "en": "I am more than difficulties"
        },
        {
          "ru": "Мне важно",
          "en": "What matters to me"
        },
        {
          "ru": "Я могу поддержать себя",
          "en": "How I can support myself"
        },
        {
          "ru": "У меня есть граница или помощь",
          "en": "A boundary or source of help"
        }
      ],
      "fields": [
        {
          "ru": "Я шире сложностей",
          "en": "I am more than difficulties"
        },
        {
          "ru": "Мне важно",
          "en": "What matters to me"
        },
        {
          "ru": "Я могу поддержать себя",
          "en": "How I can support myself"
        },
        {
          "ru": "Моя граница и резерв помощи",
          "en": "My boundary and backup help"
        }
      ],
      "scene": {
        "ru": "Соберите четыре блока из выбранных материалов, оставляя пустым всё неподходящее. Личные подробности и итоговая оценка себя не требуются.",
        "en": "Build four blocks from chosen material, leaving unsuitable fields blank. Personal details and an overall judgement of yourself are unnecessary."
      },
      "newScenario": {
        "ru": "Новая сцена: герой не закончил обычный проект, а знакомый предлагает взять ещё одно дело. Какую реалистичную фразу, ценность, границу и резерв помощи можно выбрать?",
        "en": "New scene: a character leaves an ordinary project unfinished and an acquaintance suggests another task. What realistic phrase, value, boundary and backup help are available?"
      },
      "probeFields": [
        {
          "ru": "Реалистичная поддерживающая фраза",
          "en": "Realistic support phrase"
        },
        {
          "ru": "Значимая ценность или направление",
          "en": "Meaningful value or direction"
        },
        {
          "ru": "Граница и резерв помощи",
          "en": "Boundary and backup help"
        }
      ]
    }
  ],
  "AS6": [
    {
      "day": 1,
      "title": {
        "ru": "Где в жизни я хочу больше пространства",
        "en": "Where I want more room in life"
      },
      "sourceHash": "785a6eb5fefb85de1ba4dcb59b77f543d1c7842d24dd52c1e26690138c0c6568",
      "practice": {
        "ru": "разложить карточки «здоровый отдых, повседневные дела, общение, творчество, обучение, отношения, работа», выбрать одну приоритетную либо отметить «сейчас не знаю».",
        "en": "Explore healthy rest, daily tasks, social contact, creativity, learning, relationships and work. Choose one area or not sure, without pressure to act immediately."
      },
      "transfer": {
        "ru": "определить, что в этой области выглядело бы немного лучше.",
        "en": "Describe what might look a little better in the chosen area."
      },
      "artifact": {
        "ru": "персональный вектор К6.",
        "en": "One possible course 6 direction."
      },
      "alternative": {
        "ru": "выбрать «отдых» или только читать.",
        "en": "Choose rest or read only."
      },
      "choices": [
        {
          "ru": "Здоровый отдых",
          "en": "Healthy rest"
        },
        {
          "ru": "Повседневные дела",
          "en": "Daily tasks"
        },
        {
          "ru": "Общение",
          "en": "Social contact"
        },
        {
          "ru": "Творчество",
          "en": "Creativity"
        },
        {
          "ru": "Обучение",
          "en": "Learning"
        },
        {
          "ru": "Отношения",
          "en": "Relationships"
        },
        {
          "ru": "Работа",
          "en": "Work"
        },
        {
          "ru": "Сейчас не знаю",
          "en": "Not sure now"
        }
      ],
      "fields": [
        {
          "ru": "Важная область или «не знаю»",
          "en": "Meaningful area or not sure"
        },
        {
          "ru": "Что могло бы выглядеть немного лучше",
          "en": "What might look a little better"
        }
      ],
      "scene": {
        "ru": "Учебная карта областей не задаёт правильного приоритета. У персонажа есть интерес к рисованию и потребность в отдыхе; можно выбрать одно или оставить решение открытым.",
        "en": "The educational area map has no correct priority. A character is interested in drawing and needs rest; either may be chosen or the decision left open."
      },
      "newScenario": {
        "ru": "Новая сцена: другой герой выбирает область повседневных дел. Что было бы немного удобнее без требования сразу выполнить задачу?",
        "en": "New scene: another character chooses daily tasks. What might become slightly more workable without requiring an immediate action?"
      },
      "probeFields": [
        {
          "ru": "Один признак более удобного варианта",
          "en": "One sign of a more workable option"
        },
        {
          "ru": "Право пока не действовать",
          "en": "Option not to act yet"
        }
      ]
    },
    {
      "day": 2,
      "title": {
        "ru": "Из большого желания — маленький шаг",
        "en": "From a big wish to a small step"
      },
      "sourceHash": "08b2c71626e92dd158c96e6d3082267bc22efa44761969ee53a7881e93467511",
      "practice": {
        "ru": "разложить желание героя на три возможных действия «очень мало / умеренно / пока не сейчас» и выбрать минимально доступный шаг для себя по желанию.",
        "en": "Divide a fictional person’s wish into very small, moderate and not now options. A personally relevant minimum step is optional; a brief 1–5-minute attempt or planned rest are both possible."
      },
      "transfer": {
        "ru": "адаптировать шаг под неожиданно усталый день.",
        "en": "Adapt the step for an unexpectedly tired day."
      },
      "artifact": {
        "ru": "одна 1–5-минутная попытка или запланированный отдых.",
        "en": "A small optional attempt or planned rest."
      },
      "alternative": {
        "ru": "план без обязательного выполнения.",
        "en": "Plan without being required to perform the action."
      },
      "choices": [
        {
          "ru": "Очень мало",
          "en": "Very small"
        },
        {
          "ru": "Умеренно, если доступно",
          "en": "Moderate, if workable"
        },
        {
          "ru": "Пока не сейчас",
          "en": "Not now"
        },
        {
          "ru": "Запланированный отдых",
          "en": "Planned rest"
        }
      ],
      "fields": [
        {
          "ru": "Желание героя",
          "en": "The character’s wish"
        },
        {
          "ru": "Очень маленький вариант",
          "en": "Very small option"
        },
        {
          "ru": "Умеренный вариант",
          "en": "Moderate option"
        },
        {
          "ru": "Отдых или «не сейчас»",
          "en": "Rest or not now"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: герой хочет разобрать целую полку. Варианты: убрать одну вещь, разобрать небольшой участок или отложить и отдохнуть.",
        "en": "Fictional scene: a character wants to organise a whole shelf. Options: put away one item, organise a small section, or postpone and rest."
      },
      "newScenario": {
        "ru": "Новая сцена: другой герой хотел немного порисовать, но день оказался утомительным. Как уменьшить шаг или заменить его отдыхом?",
        "en": "New scene: another character planned to draw briefly, but the day was tiring. How could the step shrink or become rest?"
      },
      "probeFields": [
        {
          "ru": "Уменьшенный шаг",
          "en": "A smaller step"
        },
        {
          "ru": "Альтернативный отдых",
          "en": "Alternative rest"
        }
      ]
    },
    {
      "day": 3,
      "title": {
        "ru": "Мой реальный запас времени и сил",
        "en": "My actual time and energy"
      },
      "sourceHash": "e981754f104dc3eb17eb277c1d4555ebb287e36df9f24eca2b9e56d097acd7da",
      "practice": {
        "ru": "карта дня «энергия, время, ответственность, здоровье, транспорт, помощь»; отдельно отмечаются доступные и недоступные ресурсы без численного «уровня продуктивности».",
        "en": "Map energy, time, responsibilities, health, transport and help. Distinguish available from unavailable resources without a productivity score."
      },
      "transfer": {
        "ru": "выбрать задачу с меньшей нагрузкой в другом расписании.",
        "en": "Choose a lower-demand task for a different schedule."
      },
      "artifact": {
        "ru": "личное условие «мне нужно …».",
        "en": "An actual condition I need."
      },
      "alternative": {
        "ru": "общий учебный пример вместо личного дня.",
        "en": "Use a general fictional day instead of personal information."
      },
      "choices": [
        {
          "ru": "Время",
          "en": "Time"
        },
        {
          "ru": "Силы и здоровье без подробностей",
          "en": "Energy and health without details"
        },
        {
          "ru": "Ответственность и дела",
          "en": "Responsibilities and tasks"
        },
        {
          "ru": "Транспорт и доступная среда",
          "en": "Transport and accessibility"
        },
        {
          "ru": "Помощь",
          "en": "Help"
        }
      ],
      "fields": [
        {
          "ru": "Доступные условия",
          "en": "Available conditions"
        },
        {
          "ru": "Недоступные условия",
          "en": "Unavailable conditions"
        },
        {
          "ru": "Задача с меньшей нагрузкой",
          "en": "A lower-demand task"
        },
        {
          "ru": "Мне нужно…",
          "en": "What I need…"
        }
      ],
      "scene": {
        "ru": "Учебный день: у героя короткое свободное окно, нет транспорта и есть возможность получить информацию дистанционно. Это условия, а не оценка старания.",
        "en": "Fictional day: a character has a short free period, no transport and access to information remotely. These are conditions, not a judgement of effort."
      },
      "newScenario": {
        "ru": "Новая сцена: в другом расписании свободное время перенесли на вечер, а помощь недоступна. Какую задачу можно уменьшить или отложить?",
        "en": "New scene: in another schedule, free time moves to the evening and help is unavailable. Which task could be reduced or postponed?"
      },
      "probeFields": [
        {
          "ru": "Изменившееся условие",
          "en": "Changed condition"
        },
        {
          "ru": "Более посильная задача или отдых",
          "en": "A more workable task or rest"
        }
      ]
    },
    {
      "day": 4,
      "title": {
        "ru": "Могу выбирать темп",
        "en": "I can choose the pace"
      },
      "sourceHash": "ad68443fe3448a226b5a2fbf0458958fa85fae6b50553783975fd6f4c5177e90",
      "practice": {
        "ru": "интерактивный календарь, где выбранное небольшое дело можно перенести, сократить, разбить или заменить отдыхом.",
        "en": "In a calendar or its text equivalent, move, shorten, divide or replace a small task with rest. Do not push against safety limits."
      },
      "transfer": {
        "ru": "изменить план при неожиданной усталости персонажа.",
        "en": "Change the plan when a fictional person is unexpectedly tired."
      },
      "artifact": {
        "ru": "гибкий план А/Б.",
        "en": "A flexible A/B plan."
      },
      "alternative": {
        "ru": "только выбрать паузу и не записывать задачу.",
        "en": "Choose a pause without writing down a task."
      },
      "choices": [
        {
          "ru": "Перенести",
          "en": "Reschedule"
        },
        {
          "ru": "Сократить",
          "en": "Shorten"
        },
        {
          "ru": "Разбить на части",
          "en": "Split into parts"
        },
        {
          "ru": "Заменить отдыхом",
          "en": "Replace with rest"
        }
      ],
      "fields": [
        {
          "ru": "Небольшое дело по желанию",
          "en": "Small task, if wanted"
        },
        {
          "ru": "Подходящее время или без срока",
          "en": "Workable time or no deadline"
        },
        {
          "ru": "План А",
          "en": "Plan A"
        },
        {
          "ru": "План Б с правом отдыха",
          "en": "Plan B including rest"
        }
      ],
      "scene": {
        "ru": "Текстовый календарь: утром обычные дела, днём свободное окно, вечером отдых. Небольшое дело можно переместить, сократить или убрать.",
        "en": "Text calendar: ordinary tasks in the morning, a free period in the afternoon, rest in the evening. A small task can move, shrink or be removed."
      },
      "newScenario": {
        "ru": "Новая сцена: свободное окно появилось позже, а герой неожиданно устал. Как изменить план, сохранив отдых?",
        "en": "New scene: the free period comes later and the character is unexpectedly tired. How could the plan change while retaining rest?"
      },
      "probeFields": [
        {
          "ru": "Изменённый план А",
          "en": "Revised plan A"
        },
        {
          "ru": "Запасной отдых или перенос",
          "en": "Backup rest or rescheduling"
        }
      ]
    },
    {
      "day": 5,
      "title": {
        "ru": "В жизни может быть место интересу",
        "en": "There may be room for interest"
      },
      "sourceHash": "0f89e0bad94301c55fab0e86c3339282b44aec88b67e0785e60893f7a7653615",
      "practice": {
        "ru": "обзор нейтральных, неопасных видов активности (музыка, свежий воздух при доступности, чтение, рисование, тёплый напиток, наблюдение за природой); выбрать, что сейчас скорее допустимо.",
        "en": "Explore neutral, safe activities: music, accessible fresh air, reading, drawing, a warm drink or observing nature. Choose what seems acceptable; enjoyment is not required."
      },
      "transfer": {
        "ru": "сравнить короткую и длинную форму одного занятия.",
        "en": "Compare a short and a longer form of the same activity."
      },
      "artifact": {
        "ru": "карта «что может быть приятным или хотя бы приемлемым».",
        "en": "What could be pleasant or at least acceptable."
      },
      "alternative": {
        "ru": "ни одного обязательного занятия.",
        "en": "No activity is compulsory."
      },
      "choices": [
        {
          "ru": "Музыка",
          "en": "Music"
        },
        {
          "ru": "Свежий воздух, если доступен",
          "en": "Fresh air, if accessible"
        },
        {
          "ru": "Чтение",
          "en": "Reading"
        },
        {
          "ru": "Рисование",
          "en": "Drawing"
        },
        {
          "ru": "Тёплый напиток",
          "en": "A warm drink"
        },
        {
          "ru": "Наблюдение за природой",
          "en": "Observing nature"
        },
        {
          "ru": "Сейчас ни одно",
          "en": "None now"
        }
      ],
      "fields": [
        {
          "ru": "Приемлемое занятие или отсутствие",
          "en": "Acceptable activity or none"
        },
        {
          "ru": "Короткая форма",
          "en": "Short form"
        },
        {
          "ru": "Более длинная форма по желанию",
          "en": "Longer form, if wanted"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: герой рассматривает чтение одной страницы или нескольких. Можно выбрать короткий вариант без обещания радости.",
        "en": "Fictional scene: a character considers reading one page or several. A short form may be chosen without a promise of enjoyment."
      },
      "newScenario": {
        "ru": "Новая сцена: другой герой рассматривает музыку. Чем отличается послушать небольшой фрагмент от целого альбома, и какой вариант допустим сейчас?",
        "en": "New scene: another character considers music. How do a short excerpt and a whole album differ, and which option is workable now?"
      },
      "probeFields": [
        {
          "ru": "Короткая форма другого занятия",
          "en": "Short form of another activity"
        },
        {
          "ru": "Более длинная форма или отказ",
          "en": "Longer form or declining"
        }
      ]
    },
    {
      "day": 6,
      "title": {
        "ru": "Я могу попробовать — и изменить решение",
        "en": "I can try and change my mind"
      },
      "sourceHash": "cced926140379a35195c759229731d419b2b722ce3e3305da6b6d18e9022938c",
      "practice": {
        "ru": "конструктор «когда будет удобно / 2 минуты / где / если не получится, то …» для нейтрального занятия; выполненная попытка сообщается только добровольно.",
        "en": "Build a neutral activity plan: when convenient, about two minutes, where, and if it does not work then… Reporting an actual attempt is voluntary."
      },
      "transfer": {
        "ru": "изменить сценарий при препятствии.",
        "en": "Change the scenario when an obstacle appears."
      },
      "artifact": {
        "ru": "маленький план «если–то».",
        "en": "A small if–then plan."
      },
      "alternative": {
        "ru": "без действий за пределами приложения.",
        "en": "No action outside the app is required."
      },
      "choices": [
        {
          "ru": "Выбрать удобное время",
          "en": "Choose a convenient time"
        },
        {
          "ru": "Оставить короткую пробу",
          "en": "Keep the attempt brief"
        },
        {
          "ru": "Выбрать доступное место",
          "en": "Choose an accessible place"
        },
        {
          "ru": "Добавить «если не получится»",
          "en": "Add if it does not work"
        },
        {
          "ru": "Отказаться от действия",
          "en": "Decline the action"
        }
      ],
      "fields": [
        {
          "ru": "Когда будет удобно",
          "en": "When convenient"
        },
        {
          "ru": "Короткий объём по желанию",
          "en": "Brief amount, if wanted"
        },
        {
          "ru": "Где",
          "en": "Where"
        },
        {
          "ru": "Если не получится, то…",
          "en": "If it does not work, then…"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: герой хочет на пару минут разложить карандаши в удобном месте. Это план, а не доказательство выполненного действия.",
        "en": "Fictional scene: a character would like to sort pencils briefly in a workable place. This is a plan, not evidence the action happened."
      },
      "newScenario": {
        "ru": "Новая сцена: доступный стол оказался занят. Как изменить место, уменьшить занятие или оставить отдых в плане «если–то»?",
        "en": "New scene: the available table is occupied. How could the place change, the activity shrink or rest enter the if–then plan?"
      },
      "probeFields": [
        {
          "ru": "Новое препятствие",
          "en": "New obstacle"
        },
        {
          "ru": "Изменённое «если–то»",
          "en": "Revised if–then plan"
        }
      ]
    },
    {
      "day": 7,
      "title": {
        "ru": "Действие и восстановление могут соседствовать",
        "en": "Action and recovery can sit together"
      },
      "sourceHash": "d5d036411b31972268ab0c1e3fe4ebf8568a0056c0adb56590c4acdf838b9105",
      "practice": {
        "ru": "на календарной ленте разместить блок «задача — отдых — запас времени» для вымышленного дня и выбрать удобный ритм.",
        "en": "Arrange task, rest and spare time on a fictional day’s timeline or a text list. Choose a workable rhythm."
      },
      "transfer": {
        "ru": "при увеличении нагрузки сократить задачу и сохранить отдых.",
        "en": "If demands increase, reduce the task and keep rest."
      },
      "artifact": {
        "ru": "моя модель чередования.",
        "en": "My optional pattern of activity and recovery."
      },
      "alternative": {
        "ru": "только план восстановительного времени.",
        "en": "Plan recovery time only."
      },
      "choices": [
        {
          "ru": "Небольшая задача",
          "en": "A small task"
        },
        {
          "ru": "Отдых",
          "en": "Rest"
        },
        {
          "ru": "Запас времени",
          "en": "Spare time"
        },
        {
          "ru": "Только восстановительное время",
          "en": "Recovery time only"
        }
      ],
      "fields": [
        {
          "ru": "Блок задачи по желанию",
          "en": "Optional task block"
        },
        {
          "ru": "Блок отдыха",
          "en": "Rest block"
        },
        {
          "ru": "Запас времени",
          "en": "Spare-time block"
        },
        {
          "ru": "Порядок чередования",
          "en": "Order of alternation"
        }
      ],
      "scene": {
        "ru": "Учебная лента: небольшая бытовая задача, затем отдых и свободный запас. Блок задачи можно уменьшить или убрать.",
        "en": "Educational timeline: a small household task, then rest and spare time. The task block may shrink or be removed."
      },
      "newScenario": {
        "ru": "Новая сцена: в вымышленном дне добавилось обязательное дело. Как сократить необязательную задачу и сохранить место отдыху?",
        "en": "New scene: a fictional day gains a necessary task. How could an optional task shrink while keeping room for rest?"
      },
      "probeFields": [
        {
          "ru": "Что можно сократить",
          "en": "What can shrink"
        },
        {
          "ru": "Сохранённое время отдыха",
          "en": "Rest time retained"
        }
      ]
    },
    {
      "day": 8,
      "title": {
        "ru": "Мой день не должен быть идеальным",
        "en": "My day does not need to be perfect"
      },
      "sourceHash": "b4dd1d29c2a7979413d29d84e405382dc83556c63357335a8cbfa44f23cd0279",
      "practice": {
        "ru": "тренажёр «первый план сорвался» с вариантами «сделать меньше, попросить помощи, перенести, отказаться», все ответы допустимы в подходящем контексте.",
        "en": "Explore a fictional plan that falls through. Do less, ask for help, postpone or decline; each can fit the context without self-punishment."
      },
      "transfer": {
        "ru": "выбрать другую реакцию, если первый вариант не помог.",
        "en": "Choose another response if the first option does not help."
      },
      "artifact": {
        "ru": "персональное правило адаптации.",
        "en": "A personal adaptation rule."
      },
      "alternative": {
        "ru": "учебный комикс без личных планов.",
        "en": "Use a fictional comic or text story without personal plans."
      },
      "choices": [
        {
          "ru": "Сделать меньше",
          "en": "Do less"
        },
        {
          "ru": "Попросить помощи",
          "en": "Ask for help"
        },
        {
          "ru": "Перенести",
          "en": "Postpone"
        },
        {
          "ru": "Отказаться",
          "en": "Decline"
        }
      ],
      "fields": [
        {
          "ru": "Какой план изменился",
          "en": "Which plan changed"
        },
        {
          "ru": "Первый вариант адаптации",
          "en": "First adaptation option"
        },
        {
          "ru": "Другой вариант, если нужен",
          "en": "Another option, if needed"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: герой планировал разобрать бумаги, но доступное время сократилось. Можно выбрать любой подходящий контексту вариант.",
        "en": "Fictional scene: a character planned to sort papers but has less time. Any option fitting the context is available."
      },
      "newScenario": {
        "ru": "Новая сцена: помощь, на которую рассчитывал другой герой, не пришла. Какую другую реакцию выбрать, если попросить помощь сейчас не получается?",
        "en": "New scene: help another character expected does not arrive. What other response is available if asking for help is not workable now?"
      },
      "probeFields": [
        {
          "ru": "Что не помогло",
          "en": "What did not help"
        },
        {
          "ru": "Другой доступный ответ",
          "en": "Another available response"
        }
      ]
    },
    {
      "day": 9,
      "title": {
        "ru": "Контакт с людьми — по моему выбору",
        "en": "Contact with people is my choice"
      },
      "sourceHash": "59af47e5911d4460c43304ca9e30db945f135a1ab1e287a9042ad39dfebc183d",
      "practice": {
        "ru": "карта дистанций общения «сообщение/звонок/встреча/никакого контакта» с выбором только потенциально безопасного человека либо анонимной профессиональной поддержки.",
        "en": "Explore message, call, meeting or no contact. Consider only a potentially safe person or anonymous professional support."
      },
      "transfer": {
        "ru": "составить сообщение, ничего не отправляя автоматически.",
        "en": "Draft a message without sending anything automatically."
      },
      "artifact": {
        "ru": "вариант комфортного контакта.",
        "en": "A comfortable contact option."
      },
      "alternative": {
        "ru": "только гипотетический сценарий.",
        "en": "Use a hypothetical scenario only."
      },
      "choices": [
        {
          "ru": "Сообщение без отправки",
          "en": "A message without sending"
        },
        {
          "ru": "Звонок как вариант, без действия",
          "en": "A call as an option, without acting"
        },
        {
          "ru": "Встреча как вариант, без обязательства",
          "en": "A meeting as an option, without commitment"
        },
        {
          "ru": "Никакого контакта",
          "en": "No contact"
        },
        {
          "ru": "Анонимная профессиональная поддержка",
          "en": "Anonymous professional support"
        }
      ],
      "fields": [
        {
          "ru": "Комфортная дистанция связи",
          "en": "Comfortable contact distance"
        },
        {
          "ru": "Тип безопасной поддержки без имён",
          "en": "Type of safe support without names"
        },
        {
          "ru": "Неотправленный шаблон по желанию",
          "en": "Unsent template, if wanted"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: персонаж может узнать условия открытого кружка через справочную службу либо пока не связываться. Отправки и звонка здесь нет.",
        "en": "Fictional scene: a character may ask an information service about an open activity or make no contact yet. No message or call is made here."
      },
      "newScenario": {
        "ru": "Новая сцена: другой герой предпочитает письменный вопрос о расписании. Составьте необязательный черновик без имён и контактов или выберите отсутствие связи.",
        "en": "New scene: another character prefers a written question about a timetable. Draft an optional message without names or contact details, or choose no contact."
      },
      "probeFields": [
        {
          "ru": "Черновик без автоматической отправки",
          "en": "Draft without automatic sending"
        },
        {
          "ru": "Вариант отсутствия контакта",
          "en": "No-contact option"
        }
      ]
    },
    {
      "day": 10,
      "title": {
        "ru": "Я могу сохранять границы в отношениях",
        "en": "I can keep boundaries in relationships"
      },
      "sourceHash": "f1d139aa0d4cede731ca8efe3a7f3351d32ee39daf4bf6a22f2bf524e7559244",
      "practice": {
        "ru": "интерактивная сценка о чужой просьбе; выбрать «могу / не могу / позже / иначе» и уважительный способ выразить границу.",
        "en": "For another person’s neutral request, choose I can, I cannot, later or another way, and a respectful phrase. Reconciliation with unsafe people is not required."
      },
      "transfer": {
        "ru": "иной сценарий общения с меньшей подсказкой.",
        "en": "Try another communication scene with less guidance."
      },
      "artifact": {
        "ru": "короткая фраза границы.",
        "en": "A short boundary phrase."
      },
      "alternative": {
        "ru": "письменный шаблон.",
        "en": "Use a written template."
      },
      "choices": [
        {
          "ru": "Могу",
          "en": "I can"
        },
        {
          "ru": "Не могу",
          "en": "I cannot"
        },
        {
          "ru": "Позже",
          "en": "Later"
        },
        {
          "ru": "Иначе",
          "en": "Another way"
        }
      ],
      "fields": [
        {
          "ru": "Выбранная граница",
          "en": "Chosen boundary"
        },
        {
          "ru": "Уважительная формулировка",
          "en": "Respectful wording"
        },
        {
          "ru": "Доступный формат или пауза",
          "en": "Available format or pause"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: знакомый просит помочь перенести книги в удобное для него время. Можно отказаться, предложить другое время или иной формат в своих пределах.",
        "en": "Fictional scene: an acquaintance asks for help moving books at their preferred time. Refusal, another time or another format within one’s limits are options."
      },
      "newScenario": {
        "ru": "Новая сцена: вас просят задержаться после необязательного занятия, когда нужен отдых. Как выразить доступную границу своими словами или шаблоном?",
        "en": "New scene: you are asked to stay after an optional class when rest is needed. How could a workable boundary be expressed in your words or a template?"
      },
      "probeFields": [
        {
          "ru": "Фраза в новой сцене",
          "en": "Phrase in the new scene"
        },
        {
          "ru": "Сохранённая граница отдыха",
          "en": "Rest boundary retained"
        }
      ]
    },
    {
      "day": 11,
      "title": {
        "ru": "Что действительно мешает моему шагу",
        "en": "What actually gets in the way of my step"
      },
      "sourceHash": "b28c5bd02997bb9068d81bc52be47ea77093de6e02304f73ee69cb5f04a3b95a",
      "practice": {
        "ru": "карточки «не хватает времени, денег, транспорта, поддержки, сил, информации, доступной среды» сопоставить с способами помощи либо признанием ограничения.",
        "en": "Sort possible barriers such as time, money, transport, support, energy, information and accessibility into internal, external and beyond-control conditions. Match help where possible or acknowledge a limit."
      },
      "transfer": {
        "ru": "для новой цели отделить изменяемое от неуправляемого.",
        "en": "For a new goal, distinguish what can change from what is not under control."
      },
      "artifact": {
        "ru": "реалистичная карта препятствий.",
        "en": "A realistic barrier map."
      },
      "alternative": {
        "ru": "только история персонажа.",
        "en": "Use a fictional character’s story only."
      },
      "choices": [
        {
          "ru": "Время или деньги",
          "en": "Time or money"
        },
        {
          "ru": "Транспорт или доступная среда",
          "en": "Transport or accessibility"
        },
        {
          "ru": "Поддержка",
          "en": "Support"
        },
        {
          "ru": "Силы",
          "en": "Energy"
        },
        {
          "ru": "Информация",
          "en": "Information"
        },
        {
          "ru": "Признать неподконтрольное ограничение",
          "en": "Acknowledge a limit beyond control"
        }
      ],
      "fields": [
        {
          "ru": "Препятствие в примере",
          "en": "Barrier in the example"
        },
        {
          "ru": "Внутреннее, внешнее или неподконтрольное",
          "en": "Internal, external or beyond control"
        },
        {
          "ru": "Доступная помощь",
          "en": "Available help"
        },
        {
          "ru": "Что нельзя сейчас изменить",
          "en": "What cannot change now"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: персонаж хочет посетить библиотеку, но транспорт недоступен. Это внешнее условие; можно проверить доступный дистанционный вариант или отложить.",
        "en": "Fictional scene: a character wants to visit a library but transport is unavailable. This is an external condition; an accessible remote option can be checked or the visit postponed."
      },
      "newScenario": {
        "ru": "Новая сцена: герой хочет начать рисовать, но магазин закрыт, а дома есть обычный карандаш. Что изменяемо, а что сейчас не под его контролем?",
        "en": "New scene: a character wants to draw, but the shop is closed and an ordinary pencil is available at home. What can change, and what is outside their control now?"
      },
      "probeFields": [
        {
          "ru": "Изменяемое условие",
          "en": "A changeable condition"
        },
        {
          "ru": "Неподконтрольное условие",
          "en": "A condition beyond control"
        },
        {
          "ru": "Доступная помощь или признание ограничения",
          "en": "Available help or acknowledging the limit"
        }
      ]
    },
    {
      "day": 12,
      "title": {
        "ru": "У меня есть второй маршрут",
        "en": "I have another route"
      },
      "sourceHash": "c9c9439b8aa233ab51393e68462e3801fdb4e56210704280476845f8e869b185",
      "practice": {
        "ru": "конструктор «если A недоступно, могу B / попросить C / отложить», обязательное право выбрать отсутствие действий; исследовать, что уменьшает зависимость от одного плана.",
        "en": "Build if A is unavailable, I can B, ask C or postpone. Keep an explicit option to take no action and avoid depending on one plan."
      },
      "transfer": {
        "ru": "перестроить план при двух изменившихся условиях.",
        "en": "Rebuild a plan when two conditions change."
      },
      "artifact": {
        "ru": "А/Б/поддержка.",
        "en": "Plan A, plan B and support."
      },
      "alternative": {
        "ru": "взять готовый шаблон.",
        "en": "Use a ready-made template."
      },
      "choices": [
        {
          "ru": "Вариант Б",
          "en": "Option B"
        },
        {
          "ru": "Попросить доступную поддержку",
          "en": "Ask for available support"
        },
        {
          "ru": "Отложить",
          "en": "Postpone"
        },
        {
          "ru": "Не действовать",
          "en": "Take no action"
        }
      ],
      "fields": [
        {
          "ru": "Если А недоступно",
          "en": "If A is unavailable"
        },
        {
          "ru": "Могу Б",
          "en": "I can choose B"
        },
        {
          "ru": "Могу попросить поддержку",
          "en": "I can ask for support"
        },
        {
          "ru": "Могу отложить или не действовать",
          "en": "I can postpone or take no action"
        }
      ],
      "scene": {
        "ru": "Учебная сцена: выбранное место для занятия закрыто. Можно выбрать доступный домашний вариант, узнать о помощи или отложить всё.",
        "en": "Fictional scene: the chosen activity venue is closed. An accessible home option, asking about support or postponing everything are available."
      },
      "newScenario": {
        "ru": "Новая сцена: одновременно сократилось время и недоступен транспорт. Как перестроить план А/Б и поддержку, сохраняя отсутствие действий как вариант?",
        "en": "New scene: time is reduced and transport is unavailable at the same time. How could plans A/B and support change while preserving no action as an option?"
      },
      "probeFields": [
        {
          "ru": "Первое изменившееся условие",
          "en": "First changed condition"
        },
        {
          "ru": "Второе изменившееся условие",
          "en": "Second changed condition"
        },
        {
          "ru": "Новый А/Б или отсутствие действий",
          "en": "Revised A/B or no action"
        },
        {
          "ru": "Доступная поддержка",
          "en": "Available support"
        }
      ]
    },
    {
      "day": 13,
      "title": {
        "ru": "Мои реальные попытки и честный опыт",
        "en": "My actual attempts and honest experience"
      },
      "sourceHash": "b18eeb6c565587b8d5ed5b4a0097fb80f34fa878a606bf7f30351dcb5a5af160",
      "practice": {
        "ru": "обзор выбранных шагов: «попробовал/не пробовал/изменил/решил отдохнуть/предпочёл помощь»; клик не означает выполненное действие, отчёт добровольный.",
        "en": "Review chosen steps with optional reports: tried, did not try, changed, chose rest or preferred help. A click does not establish that an action happened outside the app."
      },
      "transfer": {
        "ru": "сформулировать один вывод «что стоит оставить или упростить».",
        "en": "State one conclusion about what to keep or simplify."
      },
      "artifact": {
        "ru": "карта фактов без оценок личности.",
        "en": "A facts-only experience map without judging the person."
      },
      "alternative": {
        "ru": "не давать отчёт.",
        "en": "Give no report."
      },
      "choices": [
        {
          "ru": "Пробовал(а), по моему сообщению",
          "en": "Tried, by my report"
        },
        {
          "ru": "Не пробовал(а)",
          "en": "Did not try"
        },
        {
          "ru": "Изменил(а) план",
          "en": "Changed the plan"
        },
        {
          "ru": "Решил(а) отдохнуть",
          "en": "Chose rest"
        },
        {
          "ru": "Предпочёл/предпочла помощь",
          "en": "Preferred help"
        },
        {
          "ru": "Без отчёта",
          "en": "No report"
        }
      ],
      "fields": [
        {
          "ru": "Добровольный факт или отсутствие отчёта",
          "en": "Optional report or no report"
        },
        {
          "ru": "Что стоит оставить",
          "en": "What is worth keeping"
        },
        {
          "ru": "Что можно упростить",
          "en": "What could be simplified"
        }
      ],
      "scene": {
        "ru": "Просмотрите только то, что помните и хотите сообщить. Выбор кнопки подтверждает выбор в приложении, а не действие за его пределами.",
        "en": "Review only what you remember and wish to report. Choosing a button establishes an in-app selection, not an action outside the app."
      },
      "newScenario": {
        "ru": "Новая учебная сцена: герой планировал три небольших дела, сделал одно и выбрал отдых; другой отчёт отсутствует. Какой вывод возможен без домысливания отсутствующих данных?",
        "en": "New fictional scene: a character planned three small tasks, did one and chose rest; another report is missing. What can be concluded without inventing missing data?"
      },
      "probeFields": [
        {
          "ru": "Известный факт",
          "en": "Known fact"
        },
        {
          "ru": "Что остаётся неизвестным",
          "en": "What remains unknown"
        },
        {
          "ru": "Что оставить или упростить",
          "en": "What to keep or simplify"
        }
      ]
    },
    {
      "day": 14,
      "title": {
        "ru": "Мой маршрут на ближайший месяц",
        "en": "My route for the coming month"
      },
      "sourceHash": "ff67a48b406b5ecca27511be7e72a13114e2094f80b59f2b76b48706a7c78c74",
      "practice": {
        "ru": "собрать личную карту «важная область → минимальный шаг → подходящее время → запасной отдых/помощь → сигналы пересмотра» на 2–4 недели, без обязательного расписания.",
        "en": "Build a flexible map for the next two to four weeks: meaningful area, minimum step, suitable time, backup rest or help, and signals to revise the plan. A fixed schedule is optional."
      },
      "transfer": {
        "ru": "сыграть нейтральный сценарий, когда нужно пересмотреть план.",
        "en": "Use a neutral scene that calls for revising the plan."
      },
      "artifact": {
        "ru": "карточка К6.",
        "en": "My course 6 route card."
      },
      "alternative": {
        "ru": "готовый план без личных деталей.",
        "en": "Use a ready-made plan without personal details."
      },
      "choices": [
        {
          "ru": "Важная область",
          "en": "Meaningful area"
        },
        {
          "ru": "Минимальный шаг или отдых",
          "en": "Minimum step or rest"
        },
        {
          "ru": "Подходящее время",
          "en": "Suitable time"
        },
        {
          "ru": "Запасной отдых или помощь",
          "en": "Backup rest or help"
        },
        {
          "ru": "Сигналы пересмотра",
          "en": "Signals for revising the plan"
        }
      ],
      "fields": [
        {
          "ru": "Важная область",
          "en": "Meaningful area"
        },
        {
          "ru": "Минимальный шаг или отдых",
          "en": "Minimum step or rest"
        },
        {
          "ru": "Подходящее время",
          "en": "Suitable time"
        },
        {
          "ru": "Запасной отдых или помощь",
          "en": "Backup rest or help"
        },
        {
          "ru": "Сигналы пересмотра",
          "en": "Signals for revising the plan"
        }
      ],
      "scene": {
        "ru": "Соберите гибкий маршрут только из доступных условий. Ни работа, ни общение, ни действие за пределами приложения не обязательны.",
        "en": "Build a flexible route only from available conditions. Work, social contact and action outside the app are optional."
      },
      "newScenario": {
        "ru": "Новая сцена: в запланированный день изменилось расписание и стало меньше сил. Как пересмотреть шаг, время и резерв отдыха/помощи, сохранив границу?",
        "en": "New scene: on the planned day, the timetable changes and less energy is available. How could the step, time and backup rest or help be revised while keeping a boundary?"
      },
      "probeFields": [
        {
          "ru": "Посильный шаг или отдых",
          "en": "Workable step or rest"
        },
        {
          "ru": "Реалистичный план А/Б",
          "en": "Realistic A/B plan"
        },
        {
          "ru": "Доступная граница или поддержка",
          "en": "Available boundary or support"
        },
        {
          "ru": "Сигнал пересмотра",
          "en": "A revision signal"
        }
      ]
    }
  ]
})

const CHECKS = deepFreeze({
  "AS1": [
    {
      "id": "A",
      "prompt": {
        "ru": "Выбрать внешний ориентир в нейтральной сцене",
        "en": "Choose an external anchor in a neutral scene"
      },
      "scene": {
        "ru": "В новой комнате видны окно, стол и дверь. Выберите одну внешнюю деталь без поиска угроз.",
        "en": "A new room has a window, table and door. Choose an external detail without searching for threats."
      },
      "options": [
        {
          "ru": "Рама окна",
          "en": "Window frame"
        },
        {
          "ru": "Край стола",
          "en": "Table edge"
        },
        {
          "ru": "Контур двери",
          "en": "Door outline"
        }
      ]
    },
    {
      "id": "B",
      "prompt": {
        "ru": "Показать паузу или безопасный отказ",
        "en": "Choose a pause or a safe refusal"
      },
      "scene": {
        "ru": "Появилось необязательное дополнительное задание. Как оставить право остановиться?",
        "en": "An optional extra task appears. How could the option to stop be kept?"
      },
      "options": [
        {
          "ru": "Остановлюсь сейчас",
          "en": "I will stop now"
        },
        {
          "ru": "Отложу это задание",
          "en": "I will postpone this task"
        },
        {
          "ru": "Сейчас не готов(а) продолжать",
          "en": "I am not ready to continue now"
        }
      ]
    },
    {
      "id": "C",
      "prompt": {
        "ru": "Назвать доступный путь помощи или отдыха",
        "en": "Name an available route to help or rest"
      },
      "scene": {
        "ru": "В учебном зале можно выйти на спокойную паузу или обратиться в открытую справочную. Какой доступный путь выбрать?",
        "en": "In the fictional hall, a quiet break and an open information desk are available. Which route is workable?"
      },
      "options": [
        {
          "ru": "Отойду на доступную паузу",
          "en": "Take an available break"
        },
        {
          "ru": "Спрошу информацию в открытой справочной",
          "en": "Ask the open information desk"
        },
        {
          "ru": "Пауза сначала, справочная как резерв",
          "en": "A break first, with the information desk as backup"
        }
      ]
    }
  ],
  "AS2": [
    {
      "id": "A",
      "prompt": {
        "ru": "Различить «много давления» и «мало сил»",
        "en": "Distinguish high demands from low energy"
      },
      "scene": {
        "ru": "У Даны несколько срочных просьб одновременно. У Льва одна небольшая задача, но после обычного дня мало сил. Как различить две сцены?",
        "en": "Dana has several urgent requests at once. Lev has one small task but little energy after an ordinary day. How do the scenes differ?"
      },
      "options": [
        {
          "ru": "У Даны много требований; у Льва мало сил",
          "en": "Dana has high demands; Lev has low energy"
        },
        {
          "ru": "Сначала разделю требования и запас сил в каждой сцене",
          "en": "First separate demands and energy in each scene"
        }
      ]
    },
    {
      "id": "B",
      "prompt": {
        "ru": "Подобрать две безопасные стратегии и выбрать паузу",
        "en": "Choose two safe strategies and keep a pause"
      },
      "scene": {
        "ru": "В первой сцене можно сократить необязательную просьбу, во второй — оставить время для восстановления. Какой набор подходит?",
        "en": "In the first scene an optional request can shrink; in the second, recovery time can be retained. Which combination fits?"
      },
      "options": [
        {
          "ru": "Сократить требования; оставить отдых; сделать паузу",
          "en": "Reduce demands; retain rest; take a pause"
        },
        {
          "ru": "Попросить помощь с частью дела; перенести задачу; сделать паузу",
          "en": "Ask for help with part of the task; postpone it; take a pause"
        }
      ]
    },
    {
      "id": "C",
      "prompt": {
        "ru": "Составить основной и запасной план",
        "en": "Build a main and backup plan"
      },
      "scene": {
        "ru": "Небольшое дело можно сократить. Если помощи не будет, задачу можно отложить. Выберите реалистичный план А/Б.",
        "en": "A small task can shrink. If help is unavailable, it may be postponed. Choose a realistic A/B plan."
      },
      "options": [
        {
          "ru": "А: одна часть с помощью; Б: перенести и отдохнуть",
          "en": "A: one part with help; B: postpone and rest"
        },
        {
          "ru": "А: короткая самостоятельная часть; Б: остановиться и уточнить помощь позже",
          "en": "A: a brief independent part; B: stop and ask about help later"
        }
      ]
    }
  ],
  "AS3": [
    {
      "id": "A",
      "prompt": {
        "ru": "Назвать чувство или осознанно выбрать «не знаю»",
        "en": "Name a feeling or deliberately choose not sure"
      },
      "scene": {
        "ru": "Герой неожиданно получил приглашение в новый книжный клуб. Его чувства неизвестны. Какое слово возможно?",
        "en": "A character unexpectedly receives an invitation to a new book club. Their feelings are unknown. Which word might fit?"
      },
      "options": [
        {
          "ru": "Любопытство",
          "en": "Curiosity"
        },
        {
          "ru": "Растерянность",
          "en": "Confusion"
        },
        {
          "ru": "Нейтрально",
          "en": "Neutral"
        },
        {
          "ru": "Не знаю",
          "en": "Not sure"
        }
      ]
    },
    {
      "id": "B",
      "prompt": {
        "ru": "Выбрать комфортную дистанцию или отступление",
        "en": "Choose comfortable distance or stepping back"
      },
      "scene": {
        "ru": "Герой не хочет дальше обсуждать переживание. Как оставить комфортную дистанцию?",
        "en": "The character does not want to discuss the feeling further. How could a comfortable distance be kept?"
      },
      "options": [
        {
          "ru": "Перейти к нейтральному тексту",
          "en": "Switch to neutral text"
        },
        {
          "ru": "Отойти на паузу",
          "en": "Step back for a break"
        },
        {
          "ru": "Закончить эмоциональный шаг",
          "en": "End the emotion step"
        }
      ]
    },
    {
      "id": "C",
      "prompt": {
        "ru": "Вернуться к безопасному внешнему ориентиру в новой сцене",
        "en": "Return to a safe external anchor in a new scene"
      },
      "scene": {
        "ru": "В другой нейтральной комнате видны полка и обычный стол. Куда можно перенести внимание, оставив эмоциональное обсуждение?",
        "en": "Another neutral room has a shelf and an ordinary table. Where could attention move after leaving the emotional discussion?"
      },
      "options": [
        {
          "ru": "К видимой линии полки",
          "en": "To a visible line on the shelf"
        },
        {
          "ru": "К форме обычного стола",
          "en": "To the shape of the ordinary table"
        },
        {
          "ru": "К текстовому описанию стола",
          "en": "To a text description of the table"
        }
      ]
    }
  ],
  "AS5": [
    {
      "id": "A",
      "prompt": {
        "ru": "Выбрать реалистичную неунижающую поддержку",
        "en": "Choose realistic support without humiliation"
      },
      "scene": {
        "ru": "Персонаж не закончил обычную задачу. Какую поддержку можно выбрать без искусственного обещания успеха?",
        "en": "A character has not finished an ordinary task. What support fits without an artificial promise of success?"
      },
      "options": [
        {
          "ru": "Сейчас трудно; можно уменьшить объём",
          "en": "It is difficult now; the amount can shrink"
        },
        {
          "ru": "Незавершённая задача не определяет достоинство",
          "en": "An unfinished task does not determine dignity"
        },
        {
          "ru": "Можно сделать паузу и рассмотреть помощь",
          "en": "A pause and help can be considered"
        }
      ]
    },
    {
      "id": "B",
      "prompt": {
        "ru": "Назвать ценность или доступное направление",
        "en": "Name a value or accessible direction"
      },
      "scene": {
        "ru": "Герой выбирает одно направление на ближайшее время без требования доказать свою ценность результатом.",
        "en": "A character chooses one direction for the near future without having to prove their worth through results."
      },
      "options": [
        {
          "ru": "Забота и доступный отдых",
          "en": "Care and available rest"
        },
        {
          "ru": "Учёба в посильном объёме",
          "en": "Learning in a workable amount"
        },
        {
          "ru": "Творчество без оценки результата",
          "en": "Creativity without grading the result"
        },
        {
          "ru": "Честность о своих пределах",
          "en": "Honesty about one’s limits"
        }
      ]
    },
    {
      "id": "C",
      "prompt": {
        "ru": "Выбрать границу и резерв помощи",
        "en": "Choose a boundary and backup help"
      },
      "scene": {
        "ru": "Знакомый предлагает ещё одно дело, а сил мало. Какую границу и реально доступный резерв можно оставить?",
        "en": "An acquaintance suggests another task when energy is low. What boundary and genuinely available backup could remain?"
      },
      "options": [
        {
          "ru": "Не сейчас; при необходимости обращусь за практической помощью",
          "en": "Not now; I can seek practical help if needed"
        },
        {
          "ru": "Меньший объём; если не подходит, пауза и доступная консультация",
          "en": "A smaller amount; otherwise a pause and an available consultation"
        },
        {
          "ru": "Откажусь; уточню помощь подходящей службы позже",
          "en": "I will decline and ask a suitable service about help later"
        }
      ]
    }
  ],
  "AS6": [
    {
      "id": "A",
      "prompt": {
        "ru": "Выбрать достижимый шаг или альтернативный отдых",
        "en": "Choose a doable step or alternative rest"
      },
      "scene": {
        "ru": "У героя есть несколько свободных минут и обычный карандаш. Можно сделать короткий набросок или отдохнуть.",
        "en": "A character has a few free minutes and an ordinary pencil. A brief sketch or rest are both possible."
      },
      "options": [
        {
          "ru": "Одна линия или небольшой набросок",
          "en": "One line or a small sketch"
        },
        {
          "ru": "Только подготовить карандаш",
          "en": "Only prepare the pencil"
        },
        {
          "ru": "Отдохнуть без действия",
          "en": "Rest without an action"
        }
      ]
    },
    {
      "id": "B",
      "prompt": {
        "ru": "Составить реалистичный план А/Б при изменении условий",
        "en": "Build a realistic A/B plan when conditions change"
      },
      "scene": {
        "ru": "Расписание поменялось, и выбранное место недоступно. Как изменить план без обязательного выполнения?",
        "en": "The timetable changes and the chosen place is unavailable. How could the plan change without compulsory completion?"
      },
      "options": [
        {
          "ru": "А: короткая домашняя версия; Б: перенести и отдохнуть",
          "en": "A: a short home version; B: postpone and rest"
        },
        {
          "ru": "А: уточнить доступное время; Б: ничего не делать сейчас",
          "en": "A: check an available time; B: do nothing now"
        }
      ]
    },
    {
      "id": "C",
      "prompt": {
        "ru": "Выбрать доступную границу или поддержку",
        "en": "Choose an available boundary or support"
      },
      "scene": {
        "ru": "Появилась новая необязательная просьба. Доступны отказ, другой срок или помощь с одной частью. Что выбрать?",
        "en": "A new optional request appears. Refusal, another time or help with one part are available. What could be chosen?"
      },
      "options": [
        {
          "ru": "Не могу взять это сейчас",
          "en": "I cannot take this on now"
        },
        {
          "ru": "Предложу другой срок в своих пределах",
          "en": "Offer another time within my limits"
        },
        {
          "ru": "Попрошу доступную помощь с одной частью",
          "en": "Ask for available help with one part"
        }
      ]
    }
  ]
})

const EVIDENCE = deepFreeze([
  { value: 'independent', label: { ru: 'Выбрал(а) самостоятельно', en: 'Selected independently' } },
  { value: 'guided', label: { ru: 'Выбрал(а) с подсказкой', en: 'Selected with a hint' } },
  { value: 'not_tried', label: { ru: 'Не пробовал(а)', en: 'Did not try' } },
  { value: 'not_suitable', label: { ru: 'Упражнение не подходит', en: 'The exercise does not fit' } },
])
const OPTIONAL_DRAFT = Object.freeze({
  ru: 'Все поля необязательны. Можно не писать, читать, отдохнуть или закончить. Это локальный черновик; перенос в защищённую личную запись требует отдельного выбора. Клик подтверждает только выбор в приложении, а не действие за его пределами.',
  en: 'Every field is optional. You may leave it blank, read, rest or finish. This is a local draft; copying it to a protected personal entry requires a separate choice. A click records only an in-app selection, not an action outside the app.',
})
const SAFETY = Object.freeze({
  ru: 'Образовательная практика без диагноза и оценки здоровья. Не нужно вспоминать тяжёлые события, закрывать глаза или добиваться изменения чувств. Можно читать, использовать текст без образов, остановиться или пропустить. При реальной опасности важны защита и доступная помощь.',
  en: 'An educational practice without diagnosis or a health score. There is no need to recall distressing events, close your eyes or change your feelings. You may read, use text without imagery, stop or skip. Actual danger calls for protection and available help.',
})
const sourceFor = (moduleId, day, hash = null, section = SECTIONS[moduleId]) => ({
  document: SOURCE_DOCUMENT,
  revision: 'TRAUMA-1.3',
  section,
  goalsSection: '10.2',
  day,
  ...(hash ? { approvedDetailSha256: hash } : {}),
})
function dayRow(moduleId, day) {
  if (typeof moduleId !== 'string' || !Object.hasOwn(DAYS, moduleId) ||
      !Number.isInteger(day) || day < 1 || day > 14) return null
  return DAYS[moduleId][day - 1]
}

/** Fresh objects, strict day bounds, English fallback. AS2/AS4 remain outside this catalog. */
export function traumaPhaseLesson(moduleId, day, locale = 'en') {
  const row = dayRow(moduleId, day)
  if (!row) return null
  const lang = locale === 'ru' ? 'ru' : 'en'
  const title = read(row.title, lang)
  const alternative = read(row.alternative, lang)
  const artifact = read(row.artifact, lang)
  const previous = day > 1 ? read(DAYS[moduleId][day - 2].title, lang) : null
  return {
    version: VERSION, moduleId, day,
    source: sourceFor(moduleId, day, row.sourceHash),
    title, theme: title,
    practice: read(row.practice, lang),
    learningOutcome: lang === 'ru'
      ? `Учебный ориентир: ${artifact} Можно выбрать вариант, оставить поля пустыми или отказаться; это не оценка здоровья или владения навыком.`
      : `Educational focus: ${artifact} You may choose an option, leave fields blank or decline; this is not a health or mastery rating.`,
    recall: previous
      ? (lang === 'ru' ? `При желании вспомните один доступный выбор из темы «${previous}». Можно не вспоминать и продолжить.`
        : `If wanted, recall one available choice from “${previous}”. You may leave recall aside and continue.`)
      : (lang === 'ru' ? 'Выберите, хотите ли вы знакомиться с темой сегодня. Предыдущий курс и личный рассказ не нужны.'
        : 'Choose whether to explore the topic today. No previous course or personal account is needed.'),
    mainScenario: read(row.scene, lang),
    newScenario: read(row.newScenario, lang),
    transfer: read(row.transfer, lang),
    reflection: `${read(row.transfer, lang)}\n\n${read(row.newScenario, lang)}`,
    artifact,
    withoutImagery: lang === 'ru'
      ? `Можно использовать текст и готовые слова без воображения и личных воспоминаний. ${alternative}`
      : `Use text and ready-made words without imagery or personal memories. ${alternative}`,
    alternatives: {
      readOnly: lang === 'ru' ? 'Только прочитать; ничего выбирать или записывать не требуется.' : 'Read only; no selection or writing is required.',
      noImagery: alternative,
      skip: lang === 'ru' ? 'Пропустить или закончить без оценки неуспеха.' : 'Skip or finish without a failure label.',
    },
    fields: row.fields.map(value => read(value, lang)),
    newScenarioFields: row.probeFields.map(value => read(value, lang)),
    checkpoints: day === 14 ? traumaPhaseCheckpoints(moduleId, lang) : [],
  }
}

/** Uses the existing methodActivity/practiceLab transport with phase-specific content only. */
export function traumaPhaseInteractionPlan(moduleId, day, locale = 'en') {
  const row = dayRow(moduleId, day)
  if (!row) return null
  const lang = locale === 'ru' ? 'ru' : 'en'
  const lesson = traumaPhaseLesson(moduleId, day, lang)
  const prefix = `t13_${moduleId.toLowerCase()}d${String(day).padStart(2, '0')}_`
  const kind = `${moduleId.toLowerCase()}_phase_day_${String(day).padStart(2, '0')}`
  const options = [
    ...row.choices.map((value, index) => ({ id: `${prefix}c${index + 1}`, label: read(value, lang) })),
    { id: `${prefix}read`, label: lesson.alternatives.readOnly },
    { id: `${prefix}text`, label: lang === 'ru' ? 'Текстовый вариант без образов' : 'Text without imagery' },
    { id: 'skip', label: lang === 'ru' ? 'Пропустить или отдохнуть' : 'Skip or rest' },
  ]
  const prompt = `${lesson.practice}\n\n${lesson.mainScenario}`
  return {
    schema: 'opora-trauma13-interactions-1',
    version: VERSION,
    source: { ...lesson.source },
    methodActivity: {
      day, kind, skillId: `${moduleId}-${String(day).padStart(2, '0')}`,
      skill: lesson.title, title: lesson.title, prompt,
      choices: options.map(({ id, label }) => ({ value: id, label })),
      safeText: SAFETY[lang],
      actionText: OPTIONAL_DRAFT[lang],
    },
    practiceLab: {
      main: {
        method: kind, title: lesson.title, instruction: prompt,
        steps: [lesson.withoutImagery, OPTIONAL_DRAFT[lang]],
        options: options.map(option => ({ ...option })),
        format: 'worksheet', fields: [...lesson.fields],
      },
      reflect: {
        method: `${kind}_review`,
        title: lang === 'ru' ? `${lesson.title}: новая учебная сцена` : `${lesson.title}: a new learning scene`,
        instruction: lesson.reflection,
        steps: [
          lang === 'ru'
            ? 'Используйте отдельные поля для новой сцены. Подсказка допустима и отмечается отдельно; после подсказки не выбирайте самостоятельную пробу. Отказ или неподходящий вариант не означают неуспех.'
            : 'Use the separate fields for the new scene. A hint is allowed and recorded separately; after a hint, do not choose an independent attempt. Declining or an unsuitable exercise is not failure.',
          OPTIONAL_DRAFT[lang],
        ],
        options: [
          { id: `${prefix}independent`, label: lang === 'ru' ? 'По моему сообщению: рассмотрел(а) новую сцену без дополнительной подсказки' : 'By my report: considered the new scene without an extra hint' },
          { id: `${prefix}hint`, label: lang === 'ru' ? 'По моему сообщению: использовал(а) подсказку в новой сцене' : 'By my report: used a hint for the new scene' },
          { id: `${prefix}defer`, label: lang === 'ru' ? 'Новую пробу не выполнял(а)' : 'Did not try the new scene' },
          { id: `${prefix}not_suitable`, label: lang === 'ru' ? 'Новая проба мне не подходит' : 'The new scene does not fit me' },
          { id: 'skip', label: lang === 'ru' ? 'Пропустить разбор' : 'Skip the review' },
        ],
        format: 'worksheet', fields: [...lesson.newScenarioFields],
      },
    },
  }
}

/** Optional §10.2 educational checks, separate from ratings and lesson completion. */
export function traumaPhaseCheckpoints(moduleId, locale = 'en') {
  if (typeof moduleId !== 'string' || !Object.hasOwn(CHECKS, moduleId)) return []
  const lang = locale === 'ru' ? 'ru' : 'en'
  return CHECKS[moduleId].map(row => ({
    id: row.id,
    moduleId, day: 14, version: VERSION,
    source: sourceFor(moduleId, 14, null, '10.2'),
    prompt: read(row.prompt, lang),
    scene: read(row.scene, lang),
    options: row.options.map((value, index) => ({ value: `${moduleId.toLowerCase()}_${row.id.toLowerCase()}_${index + 1}`, label: read(value, lang) })),
    evidenceStates: EVIDENCE.map(value => ({ value: value.value, label: read(value.label, lang) })),
    required: false,
    completionGate: false,
    evidenceScope: 'in_app_choice_and_voluntary_report',
    guidance: lang === 'ru'
      ? 'Это необязательная учебная проба. Состояние — ваш добровольный отчёт; приложение видит только выбранный вариант. Подсказка исключает отметку «самостоятельно». Можно не пробовать или отметить неподходящее упражнение. Психологического балла и требования для завершения урока нет.'
      : 'This is an optional learning trial. The state is your voluntary report; the app observes only the selected option. A hint rules out an independent label. You may leave it untried or mark it unsuitable. There is no psychological score or lesson-completion requirement.',
  }))
}
