/**
 * Original, optional Holistic House goal observation paraphrase families.
 * Three EN/RU skill/experience variants per construct; never assessment items
 * or validated clinical outcomes. Intended semantic similarity is editorial;
 * measurement equivalence between variants has NOT been established.
 * Exact instrument metadata binds chosen goals without reading scores.
 * This catalog does not confer practice/mapping approval or activate a course.
 * Hash bytes: SHA-256(UTF-8(JSON.stringify([statementId, version, locale, text]))).
 */
const deepFreeze = value => {
  if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(deepFreeze) }
  return value
}

export const COURSE_GOAL_STATEMENTS_VERSION = "hh-course-goal-statements-v1-2026-10-12"
export const COURSE_GOAL_OBSERVATION_COPY = deepFreeze({
  "prompt": {
    "en": "How well does this statement fit your experience today?",
    "ru": "Насколько это утверждение соответствует вашему опыту сегодня?"
  },
  "optional": {
    "en": "Any answer or skipping is fine. There is no preferred answer.",
    "ru": "Подходит любой ответ, в том числе пропуск. Предпочтительного ответа нет."
  },
  "limitation": {
    "en": "This is your subjective impression of one skill or experience today. It is not a validated test or a measure of health, recovery, or treatment results. Changes in agreement do not establish a clinical change.",
    "ru": "Это ваше субъективное впечатление об одном навыке или опыте сегодня. Это не валидированный тест и не показатель здоровья, восстановления или результата лечения. Изменение согласия не устанавливает клинических изменений."
  },
  "skip": {
    "en": "Skip this statement",
    "ru": "Пропустить утверждение"
  },
  "reportTitle": {
    "en": "Your weekly observations",
    "ru": "Ваши наблюдения за неделю"
  },
  "reportLimitation": {
    "en": "These observations group close-meaning wording variants for the same goal, family version and language. Wording varies, and equivalence between variants has not been established. A raw difference describes reported agreement only; it does not establish improvement, worsening, recovery, or a cause. Missing answers are not zero. Earlier days without saved statements are listed separately.",
    "ru": "Здесь объединены близкие по смыслу варианты утверждений для одной цели, версии семейства и языка. Формулировки меняются; равнозначность вариантов не установлена. Разница баллов описывает только сообщённое согласие и не устанавливает улучшение, ухудшение, восстановление или причину изменений. Пропущенный ответ не равен нулю. Ранние дни без сохранённых утверждений указаны отдельно."
  },
  "count": {
    "en": "Responses",
    "ru": "Ответов"
  },
  "first": {
    "en": "First response",
    "ru": "Первый ответ"
  },
  "latest": {
    "en": "Latest response",
    "ru": "Последний ответ"
  },
  "rawDelta": {
    "en": "Latest minus first",
    "ru": "Последний минус первый"
  },
  "missing": {
    "en": "Not answered",
    "ru": "Без ответа"
  },
  "skipped": {
    "en": "Explicitly skipped",
    "ru": "Явно пропущено"
  },
  "missingSnapshots": {
    "en": "Days without a saved statement snapshot",
    "ru": "Дни без сохранённого снимка утверждений"
  },
  "missingSessions": {
    "en": "Days without a saved session",
    "ru": "Дни без сохранённого занятия"
  },
  "noComparison": {
    "en": "At least two responses in the same goal, family version and language are needed for a difference.",
    "ru": "Для разницы нужны хотя бы два ответа для одной цели, версии семейства и языка."
  },
  "wordingVaries": {
    "en": "Wording varies within this goal. Variants are intended to be close in meaning; equivalence has not been established.",
    "ru": "В рамках этой цели формулировки меняются. Варианты задуманы как близкие по смыслу; их равнозначность не установлена."
  },
  "weeklyTitle": {
    "en": "This learning week",
    "ru": "Эта учебная неделя"
  },
  "cumulativeTitle": {
    "en": "From the start of this course",
    "ru": "С начала курса"
  }
})
export const COURSE_GOAL_AGREEMENT_ANCHORS = deepFreeze([
  {
    "value": 1,
    "label": {
      "en": "Strongly disagree",
      "ru": "Полностью не согласен / не согласна"
    }
  },
  {
    "value": 2,
    "label": {
      "en": "Disagree",
      "ru": "Скорее не согласен / не согласна"
    }
  },
  {
    "value": 3,
    "label": {
      "en": "Neither agree nor disagree",
      "ru": "Ни согласия, ни несогласия"
    }
  },
  {
    "value": 4,
    "label": {
      "en": "Agree",
      "ru": "Скорее согласен / согласна"
    }
  },
  {
    "value": 5,
    "label": {
      "en": "Strongly agree",
      "ru": "Полностью согласен / согласна"
    }
  }
])
export const COURSE_GOAL_STATEMENTS_V1 = deepFreeze([
  {
    "statementFamilyId": "hh-course-goal/weekly.tension",
    "version": "hh-course-goal-statements-v1-2026-10-12",
    "definitionKey": "hh-weekly-pulse",
    "dimensionKey": "weekly.tension",
    "goalLabel": {
      "en": "Noticing tension",
      "ru": "Замечать напряжение"
    },
    "variants": [
      {
        "statementId": "hh-course-goal/weekly.tension/variant/1",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can notice tension and consider whether I want a pause.",
          "ru": "Сегодня я могу заметить напряжение и подумать, нужна ли мне пауза."
        },
        "contentHash": {
          "en": "sha256:93da3ba4b4e2d505182bac03d95ac14135a3bca82d7eab4da837a7316648c9d2",
          "ru": "sha256:0c4e786e644db07ccc46045463491cb8bfeaf6f163d83b6611effa6de6fb75f2"
        }
      },
      {
        "statementId": "hh-course-goal/weekly.tension/variant/2",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can recognise tension and ask myself whether a pause would suit me.",
          "ru": "Сегодня я могу распознать напряжение и спросить себя, подошла бы мне пауза."
        },
        "contentHash": {
          "en": "sha256:6e8d90f604ac990a690106fefa9897034fbd76531991e80afa5d03a841a20ccd",
          "ru": "sha256:fc982e71a6edfffd2163df6e6a1668e7064aad960bda1e9ee7ca46c1f115f9aa"
        }
      },
      {
        "statementId": "hh-course-goal/weekly.tension/variant/3",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can tell when I feel tense and consider taking a pause.",
          "ru": "Сегодня я могу заметить, что чувствую напряжение, и рассмотреть возможность паузы."
        },
        "contentHash": {
          "en": "sha256:aeb4230de42b43be39b5edd676f59862acb766ce665845c13bab81ae87f84f09",
          "ru": "sha256:5d62115c804448442c61df394e3669e9cb936a255e1b9c6907efd11b6d0e4dbe"
        }
      }
    ],
    "identities": [
      {
        "definitionId": "7dc3058b-c939-5577-9226-9c5b50aa4aee",
        "definitionKey": "hh-weekly-pulse",
        "definitionVersion": "v1",
        "instrumentLocale": "en",
        "translationVersion": "hh-en-v1",
        "contentHash": "sha256:e0db859b3e3c888643ef199e1034507687b0692b77ea6932c2cbacacfb2767d7",
        "scoringKey": "raw-dimensions",
        "scoringVersion": "v1",
        "resultVersion": "v1",
        "timeframe": "past-7-days",
        "dimensionKey": "weekly.tension"
      },
      {
        "definitionId": "7780802c-603b-5382-aebf-8f6c5ef3ddcc",
        "definitionKey": "hh-weekly-pulse",
        "definitionVersion": "v1",
        "instrumentLocale": "ru",
        "translationVersion": "hh-ru-v1",
        "contentHash": "sha256:1580de6223f16ba1806e446a0fc10bf35510b01d696bc149f49eed67a037cc82",
        "scoringKey": "raw-dimensions",
        "scoringVersion": "v1",
        "resultVersion": "v1",
        "timeframe": "past-7-days",
        "dimensionKey": "weekly.tension"
      }
    ],
    "wordingPolicy": "intended-close-meaning-paraphrases",
    "equivalenceEstablished": false
  },
  {
    "statementFamilyId": "hh-course-goal/weekly.load",
    "version": "hh-course-goal-statements-v1-2026-10-12",
    "definitionKey": "hh-weekly-pulse",
    "dimensionKey": "weekly.load",
    "goalLabel": {
      "en": "Adjusting a demand",
      "ru": "Соотносить нагрузку с возможностями"
    },
    "variants": [
      {
        "statementId": "hh-course-goal/weekly.load/variant/1",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can identify one ordinary demand I could make smaller.",
          "ru": "Сегодня я могу назвать одно обычное дело, объём которого могу уменьшить."
        },
        "contentHash": {
          "en": "sha256:e6aca004d5a148395540d3d3e896b9838594a3e2db323343f972e49349b1bc9f",
          "ru": "sha256:3d89a7550afd64a7fb1d14aba4c30a70a7e998dcaf5116739241601bade6cd34"
        }
      },
      {
        "statementId": "hh-course-goal/weekly.load/variant/2",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can see one everyday task whose scope I could reduce.",
          "ru": "Сегодня я могу заметить одно повседневное дело, объём которого мог бы стать меньше."
        },
        "contentHash": {
          "en": "sha256:b3b47134c36fcde4130fc6cdd8932ee88a789e122be2db0613a11a3caee68a44",
          "ru": "sha256:f522fa6a933d82687ed6bf6b749a85b16e9d58c53770832c85bf30f48a1b41d0"
        }
      },
      {
        "statementId": "hh-course-goal/weekly.load/variant/3",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can name a smaller version of an ordinary demand.",
          "ru": "Сегодня я могу назвать меньший по объёму вариант обычного дела."
        },
        "contentHash": {
          "en": "sha256:357a7ffa53c3601968ea31e2837fa1504e166925f89a79d1c49bee9ef4c0d8fd",
          "ru": "sha256:54fa4f7e568e7fba0fa680b580183b2f0e0b3fe57c2058bf67412f0cbed4bfdd"
        }
      }
    ],
    "identities": [
      {
        "definitionId": "7dc3058b-c939-5577-9226-9c5b50aa4aee",
        "definitionKey": "hh-weekly-pulse",
        "definitionVersion": "v1",
        "instrumentLocale": "en",
        "translationVersion": "hh-en-v1",
        "contentHash": "sha256:e0db859b3e3c888643ef199e1034507687b0692b77ea6932c2cbacacfb2767d7",
        "scoringKey": "raw-dimensions",
        "scoringVersion": "v1",
        "resultVersion": "v1",
        "timeframe": "past-7-days",
        "dimensionKey": "weekly.load"
      },
      {
        "definitionId": "7780802c-603b-5382-aebf-8f6c5ef3ddcc",
        "definitionKey": "hh-weekly-pulse",
        "definitionVersion": "v1",
        "instrumentLocale": "ru",
        "translationVersion": "hh-ru-v1",
        "contentHash": "sha256:1580de6223f16ba1806e446a0fc10bf35510b01d696bc149f49eed67a037cc82",
        "scoringKey": "raw-dimensions",
        "scoringVersion": "v1",
        "resultVersion": "v1",
        "timeframe": "past-7-days",
        "dimensionKey": "weekly.load"
      }
    ],
    "wordingPolicy": "intended-close-meaning-paraphrases",
    "equivalenceEstablished": false
  },
  {
    "statementFamilyId": "hh-course-goal/weekly.recovery",
    "version": "hh-course-goal-statements-v1-2026-10-12",
    "definitionKey": "hh-weekly-pulse",
    "dimensionKey": "weekly.recovery",
    "goalLabel": {
      "en": "Noticing rest needs",
      "ru": "Замечать потребность в отдыхе"
    },
    "variants": [
      {
        "statementId": "hh-course-goal/weekly.recovery/variant/1",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can notice when a pause or rest would suit me.",
          "ru": "Сегодня я могу заметить, когда мне подошла бы пауза или отдых."
        },
        "contentHash": {
          "en": "sha256:06f30d54a96eb76b50f51815254e3c54744f75a64e21e6f7aefeffca42dc89b1",
          "ru": "sha256:f44d7c5d8d49bcda4c616e11f7022804c6b6e3b2291b71f09ef40279c9b43719"
        }
      },
      {
        "statementId": "hh-course-goal/weekly.recovery/variant/2",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can recognise a moment when a pause or rest would fit my needs.",
          "ru": "Сегодня я могу распознать момент, когда пауза или отдых соответствовали бы моим потребностям."
        },
        "contentHash": {
          "en": "sha256:b3b2b9a16080b46cc99c4559c52480529e8154a3cfc9eb8fe38e26b0f4021807",
          "ru": "sha256:bbdb49dc0ce13fe86cb7847d52a2983a3a38e79c3b9090db87c9bb76f6c110b1"
        }
      },
      {
        "statementId": "hh-course-goal/weekly.recovery/variant/3",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can tell when I would welcome a break or some rest.",
          "ru": "Сегодня я могу заметить, когда мне хотелось бы сделать перерыв или отдохнуть."
        },
        "contentHash": {
          "en": "sha256:cc08f3dfc14e5d2454550e88b83561b3af0098128a6c50b2f3ad26db08e88039",
          "ru": "sha256:9e50d6016d63b127bbd0a20d217801fb6a4a5f36bb1121cf0dfda4f697828884"
        }
      }
    ],
    "identities": [
      {
        "definitionId": "7dc3058b-c939-5577-9226-9c5b50aa4aee",
        "definitionKey": "hh-weekly-pulse",
        "definitionVersion": "v1",
        "instrumentLocale": "en",
        "translationVersion": "hh-en-v1",
        "contentHash": "sha256:e0db859b3e3c888643ef199e1034507687b0692b77ea6932c2cbacacfb2767d7",
        "scoringKey": "raw-dimensions",
        "scoringVersion": "v1",
        "resultVersion": "v1",
        "timeframe": "past-7-days",
        "dimensionKey": "weekly.recovery"
      },
      {
        "definitionId": "7780802c-603b-5382-aebf-8f6c5ef3ddcc",
        "definitionKey": "hh-weekly-pulse",
        "definitionVersion": "v1",
        "instrumentLocale": "ru",
        "translationVersion": "hh-ru-v1",
        "contentHash": "sha256:1580de6223f16ba1806e446a0fc10bf35510b01d696bc149f49eed67a037cc82",
        "scoringKey": "raw-dimensions",
        "scoringVersion": "v1",
        "resultVersion": "v1",
        "timeframe": "past-7-days",
        "dimensionKey": "weekly.recovery"
      }
    ],
    "wordingPolicy": "intended-close-meaning-paraphrases",
    "equivalenceEstablished": false
  },
  {
    "statementFamilyId": "hh-course-goal/weekly.energy",
    "version": "hh-course-goal-statements-v1-2026-10-12",
    "definitionKey": "hh-weekly-pulse",
    "dimensionKey": "weekly.energy",
    "goalLabel": {
      "en": "Choosing a manageable activity",
      "ru": "Выбирать посильное действие"
    },
    "variants": [
      {
        "statementId": "hh-course-goal/weekly.energy/variant/1",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can choose an activity size that fits the energy I notice.",
          "ru": "Сегодня я могу выбрать объём дела с учётом сил, которые у себя замечаю."
        },
        "contentHash": {
          "en": "sha256:7ca2a4dee08d9d2827c1acf3d03c4dfcd6992f6326c6a12fbbf9ae5f1e6ac4bc",
          "ru": "sha256:421e548974defbcb0c4eb661ccaf346331d35c68b2b79d502db039c94999a08e"
        }
      },
      {
        "statementId": "hh-course-goal/weekly.energy/variant/2",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can match the size of one activity to the energy I notice.",
          "ru": "Сегодня я могу соотнести объём одного дела с силами, которые у себя замечаю."
        },
        "contentHash": {
          "en": "sha256:26225420c4c45b68838461118a2c2e5484b3e5901e92aaa1e81c94da7736787c",
          "ru": "sha256:82432e25ba04d01d85ca3ee38c5554cf6c0487021c2adfaa0d49249ad11aa492"
        }
      },
      {
        "statementId": "hh-course-goal/weekly.energy/variant/3",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can choose how much of an activity fits my available energy.",
          "ru": "Сегодня я могу выбрать, какой объём дела соответствует доступным мне силам."
        },
        "contentHash": {
          "en": "sha256:05fb0a49617b5e9046e125dc0307233abfa275d74a605b06cb097d110d13f8f4",
          "ru": "sha256:88aff0a671f618df619f0255b5086d79f925232a50bc6a82bc5d31a1da3d88a3"
        }
      }
    ],
    "identities": [
      {
        "definitionId": "7dc3058b-c939-5577-9226-9c5b50aa4aee",
        "definitionKey": "hh-weekly-pulse",
        "definitionVersion": "v1",
        "instrumentLocale": "en",
        "translationVersion": "hh-en-v1",
        "contentHash": "sha256:e0db859b3e3c888643ef199e1034507687b0692b77ea6932c2cbacacfb2767d7",
        "scoringKey": "raw-dimensions",
        "scoringVersion": "v1",
        "resultVersion": "v1",
        "timeframe": "past-7-days",
        "dimensionKey": "weekly.energy"
      },
      {
        "definitionId": "7780802c-603b-5382-aebf-8f6c5ef3ddcc",
        "definitionKey": "hh-weekly-pulse",
        "definitionVersion": "v1",
        "instrumentLocale": "ru",
        "translationVersion": "hh-ru-v1",
        "contentHash": "sha256:1580de6223f16ba1806e446a0fc10bf35510b01d696bc149f49eed67a037cc82",
        "scoringKey": "raw-dimensions",
        "scoringVersion": "v1",
        "resultVersion": "v1",
        "timeframe": "past-7-days",
        "dimensionKey": "weekly.energy"
      }
    ],
    "wordingPolicy": "intended-close-meaning-paraphrases",
    "equivalenceEstablished": false
  },
  {
    "statementFamilyId": "hh-course-goal/weekly.mood",
    "version": "hh-course-goal-statements-v1-2026-10-12",
    "definitionKey": "hh-weekly-pulse",
    "dimensionKey": "weekly.mood",
    "goalLabel": {
      "en": "Naming a feeling",
      "ru": "Называть чувство"
    },
    "variants": [
      {
        "statementId": "hh-course-goal/weekly.mood/variant/1",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can name a feeling without needing to change it.",
          "ru": "Сегодня я могу назвать своё чувство, не требуя от себя его изменить."
        },
        "contentHash": {
          "en": "sha256:58530581a2ccd6570e5b9d7df405c2d670f2090121139b8ff511b0c1f123e322",
          "ru": "sha256:43b02e528a3bb16e122b5084fb85b08e4b642c0a1a7c984aef0ac113249a1382"
        }
      },
      {
        "statementId": "hh-course-goal/weekly.mood/variant/2",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can put a feeling into words without requiring it to change.",
          "ru": "Сегодня я могу выразить чувство словами, не настаивая на том, чтобы оно изменилось."
        },
        "contentHash": {
          "en": "sha256:646b621359713fbe55df3bc77e9a140997fcb6cde9cb5ce63a7c9e4dfe94c686",
          "ru": "sha256:eb9d240fa515cee181180311a6bbcf9bf8923d6e06b26353c8f67a51e7e944b3"
        }
      },
      {
        "statementId": "hh-course-goal/weekly.mood/variant/3",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can identify a feeling and let it be as it is for now.",
          "ru": "Сегодня я могу распознать чувство и пока позволить ему быть таким, какое оно есть."
        },
        "contentHash": {
          "en": "sha256:0c2e741ed5b9927189b40b082b8526cf2eefa352c25ea5ccb32efa0cbbcfe00e",
          "ru": "sha256:2aabdafab30dc908c5b753d78083a2403f64c7a5caf5ef5e779d4bc86538eb93"
        }
      }
    ],
    "identities": [
      {
        "definitionId": "7dc3058b-c939-5577-9226-9c5b50aa4aee",
        "definitionKey": "hh-weekly-pulse",
        "definitionVersion": "v1",
        "instrumentLocale": "en",
        "translationVersion": "hh-en-v1",
        "contentHash": "sha256:e0db859b3e3c888643ef199e1034507687b0692b77ea6932c2cbacacfb2767d7",
        "scoringKey": "raw-dimensions",
        "scoringVersion": "v1",
        "resultVersion": "v1",
        "timeframe": "past-7-days",
        "dimensionKey": "weekly.mood"
      },
      {
        "definitionId": "7780802c-603b-5382-aebf-8f6c5ef3ddcc",
        "definitionKey": "hh-weekly-pulse",
        "definitionVersion": "v1",
        "instrumentLocale": "ru",
        "translationVersion": "hh-ru-v1",
        "contentHash": "sha256:1580de6223f16ba1806e446a0fc10bf35510b01d696bc149f49eed67a037cc82",
        "scoringKey": "raw-dimensions",
        "scoringVersion": "v1",
        "resultVersion": "v1",
        "timeframe": "past-7-days",
        "dimensionKey": "weekly.mood"
      }
    ],
    "wordingPolicy": "intended-close-meaning-paraphrases",
    "equivalenceEstablished": false
  },
  {
    "statementFamilyId": "hh-course-goal/weekly.clarity",
    "version": "hh-course-goal-statements-v1-2026-10-12",
    "definitionKey": "hh-weekly-pulse",
    "dimensionKey": "weekly.clarity",
    "goalLabel": {
      "en": "Choosing an attention focus",
      "ru": "Выбирать предмет внимания"
    },
    "variants": [
      {
        "statementId": "hh-course-goal/weekly.clarity/variant/1",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can name one thing to give my attention to.",
          "ru": "Сегодня я могу назвать одно дело, которому хочу уделить внимание."
        },
        "contentHash": {
          "en": "sha256:8201742de4594816717dbd7064781a19666e5237779c3c1af232ef3ff56fd727",
          "ru": "sha256:b657df5902188e0705e0471af6a874c0f0f90a0b5434858bff402ff4a8fc9a50"
        }
      },
      {
        "statementId": "hh-course-goal/weekly.clarity/variant/2",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can identify one thing I want to focus on.",
          "ru": "Сегодня я могу выделить одно дело, на котором хочу сосредоточиться."
        },
        "contentHash": {
          "en": "sha256:00907be91191a89342fb563d1f35e2648c84e94d13321191bbf94d8c0e69b83e",
          "ru": "sha256:3df4b6b8970b2bb89d06f66fca30c7a654d10ac0bae92716844bd38afcabab18"
        }
      },
      {
        "statementId": "hh-course-goal/weekly.clarity/variant/3",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can choose one task to direct my attention toward.",
          "ru": "Сегодня я могу выбрать одно дело, на которое хочу направить внимание."
        },
        "contentHash": {
          "en": "sha256:dc00342b77e3984184b403748c11432a714bc6bcb5cf48ad11905ea10eee8bcc",
          "ru": "sha256:3233d5ebeff9a3b6113579cbe3f44899306602a2ae244438cd85e53b42f03a92"
        }
      }
    ],
    "identities": [
      {
        "definitionId": "7dc3058b-c939-5577-9226-9c5b50aa4aee",
        "definitionKey": "hh-weekly-pulse",
        "definitionVersion": "v1",
        "instrumentLocale": "en",
        "translationVersion": "hh-en-v1",
        "contentHash": "sha256:e0db859b3e3c888643ef199e1034507687b0692b77ea6932c2cbacacfb2767d7",
        "scoringKey": "raw-dimensions",
        "scoringVersion": "v1",
        "resultVersion": "v1",
        "timeframe": "past-7-days",
        "dimensionKey": "weekly.clarity"
      },
      {
        "definitionId": "7780802c-603b-5382-aebf-8f6c5ef3ddcc",
        "definitionKey": "hh-weekly-pulse",
        "definitionVersion": "v1",
        "instrumentLocale": "ru",
        "translationVersion": "hh-ru-v1",
        "contentHash": "sha256:1580de6223f16ba1806e446a0fc10bf35510b01d696bc149f49eed67a037cc82",
        "scoringKey": "raw-dimensions",
        "scoringVersion": "v1",
        "resultVersion": "v1",
        "timeframe": "past-7-days",
        "dimensionKey": "weekly.clarity"
      }
    ],
    "wordingPolicy": "intended-close-meaning-paraphrases",
    "equivalenceEstablished": false
  },
  {
    "statementFamilyId": "hh-course-goal/weekly.connection",
    "version": "hh-course-goal-statements-v1-2026-10-12",
    "definitionKey": "hh-weekly-pulse",
    "dimensionKey": "weekly.connection",
    "goalLabel": {
      "en": "Noticing comfortable contact",
      "ru": "Замечать комфортное общение"
    },
    "variants": [
      {
        "statementId": "hh-course-goal/weekly.connection/variant/1",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can notice which kind of contact feels comfortable for me.",
          "ru": "Сегодня я могу заметить, какое общение для меня комфортно."
        },
        "contentHash": {
          "en": "sha256:41caf67689aabdbc67864079609feaf7714b5720619e8a87f087c1f2fe12424b",
          "ru": "sha256:1f1738e95a253027e5b8c21daf59031c9b0bc17f93d346908e90c052da095357"
        }
      },
      {
        "statementId": "hh-course-goal/weekly.connection/variant/2",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can recognise what sort of contact feels comfortable for me.",
          "ru": "Сегодня я могу распознать, какой вид общения для меня комфортен."
        },
        "contentHash": {
          "en": "sha256:8a0ea3db811ee969f2b82c6942492b2feae4b598267e0546d100edbf5a42f535",
          "ru": "sha256:7aa267c579b86a289ba1808cedaef3257b9163f7ce9dfaef38d2bf48b3682df7"
        }
      },
      {
        "statementId": "hh-course-goal/weekly.connection/variant/3",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can tell which way of connecting with others feels comfortable.",
          "ru": "Сегодня я могу заметить, какой способ общения с другими мне комфортен."
        },
        "contentHash": {
          "en": "sha256:216de05147b740e3bf9b9c2152a7bab5d0e494060481c15b42961237b5101867",
          "ru": "sha256:2638bbb8d7cb41c99a3e51155f4bcec3ad766425d2fb3198dd599f4dd56f5cd4"
        }
      }
    ],
    "identities": [
      {
        "definitionId": "7dc3058b-c939-5577-9226-9c5b50aa4aee",
        "definitionKey": "hh-weekly-pulse",
        "definitionVersion": "v1",
        "instrumentLocale": "en",
        "translationVersion": "hh-en-v1",
        "contentHash": "sha256:e0db859b3e3c888643ef199e1034507687b0692b77ea6932c2cbacacfb2767d7",
        "scoringKey": "raw-dimensions",
        "scoringVersion": "v1",
        "resultVersion": "v1",
        "timeframe": "past-7-days",
        "dimensionKey": "weekly.connection"
      },
      {
        "definitionId": "7780802c-603b-5382-aebf-8f6c5ef3ddcc",
        "definitionKey": "hh-weekly-pulse",
        "definitionVersion": "v1",
        "instrumentLocale": "ru",
        "translationVersion": "hh-ru-v1",
        "contentHash": "sha256:1580de6223f16ba1806e446a0fc10bf35510b01d696bc149f49eed67a037cc82",
        "scoringKey": "raw-dimensions",
        "scoringVersion": "v1",
        "resultVersion": "v1",
        "timeframe": "past-7-days",
        "dimensionKey": "weekly.connection"
      }
    ],
    "wordingPolicy": "intended-close-meaning-paraphrases",
    "equivalenceEstablished": false
  },
  {
    "statementFamilyId": "hh-course-goal/weekly.functioning",
    "version": "hh-course-goal-statements-v1-2026-10-12",
    "definitionKey": "hh-weekly-pulse",
    "dimensionKey": "weekly.functioning",
    "goalLabel": {
      "en": "Choosing a small task step",
      "ru": "Выбирать небольшой шаг в деле"
    },
    "variants": [
      {
        "statementId": "hh-course-goal/weekly.functioning/variant/1",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can choose one manageable step in an ordinary task.",
          "ru": "Сегодня я могу выбрать один посильный шаг в обычном деле."
        },
        "contentHash": {
          "en": "sha256:8356c77db966708ba11313fe531e7079b557503a2d134384be78df30419752be",
          "ru": "sha256:6bab299e8e5c1e94eade5a50876169fc29f431c2d9788f5d318fa057f09dd4c3"
        }
      },
      {
        "statementId": "hh-course-goal/weekly.functioning/variant/2",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can identify a manageable next step in an everyday task.",
          "ru": "Сегодня я могу наметить посильный следующий шаг в повседневном деле."
        },
        "contentHash": {
          "en": "sha256:8452963e11aa7248ba1d30f172484acbbbfe3153912a9ec7ed831218c8f7b8ff",
          "ru": "sha256:c87eaed2c2bd695301511f0c3431246716846c8cf7306b82384427c98139b5ec"
        }
      },
      {
        "statementId": "hh-course-goal/weekly.functioning/variant/3",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can break one ordinary task down to a step I can manage.",
          "ru": "Сегодня я могу выделить в обычном деле один шаг, который мне по силам."
        },
        "contentHash": {
          "en": "sha256:16d00dbc33eca49e5044e5856c9bdd8a3d965eab6b1833689aaa4d03ba1e2442",
          "ru": "sha256:e70d3c4244c374f2153518444b88f66e873263bd8dfdbfc2046cb337f3deeab2"
        }
      }
    ],
    "identities": [
      {
        "definitionId": "7dc3058b-c939-5577-9226-9c5b50aa4aee",
        "definitionKey": "hh-weekly-pulse",
        "definitionVersion": "v1",
        "instrumentLocale": "en",
        "translationVersion": "hh-en-v1",
        "contentHash": "sha256:e0db859b3e3c888643ef199e1034507687b0692b77ea6932c2cbacacfb2767d7",
        "scoringKey": "raw-dimensions",
        "scoringVersion": "v1",
        "resultVersion": "v1",
        "timeframe": "past-7-days",
        "dimensionKey": "weekly.functioning"
      },
      {
        "definitionId": "7780802c-603b-5382-aebf-8f6c5ef3ddcc",
        "definitionKey": "hh-weekly-pulse",
        "definitionVersion": "v1",
        "instrumentLocale": "ru",
        "translationVersion": "hh-ru-v1",
        "contentHash": "sha256:1580de6223f16ba1806e446a0fc10bf35510b01d696bc149f49eed67a037cc82",
        "scoringKey": "raw-dimensions",
        "scoringVersion": "v1",
        "resultVersion": "v1",
        "timeframe": "past-7-days",
        "dimensionKey": "weekly.functioning"
      }
    ],
    "wordingPolicy": "intended-close-meaning-paraphrases",
    "equivalenceEstablished": false
  },
  {
    "statementFamilyId": "hh-course-goal/resource.energy",
    "version": "hh-course-goal-statements-v1-2026-10-12",
    "definitionKey": "hh-resource-pulse",
    "dimensionKey": "resource.energy",
    "goalLabel": {
      "en": "Leaving room for rest",
      "ru": "Оставлять место для отдыха"
    },
    "variants": [
      {
        "statementId": "hh-course-goal/resource.energy/variant/1",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can leave some space for rest when planning a small activity.",
          "ru": "Сегодня я могу оставить место для отдыха, планируя небольшое дело."
        },
        "contentHash": {
          "en": "sha256:f9e12b9749349cea8d10f64957ed6e33105254ea8beec3fdc1dbe3c813fccf08",
          "ru": "sha256:b9ba69920615ba66c46f9d5033d514f05adef95e664a24bb3b4dd480de1280b6"
        }
      },
      {
        "statementId": "hh-course-goal/resource.energy/variant/2",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can make room for rest in a plan for a small task.",
          "ru": "Сегодня я могу предусмотреть отдых в плане небольшого дела."
        },
        "contentHash": {
          "en": "sha256:bb882846f0381f5ee7dce65147c74dfc6aa9b35989195e25a44e6bf2c3cd0ffa",
          "ru": "sha256:2fd0ee834d1d3c655450ac2fd502783dc8a6b888df334070e567803bf2f96e84"
        }
      },
      {
        "statementId": "hh-course-goal/resource.energy/variant/3",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can include time to rest when choosing a small activity.",
          "ru": "Сегодня я могу учесть время для отдыха, выбирая небольшое занятие."
        },
        "contentHash": {
          "en": "sha256:2231705b2f2afe1828d83fbfabea302f14fdf2f26f1852d10f2a31dfcc424270",
          "ru": "sha256:79101efc98884c56db31839d1791e0b2f9226b8ed782cd1475c20f95e43e0cf1"
        }
      }
    ],
    "identities": [
      {
        "definitionId": "435985a5-94fc-4c2b-9a7f-a2e6c33f94be",
        "definitionKey": "hh-resource-pulse",
        "definitionVersion": "v1",
        "instrumentLocale": "en",
        "translationVersion": "hh-en-v1",
        "contentHash": "sha256:80621529165c1c239cf93a30129ece25d010da05a01bd71e560231a3711d7afb",
        "scoringKey": "configured",
        "scoringVersion": "v1",
        "resultVersion": "v1",
        "timeframe": "right-now",
        "dimensionKey": "resource.energy"
      },
      {
        "definitionId": "aa30b3c7-f35a-4b52-a335-9a74366c2927",
        "definitionKey": "hh-resource-pulse",
        "definitionVersion": "v1",
        "instrumentLocale": "ru",
        "translationVersion": "hh-ru-v1",
        "contentHash": "sha256:bdba0d174efd8c4acc1bdd950a329949c0ed5fc9c4c237bd66a78b36f28f7c1b",
        "scoringKey": "configured",
        "scoringVersion": "v1",
        "resultVersion": "v1",
        "timeframe": "right-now",
        "dimensionKey": "resource.energy"
      }
    ],
    "wordingPolicy": "intended-close-meaning-paraphrases",
    "equivalenceEstablished": false
  },
  {
    "statementFamilyId": "hh-course-goal/resource.support",
    "version": "hh-course-goal-statements-v1-2026-10-12",
    "definitionKey": "hh-resource-pulse",
    "dimensionKey": "resource.support",
    "goalLabel": {
      "en": "Naming wanted support",
      "ru": "Называть нужную поддержку"
    },
    "variants": [
      {
        "statementId": "hh-course-goal/resource.support/variant/1",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can identify what kind of support I might want.",
          "ru": "Сегодня я могу назвать, какая поддержка могла бы мне пригодиться."
        },
        "contentHash": {
          "en": "sha256:53614ed238b551be4a8f9397b922779e3719e3e6f902a7b56720d7b134d82414",
          "ru": "sha256:60bb8eabae149216492542b2e392d9540896e407b752d4b92133d3c5c1cb08a3"
        }
      },
      {
        "statementId": "hh-course-goal/resource.support/variant/2",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can name a form of support that might be useful to me.",
          "ru": "Сегодня я могу назвать вид поддержки, который мог бы быть мне полезен."
        },
        "contentHash": {
          "en": "sha256:1f926c115d531209673a5ea811ef6e94d69edf8aa324aa5ad1a29e7f2d3a2e1a",
          "ru": "sha256:4c45b0d7ad14f2abc70130a1b5b5373955b7a705d5f63dc38bb38a14d9d97aad"
        }
      },
      {
        "statementId": "hh-course-goal/resource.support/variant/3",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can put into words what kind of help I might welcome.",
          "ru": "Сегодня я могу выразить словами, какая помощь могла бы мне подойти."
        },
        "contentHash": {
          "en": "sha256:ef5d907786ee0f4630164eb29bf868e0482c6a5b1e5f4cf4267b353fe46547e1",
          "ru": "sha256:9ea59061fa3b3a2bcfbebed92cd18f72028133e02dc13a4be36331fa0353a6b7"
        }
      }
    ],
    "identities": [
      {
        "definitionId": "435985a5-94fc-4c2b-9a7f-a2e6c33f94be",
        "definitionKey": "hh-resource-pulse",
        "definitionVersion": "v1",
        "instrumentLocale": "en",
        "translationVersion": "hh-en-v1",
        "contentHash": "sha256:80621529165c1c239cf93a30129ece25d010da05a01bd71e560231a3711d7afb",
        "scoringKey": "configured",
        "scoringVersion": "v1",
        "resultVersion": "v1",
        "timeframe": "right-now",
        "dimensionKey": "resource.support"
      },
      {
        "definitionId": "aa30b3c7-f35a-4b52-a335-9a74366c2927",
        "definitionKey": "hh-resource-pulse",
        "definitionVersion": "v1",
        "instrumentLocale": "ru",
        "translationVersion": "hh-ru-v1",
        "contentHash": "sha256:bdba0d174efd8c4acc1bdd950a329949c0ed5fc9c4c237bd66a78b36f28f7c1b",
        "scoringKey": "configured",
        "scoringVersion": "v1",
        "resultVersion": "v1",
        "timeframe": "right-now",
        "dimensionKey": "resource.support"
      }
    ],
    "wordingPolicy": "intended-close-meaning-paraphrases",
    "equivalenceEstablished": false
  },
  {
    "statementFamilyId": "hh-course-goal/resource.agency",
    "version": "hh-course-goal-statements-v1-2026-10-12",
    "definitionKey": "hh-resource-pulse",
    "dimensionKey": "resource.agency",
    "goalLabel": {
      "en": "Noticing a choice",
      "ru": "Замечать доступный выбор"
    },
    "variants": [
      {
        "statementId": "hh-course-goal/resource.agency/variant/1",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can distinguish one choice that is within my control.",
          "ru": "Сегодня я могу выделить один выбор, который зависит от меня."
        },
        "contentHash": {
          "en": "sha256:ffd8f2d1526f1415952a419a6cca587caf716574a9679e9c17060531d7669b36",
          "ru": "sha256:464eff064f89819f884a4bba539e557d7ae2c253384885deaac8406c74a58ef3"
        }
      },
      {
        "statementId": "hh-course-goal/resource.agency/variant/2",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can identify one choice I can make for myself.",
          "ru": "Сегодня я могу назвать один выбор, который могу сделать самостоятельно."
        },
        "contentHash": {
          "en": "sha256:ffab3967a68300986d1bf33594e0c1e8fb4607e57fdacd65991dfacd9d267f57",
          "ru": "sha256:f0d18313925aade0cfe58f218bf119b8721efdde0f00306a67eaad3172a842f4"
        }
      },
      {
        "statementId": "hh-course-goal/resource.agency/variant/3",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can notice one decision that is within my control.",
          "ru": "Сегодня я могу заметить одно решение, которое находится в пределах моего влияния."
        },
        "contentHash": {
          "en": "sha256:9d484c1232229ec52e7eaaa6cad391b6e34d1314455823b14acac1d8a121083a",
          "ru": "sha256:f172f715bced7c2a1236c97f1420ce758e85a44c3b6cbd6ff620374bafe18f20"
        }
      }
    ],
    "identities": [
      {
        "definitionId": "435985a5-94fc-4c2b-9a7f-a2e6c33f94be",
        "definitionKey": "hh-resource-pulse",
        "definitionVersion": "v1",
        "instrumentLocale": "en",
        "translationVersion": "hh-en-v1",
        "contentHash": "sha256:80621529165c1c239cf93a30129ece25d010da05a01bd71e560231a3711d7afb",
        "scoringKey": "configured",
        "scoringVersion": "v1",
        "resultVersion": "v1",
        "timeframe": "right-now",
        "dimensionKey": "resource.agency"
      },
      {
        "definitionId": "aa30b3c7-f35a-4b52-a335-9a74366c2927",
        "definitionKey": "hh-resource-pulse",
        "definitionVersion": "v1",
        "instrumentLocale": "ru",
        "translationVersion": "hh-ru-v1",
        "contentHash": "sha256:bdba0d174efd8c4acc1bdd950a329949c0ed5fc9c4c237bd66a78b36f28f7c1b",
        "scoringKey": "configured",
        "scoringVersion": "v1",
        "resultVersion": "v1",
        "timeframe": "right-now",
        "dimensionKey": "resource.agency"
      }
    ],
    "wordingPolicy": "intended-close-meaning-paraphrases",
    "equivalenceEstablished": false
  },
  {
    "statementFamilyId": "hh-course-goal/resource.connection",
    "version": "hh-course-goal-statements-v1-2026-10-12",
    "definitionKey": "hh-resource-pulse",
    "dimensionKey": "resource.connection",
    "goalLabel": {
      "en": "Putting a request or boundary into words",
      "ru": "Выражать просьбу или границу"
    },
    "variants": [
      {
        "statementId": "hh-course-goal/resource.connection/variant/1",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can put a small request or boundary into words.",
          "ru": "Сегодня я могу выразить словами небольшую просьбу или границу."
        },
        "contentHash": {
          "en": "sha256:5fcb324fc4fe4d2c9c20d983ee2a267d2577e22e02f5ebd66acd0f58b945f9b8",
          "ru": "sha256:11db53b68d603feb633639cd59b5813f621bbc05faf594acf6eb5df41a79d24a"
        }
      },
      {
        "statementId": "hh-course-goal/resource.connection/variant/2",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can find words for a small request or a personal boundary.",
          "ru": "Сегодня я могу подобрать слова для небольшой просьбы или личной границы."
        },
        "contentHash": {
          "en": "sha256:65d4c9942d791038bbf9fc003611f448492e137405533da524a4f2ad100992d4",
          "ru": "sha256:5b631e81c3638f2eaccfc3da9222b2f59e4cc8858a91162cfc4c7cfc5d9d9cfa"
        }
      },
      {
        "statementId": "hh-course-goal/resource.connection/variant/3",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can express a small request or boundary in a simple sentence.",
          "ru": "Сегодня я могу выразить небольшую просьбу или границу простой фразой."
        },
        "contentHash": {
          "en": "sha256:dfd5ceeaea6b428e8cf8144650ae96119aae24fa10092b9c563f6db6d0b0b00b",
          "ru": "sha256:69b2b54de592d983538896ab2958262c6c42ba1888ca3062cc70ed6053bbc1cf"
        }
      }
    ],
    "identities": [
      {
        "definitionId": "435985a5-94fc-4c2b-9a7f-a2e6c33f94be",
        "definitionKey": "hh-resource-pulse",
        "definitionVersion": "v1",
        "instrumentLocale": "en",
        "translationVersion": "hh-en-v1",
        "contentHash": "sha256:80621529165c1c239cf93a30129ece25d010da05a01bd71e560231a3711d7afb",
        "scoringKey": "configured",
        "scoringVersion": "v1",
        "resultVersion": "v1",
        "timeframe": "right-now",
        "dimensionKey": "resource.connection"
      },
      {
        "definitionId": "aa30b3c7-f35a-4b52-a335-9a74366c2927",
        "definitionKey": "hh-resource-pulse",
        "definitionVersion": "v1",
        "instrumentLocale": "ru",
        "translationVersion": "hh-ru-v1",
        "contentHash": "sha256:bdba0d174efd8c4acc1bdd950a329949c0ed5fc9c4c237bd66a78b36f28f7c1b",
        "scoringKey": "configured",
        "scoringVersion": "v1",
        "resultVersion": "v1",
        "timeframe": "right-now",
        "dimensionKey": "resource.connection"
      }
    ],
    "wordingPolicy": "intended-close-meaning-paraphrases",
    "equivalenceEstablished": false
  },
  {
    "statementFamilyId": "hh-course-goal/resource.self_support",
    "version": "hh-course-goal-statements-v1-2026-10-12",
    "definitionKey": "hh-resource-pulse",
    "dimensionKey": "resource.self_support",
    "goalLabel": {
      "en": "Using fair words about oneself",
      "ru": "Говорить о себе бережно"
    },
    "variants": [
      {
        "statementId": "hh-course-goal/resource.self_support/variant/1",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can describe a difficulty without putting myself down.",
          "ru": "Сегодня я могу описать трудность, не унижая себя."
        },
        "contentHash": {
          "en": "sha256:48107bfdd66a4994fae7dbbe502f1fa5b636979867461d5a89cbabc03dd33c47",
          "ru": "sha256:ad996c172450bce78005ea62cb9ab8cf3b3a9d8c090653974bbdda9000ad94d8"
        }
      },
      {
        "statementId": "hh-course-goal/resource.self_support/variant/2",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can put a difficulty into words without belittling myself.",
          "ru": "Сегодня я могу выразить трудность словами, не принижая себя."
        },
        "contentHash": {
          "en": "sha256:be75d86e02496f2ede2c1948e3dac3b9fef63a1f8583c5e92750c47fb416d046",
          "ru": "sha256:7fc40c3fe27cdb969f81a39d92ac0cf1f214defdb6e0e520d79a25810f3dfc86"
        }
      },
      {
        "statementId": "hh-course-goal/resource.self_support/variant/3",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can speak about a difficulty without insulting myself.",
          "ru": "Сегодня я могу говорить о трудности без оскорблений в свой адрес."
        },
        "contentHash": {
          "en": "sha256:2043cd8250fee91d22572f55e0795e4313ef810743193903b40a00409c524164",
          "ru": "sha256:6649d0bfa6e160eeb0c19c53b3babd87ebd85b09b17d926fd48930f52d40eb40"
        }
      }
    ],
    "identities": [
      {
        "definitionId": "435985a5-94fc-4c2b-9a7f-a2e6c33f94be",
        "definitionKey": "hh-resource-pulse",
        "definitionVersion": "v1",
        "instrumentLocale": "en",
        "translationVersion": "hh-en-v1",
        "contentHash": "sha256:80621529165c1c239cf93a30129ece25d010da05a01bd71e560231a3711d7afb",
        "scoringKey": "configured",
        "scoringVersion": "v1",
        "resultVersion": "v1",
        "timeframe": "right-now",
        "dimensionKey": "resource.self_support"
      },
      {
        "definitionId": "aa30b3c7-f35a-4b52-a335-9a74366c2927",
        "definitionKey": "hh-resource-pulse",
        "definitionVersion": "v1",
        "instrumentLocale": "ru",
        "translationVersion": "hh-ru-v1",
        "contentHash": "sha256:bdba0d174efd8c4acc1bdd950a329949c0ed5fc9c4c237bd66a78b36f28f7c1b",
        "scoringKey": "configured",
        "scoringVersion": "v1",
        "resultVersion": "v1",
        "timeframe": "right-now",
        "dimensionKey": "resource.self_support"
      }
    ],
    "wordingPolicy": "intended-close-meaning-paraphrases",
    "equivalenceEstablished": false
  },
  {
    "statementFamilyId": "hh-course-goal/resource.meaning",
    "version": "hh-course-goal-statements-v1-2026-10-12",
    "definitionKey": "hh-resource-pulse",
    "dimensionKey": "resource.meaning",
    "goalLabel": {
      "en": "Naming what matters",
      "ru": "Называть важное для себя"
    },
    "variants": [
      {
        "statementId": "hh-course-goal/resource.meaning/variant/1",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can name something that matters to me when choosing a small step.",
          "ru": "Сегодня я могу назвать что-то важное для себя, выбирая небольшой шаг."
        },
        "contentHash": {
          "en": "sha256:55fd670161ba8ad4e9a22dd14edef1beccdf4efca0934a1540ad8476a6d8ec50",
          "ru": "sha256:648143bc812f27cd9ab9387501df5594fb4861856f8178db1f6065a34e886a5b"
        }
      },
      {
        "statementId": "hh-course-goal/resource.meaning/variant/2",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can identify something important to me when deciding on a small action.",
          "ru": "Сегодня я могу выделить что-то важное для себя, решая, какое небольшое действие выбрать."
        },
        "contentHash": {
          "en": "sha256:a32e3e0ca7d8a9da10dbe121877bc21e5fccee4b7d684ca4cc138665e0165f3f",
          "ru": "sha256:da573f9fa65e665473de3e1d5636471a5dcebd273ced43bfe11bcf757885abd0"
        }
      },
      {
        "statementId": "hh-course-goal/resource.meaning/variant/3",
        "version": "hh-course-goal-statements-v1-2026-10-12/variant-v1",
        "text": {
          "en": "Today I can choose a small next step while naming what matters to me.",
          "ru": "Сегодня я могу выбрать небольшой следующий шаг и назвать, что для меня важно."
        },
        "contentHash": {
          "en": "sha256:8366bcd6387e8e825491a02c72af4d696f43de3285548ca996cc0384dc540c2e",
          "ru": "sha256:f3913d417cdf1ff49d6237ba4ef58262d3c8111fd0c2b2f63c05e3eb8c86f0ba"
        }
      }
    ],
    "identities": [
      {
        "definitionId": "435985a5-94fc-4c2b-9a7f-a2e6c33f94be",
        "definitionKey": "hh-resource-pulse",
        "definitionVersion": "v1",
        "instrumentLocale": "en",
        "translationVersion": "hh-en-v1",
        "contentHash": "sha256:80621529165c1c239cf93a30129ece25d010da05a01bd71e560231a3711d7afb",
        "scoringKey": "configured",
        "scoringVersion": "v1",
        "resultVersion": "v1",
        "timeframe": "right-now",
        "dimensionKey": "resource.meaning"
      },
      {
        "definitionId": "aa30b3c7-f35a-4b52-a335-9a74366c2927",
        "definitionKey": "hh-resource-pulse",
        "definitionVersion": "v1",
        "instrumentLocale": "ru",
        "translationVersion": "hh-ru-v1",
        "contentHash": "sha256:bdba0d174efd8c4acc1bdd950a329949c0ed5fc9c4c237bd66a78b36f28f7c1b",
        "scoringKey": "configured",
        "scoringVersion": "v1",
        "resultVersion": "v1",
        "timeframe": "right-now",
        "dimensionKey": "resource.meaning"
      }
    ],
    "wordingPolicy": "intended-close-meaning-paraphrases",
    "equivalenceEstablished": false
  }
])
