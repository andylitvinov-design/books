import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { VERSION, traumaPhaseLesson, traumaPhaseInteractionPlan, traumaPhaseCheckpoints } from '../lib/inner-growth/trauma-phase-catalog.js'
import { validateAntiStressMethodChoice } from '../lib/inner-growth/anti-stress-method-activities.js'
import { validateAntiStressLabAnswers } from '../lib/inner-growth/anti-stress-practice-lab.js'

// Reviewed against TRAUMA-1.3 (15 October 2026), §§6.1/6.3/6.5/6.6.
// RU fixtures are verbatim source practices/trials; EN anchors lock each source method.
// Source hashes refer to the complete approved daily detail excerpt; titles are checked separately.
const SOURCE_FIXTURE = [
  {
    "moduleId": "AS1",
    "day": 1,
    "section": "6.1",
    "titleRu": "Я могу начать по-своему",
    "practiceRu": "открыть три спокойных сценария начала (чтение / неподвижное фото / без медиа), выбрать один; самостоятельно поставить практику на паузу через 15–30 секунд.",
    "trialRu": "выбрать другое условие участия для вымышленного персонажа.",
    "sourceHash": "4de42172e87984fc4b121a0025ae40b3f7be787efe888b1ad61344a8d2beee27",
    "englishSourceAnchors": [
      "three quiet starting formats",
      "reading",
      "still photo",
      "no media",
      "paus"
    ]
  },
  {
    "moduleId": "AS1",
    "day": 2,
    "section": "6.1",
    "titleRu": "Моё “нет” имеет значение",
    "practiceRu": "попробовать тренажёр «продолжить — сделать короче — отложить — закончить» без штрафа; увидеть, что выбор сохраняется.",
    "trialRu": "на иной учебной сцене решить, как отказаться от лишнего задания.",
    "sourceHash": "8e324bd9dbc5399b154a1624ee08b1ef64afdadf379eaaa9e3c690ebac6eae67",
    "englishSourceAnchors": [
      "continue",
      "shorten",
      "postpone",
      "finish"
    ]
  },
  {
    "moduleId": "AS1",
    "day": 3,
    "section": "6.1",
    "titleRu": "Я замечаю настоящее вокруг",
    "practiceRu": "с открытыми глазами выбрать один нейтральный предмет вокруг себя; описать его цвет/форму или сделать то же на статичной фотографии.",
    "trialRu": "сменить ориентир и вернуться к первому, если удобно.",
    "sourceHash": "e46fa3d60eca235e1729b03ae63bd461cb74fae3746916b28bc883e4eb97a972",
    "englishSourceAnchors": [
      "neutral object",
      "colour",
      "shape",
      "still photo"
    ]
  },
  {
    "moduleId": "AS1",
    "day": 4,
    "section": "6.1",
    "titleRu": "Я могу ориентироваться в другой обстановке",
    "practiceRu": "в новой панораме комнаты найти двери/окно/устойчивые объекты без необходимости искать угрозы; выбрать спокойный визуальный ориентир.",
    "trialRu": "самостоятельно выбрать из двух изображений удобное для внимания.",
    "sourceHash": "ef60b95bf83e66a45fb33a537795aa467e2172007d39c9f880665fed5c9a05aa",
    "englishSourceAnchors": [
      "door",
      "window",
      "stable object",
      "flat room plan"
    ]
  },
  {
    "moduleId": "AS1",
    "day": 5,
    "section": "6.1",
    "titleRu": "Чувство опасности и реальная ситуация — не одно и то же",
    "practiceRu": "три вымышленных ситуации — безопасное, неопределённое и явно небезопасное пространство; сопоставить действие: ориентироваться / запросить информацию / уйти и получить поддержку.",
    "trialRu": "в дополнительной нейтральной сцене ответить «проверить факт или сделать защитный шаг?».",
    "sourceHash": "1a6b2afeafeda26f65bae6dcf741006d36439dd8eca8f35d14224f00b97a0edd",
    "englishSourceAnchors": [
      "safe, uncertain and clearly unsafe",
      "requesting information",
      "leaving",
      "support"
    ]
  },
  {
    "moduleId": "AS1",
    "day": 6,
    "section": "6.1",
    "titleRu": "Я могу менять условия, а не себя",
    "practiceRu": "конструктор «слишком шумно/много сообщений/неудобное место» с действиями уменьшить шум, закрыть экран, отойти, попросить время, прекратить контакт.",
    "trialRu": "выбрать один вариант изменения для новой сцены.",
    "sourceHash": "d95254840951dce136f0613306b43456871d79ae67fd7817f5f8b6b52fad56c3",
    "englishSourceAnchors": [
      "noise",
      "messages",
      "place",
      "close a screen",
      "end contact"
    ]
  },
  {
    "moduleId": "AS1",
    "day": 7,
    "section": "6.1",
    "titleRu": "Мои реальные внешние опоры",
    "practiceRu": "карта ресурсов «предмет — место — время — информация — человек — организация»; выбрать один реально доступный тип опоры либо отметить отсутствие.",
    "trialRu": "в другой обстановке подобрать резервный вариант.",
    "sourceHash": "95c5d3ced55d5a72ea14c8a192fc4d1678786d0df09ff8492c62e575787781a0",
    "englishSourceAnchors": [
      "object, place, time, information, person and organisation",
      "none"
    ]
  },
  {
    "moduleId": "AS1",
    "day": 8,
    "section": "6.1",
    "titleRu": "Мой план, когда поддержки мало",
    "practiceRu": "выбрать сценарий «основной ресурс недоступен» и составить два варианта: безопасный отдых и источник практической помощи/консультации.",
    "trialRu": "выбрать, что делать сначала, если план А недоступен.",
    "sourceHash": "de901c87d4e5b539bdb7fd41919215ce3722b483e1fba443d0bae71593383542",
    "englishSourceAnchors": [
      "main support is unavailable",
      "two alternatives",
      "safe rest",
      "help"
    ]
  },
  {
    "moduleId": "AS1",
    "day": 9,
    "section": "6.1",
    "titleRu": "Моя комфортная дистанция",
    "practiceRu": "в нейтральной социальной иллюстрации настроить дистанцию: читать сейчас/позже, остаться/отойти, отвечать/не отвечать.",
    "trialRu": "выбрать подходящее расстояние в другом контексте.",
    "sourceHash": "f0bae5830d62fc0d656f6d51795dae5e1e2facb73bc170385a8cd0f8489aef1c",
    "englishSourceAnchors": [
      "read now or later",
      "stay or step away",
      "respond or not respond"
    ]
  },
  {
    "moduleId": "AS1",
    "day": 10,
    "section": "6.1",
    "titleRu": "Мои границы времени и внимания",
    "practiceRu": "конструктор коротких сообщений «Сейчас не могу», «Вернусь позже», «Предпочитаю другой способ», «Мне нужна пауза» без отправки адресатам.",
    "trialRu": "для новой сцены выбрать спокойный ответ.",
    "sourceHash": "08a8d2ef0c2c46a3f24f286b50073819dc6b00fa89c39454c5c1d38f09a52ca1",
    "englishSourceAnchors": [
      "unsent",
      "cannot now",
      "return later",
      "another format",
      "break"
    ]
  },
  {
    "moduleId": "AS1",
    "day": 11,
    "section": "6.1",
    "titleRu": "Кто и что может быть безопасной поддержкой",
    "practiceRu": "карточки критериев безопасного взаимодействия — уважает отказ, не торопит, не требует подробностей, соблюдает границы; сравнить два вымышленных предложения.",
    "trialRu": "выбрать, какие вопросы стоит задать человеку/службе до обращения.",
    "sourceHash": "c2d5629b602b2244274ac093cbadc8f0ed513026bf3c679d82365243a2157c26",
    "englishSourceAnchors": [
      "two fictional offers",
      "refusal",
      "rush",
      "details",
      "boundaries"
    ]
  },
  {
    "moduleId": "AS1",
    "day": 12,
    "section": "6.1",
    "titleRu": "Я могу попросить поддержку",
    "practiceRu": "составить из блоков просьбу «Мне сейчас трудно. Можно…», варианты: информация, тихое присутствие, помощь с задачей, профессиональная консультация.",
    "trialRu": "выбрать резервный адресат типа службы при отказе основного варианта.",
    "sourceHash": "77828351b866ade4b9fd981975176eb822e7a8605f44c86cbadc8b06b42a57cb",
    "englishSourceAnchors": [
      "unsent request",
      "information",
      "quiet company",
      "task help",
      "consultation"
    ]
  },
  {
    "moduleId": "AS1",
    "day": 13,
    "section": "6.1",
    "titleRu": "Я выбираю первую помощь себе в новой ситуации",
    "practiceRu": "на незнакомой учебной сцене выбрать одно: внешняя ориентировка, смена условий, пауза, граница, помощь. Затем по желанию выполнить короткую пробу.",
    "trialRu": "поменять решение, если первый вариант не подходит.",
    "sourceHash": "b56d953bc7b1ea5e98ef3530b7d8313cdf4bd877a72fa10fccd105dade0b7247",
    "englishSourceAnchors": [
      "external orientation",
      "change of conditions",
      "pause",
      "boundary",
      "help"
    ]
  },
  {
    "moduleId": "AS1",
    "day": 14,
    "section": "6.1",
    "titleRu": "Моя карта безопасности и первой опоры",
    "practiceRu": "составить карту из 4 полей «мой ориентир → моя граница → моя опора → запасной маршрут помощи», используя лишь реально выбранные варианты.",
    "trialRu": "прокрутить вымышленную ситуацию по карте без драматизации.",
    "sourceHash": "9c116b892ecfc33d0bc4a4dc749e4989a7bc6621963d3dba51d83d6a23c4ec9e",
    "englishSourceAnchors": [
      "four optional fields",
      "anchor",
      "boundary",
      "support",
      "backup"
    ]
  },
  {
    "moduleId": "AS3",
    "day": 1,
    "section": "6.3",
    "titleRu": "Мне разрешено чувствовать по-разному",
    "practiceRu": "на спокойных сценках выбрать слова «радость, грусть, тревога, злость, растерянность, нейтрально, не знаю» и отметить, что однозначного ответа может не быть.",
    "trialRu": "назвать возможное чувство другого вымышленного героя.",
    "sourceHash": "287f385efca3a959fce298b71e3733abffc7bed7959525b9ff609b34b1caa168",
    "englishSourceAnchors": [
      "joy",
      "sadness",
      "anxiety",
      "anger",
      "confusion",
      "neutral",
      "not sure"
    ]
  },
  {
    "moduleId": "AS3",
    "day": 2,
    "section": "6.3",
    "titleRu": "У одного события могут быть разные чувства",
    "practiceRu": "в рассказе о неожиданном приглашении расположить две разные эмоции одновременно, например любопытство и осторожность; сравнить два возможных ответа.",
    "trialRu": "самостоятельно назвать альтернативную эмоцию в новой сцене.",
    "sourceHash": "297e8ec0a457cd2af902283ec879317495375f1987ffb325d5de1951d2b09da2",
    "englishSourceAnchors": [
      "unexpected invitation",
      "two possible feelings",
      "curiosity",
      "caution",
      "two possible responses"
    ]
  },
  {
    "moduleId": "AS3",
    "day": 3,
    "section": "6.3",
    "titleRu": "Как понять, насколько сильное чувство",
    "practiceRu": "мягкая шкала 0–10 для эмоции персонажа; выбрать, где нужна пауза и внешняя опора.",
    "trialRu": "другой сюжет с другой эмоцией.",
    "sourceHash": "e9fe2989c7a2f058c8f5e6d9f38b5657370828a7320c59a650f9db7ed6d1b7b1",
    "englishSourceAnchors": [
      "low, moderate or high",
      "fictional",
      "paus",
      "external anchor"
    ]
  },
  {
    "moduleId": "AS3",
    "day": 4,
    "section": "6.3",
    "titleRu": "Я могу выбрать дистанцию от переживания",
    "practiceRu": "для нейтрального или слегка окрашенного чувства выбрать «заметить на секунду / посмотреть вокруг / отдохнуть»; внимание направляется по разрешению самого участника.",
    "trialRu": "самому выбрать удобное расстояние в новой истории.",
    "sourceHash": "2f1f80996eb1c91a272d8b61495376fa30c16da242117a24082f574d1f58c1b8",
    "englishSourceAnchors": [
      "neutral or mildly",
      "noticing briefly",
      "looking around",
      "resting"
    ]
  },
  {
    "moduleId": "AS3",
    "day": 5,
    "section": "6.3",
    "titleRu": "Чувство, мысль и действие — разные вещи",
    "practiceRu": "в учебном комиксе рассортировать фразы «мне обидно», «меня не уважают» и «я могу попросить время» по категориям чувство/предположение/действие.",
    "trialRu": "другая короткая сцена без подсказок.",
    "sourceHash": "11a595630eaa1426d19d033d787b38ebbbfa6083144dc3fd279bd375a1efd4ab",
    "englishSourceAnchors": [
      "I feel hurt",
      "they do not respect me",
      "ask for time",
      "feeling, assumption and action"
    ]
  },
  {
    "moduleId": "AS3",
    "day": 6,
    "section": "6.3",
    "titleRu": "Чувства могут меняться, и это нормально",
    "practiceRu": "выбрать несколько правдоподобных продолжений спокойной истории: усталость меняется на интерес или сохраняется; нет «правильного» эмоционального финала.",
    "trialRu": "указать нейтральное действие независимо от эмоционального исхода.",
    "sourceHash": "e6e2531ce72164aeda82790985881500d14839f906941d0da521b3f9f0f69b2f",
    "englishSourceAnchors": [
      "plausible endings",
      "tiredness",
      "interest",
      "remains"
    ]
  },
  {
    "moduleId": "AS3",
    "day": 7,
    "section": "6.3",
    "titleRu": "Я замечаю эмоцию, но не обязан(а) усиливать её",
    "practiceRu": "выбрать комфортное слово для текущей мягкой эмоции ИЛИ работать с чувствами персонажа; затем добровольно переключиться на нейтральный внешний ориентир.",
    "trialRu": "повторить переключение с меньшей подсказкой в другой нейтральной обстановке.",
    "sourceHash": "8fe531edb49a32978bf204b7d5c1fdbacbdf2be17476855bd3643aa000a2c5d9",
    "englishSourceAnchors": [
      "mild current feeling",
      "fictional",
      "neutral external anchor"
    ]
  },
  {
    "moduleId": "AS3",
    "day": 8,
    "section": "6.3",
    "titleRu": "Мой путь обратно к опоре",
    "practiceRu": "в упражнении «эмоция героя → пауза → нейтральная деталь комнаты» участник самостоятельно регулирует длительность и может закончить на любом шаге.",
    "trialRu": "выбрать иной безопасный выход — текст, предмет, просьба о поддержке.",
    "sourceHash": "4a1672dbc9765399276fa092586d7adfaf098464d27aa7de64818191a5074758",
    "englishSourceAnchors": [
      "character’s emotion, pause, neutral room detail",
      "finish at any step"
    ]
  },
  {
    "moduleId": "AS3",
    "day": 9,
    "section": "6.3",
    "titleRu": "О чём чувство может сообщать",
    "practiceRu": "сопоставить усталость героя с отдыхом, тревогу — с информацией/поддержкой, досаду — с границей; допустимы несколько объяснений.",
    "trialRu": "выбрать другую возможную потребность того же героя.",
    "sourceHash": "b425694047f030ea85ad0e1ed2eb8ad654966b6f369bd0a0d2267afa85477619",
    "englishSourceAnchors": [
      "tiredness",
      "rest",
      "anxiety",
      "information",
      "frustration",
      "boundary",
      "not diagnostic"
    ]
  },
  {
    "moduleId": "AS3",
    "day": 10,
    "section": "6.3",
    "titleRu": "Как поддержать себя, когда есть чувство",
    "practiceRu": "конструктор «я замечаю … → сейчас мне может помочь …»: отдых, пауза, внешняя ориентировка, мягкая фраза, разговор с безопасным человеком; выбор не обязан облегчить эмоцию.",
    "trialRu": "подобрать помощь другой эмоции в новом сюжете.",
    "sourceHash": "eeba09112839ac2beb64ba94886f852ab1d946716033344ed68aed0d9056736f",
    "englishSourceAnchors": [
      "I notice",
      "rest",
      "pause",
      "external orientation",
      "gentle phrase",
      "safe conversation"
    ]
  },
  {
    "moduleId": "AS3",
    "day": 11,
    "section": "6.3",
    "titleRu": "Злость может подсказать границу",
    "practiceRu": "на вымышленной истории о нарушенном расписании разделить эмоцию, возможную потребность и уважительную границу.",
    "trialRu": "выбрать из фраз «мне нужен перерыв / этот вариант не подходит / вернёмся позже».",
    "sourceHash": "3a11c68707be56a7825f92aecf64690924e6d5c59a68638198687e769dec0d40",
    "englishSourceAnchors": [
      "disrupted schedule",
      "emotion",
      "need",
      "respectful boundary"
    ]
  },
  {
    "moduleId": "AS3",
    "day": 12,
    "section": "6.3",
    "titleRu": "Когда появляется стыд или вина",
    "practiceRu": "в нетравматической истории персонаж ошибся; выбрать между «я плохой целиком», «я сделал ошибку» и «нужна поддержка/исправление»; без навязывания моральной оценки.",
    "trialRu": "бережная фраза для другого героя.",
    "sourceHash": "308c48dc6558d180aa7b71ea9dbd49b4dedb2f358601ceace688bbeee84b30ce",
    "englishSourceAnchors": [
      "non-traumatic",
      "I am entirely bad",
      "I made a mistake",
      "support or repair"
    ]
  },
  {
    "moduleId": "AS3",
    "day": 13,
    "section": "6.3",
    "titleRu": "Выбираю ответ, а не борюсь с чувством",
    "practiceRu": "в новой бытовой сцене самостоятельно выбрать возможную эмоцию, её допустимую интенсивность, потребность и способ ответа с доступной внешней опорой.",
    "trialRu": "изменить решение, если оно не подошло.",
    "sourceHash": "6147810657addcdf09960e6bef286eeca31559bc9ca4b74397596a6d55cf5946",
    "englishSourceAnchors": [
      "emotion",
      "intensity",
      "need",
      "response",
      "external anchor"
    ]
  },
  {
    "moduleId": "AS3",
    "day": 14,
    "section": "6.3",
    "titleRu": "Моя карта эмоциональной поддержки",
    "practiceRu": "собрать карту «как узнаю чувство → когда нужна пауза → что может быть нужно → какая поддержка или граница доступна».",
    "trialRu": "использовать карту на безопасной сценке самостоятельно.",
    "sourceHash": "9d6c1505059476cf8bbb686972e12ecbb9df33577f9027dd100ddf16dd46951c",
    "englishSourceAnchors": [
      "recognise a feeling",
      "pause",
      "needed",
      "support or boundary"
    ]
  },
  {
    "moduleId": "AS5",
    "day": 1,
    "section": "6.5",
    "titleRu": "Я — больше, чем трудное состояние",
    "practiceRu": "пазл из карточек «я могу быть человеком с интересами, привычками, отношениями, навыками, сомнениями», выбрать минимум две стороны себя, которые приемлемо назвать.",
    "trialRu": "выбрать качество персонажа, не связанное с его проблемой.",
    "sourceHash": "f4ab1b7f36a2f35c6286953b97781ec3e103eb6e24eea50ee7da328dede1cd71",
    "englishSourceAnchors": [
      "interests",
      "habits",
      "relationships",
      "skills",
      "doubts",
      "two aspects"
    ]
  },
  {
    "moduleId": "AS5",
    "day": 2,
    "section": "6.5",
    "titleRu": "У меня могут быть разные роли",
    "practiceRu": "карта возможных ролей (учусь, отдыхаю, дружу, забочусь о себе, исследую, творю) с правом ничего не утверждать про себя.",
    "trialRu": "выбрать одну роль для новой вымышленной ситуации.",
    "sourceHash": "d5624ab634e5072edd33dd1240a582473ad9e739c94ae15508d81f4fd5bd6056",
    "englishSourceAnchors": [
      "learning",
      "resting",
      "friendship",
      "self-care",
      "exploring",
      "creating"
    ]
  },
  {
    "moduleId": "AS5",
    "day": 3,
    "section": "6.5",
    "titleRu": "Как со мной разговаривает внутренний голос",
    "practiceRu": "в повседневной сцене выбрать между обвиняющим, нейтральным и бережно-реалистичным ответом герою; понять разницу без принуждения чувствовать доброту к себе.",
    "trialRu": "переписать одну нейтральную фразу в более уважительную.",
    "sourceHash": "ede9e7c7559dd983cc0c0c44d82866c146c75159ce1b3c7ba3fd8c77e93f93d5",
    "englishSourceAnchors": [
      "blaming",
      "neutral",
      "gently realistic",
      "not required"
    ]
  },
  {
    "moduleId": "AS5",
    "day": 4,
    "section": "6.5",
    "titleRu": "Поддержка без самообмана",
    "practiceRu": "конструктор «сейчас трудно → я могу уменьшить требования / обратиться за помощью / сделать паузу»; сравнить две версии для вымышленного героя.",
    "trialRu": "выбрать собственный нейтральный вариант, если фраза «я молодец» раздражает.",
    "sourceHash": "b6bc1bb47ef67e2cbb9fe83959f10ca9c44b03b016d325ea0970b0a9d5c4a5eb",
    "englishSourceAnchors": [
      "difficult now",
      "reduce demands",
      "seek help",
      "pause",
      "two"
    ]
  },
  {
    "moduleId": "AS5",
    "day": 5,
    "section": "6.5",
    "titleRu": "Моя история включает и обычную жизнь",
    "practiceRu": "на нейтральной линии «вчера — сегодня — ближайшее будущее» выбрать обычные факты из безопасной повседневной жизни либо на истории персонажа; ничего о травме не спрашивать.",
    "trialRu": "отметить один факт «сегодня я здесь».",
    "sourceHash": "44320023700d5cf6f49167497dd99fcfd4a5735e01146fc9a7015e1a7048ec15",
    "englishSourceAnchors": [
      "yesterday, today and near-future",
      "ordinary safe facts",
      "fictional"
    ]
  },
  {
    "moduleId": "AS5",
    "day": 6,
    "section": "6.5",
    "titleRu": "Я могу выбирать, что о себе рассказывать",
    "practiceRu": "разобрать сценарий «знакомый спрашивает о моей жизни»: выбрать, какие безопасные темы назвать, какие отложить, как сказать «не готов обсуждать».",
    "trialRu": "создать один вариант рассказа о своём настоящем без травматического содержания.",
    "sourceHash": "b66b979a97314cea7cd3d0e053546944c70f89d0b0ddd53c506ba25dd581a94c",
    "englishSourceAnchors": [
      "acquaintance",
      "safe topics",
      "defer",
      "not ready to discuss"
    ]
  },
  {
    "moduleId": "AS5",
    "day": 7,
    "section": "6.5",
    "titleRu": "Что мне действительно важно",
    "practiceRu": "визуальный «компас» из направлений забота, честность, свобода, учёба, связь, творчество, отдых; выбрать 1–2 направления без оценки «правильности».",
    "trialRu": "подобрать к ценности одно безопасное намерение.",
    "sourceHash": "bb0392183e1b7c25d487ddd45698598e5bf5e8e4ff6f845c8161b856ad7aa685",
    "englishSourceAnchors": [
      "care",
      "honesty",
      "freedom",
      "learning",
      "connection",
      "creativity",
      "rest"
    ]
  },
  {
    "moduleId": "AS5",
    "day": 8,
    "section": "6.5",
    "titleRu": "Мои ресурсы не обязаны быть большими",
    "practiceRu": "два набора карточек «мне доступно / пока недоступно», чтобы найти хотя бы один маленький ресурс: время отдыха, музыка, доступная вещь, профессиональная поддержка, место.",
    "trialRu": "выбрать другой ресурс, если первый исчез.",
    "sourceHash": "0e3f5897166e190da7aef09c7788e0f4086e56ec657c09c6c08e4fa64d737177",
    "englishSourceAnchors": [
      "available",
      "not-yet-available",
      "rest time",
      "music",
      "object",
      "professional support",
      "place"
    ]
  },
  {
    "moduleId": "AS5",
    "day": 9,
    "section": "6.5",
    "titleRu": "Моё достоинство не равно результату",
    "practiceRu": "безопасная история человека, у которого не вышло задание; выбрать уважительный ответ вместо самоунижения или требовательного «надо стараться сильнее».",
    "trialRu": "сопоставить личную границу и достоинство на втором примере.",
    "sourceHash": "4f99ffa6761823e856360647aa29620cb06d2aaf8c90f5137a36fde44afc6786",
    "englishSourceAnchors": [
      "unfinished task",
      "respectful response",
      "humiliation"
    ]
  },
  {
    "moduleId": "AS5",
    "day": 10,
    "section": "6.5",
    "titleRu": "Я могу иметь границы и сохранять отношения",
    "practiceRu": "нейтральная репетиция «да / нет / не сейчас / мне нужен другой формат» в отношении просьбы знакомого.",
    "trialRu": "выбрать дистанцию и вариант заботы о себе при повторной просьбе.",
    "sourceHash": "bbe6f9f7f318e9d125a396675a20e7069c76b90da8faa41c465805d3b1b68b5b",
    "englishSourceAnchors": [
      "yes, no, not now",
      "another format",
      "unsafe"
    ]
  },
  {
    "moduleId": "AS5",
    "day": 11,
    "section": "6.5",
    "titleRu": "Какие связи поддерживают меня",
    "practiceRu": "карта видов связей «люди, сообщества, природа, занятия, профессиональные службы», отметить комфортный/некомфортный тип.",
    "trialRu": "выбрать, как безопасно увеличить поддержку без обязательного контакта.",
    "sourceHash": "6d9150ea7482e7cd836e792fe879d8f91c9aa861c9d94b333c0af0f757cc1279",
    "englishSourceAnchors": [
      "people, communities, nature, activities and professional services",
      "comfortable",
      "uncomfortable"
    ]
  },
  {
    "moduleId": "AS5",
    "day": 12,
    "section": "6.5",
    "titleRu": "У меня есть право на будущее без идеального прошлого",
    "practiceRu": "выбрать из настоящих маленьких интересов и ценностей одно направление на ближайшие недели; обозначить неизвестность и право изменить план.",
    "trialRu": "представить не образ «исцелённого себя», а обычную, достижимую будущую ситуацию или текстовую альтернативу.",
    "sourceHash": "be43e73c0a96b0380bb9dde1790444f543f4e75f8a3ae4b65c3f6a2b3661f501",
    "englishSourceAnchors": [
      "interests or values",
      "coming weeks",
      "uncertainty",
      "right to change"
    ]
  },
  {
    "moduleId": "AS5",
    "day": 13,
    "section": "6.5",
    "titleRu": "Что во мне уже соединяется",
    "practiceRu": "из прежних собственных карточек выбрать «мой ориентир / поддерживающая фраза / граница / ценность»; если человек начинал сразу с К5, заполнить только доступное.",
    "trialRu": "применить связку к новой обычной трудности.",
    "sourceHash": "9884b85e310a943750f80d8b0b9ed33dbdd77a847b24919216289a28c357f9fd",
    "englishSourceAnchors": [
      "anchor, support phrase, boundary and value",
      "directly with course 5",
      "only what is available"
    ]
  },
  {
    "moduleId": "AS5",
    "day": 14,
    "section": "6.5",
    "titleRu": "Моя карта Я и моей поддержки",
    "practiceRu": "создать четыре блока «я шире сложностей → мне важно → я могу поддержать себя → у меня есть граница/помощь» из действительно выбранных материалов.",
    "trialRu": "воспользоваться картой в вымышленном сюжете о неудачном дне.",
    "sourceHash": "85e11231371dc8b003518d87af375ddab6f92e174393dd76fc37cf1ca41ca008",
    "englishSourceAnchors": [
      "four optional blocks",
      "more than difficulties",
      "matters",
      "support",
      "boundary"
    ]
  },
  {
    "moduleId": "AS6",
    "day": 1,
    "section": "6.6",
    "titleRu": "Где в жизни я хочу больше пространства",
    "practiceRu": "разложить карточки «здоровый отдых, повседневные дела, общение, творчество, обучение, отношения, работа», выбрать одну приоритетную либо отметить «сейчас не знаю».",
    "trialRu": "определить, что в этой области выглядело бы немного лучше.",
    "sourceHash": "785a6eb5fefb85de1ba4dcb59b77f543d1c7842d24dd52c1e26690138c0c6568",
    "englishSourceAnchors": [
      "healthy rest, daily tasks, social contact, creativity, learning, relationships and work",
      "not sure"
    ]
  },
  {
    "moduleId": "AS6",
    "day": 2,
    "section": "6.6",
    "titleRu": "Из большого желания — маленький шаг",
    "practiceRu": "разложить желание героя на три возможных действия «очень мало / умеренно / пока не сейчас» и выбрать минимально доступный шаг для себя по желанию.",
    "trialRu": "адаптировать шаг под неожиданно усталый день.",
    "sourceHash": "08b2c71626e92dd158c96e6d3082267bc22efa44761969ee53a7881e93467511",
    "englishSourceAnchors": [
      "very small, moderate and not now",
      "planned rest"
    ]
  },
  {
    "moduleId": "AS6",
    "day": 3,
    "section": "6.6",
    "titleRu": "Мой реальный запас времени и сил",
    "practiceRu": "карта дня «энергия, время, ответственность, здоровье, транспорт, помощь»; отдельно отмечаются доступные и недоступные ресурсы без численного «уровня продуктивности».",
    "trialRu": "выбрать задачу с меньшей нагрузкой в другом расписании.",
    "sourceHash": "e981754f104dc3eb17eb277c1d4555ebb287e36df9f24eca2b9e56d097acd7da",
    "englishSourceAnchors": [
      "energy, time, responsibilities, health, transport and help",
      "unavailable",
      "without a productivity score"
    ]
  },
  {
    "moduleId": "AS6",
    "day": 4,
    "section": "6.6",
    "titleRu": "Могу выбирать темп",
    "practiceRu": "интерактивный календарь, где выбранное небольшое дело можно перенести, сократить, разбить или заменить отдыхом.",
    "trialRu": "изменить план при неожиданной усталости персонажа.",
    "sourceHash": "ad68443fe3448a226b5a2fbf0458958fa85fae6b50553783975fd6f4c5177e90",
    "englishSourceAnchors": [
      "calendar",
      "move, shorten, divide",
      "rest"
    ]
  },
  {
    "moduleId": "AS6",
    "day": 5,
    "section": "6.6",
    "titleRu": "В жизни может быть место интересу",
    "practiceRu": "обзор нейтральных, неопасных видов активности (музыка, свежий воздух при доступности, чтение, рисование, тёплый напиток, наблюдение за природой); выбрать, что сейчас скорее допустимо.",
    "trialRu": "сравнить короткую и длинную форму одного занятия.",
    "sourceHash": "0f89e0bad94301c55fab0e86c3339282b44aec88b67e0785e60893f7a7653615",
    "englishSourceAnchors": [
      "music",
      "fresh air",
      "reading",
      "drawing",
      "warm drink",
      "nature",
      "enjoyment is not required"
    ]
  },
  {
    "moduleId": "AS6",
    "day": 6,
    "section": "6.6",
    "titleRu": "Я могу попробовать — и изменить решение",
    "practiceRu": "конструктор «когда будет удобно / 2 минуты / где / если не получится, то …» для нейтрального занятия; выполненная попытка сообщается только добровольно.",
    "trialRu": "изменить сценарий при препятствии.",
    "sourceHash": "cced926140379a35195c759229731d419b2b722ce3e3305da6b6d18e9022938c",
    "englishSourceAnchors": [
      "when convenient",
      "two minutes",
      "where",
      "if it does not work",
      "voluntary"
    ]
  },
  {
    "moduleId": "AS6",
    "day": 7,
    "section": "6.6",
    "titleRu": "Действие и восстановление могут соседствовать",
    "practiceRu": "на календарной ленте разместить блок «задача — отдых — запас времени» для вымышленного дня и выбрать удобный ритм.",
    "trialRu": "при увеличении нагрузки сократить задачу и сохранить отдых.",
    "sourceHash": "d5d036411b31972268ab0c1e3fe4ebf8568a0056c0adb56590c4acdf838b9105",
    "englishSourceAnchors": [
      "task, rest and spare time",
      "timeline",
      "workable rhythm"
    ]
  },
  {
    "moduleId": "AS6",
    "day": 8,
    "section": "6.6",
    "titleRu": "Мой день не должен быть идеальным",
    "practiceRu": "тренажёр «первый план сорвался» с вариантами «сделать меньше, попросить помощи, перенести, отказаться», все ответы допустимы в подходящем контексте.",
    "trialRu": "выбрать другую реакцию, если первый вариант не помог.",
    "sourceHash": "b4dd1d29c2a7979413d29d84e405382dc83556c63357335a8cbfa44f23cd0279",
    "englishSourceAnchors": [
      "do less, ask for help, postpone or decline",
      "without self-punishment"
    ]
  },
  {
    "moduleId": "AS6",
    "day": 9,
    "section": "6.6",
    "titleRu": "Контакт с людьми — по моему выбору",
    "practiceRu": "карта дистанций общения «сообщение/звонок/встреча/никакого контакта» с выбором только потенциально безопасного человека либо анонимной профессиональной поддержки.",
    "trialRu": "составить сообщение, ничего не отправляя автоматически.",
    "sourceHash": "59af47e5911d4460c43304ca9e30db945f135a1ab1e287a9042ad39dfebc183d",
    "englishSourceAnchors": [
      "message, call, meeting or no contact",
      "safe person",
      "anonymous professional support"
    ]
  },
  {
    "moduleId": "AS6",
    "day": 10,
    "section": "6.6",
    "titleRu": "Я могу сохранять границы в отношениях",
    "practiceRu": "интерактивная сценка о чужой просьбе; выбрать «могу / не могу / позже / иначе» и уважительный способ выразить границу.",
    "trialRu": "иной сценарий общения с меньшей подсказкой.",
    "sourceHash": "f1d139aa0d4cede731ca8efe3a7f3351d32ee39daf4bf6a22f2bf524e7559244",
    "englishSourceAnchors": [
      "I can, I cannot, later or another way",
      "respectful phrase"
    ]
  },
  {
    "moduleId": "AS6",
    "day": 11,
    "section": "6.6",
    "titleRu": "Что действительно мешает моему шагу",
    "practiceRu": "карточки «не хватает времени, денег, транспорта, поддержки, сил, информации, доступной среды» сопоставить с способами помощи либо признанием ограничения.",
    "trialRu": "для новой цели отделить изменяемое от неуправляемого.",
    "sourceHash": "b28c5bd02997bb9068d81bc52be47ea77093de6e02304f73ee69cb5f04a3b95a",
    "englishSourceAnchors": [
      "time, money, transport, support, energy, information and accessibility",
      "internal, external and beyond-control"
    ]
  },
  {
    "moduleId": "AS6",
    "day": 12,
    "section": "6.6",
    "titleRu": "У меня есть второй маршрут",
    "practiceRu": "конструктор «если A недоступно, могу B / попросить C / отложить», обязательное право выбрать отсутствие действий; исследовать, что уменьшает зависимость от одного плана.",
    "trialRu": "перестроить план при двух изменившихся условиях.",
    "sourceHash": "c9c9439b8aa233ab51393e68462e3801fdb4e56210704280476845f8e869b185",
    "englishSourceAnchors": [
      "if A is unavailable",
      "B",
      "C",
      "postpone",
      "no action"
    ]
  },
  {
    "moduleId": "AS6",
    "day": 13,
    "section": "6.6",
    "titleRu": "Мои реальные попытки и честный опыт",
    "practiceRu": "обзор выбранных шагов: «попробовал/не пробовал/изменил/решил отдохнуть/предпочёл помощь»; клик не означает выполненное действие, отчёт добровольный.",
    "trialRu": "сформулировать один вывод «что стоит оставить или упростить».",
    "sourceHash": "b18eeb6c565587b8d5ed5b4a0097fb80f34fa878a606bf7f30351dcb5a5af160",
    "englishSourceAnchors": [
      "tried, did not try, changed, chose rest or preferred help",
      "click does not establish"
    ]
  },
  {
    "moduleId": "AS6",
    "day": 14,
    "section": "6.6",
    "titleRu": "Мой маршрут на ближайший месяц",
    "practiceRu": "собрать личную карту «важная область → минимальный шаг → подходящее время → запасной отдых/помощь → сигналы пересмотра» на 2–4 недели, без обязательного расписания.",
    "trialRu": "сыграть нейтральный сценарий, когда нужно пересмотреть план.",
    "sourceHash": "ff67a48b406b5ecca27511be7e72a13114e2094f80b59f2b76b48706a7c78c74",
    "englishSourceAnchors": [
      "meaningful area, minimum step, suitable time, backup rest or help, and signals to revise",
      "two to four weeks",
      "optional"
    ]
  }
]

