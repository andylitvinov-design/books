import { deepFreeze } from '../../lib/assessments/contracts.js'
import { buildFunDefinitions } from './expanded-battery-v2-helper.js'

// Original non-diagnostic EN/RU self-reflections, not licensed clinical instruments.
// Each definition has an immutable ID and questionnaire fingerprint for result provenance.
const CONFIGS = [
  {
    "key": "hh-felt-safety",
    "titles": {
      "en": "Feeling Safe in My Body",
      "ru": "Чувство безопасности в теле"
    },
    "descriptions": {
      "en": "Notice moments of physical ease, choice and grounding during the last week. Original reflection, not a clinical assessment.",
      "ru": "Заметьте моменты телесного спокойствия, выбора и заземления за неделю. Авторская саморефлексия, не клиническая диагностика."
    },
    "axis": "resources",
    "topics": [
      "body",
      "stress",
      "self-support"
    ],
    "categoryAffinities": [
      "body",
      "emotions"
    ],
    "analysisAxes": [
      {
        "key": "self_support",
        "weight": 0.88
      },
      {
        "key": "stress",
        "weight": 0.67
      },
      {
        "key": "emotional_regulation",
        "weight": 0.57
      }
    ],
    "testLength": "medium",
    "en": [
      "I can notice when my body begins to tense.",
      "I know at least one ordinary situation in which I feel physically at ease.",
      "I can change my posture or surroundings when I need more comfort.",
      "I can recognise a small sign that I am becoming calmer.",
      "I feel able to say no to physical contact I do not want.",
      "I have a simple grounding action I can choose when overwhelmed."
    ],
    "ru": [
      "Я замечаю, когда тело начинает напрягаться.",
      "Я знаю хотя бы одну обычную ситуацию, в которой телу спокойно.",
      "Я могу менять позу или обстановку, когда мне нужно больше комфорта.",
      "Я могу распознать небольшой признак того, что успокаиваюсь.",
      "Я чувствую, что могу отказаться от нежелательного физического контакта.",
      "У меня есть простое действие для заземления, которое я могу выбрать при перегрузке."
    ],
    "ids": {
      "en": "f2076b15-7790-5323-ae66-ca5b31c5d54b",
      "ru": "d02f69c6-a6b2-5c3f-a367-4e3f43427118"
    },
    "hashes": {
      "en": "sha256:88fba1c7ff6ca1a26fc368351f5d55cb5b89ad886bcf8fc881b3df2294c7e9ad",
      "ru": "sha256:101dc34d4bb09c0eb37ce3f4c7f8266389835114fd79ac7c1991251842ce1c05"
    },
    "negative": false,
    "timeframe": "past-7-days",
    "reviewedAt": "2026-10-08"
  },
  {
    "key": "hh-emotion-clarity",
    "titles": {
      "en": "Naming My Feelings",
      "ru": "Ясность чувств"
    },
    "descriptions": {
      "en": "Explore how clearly you notice and describe feelings without judging them.",
      "ru": "Исследуйте, насколько ясно вы замечаете и называете чувства без самоосуждения."
    },
    "axis": "resources",
    "topics": [
      "mood",
      "self-support",
      "stress"
    ],
    "categoryAffinities": [
      "emotions"
    ],
    "analysisAxes": [
      {
        "key": "emotional_regulation",
        "weight": 0.9
      },
      {
        "key": "clarity",
        "weight": 0.67
      },
      {
        "key": "self_support",
        "weight": 0.46
      }
    ],
    "testLength": "short",
    "en": [
      "I can distinguish sadness from tiredness.",
      "I can name a feeling without deciding it is bad.",
      "I notice where an emotion is felt in my body.",
      "I can describe a feeling in my own words.",
      "I can recognise when several feelings are present at once.",
      "I can make room for a feeling before acting on it."
    ],
    "ru": [
      "Я могу отличить грусть от усталости.",
      "Я могу назвать чувство, не решая, что оно плохое.",
      "Я замечаю, как эмоция ощущается в теле.",
      "Я могу описать чувство своими словами.",
      "Я могу распознать, когда одновременно присутствуют несколько чувств.",
      "Я могу дать чувству немного места, прежде чем действовать."
    ],
    "ids": {
      "en": "1828ac5c-4dde-5e30-ad18-7bb46e20dab7",
      "ru": "9daaadc2-6236-5b46-a187-1029dfa1c13d"
    },
    "hashes": {
      "en": "sha256:f9791a64ffbc8116a2c0f4d6b74a44264cf7f777f9f1fc6ed317fb2e94eee7ea",
      "ru": "sha256:ca1e44148405a28f41e1a56a55fcff8d44bd977ff96dc512afcb3ae0cd8f11ac"
    },
    "negative": false,
    "timeframe": "past-7-days",
    "reviewedAt": "2026-10-08"
  },
  {
    "key": "hh-loss-adjustment",
    "titles": {
      "en": "Making Space for Loss",
      "ru": "Место для переживания утраты"
    },
    "descriptions": {
      "en": "A gentle check of support, daily functioning and space for feelings after a change or loss; not a grief diagnosis.",
      "ru": "Бережная проверка опоры, повседневных дел и места для чувств после перемен или утраты; не диагностика."
    },
    "axis": "resources",
    "topics": [
      "mood",
      "relationships",
      "support",
      "recovery"
    ],
    "categoryAffinities": [
      "emotions",
      "relationships"
    ],
    "analysisAxes": [
      {
        "key": "mood",
        "weight": 0.73
      },
      {
        "key": "resource",
        "weight": 0.82
      },
      {
        "key": "relationships",
        "weight": 0.49
      }
    ],
    "testLength": "medium",
    "en": [
      "I can acknowledge that something important has changed or been lost.",
      "I allow myself different reactions rather than expecting one correct feeling.",
      "I know someone I could turn to if I wanted to talk.",
      "I can take care of at least one daily need during a difficult period.",
      "I have moments of rest without demanding that I feel better immediately.",
      "I can remember what mattered without forcing myself to move on."
    ],
    "ru": [
      "Я могу признать, что что-то важное изменилось или было утрачено.",
      "Я позволяю себе разные реакции, не требуя одного правильного чувства.",
      "Я знаю человека, к которому мог бы обратиться для разговора.",
      "Я могу позаботиться хотя бы об одной повседневной потребности в трудный период.",
      "У меня бывают моменты отдыха без требования немедленно почувствовать себя лучше.",
      "Я могу помнить о том, что было важно, не заставляя себя немедленно идти дальше."
    ],
    "ids": {
      "en": "a7275a87-3b07-5a8e-a107-7548bd34eefe",
      "ru": "ceab5e3f-dac8-5fc2-a303-ea6fb33d2036"
    },
    "hashes": {
      "en": "sha256:00d003687b63a09d5414f3626be7b06a963e453c15c94b931848641dff540875",
      "ru": "sha256:a41286aae856f63254e92fc5fd29ef7aec9c8d90490a0fcdf4265ab4e0db62ff"
    },
    "negative": false,
    "timeframe": "past-7-days",
    "reviewedAt": "2026-10-08"
  },
  {
    "key": "hh-belonging",
    "titles": {
      "en": "Belonging & Connection",
      "ru": "Принадлежность и связь"
    },
    "descriptions": {
      "en": "Reflect on places, groups and people with whom you can be yourself.",
      "ru": "Подумайте о людях, местах и сообществах, среди которых можно быть собой."
    },
    "axis": "resources",
    "topics": [
      "relationships",
      "support",
      "self-support"
    ],
    "categoryAffinities": [
      "relationships",
      "emotions"
    ],
    "analysisAxes": [
      {
        "key": "relationships",
        "weight": 0.96
      },
      {
        "key": "resource",
        "weight": 0.62
      },
      {
        "key": "self_support",
        "weight": 0.38
      }
    ],
    "testLength": "medium",
    "en": [
      "I have at least one place where I feel welcome.",
      "I can be myself with at least one person.",
      "I experience small moments of connection during the week.",
      "I can participate in a group without having to perform a role.",
      "I can ask for space without fearing that all connection will disappear.",
      "I can notice people or communities with shared interests."
    ],
    "ru": [
      "Есть хотя бы одно место, где я чувствую, что мне рады.",
      "Хотя бы с одним человеком я могу быть собой.",
      "В течение недели у меня бывают небольшие моменты близости или связи.",
      "Я могу быть в группе, не играя обязательную роль.",
      "Я могу попросить личного пространства без ощущения, что любая связь исчезнет.",
      "Я замечаю людей или сообщества с близкими интересами."
    ],
    "ids": {
      "en": "c35e0b17-f460-5fdb-ad95-c78ae5e3acb0",
      "ru": "412ea9e7-a00e-565c-aeaa-174191fa10bd"
    },
    "hashes": {
      "en": "sha256:3c33992af4e355167111b38f7f51ea2aa71116103790d2fe0e9222b28e4d2b05",
      "ru": "sha256:3ce04fe0617342e5e70e5ec058ab55b887ab0d8bd614c15b2098ffecc6056b5a"
    },
    "negative": false,
    "timeframe": "past-7-days",
    "reviewedAt": "2026-10-08"
  },
  {
    "key": "hh-conflict-repair",
    "titles": {
      "en": "After a Difficult Conversation",
      "ru": "После трудного разговора"
    },
    "descriptions": {
      "en": "Consider how you pause, express needs and repair everyday misunderstandings.",
      "ru": "Исследуйте, как вы делаете паузу, говорите о потребностях и восстанавливаете контакт после недопонимания."
    },
    "axis": "function",
    "topics": [
      "relationships",
      "support",
      "self-support"
    ],
    "categoryAffinities": [
      "relationships",
      "emotions"
    ],
    "analysisAxes": [
      {
        "key": "relationships",
        "weight": 0.96
      },
      {
        "key": "emotional_regulation",
        "weight": 0.77
      },
      {
        "key": "self_support",
        "weight": 0.54
      }
    ],
    "testLength": "medium",
    "en": [
      "I can pause before replying when a conversation becomes heated.",
      "I can describe what bothered me without attacking the other person.",
      "I can listen for the other person's concern even when I disagree.",
      "I can recognise my part in a misunderstanding.",
      "I can suggest one small step to restore dialogue.",
      "I can choose not to continue a conversation that feels unsafe."
    ],
    "ru": [
      "Я могу сделать паузу перед ответом, когда разговор накаляется.",
      "Я могу сказать, что меня задело, не нападая на другого человека.",
      "Я могу услышать, что тревожит другого, даже когда не согласен.",
      "Я могу признать свою часть в недопонимании.",
      "Я могу предложить небольшой шаг для восстановления диалога.",
      "Я могу не продолжать разговор, если он ощущается небезопасным."
    ],
    "ids": {
      "en": "aee0184b-a4b3-5d0c-a871-c2f2f3faf2d3",
      "ru": "32656416-981e-5710-aaca-adeabb7288c1"
    },
    "hashes": {
      "en": "sha256:81431d3e392eaa5462dcd8c1b2c6a7de93e31bdaa46487c031766318e74117e5",
      "ru": "sha256:2f459f4bc10951e51c7910e8e38273e5ad4cd05dcac2a9d0096a49b6cafd883e"
    },
    "negative": false,
    "timeframe": "past-7-days",
    "reviewedAt": "2026-10-08"
  },
  {
    "key": "hh-family-roles",
    "titles": {
      "en": "Family Roles & My Choices",
      "ru": "Семейные роли и мой выбор"
    },
    "descriptions": {
      "en": "Notice expectations and responsibilities in family relationships without assigning blame or diagnosing patterns.",
      "ru": "Заметьте ожидания и ответственность в семье без обвинений и диагностических ярлыков."
    },
    "axis": "resources",
    "topics": [
      "relationships",
      "self-support",
      "stress"
    ],
    "categoryAffinities": [
      "relationships",
      "emotions"
    ],
    "analysisAxes": [
      {
        "key": "self_support",
        "weight": 0.85
      },
      {
        "key": "relationships",
        "weight": 0.86
      },
      {
        "key": "stress",
        "weight": 0.53
      }
    ],
    "testLength": "medium",
    "en": [
      "I can tell my own wishes apart from family expectations.",
      "I can notice when I take responsibility for another adult's feelings.",
      "I can choose how much help I realistically have energy to give.",
      "I can appreciate my family and still make independent decisions.",
      "I can talk about limits without dismissing another person's needs.",
      "I allow myself to reconsider a role that no longer fits."
    ],
    "ru": [
      "Я могу отличить собственные желания от семейных ожиданий.",
      "Я замечаю, когда беру на себя ответственность за чувства другого взрослого.",
      "Я могу выбирать, сколько помощи реально способен дать.",
      "Я могу ценить семью и при этом принимать самостоятельные решения.",
      "Я могу говорить о границах, не обесценивая потребности другого.",
      "Я позволяю себе пересматривать роль, которая больше не подходит."
    ],
    "ids": {
      "en": "13cbb77f-cf5c-5699-aa29-1295218ec6a8",
      "ru": "79bc7b6c-eb6e-568d-a506-010c134f0f87"
    },
    "hashes": {
      "en": "sha256:38d26052de8ca7253024aaf341583225da0e7ca3e2176d3d1c26c4f43ff6b832",
      "ru": "sha256:3115cfadc8612e9b555cdd0042e27a2306fffaab3e53a1570a79dc4907ba75f8"
    },
    "negative": false,
    "timeframe": "past-7-days",
    "reviewedAt": "2026-10-08"
  },
  {
    "key": "hh-inner-imagery",
    "titles": {
      "en": "Imagination & Inner Images",
      "ru": "Воображение и внутренние образы"
    },
    "descriptions": {
      "en": "A creative self-reflection on imagery, metaphors and personal meaning, not a psychological diagnosis.",
      "ru": "Творческая саморефлексия об образах, метафорах и личных смыслах, не психологическая диагностика."
    },
    "axis": "resources",
    "topics": [
      "meaning",
      "mood",
      "self-support"
    ],
    "categoryAffinities": [
      "emotions",
      "other"
    ],
    "analysisAxes": [
      {
        "key": "meaning",
        "weight": 0.87
      },
      {
        "key": "clarity",
        "weight": 0.54
      },
      {
        "key": "emotional_regulation",
        "weight": 0.5
      }
    ],
    "testLength": "medium",
    "en": [
      "I can imagine a place that feels calming or welcoming.",
      "Images or metaphors sometimes help me describe a feeling.",
      "I can notice colours, shapes or sensations in an imagined scene.",
      "I can be curious about an image without deciding what it must mean.",
      "I can use a creative image to explore several possible choices.",
      "I can return attention to my surroundings whenever I wish."
    ],
    "ru": [
      "Я могу представить место, которое ощущается спокойным или принимающим.",
      "Образы или метафоры иногда помогают мне описать чувство.",
      "Я могу замечать цвета, формы или ощущения в воображаемой сцене.",
      "Я могу интересоваться образом, не навязывая ему обязательный смысл.",
      "Я могу через творческий образ исследовать несколько вариантов выбора.",
      "Я могу возвращать внимание к окружающей обстановке, когда захочу."
    ],
    "ids": {
      "en": "5ebfbbb4-8ce5-58b9-a5bc-dfe8cdc1bfb4",
      "ru": "fb657a43-39cd-5ebc-af98-b25ad72cb5bf"
    },
    "hashes": {
      "en": "sha256:d36b08688ba6637c3eec663e09a1419506a5038bb5b8a0db34d2d70eb6c3a73e",
      "ru": "sha256:aee65c291e19e7979eef1ccfe3f49ae86aa0bcda424eee57b472769d528bfe84"
    },
    "negative": false,
    "timeframe": "past-7-days",
    "reviewedAt": "2026-10-08"
  },
  {
    "key": "hh-values-direction",
    "titles": {
      "en": "Living My Values",
      "ru": "Жить в согласии с ценностями"
    },
    "descriptions": {
      "en": "Explore the connection between everyday choices and what matters to you.",
      "ru": "Исследуйте связь между повседневными решениями и тем, что для вас важно."
    },
    "axis": "resources",
    "topics": [
      "meaning",
      "motivation",
      "function"
    ],
    "categoryAffinities": [
      "work-money",
      "emotions",
      "other"
    ],
    "analysisAxes": [
      {
        "key": "meaning",
        "weight": 1
      },
      {
        "key": "clarity",
        "weight": 0.71
      },
      {
        "key": "functioning",
        "weight": 0.5
      }
    ],
    "testLength": "medium",
    "en": [
      "I can name two things that matter deeply to me.",
      "At least one recent action reflected my values.",
      "I can notice when an obligation conflicts with what matters to me.",
      "I know one small choice that would bring me closer to my priorities.",
      "I can revise a goal if it no longer reflects what I want.",
      "I can distinguish my direction from other people's definitions of success."
    ],
    "ru": [
      "Я могу назвать две вещи, которые для меня глубоко важны.",
      "Хотя бы одно недавнее действие соответствовало моим ценностям.",
      "Я замечаю, когда обязательство противоречит моим ценностям.",
      "Я знаю один небольшой выбор, который приблизит меня к важному.",
      "Я могу пересмотреть цель, если она больше не отражает мои желания.",
      "Я могу отличить своё направление от чужого представления об успехе."
    ],
    "ids": {
      "en": "d0739c27-8d4b-5c64-a645-c21c0edf8806",
      "ru": "319361bc-2c02-52ae-a5b8-77b9e95c3af9"
    },
    "hashes": {
      "en": "sha256:263078b8df5261d1f6cbe6bf2a26bc65666054bec447f3abf99e30099f6ed05f",
      "ru": "sha256:a76a7e355e3da2877a5ce31f2eb858dc14c78e7193073383eafe0da295006cbc"
    },
    "negative": false,
    "timeframe": "past-7-days",
    "reviewedAt": "2026-10-08"
  },
  {
    "key": "hh-life-transition",
    "titles": {
      "en": "Stability During Change",
      "ru": "Опора во время перемен"
    },
    "descriptions": {
      "en": "Check which anchors and choices support you during life transitions.",
      "ru": "Проверьте, какие опоры и решения помогают вам в период жизненных перемен."
    },
    "axis": "resources",
    "topics": [
      "recovery",
      "support",
      "meaning",
      "function"
    ],
    "categoryAffinities": [
      "emotions",
      "work-money",
      "other"
    ],
    "analysisAxes": [
      {
        "key": "resource",
        "weight": 0.92
      },
      {
        "key": "self_support",
        "weight": 0.78
      },
      {
        "key": "meaning",
        "weight": 0.57
      },
      {
        "key": "functioning",
        "weight": 0.42
      }
    ],
    "testLength": "medium",
    "en": [
      "I can name what is changing in my life.",
      "I know one part of my routine I can keep stable.",
      "I can identify support available during this transition.",
      "I can separate what I control from what I cannot control.",
      "I allow myself time to adapt to an unfamiliar situation.",
      "I can choose one manageable next step instead of planning everything."
    ],
    "ru": [
      "Я могу назвать, что именно меняется в моей жизни.",
      "Я знаю одну часть привычного распорядка, которую могу сохранить.",
      "Я могу определить доступную поддержку во время перемен.",
      "Я могу отделить то, на что влияю, от того, на что не влияю.",
      "Я даю себе время привыкнуть к незнакомой ситуации.",
      "Я могу выбрать один посильный следующий шаг вместо попытки спланировать всё."
    ],
    "ids": {
      "en": "78ae1ce7-168e-5938-ad33-7746bc9b0941",
      "ru": "3f1dd101-1586-5f0d-a02e-e2f4be0dee3f"
    },
    "hashes": {
      "en": "sha256:9e6e0842af0c7063b543b56ecaaeb70dac87f2ad5d01cf473b625ccac9b1f07e",
      "ru": "sha256:195935f56f334c596f5d4ef5cf0e93cf063b40634b8a7469a52388e517de1e7d"
    },
    "negative": false,
    "timeframe": "past-7-days",
    "reviewedAt": "2026-10-08"
  },
  {
    "key": "hh-speaking-up",
    "titles": {
      "en": "Finding My Voice",
      "ru": "Уверенно говорить о себе"
    },
    "descriptions": {
      "en": "Notice how easily you communicate preferences, requests and limits.",
      "ru": "Заметьте, насколько легко вы выражаете предпочтения, просьбы и границы."
    },
    "axis": "function",
    "topics": [
      "relationships",
      "self-support",
      "function"
    ],
    "categoryAffinities": [
      "relationships",
      "work-money",
      "emotions"
    ],
    "analysisAxes": [
      {
        "key": "self_support",
        "weight": 0.88
      },
      {
        "key": "relationships",
        "weight": 0.79
      },
      {
        "key": "functioning",
        "weight": 0.52
      }
    ],
    "testLength": "short",
    "en": [
      "I can say what I prefer in an ordinary conversation.",
      "I can ask a clear question when something is confusing.",
      "I can decline a request without inventing a long excuse.",
      "I can respectfully disagree with someone important to me.",
      "I can ask for more time before giving an answer.",
      "I can express a need even if it might disappoint someone."
    ],
    "ru": [
      "Я могу сказать, что предпочитаю, в обычном разговоре.",
      "Я могу задать ясный вопрос, когда что-то непонятно.",
      "Я могу отказаться от просьбы без длинных оправданий.",
      "Я могу уважительно не согласиться с важным для меня человеком.",
      "Я могу попросить время перед ответом.",
      "Я могу выразить потребность, даже если кого-то это разочарует."
    ],
    "ids": {
      "en": "3297dc76-f225-545e-acdf-f60cdab71e0e",
      "ru": "2aeb8a89-8879-56ad-ac3d-09d5762d61dd"
    },
    "hashes": {
      "en": "sha256:26bbe8cceeac0594dacddcfee2d373819a8dad16551f4a70f503eab14a2305fe",
      "ru": "sha256:84f5539cc85ff6ef4d3af0baf7eda84f8101e168e91e6f6094fb8eb21b018807"
    },
    "negative": false,
    "timeframe": "past-7-days",
    "reviewedAt": "2026-10-08"
  },
  {
    "key": "hh-sustainable-pace",
    "titles": {
      "en": "A Pace I Can Sustain",
      "ru": "Темп без истощения"
    },
    "descriptions": {
      "en": "Reflect on workload, pauses and capacity without labelling burnout or a medical condition.",
      "ru": "Оцените нагрузку, паузы и свои возможности без диагнозов и ярлыков выгорания."
    },
    "axis": "function",
    "topics": [
      "work",
      "stress",
      "recovery",
      "energy"
    ],
    "categoryAffinities": [
      "work-money",
      "energy",
      "body"
    ],
    "analysisAxes": [
      {
        "key": "functioning",
        "weight": 0.86
      },
      {
        "key": "energy",
        "weight": 0.75
      },
      {
        "key": "stress",
        "weight": 0.69
      },
      {
        "key": "resource",
        "weight": 0.53
      }
    ],
    "testLength": "medium",
    "en": [
      "I can recognise when my workload exceeds my energy.",
      "I can make a task smaller when time or energy is limited.",
      "I can take a pause before reaching complete exhaustion.",
      "I know which responsibilities are most important this week.",
      "I can adjust my pace without treating it as a personal failure.",
      "I have some recovery time after demanding periods."
    ],
    "ru": [
      "Я замечаю, когда нагрузка превышает мои силы.",
      "Я могу уменьшить задачу, когда мало времени или энергии.",
      "Я могу делать паузу до полного истощения.",
      "Я понимаю, какие обязательства важнее всего на этой неделе.",
      "Я могу менять темп, не считая это личной неудачей.",
      "После напряжённых периодов у меня есть время на восстановление."
    ],
    "ids": {
      "en": "c897c975-620b-5afb-a281-d24ec11878c9",
      "ru": "804e857a-1568-5ae4-a053-b889a24b225b"
    },
    "hashes": {
      "en": "sha256:60bfde93a89d3e652e74c18d2fd13abc3628d4a07634d6fd9e059709e9f993b6",
      "ru": "sha256:f3ba493db26308c56d7087150e936e9b2f92e988325bb0384ea9511817eae4e4"
    },
    "negative": false,
    "timeframe": "past-7-days",
    "reviewedAt": "2026-10-08"
  },
  {
    "key": "hh-support-seeking",
    "titles": {
      "en": "Asking for Support",
      "ru": "Умение просить поддержку"
    },
    "descriptions": {
      "en": "Explore practical comfort with receiving help and expressing a clear request.",
      "ru": "Исследуйте, насколько вам доступно принимать помощь и ясно формулировать просьбу."
    },
    "axis": "resources",
    "topics": [
      "support",
      "relationships",
      "self-support"
    ],
    "categoryAffinities": [
      "relationships",
      "emotions"
    ],
    "analysisAxes": [
      {
        "key": "resource",
        "weight": 0.86
      },
      {
        "key": "relationships",
        "weight": 0.78
      },
      {
        "key": "self_support",
        "weight": 0.72
      }
    ],
    "testLength": "short",
    "en": [
      "I can notice when a problem would be easier with help.",
      "I know at least one person or service I could ask for support.",
      "I can explain what kind of help I need.",
      "I can accept a small offer of help without feeling I must repay it immediately.",
      "I can handle a refusal and look for another option.",
      "I can also respect my limits when someone asks for my help."
    ],
    "ru": [
      "Я замечаю, когда с проблемой было бы легче справиться с помощью.",
      "Я знаю хотя бы одного человека или службу, к которым могу обратиться за поддержкой.",
      "Я могу объяснить, какая помощь мне нужна.",
      "Я могу принять небольшую помощь без чувства, что обязан немедленно отплатить.",
      "Я могу пережить отказ и поискать другой вариант.",
      "Я умею учитывать свои возможности, когда о помощи просят меня."
    ],
    "ids": {
      "en": "a5fbdff6-e125-5e29-a828-7415938871e9",
      "ru": "31b95974-1368-5048-a299-27968ce8ae59"
    },
    "hashes": {
      "en": "sha256:c4d059e26d67bc6c503f9f3d4d6a05fa6286f729ba226013d487e3fd99948656",
      "ru": "sha256:50241f026c7c5e2b01c8994c133ad249b4be55ad66c6374740709840a29580e1"
    },
    "negative": false,
    "timeframe": "past-7-days",
    "reviewedAt": "2026-10-08"
  },
  {
    "key": "hh-sensory-comfort",
    "titles": {
      "en": "Everyday Sensory Comfort",
      "ru": "Сенсорный комфорт"
    },
    "descriptions": {
      "en": "Notice how light, sound, movement and surroundings affect everyday comfort; not a neurological test.",
      "ru": "Заметьте влияние света, звуков, движения и среды на повседневный комфорт; не неврологический тест."
    },
    "axis": "state",
    "topics": [
      "body",
      "stress",
      "recovery"
    ],
    "categoryAffinities": [
      "body",
      "energy",
      "other"
    ],
    "analysisAxes": [
      {
        "key": "stress",
        "weight": 0.61
      },
      {
        "key": "emotional_regulation",
        "weight": 0.56
      },
      {
        "key": "energy",
        "weight": 0.43
      }
    ],
    "testLength": "short",
    "en": [
      "I can notice when noise or light becomes tiring.",
      "I can change something small in my environment to feel more comfortable.",
      "I can tell the difference between needing rest and needing movement.",
      "I notice which textures, sounds or spaces feel pleasant to me.",
      "I can take a brief sensory break when I need one.",
      "I can explain a comfort need without blaming myself."
    ],
    "ru": [
      "Я замечаю, когда шум или свет начинают утомлять.",
      "Я могу немного изменить обстановку, чтобы стало комфортнее.",
      "Я могу отличить потребность в отдыхе от потребности в движении.",
      "Я замечаю, какие фактуры, звуки или пространства мне приятны.",
      "Я могу устроить короткую сенсорную паузу при необходимости.",
      "Я могу объяснить потребность в комфорте без самоосуждения."
    ],
    "ids": {
      "en": "e4cbe495-d4e6-53a1-aa04-9d39767a2b26",
      "ru": "604048de-3ee3-521a-aab0-3c0ee0e3b673"
    },
    "hashes": {
      "en": "sha256:1753b08c2e5e67b5b0f78dffb21064b91c0142d2b466e26f152b1c279f4ee9e2",
      "ru": "sha256:de3297aaa9ed8cc63c9c01c57f9f1c126807e1b433a5e9d44489c99a7926a3fe"
    },
    "negative": false,
    "timeframe": "past-7-days",
    "reviewedAt": "2026-10-08"
  },
  {
    "key": "hh-goal-obstacles",
    "titles": {
      "en": "Obstacles on the Way to a Goal",
      "ru": "Препятствия на пути к цели"
    },
    "descriptions": {
      "en": "Map one chosen goal, its real obstacles and the practical help available.",
      "ru": "Исследуйте одну выбранную цель, реальные препятствия и доступную практическую поддержку."
    },
    "axis": "function",
    "topics": [
      "work",
      "motivation",
      "meaning",
      "function"
    ],
    "categoryAffinities": [
      "work-money",
      "other"
    ],
    "analysisAxes": [
      {
        "key": "functioning",
        "weight": 0.91
      },
      {
        "key": "clarity",
        "weight": 0.83
      },
      {
        "key": "meaning",
        "weight": 0.74
      },
      {
        "key": "self_support",
        "weight": 0.43
      }
    ],
    "testLength": "medium",
    "en": [
      "I can describe one goal in a concrete sentence.",
      "I can identify the main practical obstacle to that goal.",
      "I can distinguish a real constraint from an imagined worst case.",
      "I know one resource or ally that might help.",
      "I can break the goal into a step that fits this week.",
      "I can revise the plan after receiving new information."
    ],
    "ru": [
      "Я могу описать одну цель конкретным предложением.",
      "Я могу определить главное практическое препятствие на пути к цели.",
      "Я могу отличать реальные ограничения от воображаемого худшего исхода.",
      "Я знаю хотя бы один ресурс или человека, который может помочь.",
      "Я могу разбить цель на шаг, который реально сделать на этой неделе.",
      "Я могу пересмотреть план, если появится новая информация."
    ],
    "ids": {
      "en": "7977d54a-e767-5500-ac9a-462dc45137cb",
      "ru": "8f8b5fe4-b555-529a-a91e-75134194d6f8"
    },
    "hashes": {
      "en": "sha256:a65c763622b2f5d018a218b895909da08a56d09865267dccbb7273b066ac294d",
      "ru": "sha256:54bd6a4a225cc8f2612dae30a0fe1a67f88213068405388303c95ce4b63bfdca"
    },
    "negative": false,
    "timeframe": "past-7-days",
    "reviewedAt": "2026-10-08"
  }
]

export const EXPANDED_BATTERY_V3_DEFINITIONS = buildFunDefinitions(CONFIGS)
export const EXPANDED_BATTERY_V3_KEYS = Object.freeze(CONFIGS.map(({ key }) => key))
export const EXPANDED_CATALOG_V3 = deepFreeze(CONFIGS.map((item) => ({
  key: item.key, version: 'v1', instrumentLocale: 'dynamic', axis: item.axis,
  resultAxes: [item.axis], topics: item.topics,
  moodAffinities: ['sad','neutral','happy'], categoryAffinities: item.categoryAffinities,
  questionCount: item.en.length, durationMinutes: item.testLength === 'short' ? 1 : 2,
  testStyle: 'engaging', testLength: item.testLength,
  suggestedRepeatDays: item.testLength === 'short' ? 7 : 14,
  cooldownDays: item.testLength === 'short' ? 3 : 7,
  startable: true, access: 'account', rightsStatus: 'cleared', guestEligible: true,
  free: true, analysisAxes: item.analysisAxes,
  title: item.titles, description: item.descriptions,
})))
