// OPORA Anti-Stress AS-OUTCOME-3.0: original trauma-informed editorial content.
// Not PTSD/shock-trauma treatment, exposure, forced bodywork or a clinical score algorithm.
// Immutable new-cycle version. Previously started V4 courses continue unchanged.
export const COURSE_ANTISTRESS_OUTCOME_V3 = 'hh-antistress-outcomes-v3-20261014'
const SKILL_NAMES = Object.freeze([["Orientation and choice","Ориентация и право выбора"],["Early signs of overload","Ранние признаки перегрузки"],["Gentle regulation and pacing","Мягкая регуляция и дозировка"],["Realistic sources of support","Доступные ресурсы"],["Flexible thinking","Гибкость мышления"],["Boundaries and human support","Границы и человеческая поддержка"],["Everyday transfer and personal plan","Самостоятельное применение"]])
const DAYS = Object.freeze([
  {
    "day": 1,
    "skillId": "S1",
    "title": [
      "I am here, and I can choose",
      "Я здесь, и могу выбирать"
    ],
    "teaching": [
      "You do not have to feel calm before beginning. Your first skill is finding a neutral point in your actual surroundings while retaining the freedom to stop.",
      "Необязательно сначала успокоиться. Сегодня мы учимся находить нейтральную точку в настоящем пространстве и сохранять право остановиться."
    ],
    "guide": [
      "With your eyes open, look at your immediate surroundings. Pick an ordinary object or one colour. If you wish, notice its edges, shape and where it is in relation to another object. Do not search for a particular emotion. You can pause and look away at any time. After a few comfortable moments, check whether you want to keep this object, choose a different one or stop. Nothing needs to change inside you for this to count as an experience.",
      "С открытыми глазами осмотритесь вокруг. Выберите обычный предмет или один цвет. Если хочется, заметьте его границы, форму и расположение относительно другого предмета. Не нужно искать особое чувство. Можно отвлечься или остановиться в любой момент. Через несколько комфортных мгновений решите, хотите ли сохранить этот ориентир, выбрать другой или завершить. Для полезного знакомства с практикой ощущения не обязаны меняться."
    ],
    "action": [
      "Choose one neutral colour, shape or object that you could find again without effort. Leaving it blank is also fine.",
      "Выберите один нейтральный цвет, форму или предмет, который легко заметить снова. Поле можно оставить пустым."
    ],
    "transfer": [
      "If a natural pause appears today, you may briefly notice this object again. This is an invitation, not homework.",
      "Если сегодня сама собой возникнет пауза, можно вновь взглянуть на этот предмет. Это приглашение, не домашнее задание."
    ],
    "reflection": [
      "Which choice in this exercise felt most comfortable: looking, reading, changing the object or stopping?",
      "Какой выбор оказался удобнее: смотреть, читать, сменить предмет или остановиться?"
    ],
    "quote": [
      "I can begin from my actual state, not an ideal one.",
      "Мне можно начинать с того состояния, которое есть."
    ],
    "neutral": [
      "You may simply read a neutral sentence or end the exercise. You do not need to focus on body sensations.",
      "Можно просто прочитать нейтральную фразу или завершить упражнение. Следить за телом необязательно."
    ],
    "outcome": [
      "A chosen neutral visual anchor or an honest decision not to use one.",
      "Один выбранный зрительный ориентир либо честный отказ от него."
    ],
    "scales": [
      "weekly.tension",
      "resource.agency"
    ],
    "probe": null
  },
  {
    "day": 2,
    "skillId": "S1",
    "title": [
      "I can return my attention",
      "Я могу возвращать внимание"
    ],
    "teaching": [
      "Returning attention is a choice, not a performance test. Practise gently with two ordinary things without triggering stressful memories.",
      "Возвращать внимание — это выбор, а не экзамен. Потренируемся на двух обычных объектах без воспоминаний о трудных событиях."
    ],
    "guide": [
      "Find a neutral detail in the room. Look at its shape for a few moments. When ready, look at a second harmless detail. You can come back to the first one or stay with the second. Let your attention move at a comfortable pace. If you forgot yesterday's anchor, you can select a new one. You may keep your eyes open and stop whenever you wish.",
      "Найдите нейтральную деталь в комнате. Несколько мгновений посмотрите на её форму. Когда будете готовы, переключитесь на другую обычную деталь. Можно вернуться к первой или остаться на второй. Меняйте фокус в комфортном темпе. Если не помните вчерашний ориентир, выберите новый. Глаза можно не закрывать и можно остановиться в любой момент."
    ],
    "action": [
      "Try to identify one available anchor in a different harmless scene. A hint or opting out is allowed.",
      "Попробуйте выбрать доступный ориентир в другой нейтральной сцене. Подсказка или отказ допустимы."
    ],
    "transfer": [
      "Your cue could be something already near you, not another reminder you must monitor.",
      "Ориентиром может быть то, что уже рядом, без нового обязательного напоминания."
    ],
    "reflection": [
      "What was easier today: choosing an object, returning to it or deciding to stop?",
      "Что сегодня было доступнее: выбрать предмет, вернуться к нему или решить остановиться?"
    ],
    "quote": [
      "I can bring attention back without blaming myself for distraction.",
      "Я могу возвращать внимание, не ругая себя за отвлечение."
    ],
    "neutral": [
      "Stay with one still picture or a single word instead of changing objects.",
      "Оставайтесь с одной неподвижной картинкой или одним словом, не переключая объекты."
    ],
    "outcome": [
      "A second attempt at visual orientation, with or without guidance.",
      "Повторная попытка внешней ориентировки с подсказкой или без."
    ],
    "scales": [
      "weekly.tension",
      "weekly.clarity"
    ],
    "probe": {
      "prompt": [
        "You are in a familiar room after finishing a task. What would you prefer to try?",
        "Вы закончили обычное дело и находитесь в знакомой комнате. Что вы предпочли бы попробовать?"
      ],
      "choices": [
        [
          "object",
          [
            "Notice one ordinary shape near me",
            "Заметить обычную форму рядом"
          ]
        ],
        [
          "colour",
          [
            "Look at a comfortable colour for a moment",
            "На мгновение заметить комфортный цвет"
          ]
        ],
        [
          "rest",
          [
            "Skip this exercise and rest",
            "Пропустить упражнение и отдохнуть"
          ]
        ]
      ],
      "hint": [
        "There is no single correct answer. Choose what is actually available and comfortable.",
        "Единственного правильного ответа нет. Выбирайте то, что доступно и комфортно."
      ]
    }
  },
  {
    "day": 3,
    "skillId": "S2",
    "title": [
      "My early overload signal",
      "Мой ранний сигнал перегрузки"
    ],
    "teaching": [
      "Stress can show up as hurried thoughts, lost focus, tension or fatigue. Noticing one early sign may give you more choice; it is not a diagnosis.",
      "Перегрузка может проявляться спешкой мыслей, потерей фокуса, напряжением или усталостью. Один замеченный ранний сигнал иногда помогает раньше выбрать поддержку; это не диагноз."
    ],
    "guide": [
      "Read a simple example: several messages arrive while you are busy with something else. Without bringing up an upsetting personal memory, consider what a first small sign of overload might be for you. Perhaps your thoughts speed up, you rush, stop concentrating or feel tired. You need only choose one possible sign, or say you do not know yet. Now look at one ordinary object in the room to complete the exercise.",
      "Представьте простой пример: пока вы заняты, приходит несколько сообщений. Не обращаясь к неприятным личным воспоминаниям, подумайте, какой первый небольшой признак перегрузки бывает вам знаком. Возможно, мысли ускоряются, появляется спешка, рассеивается внимание или чувствуется усталость. Достаточно выбрать один возможный сигнал или ответить «пока не знаю». В завершение посмотрите на обычный предмет вокруг."
    ],
    "action": [
      "Choose one signal you could notice early; pair it with a short neutral pause.",
      "Выберите один ранний сигнал, который можете узнавать, и соедините его с короткой нейтральной паузой."
    ],
    "transfer": [
      "You may recognise the signal in daily life, but you need not scan yourself all day.",
      "Можно заметить этот сигнал в обычной жизни, но не нужно постоянно следить за собой."
    ],
    "reflection": [
      "Which sign is easiest for you to recognise, if any?",
      "Какой сигнал вам проще всего узнавать, если такой есть?"
    ],
    "quote": [
      "An early signal can be information, not another reason for self-criticism.",
      "Ранний сигнал может быть информацией, а не поводом критиковать себя."
    ],
    "neutral": [
      "Stay with the fictional example, not your own symptoms. You can return to one neutral object.",
      "Можно оставаться только с вымышленным примером, не исследуя свои симптомы, и вернуться к нейтральному предмету."
    ],
    "outcome": [
      "One possible early sign, or a valid 'not sure yet'.",
      "Один возможный ранний сигнал или допустимое «пока не знаю»."
    ],
    "scales": [
      "weekly.load",
      "weekly.tension"
    ],
    "probe": null
  },
  {
    "day": 4,
    "skillId": "S2",
    "title": [
      "Too much pressure or too little energy?",
      "Слишком много давления или слишком мало сил?"
    ],
    "teaching": [
      "Feeling rushed and feeling drained may need different responses. We do not label these experiences as nervous-system diagnoses.",
      "Спешке и истощению могут подходить разные способы поддержки. Мы не превращаем эти переживания в диагнозы нервной системы."
    ],
    "guide": [
      "Consider two ordinary days. In the first, messages and demands keep coming. In the second, you feel worn out after effort. For the first, you might try a brief pause or simplify one harmless task. For the second, you might choose rest, a comfortable position or help. Think about which situation is closer to today without forcing an answer. Try just one suitable gentle choice for half a minute, or decide not to do it.",
      "Представьте два обычных дня. В первом сообщения и просьбы идут непрерывно. Во втором после нагрузки почти не осталось сил. В первом случае может подойти короткая пауза или упрощение одного безопасного дела. Во втором — отдых, удобное положение или помощь. Подумайте, какая ситуация сейчас ближе, но не требуйте от себя ответа. Если хочется, попробуйте один мягкий вариант около полуминуты или откажитесь."
    ],
    "action": [
      "Choose a matching pair: early sign → practical support, including rest or no change.",
      "Составьте подходящую пару «ранний сигнал → доступная поддержка», включая отдых или отсутствие изменений."
    ],
    "transfer": [
      "Is there one small demand you can safely shorten, postpone or ask for help with? Only if realistically possible.",
      "Есть ли одно небольшое требование, которое можно безопасно сократить, отложить или разделить с кем-то? Только если это реально."
    ],
    "reflection": [
      "Did your chosen response fit the situation? You can change it next time.",
      "Подошёл ли выбранный вариант ситуации? В другой день его можно изменить."
    ],
    "quote": [
      "Different kinds of strain can deserve different forms of care.",
      "Разная нагрузка может требовать разной поддержки."
    ],
    "neutral": [
      "Only read the two examples and choose rest. No body scan or problem solving is required.",
      "Можно только прочитать два примера и выбрать отдых, без сканирования тела и решения задач."
    ],
    "outcome": [
      "A suitable response selected for a low-stakes overload or tiredness example.",
      "Выбран подходящий ответ для безопасного примера перегрузки или усталости."
    ],
    "scales": [
      "weekly.load",
      "weekly.recovery",
      "resource.agency"
    ],
    "probe": {
      "prompt": [
        "A harmless task is taking more effort than you have today. Which option is available?",
        "Простое дело сегодня требует больше сил, чем у вас есть. Какой вариант сейчас доступен?"
      ],
      "choices": [
        [
          "shorten",
          [
            "Reduce or postpone a small nonurgent part",
            "Сократить или отложить небольшую несрочную часть"
          ]
        ],
        [
          "rest",
          [
            "Make space for an ordinary break",
            "Найти возможность обычной паузы"
          ]
        ],
        [
          "ask",
          [
            "Ask a safe person for practical help, if possible",
            "При возможности попросить практической помощи у безопасного человека"
          ]
        ]
      ],
      "hint": [
        "Any feasible choice can be reasonable. The important part is that it fits real conditions.",
        "Любой осуществимый вариант может подойти. Главное — соответствие реальным условиям."
      ]
    }
  },
  {
    "day": 5,
    "skillId": "S3",
    "title": [
      "A gentle pause for body and attention",
      "Мягкая пауза для тела и внимания"
    ],
    "teaching": [
      "A short sensory or movement practice can be tried without forcing relaxation or controlling breathing. Choose what is acceptable.",
      "Небольшую сенсорную или двигательную практику можно попробовать без требования расслабиться и без контроля дыхания. Выберите приемлемый вариант."
    ],
    "guide": [
      "With your eyes open if you prefer, notice a neutral object. If it feels comfortable, gently change the position of your shoulders or hands, or notice the chair supporting you. You may stay completely still instead. Return your attention to the object's shape. There is no special breathing rhythm to achieve. A sensation can stay as it is. When you are ready, look around the room again and choose whether this pause was useful, neutral or uncomfortable.",
      "При желании оставьте глаза открытыми и заметьте обычный предмет. Если комфортно, слегка измените положение плеч или рук либо почувствуйте опору кресла. Можно остаться совершенно неподвижно. Верните внимание к форме предмета. Не нужно задавать дыханию особый ритм. Ощущения могут остаться прежними. Затем снова оглядите комнату и решите, была ли эта пауза полезной, нейтральной или некомфортной."
    ],
    "action": [
      "Keep a 20–30 second version of one acceptable choice. Stop if it feels uncomfortable.",
      "Сохраните 20–30-секундный вариант одного приемлемого действия. При дискомфорте остановитесь."
    ],
    "transfer": [
      "A brief comfortable pause may fit after an everyday task, without new reminders or obligations.",
      "Короткая комфортная пауза может подойти после обычного дела без новых обязательств."
    ],
    "reflection": [
      "Which element, if any, would you willingly repeat: looking, a small posture change or resting?",
      "Что вы могли бы повторить: зрительный ориентир, смену позы или отдых?"
    ],
    "quote": [
      "A small pause does not have to erase tension to be worthwhile.",
      "Маленькая пауза не обязана убрать напряжение, чтобы быть полезной."
    ],
    "neutral": [
      "Keep your eyes open, notice a neutral colour and skip body attention and movement entirely.",
      "Оставьте глаза открытыми, заметьте нейтральный цвет и полностью пропустите движения и внимание к телу."
    ],
    "outcome": [
      "A tried sensory or comfort practice and a realistic short version.",
      "Опробованный сенсорный или комфортный способ и его короткая версия."
    ],
    "scales": [
      "weekly.tension",
      "weekly.recovery"
    ],
    "probe": null
  },
  {
    "day": 6,
    "skillId": "S3",
    "title": [
      "I can adjust the effort and make room for rest",
      "Я могу менять нагрузку и оставлять место отдыху"
    ],
    "teaching": [
      "Choosing the length of a practice is part of self-regulation. An ordinary rest break may also matter more than another technique.",
      "Выбирать длительность практики — часть саморегуляции. Обычный отдых иногда важнее ещё одной техники."
    ],
    "guide": [
      "Choose a neutral orienting activity and decide what duration suits you: twenty seconds, about a minute or a few minutes. Begin and notice whether that amount feels reasonable. You may shorten it, stop early or select a still image instead. Afterwards consider whether your real day contains a small, safe opportunity for rest. If not, that is useful information about the demands around you, not personal failure.",
      "Выберите нейтральный способ ориентировки и подходящую длительность: двадцать секунд, примерно минуту или несколько минут. Начните и заметьте, подходит ли нагрузка. Можно сократить её, остановиться раньше или выбрать неподвижную картинку. Затем подумайте, есть ли в реальном дне небольшая безопасная возможность отдохнуть. Если её нет, это информация об обстоятельствах, а не личная неудача."
    ],
    "action": [
      "Select a short version, a longer version, a neutral alternative or stop. A break in your daily schedule is optional.",
      "Выберите короткий вариант, более долгий, нейтральную замену или остановку. Перерыв в расписании — только по желанию."
    ],
    "transfer": [
      "If feasible, identify a 3–10 minute recovery window after routine effort. Planning is not the same as doing.",
      "Если реально, найдите 3–10 минут восстановления после обычной нагрузки. План не равен выполнению."
    ],
    "reflection": [
      "What length feels sustainable on an ordinary difficult day?",
      "Какая длительность посильна в обычный трудный день?"
    ],
    "quote": [
      "Adapting effort to available energy is a skill, not giving up.",
      "Соотносить усилия с доступными силами — это навык, а не поражение."
    ],
    "neutral": [
      "Choose the shortest option, a static image or complete rest. You do not have to continue through discomfort.",
      "Выберите минимальную длительность, неподвижную картинку или полный отдых. Не нужно продолжать через дискомфорт."
    ],
    "outcome": [
      "A chosen manageable dose and one possible recovery window or honest absence of one.",
      "Выбранная посильная длительность и возможный период отдыха либо честное отсутствие такой возможности."
    ],
    "scales": [
      "weekly.recovery",
      "weekly.load",
      "resource.agency"
    ],
    "probe": {
      "prompt": [
        "After a demanding but safe day, a three-minute exercise feels too long. What could you choose?",
        "После насыщенного, но безопасного дня трёхминутная практика кажется слишком длинной. Что можно выбрать?"
      ],
      "choices": [
        [
          "shorter",
          [
            "Try just twenty seconds instead",
            "Попробовать только двадцать секунд"
          ]
        ],
        [
          "neutral",
          [
            "Switch to a quiet visual object",
            "Выбрать спокойный зрительный ориентир"
          ]
        ],
        [
          "stop",
          [
            "Stop the exercise and rest",
            "Остановить упражнение и отдохнуть"
          ]
        ]
      ],
      "hint": [
        "You are allowed to reduce, replace or end an activity. Comfort does not require endurance.",
        "Упражнение можно сократить, заменить или закончить. Комфорт не требует терпения."
      ]
    }
  },
  {
    "day": 7,
    "skillId": "S4",
    "title": [
      "Real support and one manageable demand",
      "Реальные опоры и одно посильное требование"
    ],
    "teaching": [
      "Support can come from places, objects, rest, people or practical changes in workload, not only from an internal feeling.",
      "Поддержка может быть связана с местом, предметом, отдыхом, человеком или реальным изменением нагрузки — не только с внутренним ощущением."
    ],
    "guide": [
      "Think of an ordinary day without recalling a frightening event. Name one neutral place or object that is available. If there is a safe person or service you can contact, you may name the type without giving private details. Next look at one small current demand: can it realistically be shortened, postponed or shared without creating new risk? If not, you can choose a rest or support option. Do not invent resources that do not exist.",
      "Вспомните обычный день, не возвращаясь к пугающему событию. Назовите доступное нейтральное место или предмет. Если есть безопасный человек или служба, можно обозначить их тип, не вводя личные контакты. Теперь посмотрите на одно небольшое требование: можно ли его безопасно сократить, отложить или разделить с кем-то? Если нет — можно выбрать отдых или поддержку. Не нужно придумывать ресурсы, которых нет."
    ],
    "action": [
      "Build a simple map: one reachable object or place, one rest option, and optionally a human support route.",
      "Составьте карту: один доступный предмет или место, один вариант отдыха и, если есть, путь к человеческой помощи."
    ],
    "transfer": [
      "Choose keep, simplify or replace for a previously tried practice. Nothing changes without your confirmation.",
      "Выберите оставить, упростить или заменить ранее опробованную практику. Без вашего подтверждения ничего не меняется."
    ],
    "reflection": [
      "Which support is truly available, and which demand could realistically change?",
      "Какая поддержка реально доступна и какое требование действительно можно изменить?"
    ],
    "quote": [
      "Support may be practical and external; it does not have to be a feeling I manufacture.",
      "Опора может быть практической и внешней, а не чувством, которое я обязан создать."
    ],
    "neutral": [
      "Select a neutral nearby object or rest. You need not disclose information about relationships.",
      "Можно выбрать обычный предмет рядом или отдых. Раскрывать личные отношения необязательно."
    ],
    "outcome": [
      "A real support map and an optional, feasible load adjustment.",
      "Карта реальных опор и возможное посильное изменение нагрузки."
    ],
    "scales": [
      "weekly.load",
      "weekly.functioning",
      "weekly.connection",
      "resource.self_support"
    ],
    "probe": null
  },
  {
    "day": 8,
    "skillId": "S4",
    "title": [
      "A resource I can use, plus real recovery",
      "Ресурсный образ и настоящее восстановление"
    ],
    "teaching": [
      "Resource imagery is optional. A real short recovery action may complement a helpful word, image or ordinary object.",
      "Ресурсный образ необязателен. Реальная короткая пауза для восстановления может дополнять полезное слово, образ или обычный предмет."
    ],
    "guide": [
      "Choose one safe route. You might imagine finishing an ordinary task and having a little space to rest. Or look at a calm photograph and name up to five details and qualities. Or simply read a supportive phrase while looking at a neutral object. Do not travel back into painful memories or search for a childhood event. Notice one quality that seems accessible and, if realistic, one small recovery action you could take later. Imagining and doing are different; neither is required.",
      "Выберите один безопасный путь. Можно представить, как заканчивается обычное дело и появляется немного времени для отдыха. Или рассмотреть спокойную фотографию, заметить до пяти деталей и качеств. Или просто прочитать поддерживающую фразу, глядя на нейтральный предмет. Не нужно возвращаться к болезненным воспоминаниям или искать детские события. Заметьте одно доступное качество и, если реально, маленькое восстановительное действие на будущее. Представить и сделать — разные вещи; ни то ни другое не обязательно."
    ],
    "action": [
      "Choose an image, a word or an ordinary real object. Select a feasible tiny break only if you want.",
      "Выберите образ, слово или обычный реальный предмет. При желании наметьте небольшой доступный отдых."
    ],
    "transfer": [
      "A few quiet minutes after a routine may be more useful than adding another obligation.",
      "Несколько спокойных минут после привычного дела могут оказаться полезнее нового обязательства."
    ],
    "reflection": [
      "Was the resource practical for you, or would an external object or rest fit better?",
      "Подошёл ли выбранный ресурс или лучше использовать внешний предмет либо отдых?"
    ],
    "quote": [
      "A realistic resource is one that I can access, not one that sounds impressive.",
      "Подходящая опора — та, к которой можно обратиться, а не та, которая красиво звучит."
    ],
    "neutral": [
      "No imagery is needed. Look at one neutral object, read a short phrase or rest.",
      "Образы необязательны. Можно смотреть на обычный предмет, прочитать фразу или отдохнуть."
    ],
    "outcome": [
      "An acceptable image, word or object, with a possible real recovery choice.",
      "Приемлемый образ, слово или предмет и возможный реальный вариант восстановления."
    ],
    "scales": [
      "weekly.recovery",
      "weekly.mood",
      "resource.self_support"
    ],
    "probe": {
      "prompt": [
        "You have a quiet moment after an ordinary task. Which resource fits today?",
        "У вас появилась спокойная минута после обычного дела. Какая опора сейчас подходит?"
      ],
      "choices": [
        [
          "words",
          [
            "Use a believable supporting phrase",
            "Использовать правдоподобную поддерживающую фразу"
          ]
        ],
        [
          "place",
          [
            "Notice a real comfortable place or object",
            "Обратить внимание на реальное удобное место или предмет"
          ]
        ],
        [
          "rest",
          [
            "Choose a short rest without imagery",
            "Выбрать небольшой отдых без визуализации"
          ]
        ]
      ],
      "hint": [
        "An imagined scene is not required. Practical and external support can be just as valid.",
        "Образ необязателен. Практическая и внешняя поддержка тоже полноценны."
      ]
    }
  },
  {
    "day": 9,
    "skillId": "S5",
    "title": [
      "A worrying thought is not a confirmed fact",
      "Тревожная мысль не равна установленному факту"
    ],
    "teaching": [
      "One anxious prediction is a thought. You may notice it, check a harmless fact or return to a neutral object without forcing positivity.",
      "Тревожный прогноз — это мысль. Можно заметить его, проверить безопасный факт или вернуться к нейтральному предмету, не заставляя себя мыслить позитивно."
    ],
    "guide": [
      "Imagine an ordinary message that has not yet received a reply. A thought may arise: something bad must have happened. Pause. The visible fact is that no reply has appeared yet; the explanation is not known. You can try saying, 'I notice I am having a worrying thought,' or return to something you can see around you. You need not prove the thought wrong. Choose one calm response that fits the actual situation.",
      "Представьте обычное сообщение, на которое пока нет ответа. Может возникнуть мысль: наверняка случилось что-то плохое. Сделайте паузу. Известный факт — ответ ещё не пришёл; причина неизвестна. Можно сказать себе: «Я замечаю тревожную мысль», или обратиться к видимому предмету вокруг. Не нужно доказывать, что мысль неверна. Выберите один спокойный ответ, подходящий реальным обстоятельствам."
    ],
    "action": [
      "Try the wording 'I am noticing a thought that...' or choose a neutral visual anchor.",
      "Попробуйте слова «Я замечаю мысль, что…» или выберите нейтральный зрительный ориентир."
    ],
    "transfer": [
      "If worrying thoughts return, noticing them is optional and does not require arguing with them.",
      "Если тревожные мысли возвращаются, их можно замечать, но необязательно спорить с ними."
    ],
    "reflection": [
      "Did you choose noticing, checking an ordinary fact or returning to your surroundings?",
      "Вы выбрали замечание мысли, проверку обычного факта или возвращение к окружению?"
    ],
    "quote": [
      "A thought can be present without deciding my next action for me.",
      "Мысль может оставаться со мной, но не обязана выбирать действие за меня."
    ],
    "neutral": [
      "Skip thinking exercises; look at a neutral shape or take a break.",
      "Пропустите работу с мыслями; посмотрите на обычную форму или сделайте перерыв."
    ],
    "outcome": [
      "One tried way to separate a thought from an immediate response.",
      "Опробован один способ отделять мысль от немедленной реакции."
    ],
    "scales": [
      "weekly.tension",
      "weekly.clarity",
      "gad-7"
    ],
    "probe": null
  },
  {
    "day": 10,
    "skillId": "S5",
    "title": [
      "Fact, assumption and one manageable step",
      "Факт, предположение и один посильный шаг"
    ],
    "teaching": [
      "Some worries concern solvable daily problems; others are guesses we cannot settle right now. Choosing one manageable response can reduce unnecessary pressure.",
      "Некоторые беспокойства связаны с решаемыми повседневными задачами; другие — с предположениями, на которые сейчас нет ответа. Посильный выбор может уменьшать избыточное давление."
    ],
    "guide": [
      "Return to the harmless unanswered-message example. What is directly known? What is merely a guess? Consider two realistic interpretations without insisting on a cheerful one. Next choose an ordinary practical problem from a prepared neutral example, such as a busy to-do list. Could one small requirement be shortened or moved? If it cannot change, you might take a pause or ask for support. Do not use frightening memories or confront unsafe people.",
      "Вернитесь к безопасному примеру непрочитанного сообщения. Что известно напрямую, а что только предполагается? Рассмотрите две реалистичные версии, не требуя позитивной. Затем возьмите простую учебную задачу, например перегруженный список дел. Можно ли одну маленькую часть сократить или перенести? Если изменить её нельзя, может подойти пауза или поддержка. Не используйте пугающие воспоминания и не вступайте в конфликт с небезопасными людьми."
    ],
    "action": [
      "Write or choose one fact, one assumption and one feasible next option. Writing is optional.",
      "Запишите или выберите один факт, одно предположение и один осуществимый следующий вариант. Писать необязательно."
    ],
    "transfer": [
      "The next step can be a plan, a pause or asking for time; it need not be performed now.",
      "Следующим шагом может быть план, пауза или просьба дать время; выполнять его сейчас не нужно."
    ],
    "reflection": [
      "Was the difficulty a known fact, an assumption or a practical problem you might influence?",
      "Трудность была известным фактом, предположением или задачей, на которую можно повлиять?"
    ],
    "quote": [
      "I can separate what happened from what I imagine it means.",
      "Я могу отличать произошедшее от своих предположений о его значении."
    ],
    "neutral": [
      "Use the fictional message only and choose to pause without analysing personal worries.",
      "Оставайтесь с вымышленным сообщением и выберите паузу без анализа личных тревог."
    ],
    "outcome": [
      "A distinction between one fact and assumption, plus a doable next option.",
      "Различён один факт и одно предположение, выбран посильный вариант."
    ],
    "scales": [
      "weekly.load",
      "weekly.functioning",
      "weekly.tension",
      "gad-7"
    ],
    "probe": {
      "prompt": [
        "A colleague has not replied to an ordinary message. What do you know?",
        "Коллега не ответил на обычное сообщение. Что вам точно известно?"
      ],
      "choices": [
        [
          "fact",
          [
            "Only that the reply has not arrived yet",
            "Только то, что ответа пока нет"
          ]
        ],
        [
          "pause",
          [
            "I can postpone conclusions and choose a calm next step",
            "Можно отложить выводы и выбрать спокойный следующий шаг"
          ]
        ],
        [
          "rest",
          [
            "I would rather step back from this example",
            "Я предпочитаю не разбирать этот пример"
          ]
        ]
      ],
      "hint": [
        "The reply is an observation; the reason for silence is not established.",
        "Отсутствие ответа — наблюдение; причина молчания пока неизвестна."
      ]
    }
  },
  {
    "day": 11,
    "skillId": "S6",
    "title": [
      "A boundary without confrontation",
      "Граница без конфликта"
    ],
    "teaching": [
      "Reducing overload sometimes means having a simple way to ask for time. This is a safe role-play, not a requirement to confront anyone.",
      "Иногда уменьшить перегрузку помогает простая просьба о времени. Мы используем безопасную учебную репетицию, а не требование с кем-то конфликтовать."
    ],
    "guide": [
      "Imagine a harmless work request arriving while you already have something to do. You may choose an ordinary sentence: 'I need a little time to think,' 'I can reply later,' or 'I cannot take this on right now.' Say it silently or just select it on screen. Notice whether the sentence feels believable and respectful for you. You are not required to send it, argue or speak with an unsafe person. You can choose rest or support instead.",
      "Представьте обычную рабочую просьбу, когда у вас уже есть дела. Можно выбрать простую фразу: «Мне нужно немного времени подумать», «Я отвечу позже» или «Сейчас не могу взять это на себя». Проговорите мысленно или просто выберите на экране. Проверьте, звучит ли она правдоподобно и уважительно для вас. Отправлять её, спорить или общаться с небезопасным человеком не нужно. Вместо этого можно выбрать отдых или поддержку."
    ],
    "action": [
      "Choose one respectful pause or boundary phrase that fits your circumstances.",
      "Выберите одну уважительную фразу паузы или границы, подходящую вашим условиям."
    ],
    "transfer": [
      "If a safe ordinary request arises, you may try the phrase or only remember it. No real-life task is required.",
      "Если возникнет обычная безопасная просьба, можно попробовать фразу или просто вспомнить её. Реальное действие не требуется."
    ],
    "reflection": [
      "Which phrase feels realistic? You can keep it private or choose none.",
      "Какая фраза звучит реалистично? Её можно оставить приватной или не выбирать."
    ],
    "quote": [
      "Requesting time is a possible response, not a confrontation I must win.",
      "Попросить время — один из вариантов ответа, а не конфликт, который надо выиграть."
    ],
    "neutral": [
      "Read the example without rehearsing a conversation; choose a brief visual pause.",
      "Прочитайте пример без репетиции разговора и выберите короткую зрительную паузу."
    ],
    "outcome": [
      "A prepared, realistic boundary sentence or an appropriate decline.",
      "Подготовлена реалистичная фраза границы либо выбран отказ от практики."
    ],
    "scales": [
      "weekly.load",
      "weekly.functioning",
      "resource.agency"
    ],
    "probe": null
  },
  {
    "day": 12,
    "skillId": "S6",
    "title": [
      "People and practical help can be part of support",
      "Люди и практическая помощь могут быть опорой"
    ],
    "teaching": [
      "Having a source of real-world support matters. We cannot create social resources that do not exist, but we can identify available options without disclosing private names.",
      "Реальная поддержка имеет значение. Курс не создаёт отсутствующих социальных условий, но может помочь заметить доступные варианты без раскрытия частных контактов."
    ],
    "guide": [
      "Think about a simple situation such as a busy week or needing information. Without entering names or phone numbers, consider whether a safe person, organisation or service might be available. If so, what small concrete request could you make? Perhaps you need advice, a short conversation or help with one task. If no one is currently available, choose a practical fallback such as rest or finding a local professional resource. You do not need to contact anyone during this lesson.",
      "Представьте обычную ситуацию: насыщенная неделя или необходимость что-то уточнить. Не вводя имён и телефонов, подумайте, есть ли безопасный человек, организация или служба помощи. Если да, какую небольшую конкретную просьбу можно сформулировать? Возможно, нужен совет, короткий разговор или помощь с одним делом. Если сейчас никого нет, выберите запасной практический вариант: отдых или поиск местной профессиональной поддержки. Ни с кем связываться на занятии не нужно."
    ],
    "action": [
      "Choose one potential support route and one short request, or say that no safe support is available yet.",
      "Выберите один возможный путь к помощи и короткую просьбу либо честно укажите, что доступной поддержки сейчас нет."
    ],
    "transfer": [
      "You may ask for support later, if you choose; preparing the sentence is already a useful educational step.",
      "Можно обратиться за помощью позже, если захотите; подготовка фразы уже является учебным опытом."
    ],
    "reflection": [
      "What practical or human support is genuinely available to you?",
      "Какая практическая или человеческая поддержка вам действительно доступна?"
    ],
    "quote": [
      "Asking for suitable help can be an act of choice, not weakness.",
      "Просьба о подходящей помощи может быть проявлением выбора, а не слабости."
    ],
    "neutral": [
      "Do not discuss relationships; choose a neutral object, a break or information about support services.",
      "Можно не обсуждать отношения; выбрать нейтральный предмет, отдых или информацию о службах помощи."
    ],
    "outcome": [
      "An optional practical support route with a realistic request or fallback.",
      "Возможный путь к практической поддержке с реалистичной просьбой или запасной вариант."
    ],
    "scales": [
      "weekly.connection",
      "resource.support",
      "resource.self_support"
    ],
    "probe": {
      "prompt": [
        "You have a demanding but safe week and could use practical help. What would you choose?",
        "У вас насыщенная, но безопасная неделя, и пригодилась бы помощь. Что можно выбрать?"
      ],
      "choices": [
        [
          "request",
          [
            "Prepare a specific request to a safe person",
            "Подготовить конкретную просьбу к безопасному человеку"
          ]
        ],
        [
          "service",
          [
            "Look up an appropriate professional or community resource",
            "Найти подходящую профессиональную или общественную службу"
          ]
        ],
        [
          "fallback",
          [
            "Choose rest or another practical fallback if nobody is available",
            "Выбрать отдых или запасной вариант, если сейчас не к кому обратиться"
          ]
        ]
      ],
      "hint": [
        "You are not asked to reveal someone's identity or to send a message.",
        "Раскрывать чужие данные и отправлять сообщения не требуется."
      ]
    }
  },
  {
    "day": 13,
    "skillId": "S7",
    "title": [
      "Which familiar support fits this situation?",
      "Какая знакомая опора подходит сейчас?"
    ],
    "teaching": [
      "Different ordinary circumstances may call for different supports. Try choosing from your familiar options rather than learning a completely new technique.",
      "Разным повседневным обстоятельствам подходят разные ресурсы. Попробуйте выбирать среди знакомых практик, а не изучать новую сложную технику."
    ],
    "guide": [
      "Choose one harmless example: a busy day with too many small tasks, an evening with worrying thoughts, or a day with very little energy. Match it with one previously tried option. For overload you might reduce an unnecessary demand or pause; for worry, notice a thought or a visual anchor; for tiredness, choose a short rest. You may ask for a hint, change your mind or skip the task. Imagine a natural cue, such as finishing work, without needing an app notification.",
      "Выберите один безопасный пример: много мелких дел, вечер с тревожными мыслями или день с недостатком сил. Подберите один уже знакомый вариант. При перегрузке можно сократить необязательное требование или сделать паузу; при тревоге — заметить мысль или зрительный ориентир; при усталости — короткий отдых. Можно открыть подсказку, изменить решение или пропустить. Представьте естественное напоминание, например завершение работы, без обязательных уведомлений приложения."
    ],
    "action": [
      "Choose one familiar practice for one everyday situation. A rest choice counts as a valid personal preference.",
      "Подберите одну знакомую практику к одной повседневной ситуации. Отдых — полноценный допустимый выбор."
    ],
    "transfer": [
      "Optional cue: 'After [ordinary task], I may choose [a familiar support].' A plan is not proof of real-world use.",
      "Необязательная формула: «После [обычного дела] я могу выбрать [знакомую опору]». План не доказывает применения в жизни."
    ],
    "reflection": [
      "Which option felt possible without making your day harder?",
      "Какой вариант казался возможным и не увеличивал нагрузку?"
    ],
    "quote": [
      "Choosing less can be a skill when it preserves what matters.",
      "Уменьшать нагрузку тоже бывает навыком, если это сохраняет важное."
    ],
    "neutral": [
      "Read one situation and choose rest or a familiar neutral object; no mental rehearsal is required.",
      "Прочитайте один пример и выберите отдых либо знакомый нейтральный предмет. Мысленная репетиция необязательна."
    ],
    "outcome": [
      "A fitting familiar support and a voluntary everyday cue.",
      "Подходящая знакомая опора и необязательное напоминание в обычной жизни."
    ],
    "scales": [
      "weekly.load",
      "weekly.functioning",
      "weekly.recovery"
    ],
    "probe": null
  },
  {
    "day": 14,
    "skillId": "S7",
    "title": [
      "My practical OPORA support plan",
      "Моя практическая карта ОПОРА"
    ],
    "teaching": [
      "A course ends with choices you genuinely tried or selected, not proof that anxiety or trauma has been cured. Your personal plan can stay small.",
      "Курс завершается конкретными способами, которые вы действительно пробовали или выбирали, а не доказательством лечения тревоги или травмы. Личная карта может быть очень короткой."
    ],
    "guide": [
      "Look back on the skills you actually explored. You may choose one early overload sign, one short support such as visual orientation or a pause, and one backup such as rest or a safe person's help. If something never worked for you, leave it out. Try a new harmless example, such as a busy afternoon, and decide which support you would choose. It is fine to use a hint, choose not to act or leave a field blank. End by looking around the present room.",
      "Вспомните навыки, которые действительно пробовали. Можно выбрать один ранний признак перегрузки, одну короткую опору — например зрительный ориентир или паузу — и запасной вариант: отдых или помощь безопасного человека. Если что-то вам не подошло, не включайте это. Рассмотрите новый безопасный пример, например насыщенный день, и выберите возможную поддержку. Допустимы подсказка, отказ от действия и пустые поля. Завершите, оглядев реальную комнату."
    ],
    "action": [
      "Keep only real choices: early signal → short support → backup rest or human help. Do not invent missing achievements.",
      "Сохраните только реальные решения: ранний сигнал → короткая опора → запасной отдых или человеческая помощь. Не заполняйте отсутствующие достижения."
    ],
    "transfer": [
      "For the next few weeks, you may return to one supportive action when appropriate. Follow-up measurements are separate and voluntary.",
      "В последующие недели можно возвращаться к одной подходящей опоре. Итоговые измерения проводятся отдельно и добровольно."
    ],
    "reflection": [
      "Which one or two resources are actually worth keeping for you?",
      "Какие один-два способа действительно стоит сохранить для себя?"
    ],
    "quote": [
      "My goal is more available choice, not a perfect score or the disappearance of every difficult feeling.",
      "Моя цель — больше доступных вариантов, а не идеальный балл или исчезновение каждого неприятного чувства."
    ],
    "neutral": [
      "You may finish without constructing a plan. A neutral visual point or human support remains available.",
      "Можно завершить без создания карты. Нейтральный зрительный ориентир или человеческая помощь остаются доступны."
    ],
    "outcome": [
      "A compact user-confirmed support plan, with honest status for all seven skills.",
      "Короткая подтверждённая человеком карта опор и честные статусы семи навыков."
    ],
    "scales": [
      "weekly.load",
      "weekly.functioning",
      "resource.self_support"
    ],
    "probe": {
      "prompt": [
        "A future harmless afternoon becomes overwhelming. Which familiar option would you consider?",
        "В будущем обычный день становится слишком насыщенным. Какой знакомый вариант можно рассмотреть?"
      ],
      "choices": [
        [
          "reduce",
          [
            "Simplify one nonurgent demand or take a pause",
            "Упростить одно несрочное дело или сделать паузу"
          ]
        ],
        [
          "anchor",
          [
            "Use a previously comfortable visual anchor",
            "Использовать ранее подходивший зрительный ориентир"
          ]
        ],
        [
          "help",
          [
            "Choose rest or safe practical support",
            "Выбрать отдых или безопасную практическую помощь"
          ]
        ]
      ],
      "hint": [
        "A valid support plan has a short option, a fallback and the right to stop; no single answer is best for everyone.",
        "В доступной карте есть короткий вариант, запасная поддержка и право остановиться; одного лучшего ответа для всех нет."
      ]
    }
  }
].map(entry=>Object.freeze(entry)))
const langIndex = locale => locale === 'ru' ? 1 : 0
export function antiStressSkillCards(locale='en') {
  const index=langIndex(locale)
  return SKILL_NAMES.map((name,i)=>({ id:'S'+(i+1), days:[i*2+1,i*2+2], title:name[index] }))
}
export function antiStressDay(day,locale='en',length='standard') {
  if(!Number.isInteger(day)||day<1||day>14)return null
  const e=DAYS[day-1],index=langIndex(locale),short=length==='quick'
  return {
    day:e.day, skillId:e.skillId, skill:SKILL_NAMES[Math.floor((day-1)/2)][index],
    title:e.title[index], teaching:e.teaching[index], guide:e.guide[index],
    action:e.action[index], transfer:e.transfer[index], reflection:e.reflection[index],
    quote:e.quote[index], neutral:e.neutral[index], outcome:e.outcome[index],
    scales:[...e.scales],
    // For even lessons only, a non-diagnostic practice-choice card in a fresh harmless scenario.
    probe:e.probe?{prompt:e.probe.prompt[index],choices:e.probe.choices.map(([value,title])=>({value,label:title[index]})),hint:e.probe.hint[index]}:null,
    length:short?'quick':'standard',
  }
}
export function antiStressLessonValid() {
  return DAYS.length===14 && SKILL_NAMES.length===7 && DAYS.every((e,i)=>e.day===i+1 && e.skillId==='S'+(Math.floor(i/2)+1) &&
    ['title','teaching','guide','action','transfer','reflection','quote','neutral','outcome'].every(k=>Array.isArray(e[k])&&e[k].length===2&&e[k].every(v=>typeof v==='string'&&v.length>12)) &&
    Array.isArray(e.scales)&&e.scales.length>0&&e.scales.every(k=>/^(weekly\.|resource\.|gad-7)/.test(k))&&
    (i%2===0?!e.probe:Boolean(e.probe&&e.probe.choices.length===3&&e.probe.choices.every(([v,labels])=>v&&labels[0]&&labels[1]))))
}