const MODULES = ['AS1', 'AS3', 'AS5', 'AS6']
const LOCALES = ['ru', 'en']
const STATES = ['independent', 'guided', 'not_tried', 'not_suitable']

for (const fixture of SOURCE_FIXTURE) {
  for (const locale of LOCALES) test(`${fixture.moduleId} day ${fixture.day} ${locale}: source-corresponding practice and actual transport`, () => {
    const { moduleId, day } = fixture
    const lesson = traumaPhaseLesson(moduleId, day, locale)
    const route = traumaPhaseInteractionPlan(moduleId, day, locale)
    assert.equal(lesson.version, VERSION)
    assert.equal(lesson.moduleId, moduleId)
    assert.equal(lesson.day, day)
    assert.equal(lesson.source.section, fixture.section)
    assert.equal(lesson.source.goalsSection, '10.2')
    assert.equal(lesson.source.approvedDetailSha256, fixture.sourceHash)
    assert.equal(lesson.source.document, 'https://docs.google.com/document/d/10Je2F-a54NCkmZPr0uAFPyeHkRgAxYOJoBoNWcnCnew/edit')
    if (locale === 'ru') {
      assert.equal(lesson.title, fixture.titleRu)
      assert.equal(lesson.practice, fixture.practiceRu)
      assert.equal(lesson.transfer, fixture.trialRu)
    } else {
      for (const anchor of fixture.englishSourceAnchors) {
        assert.ok(lesson.practice.toLowerCase().includes(anchor.toLowerCase()), `${moduleId}/${day}: missing translated source concept ${anchor}`)
      }
      assert.doesNotMatch(JSON.stringify(lesson), /[А-Яа-яЁё]/u, 'English descriptor must not silently fall back to Russian')
    }
    for (const key of ['title', 'theme', 'practice', 'learningOutcome', 'recall', 'transfer', 'reflection', 'artifact', 'withoutImagery', 'mainScenario', 'newScenario']) {
      assert.ok(typeof lesson[key] === 'string' && lesson[key].length > 8, key)
    }
    assert.notEqual(lesson.mainScenario, lesson.newScenario, 'The transfer scene is different from the guided scene')
    assert.ok(lesson.reflection.includes(lesson.newScenario))
    assert.ok(lesson.reflection.includes(lesson.transfer))
    assert.ok(lesson.alternatives.readOnly)
    assert.ok(lesson.alternatives.noImagery)
    assert.ok(lesson.alternatives.skip)
    assert.equal(route.schema, 'opora-trauma13-interactions-1')
    assert.equal(route.version, VERSION)
    assert.deepEqual(route.source, lesson.source)
    assert.equal(route.methodActivity.title, lesson.title)
    assert.ok(route.methodActivity.prompt.includes(lesson.practice))
    assert.ok(route.methodActivity.prompt.includes(lesson.mainScenario))
    assert.equal(route.practiceLab.reflect.instruction, lesson.reflection)
    assert.deepEqual(route.practiceLab.main.fields, lesson.fields)
    assert.deepEqual(route.practiceLab.reflect.fields, lesson.newScenarioFields)
    assert.deepEqual(route.methodActivity.choices.map(({ value, label }) => ({ id: value, label })), route.practiceLab.main.options)
    assert.ok(route.methodActivity.choices.some(o => o.value.endsWith('_read')))
    assert.ok(route.methodActivity.choices.some(o => o.value.endsWith('_text')))
    assert.ok(route.methodActivity.choices.some(o => o.value === 'skip'))
    assert.ok(route.practiceLab.reflect.options.some(o => o.id.endsWith('_independent')))
    assert.ok(route.practiceLab.reflect.options.some(o => o.id.endsWith('_hint')))
    assert.ok(route.practiceLab.reflect.options.some(o => o.id.endsWith('_defer')))
    assert.ok(route.practiceLab.reflect.options.some(o => o.id.endsWith('_not_suitable')))
    assert.equal(new Set(route.methodActivity.choices.map(o => o.value)).size, route.methodActivity.choices.length)
    for (const option of route.methodActivity.choices) {
      assert.ok(option.value.length <= 30, 'Existing method validator limit')
      assert.equal(validateAntiStressMethodChoice(day, option.value, route.methodActivity), option.value)
    }
    for (const part of ['main', 'reflect']) {
      const card = route.practiceLab[part]
      assert.equal(card.format, 'worksheet', 'Use a supported renderer format')
      assert.ok(card.steps.length > 0 && card.steps.every(s => typeof s === 'string' && s.length > 10))
      assert.ok(card.fields.length >= 1 && card.fields.length <= 5)
      assert.equal(new Set(card.options.map(o => o.id)).size, card.options.length)
      for (const option of card.options) {
        assert.ok(option.id.length <= 30)
        assert.deepEqual(validateAntiStressLabAnswers({ [part]: option.id }, day, route.practiceLab), { [part]: option.id })
      }
    }
    assert.deepEqual(validateAntiStressLabAnswers({}, day, route.practiceLab), {}, 'Missing answers remain missing')
    for (const attempt of ['tried', 'partly', 'stopped', 'skip']) assert.deepEqual(
      validateAntiStressLabAnswers({ attempt }, day, route.practiceLab), { attempt })
    assert.equal(lesson.checkpoints.length, day === 14 ? 3 : 0)
  })
}

test('all 56 daily source practices are present in both languages without shared-scene substitution', () => {
  assert.equal(SOURCE_FIXTURE.length, 56)
  for (const locale of LOCALES) {
    const lessons = SOURCE_FIXTURE.map(({ moduleId, day }) => traumaPhaseLesson(moduleId, day, locale))
    assert.equal(new Set(lessons.map(x => x.newScenario)).size, 56)
    assert.equal(new Set(lessons.map(x => x.practice)).size, 56)
    for (const moduleId of MODULES) assert.equal(lessons.filter(x => x.moduleId === moduleId).length, 14)
  }
})

test('catalog does not activate AS4 or replace AS2 daily content; AS2 gets only supplemental §10.2 checkpoints', () => {
  for (const moduleId of ['AS2', 'AS4', 'AS0', 'AS7', '__proto__', 'constructor', '', null, undefined, {}, []]) {
    for (const day of [1, 14]) {
      assert.equal(traumaPhaseLesson(moduleId, day), null)
      assert.equal(traumaPhaseInteractionPlan(moduleId, day), null)
    }
    assert.equal(traumaPhaseCheckpoints(moduleId).length, moduleId === 'AS2' ? 3 : 0)
  }
  for (const day of [0, -1, 15, 1.1, '1', NaN, Infinity, null, undefined]) {
    assert.equal(traumaPhaseLesson('AS1', day), null)
    assert.equal(traumaPhaseInteractionPlan('AS1', day), null)
  }
  assert.deepEqual(traumaPhaseLesson('AS6', 14), traumaPhaseLesson('AS6', 14, 'en'))
  assert.deepEqual(traumaPhaseLesson('AS1', 1, 'unsupported'), traumaPhaseLesson('AS1', 1, 'en'))
})

test('choices are scoped to the course and day; forged values cannot use the transport', () => {
  for (const moduleId of MODULES) {
    const plan = traumaPhaseInteractionPlan(moduleId, 1)
    const otherDay = traumaPhaseInteractionPlan(moduleId, 2)
    const otherCourse = traumaPhaseInteractionPlan(MODULES[(MODULES.indexOf(moduleId) + 1) % MODULES.length], 1)
    for (const other of [otherDay, otherCourse]) {
      assert.throws(() => validateAntiStressMethodChoice(1, other.methodActivity.choices[0].value, plan.methodActivity), /INVALID_OPORA_METHOD_CHOICE/)
      for (const part of ['main', 'reflect']) assert.throws(() => validateAntiStressLabAnswers({ [part]: other.practiceLab[part].options[0].id }, 1, plan.practiceLab), /INVALID_PRACTICE_LAB/)
    }
    assert.throws(() => validateAntiStressLabAnswers({ arbitraryText: 'private journal' }, 1, plan.practiceLab), /INVALID_PRACTICE_LAB/)
    assert.throws(() => validateAntiStressLabAnswers({ attempt: 'mastered' }, 1, plan.practiceLab), /INVALID_PRACTICE_LAB/)
  }
})

const CHECKPOINT_CONCEPTS = {
  AS1: [['ориентир', 'anchor'], ['пауз', 'pause'], ['помощ', 'help']],
  AS2: [['давления', 'demands'], ['две', 'two'], ['запасной', 'backup']],
  AS3: [['не знаю', 'not sure'], ['дистанц', 'distance'], ['ориентир', 'anchor']],
  AS5: [['поддерж', 'support'], ['ценност', 'value'], ['границ', 'boundary']],
  AS6: [['отдых', 'rest'], ['план А/Б', 'A/B plan'], ['границ', 'boundary']],
}
for (const moduleId of ['AS1', 'AS2', 'AS3', 'AS5', 'AS6']) for (const locale of LOCALES) {
  test(`${moduleId} ${locale}: three distinct §10.2 optional checkpoints and honest evidence states`, () => {
    const checkpoints = traumaPhaseCheckpoints(moduleId, locale)
    assert.deepEqual(checkpoints.map(x => x.id), ['A', 'B', 'C'])
    for (const [index, checkpoint] of checkpoints.entries()) {
      assert.equal(checkpoint.moduleId, moduleId)
      assert.equal(checkpoint.day, 14)
      assert.equal(checkpoint.version, VERSION)
      assert.equal(checkpoint.source.section, '10.2')
      assert.equal(checkpoint.required, false)
      assert.equal(checkpoint.completionGate, false)
      assert.equal(checkpoint.evidenceScope, 'in_app_choice_and_voluntary_report')
      assert.deepEqual(checkpoint.evidenceStates.map(x => x.value), STATES)
      assert.ok(checkpoint.prompt.includes(CHECKPOINT_CONCEPTS[moduleId][index][locale === 'ru' ? 0 : 1]))
      assert.ok(checkpoint.scene.length > 30)
      assert.ok(checkpoint.options.length >= 2)
      assert.equal(new Set(checkpoint.options.map(x => x.value)).size, checkpoint.options.length)
      assert.ok(checkpoint.options.every(x => typeof x.value === 'string' && x.value.length <= 30 && x.label))
      assert.ok(checkpoint.options.every(x => x.value.startsWith(moduleId.toLowerCase() + '_')))
      assert.equal(Object.hasOwn(checkpoint, 'score'), false)
      assert.equal(Object.hasOwn(checkpoint, 'passingScore'), false)
      assert.equal(Object.hasOwn(checkpoint, 'defaultState'), false)
      assert.match(checkpoint.guidance, locale === 'ru' ? /добровольный отчёт/ : /voluntary report/)
      assert.match(checkpoint.guidance, locale === 'ru' ? /Подсказка исключает/ : /hint rules out/)
    }
  })
}

test('AS1 safety discrimination and AS6 life-reengagement fields retain their distinct source content', () => {
  const safety = traumaPhaseInteractionPlan('AS1', 5, 'ru')
  assert.match(safety.methodActivity.prompt, /тихий открытый читальный зал/)
  assert.match(safety.methodActivity.prompt, /вход временно закрыт/)
  assert.match(safety.methodActivity.prompt, /видимым дымом/)
  assert.equal(safety.practiceLab.main.fields.length, 3)
  const dailyMap = traumaPhaseInteractionPlan('AS6', 14, 'en')
  assert.deepEqual(dailyMap.practiceLab.main.fields, [
    'Meaningful area', 'Minimum step or rest', 'Suitable time', 'Backup rest or help', 'Signals for revising the plan',
  ])
  assert.match(traumaPhaseLesson('AS6', 13).practice, /A click does not establish/)
  assert.match(traumaPhaseLesson('AS6', 9).transfer, /without sending/)
  assert.match(traumaPhaseLesson('AS3', 3).alternatives.noImagery, /words instead of numbers/)
  assert.match(traumaPhaseLesson('AS5', 13).practice, /Starting directly with course 5 is allowed/)
})

test('resolvers return fresh nested objects so callers cannot corrupt other sessions or locales', () => {
  const original = traumaPhaseLesson('AS1', 14, 'ru')
  const lesson = traumaPhaseLesson('AS1', 14, 'ru')
  lesson.fields[0] = 'changed'
  lesson.alternatives.readOnly = 'changed'
  lesson.checkpoints[0].options[0].label = 'changed'
  lesson.source.section = 'changed'
  assert.deepEqual(traumaPhaseLesson('AS1', 14, 'ru'), original)
  const originalPlan = traumaPhaseInteractionPlan('AS6', 14)
  const plan = traumaPhaseInteractionPlan('AS6', 14)
  plan.methodActivity.choices[0].label = 'changed'
  plan.practiceLab.main.fields[0] = 'changed'
  plan.practiceLab.main.options[0].label = 'changed'
  plan.practiceLab.reflect.steps.push('changed')
  assert.deepEqual(traumaPhaseInteractionPlan('AS6', 14), originalPlan)
  const before = traumaPhaseCheckpoints('AS2')
  const altered = traumaPhaseCheckpoints('AS2')
  altered[0].evidenceStates[0].value = 'mastered'
  assert.deepEqual(traumaPhaseCheckpoints('AS2'), before)
})

test('no imported legacy content, hidden persistence, numeric treatment targets or scoring gate', () => {
  const source = readFileSync(new URL('../lib/inner-growth/trauma-phase-catalog.js', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /^import\s/m)
  assert.doesNotMatch(source, /fiveLevelLessonRow|routeInteractionPlan\(|NAV2|NAV-2|localStorage|sessionStorage|fetch\(|supabase|process\.env/)
  for (const locale of LOCALES) {
    const display = JSON.stringify(SOURCE_FIXTURE.map(({ moduleId, day }) => ({
      lesson: traumaPhaseLesson(moduleId, day, locale), route: traumaPhaseInteractionPlan(moduleId, day, locale),
    })))
    assert.doesNotMatch(display, /(?:\+1|−1|2\/3|2 из 3|MCID|SEM|MDC95|PCL-5|DERS-16|WSAS|SCS-SF)/)
    assert.doesNotMatch(display, /(?:you will recover|guaranteed improvement|proven treatment|вы излечитесь|гарантированное улучшение|доказанный лечебный эффект)/i)
    assert.doesNotMatch(display, /"(?:score|passingScore|successThreshold|masteryScore)"\s*:/)
  }
})
