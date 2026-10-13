// Isolated editorial proposal: five additional constructs in the two-test slice.
// No runtime integration or approval. Existing pilot records and content stay unchanged.
// Instrument, family, content and objective pins below are literal authoring snapshots.
// Do not regenerate them at import time from current definitions, labels or hashes.
import { deepFreeze } from '../../lib/assessments/contracts.js'
import { getPersonalCoursePilotMapping } from './course-personal-practices-v2.js'

export const PERSONAL_COURSE_MAPPING_EXTENSIONS_VERSION = 'hh-personal-mapping-extensions-v2-two-test-draft-2026-10-12'
export const PERSONAL_COURSE_MAPPING_EXTENSIONS_STATUS = 'DRAFT_PENDING_EXACT_MAPPING_REVIEW'
const clone = value => structuredClone(value)
const text = value => typeof value === 'string' && value.trim().length > 0
const IDENTITY_KEYS = ['definitionId', 'definitionKey', 'definitionVersion', 'instrumentLocale', 'translationVersion', 'contentHash', 'scoringKey', 'scoringVersion', 'resultVersion', 'timeframe', 'dimensionKey']
const sameIdentity = (a, b) => Boolean(a && b && Object.keys(a).length === IDENTITY_KEYS.length && IDENTITY_KEYS.every(key => text(a[key]) && a[key] === b[key]))

// A family is prepared draft content, not independently approved treatment.
export const PERSONAL_COURSE_MAPPING_EXTENSION_FAMILIES = deepFreeze([
  {
    "sourceSkillId": "pace-one-action",
    "topicId": "energy_agency",
    "sourcePilotIdentity": {
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
    "sourceMappingVersion": "hh-personal-practices-21-v2-pilot-2026-10-12/mapping/435985a5-94fc-4c2b-9a7f-a2e6c33f94be/resource.energy",
    "sourceContentVersion": "hh-personal-practices-21-v2-pilot-2026-10-12",
    "sourceCurriculumVersion": "hh-21day-editorial-overlay-2026-10-12",
    "sourceObjectiveIds": [
      "hh-21day-editorial-overlay-2026-10-12/day/1",
      "hh-21day-editorial-overlay-2026-10-12/day/2",
      "hh-21day-editorial-overlay-2026-10-12/day/3",
      "hh-21day-editorial-overlay-2026-10-12/day/4",
      "hh-21day-editorial-overlay-2026-10-12/day/5",
      "hh-21day-editorial-overlay-2026-10-12/day/6",
      "hh-21day-editorial-overlay-2026-10-12/day/8",
      "hh-21day-editorial-overlay-2026-10-12/day/9",
      "hh-21day-editorial-overlay-2026-10-12/day/10",
      "hh-21day-editorial-overlay-2026-10-12/day/11",
      "hh-21day-editorial-overlay-2026-10-12/day/12",
      "hh-21day-editorial-overlay-2026-10-12/day/13",
      "hh-21day-editorial-overlay-2026-10-12/day/15",
      "hh-21day-editorial-overlay-2026-10-12/day/16",
      "hh-21day-editorial-overlay-2026-10-12/day/17",
      "hh-21day-editorial-overlay-2026-10-12/day/18",
      "hh-21day-editorial-overlay-2026-10-12/day/19",
      "hh-21day-editorial-overlay-2026-10-12/day/20"
    ],
    "sourceFamilyStatus": "draft",
    "sourceMappingReviewStatus": "pending-independent-review"
  },
  {
    "sourceSkillId": "safe-request",
    "topicId": "connection_boundaries",
    "sourcePilotIdentity": {
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
    "sourceMappingVersion": "hh-personal-practices-21-v2-pilot-2026-10-12/mapping/435985a5-94fc-4c2b-9a7f-a2e6c33f94be/resource.connection",
    "sourceContentVersion": "hh-personal-practices-21-v2-pilot-2026-10-12",
    "sourceCurriculumVersion": "hh-21day-editorial-overlay-2026-10-12",
    "sourceObjectiveIds": [
      "hh-21day-editorial-overlay-2026-10-12/day/1",
      "hh-21day-editorial-overlay-2026-10-12/day/2",
      "hh-21day-editorial-overlay-2026-10-12/day/3",
      "hh-21day-editorial-overlay-2026-10-12/day/4",
      "hh-21day-editorial-overlay-2026-10-12/day/5",
      "hh-21day-editorial-overlay-2026-10-12/day/6",
      "hh-21day-editorial-overlay-2026-10-12/day/8",
      "hh-21day-editorial-overlay-2026-10-12/day/9",
      "hh-21day-editorial-overlay-2026-10-12/day/10",
      "hh-21day-editorial-overlay-2026-10-12/day/11",
      "hh-21day-editorial-overlay-2026-10-12/day/12",
      "hh-21day-editorial-overlay-2026-10-12/day/13",
      "hh-21day-editorial-overlay-2026-10-12/day/15",
      "hh-21day-editorial-overlay-2026-10-12/day/16",
      "hh-21day-editorial-overlay-2026-10-12/day/17",
      "hh-21day-editorial-overlay-2026-10-12/day/18",
      "hh-21day-editorial-overlay-2026-10-12/day/19",
      "hh-21day-editorial-overlay-2026-10-12/day/20"
    ],
    "sourceFamilyStatus": "draft",
    "sourceMappingReviewStatus": "pending-independent-review"
  },
  {
    "sourceSkillId": "one-visible-task",
    "topicId": "attention_clarity",
    "sourcePilotIdentity": {
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
    "sourceMappingVersion": "hh-personal-practices-21-v2-pilot-2026-10-12/mapping/7dc3058b-c939-5577-9226-9c5b50aa4aee/weekly.clarity",
    "sourceContentVersion": "hh-personal-practices-21-v2-pilot-2026-10-12",
    "sourceCurriculumVersion": "hh-21day-editorial-overlay-2026-10-12",
    "sourceObjectiveIds": [
      "hh-21day-editorial-overlay-2026-10-12/day/1",
      "hh-21day-editorial-overlay-2026-10-12/day/2",
      "hh-21day-editorial-overlay-2026-10-12/day/3",
      "hh-21day-editorial-overlay-2026-10-12/day/4",
      "hh-21day-editorial-overlay-2026-10-12/day/5",
      "hh-21day-editorial-overlay-2026-10-12/day/6",
      "hh-21day-editorial-overlay-2026-10-12/day/8",
      "hh-21day-editorial-overlay-2026-10-12/day/9",
      "hh-21day-editorial-overlay-2026-10-12/day/10",
      "hh-21day-editorial-overlay-2026-10-12/day/11",
      "hh-21day-editorial-overlay-2026-10-12/day/12",
      "hh-21day-editorial-overlay-2026-10-12/day/13",
      "hh-21day-editorial-overlay-2026-10-12/day/15",
      "hh-21day-editorial-overlay-2026-10-12/day/16",
      "hh-21day-editorial-overlay-2026-10-12/day/17",
      "hh-21day-editorial-overlay-2026-10-12/day/18",
      "hh-21day-editorial-overlay-2026-10-12/day/19",
      "hh-21day-editorial-overlay-2026-10-12/day/20"
    ],
    "sourceFamilyStatus": "draft",
    "sourceMappingReviewStatus": "pending-independent-review"
  }
])

// Each instrument-language binding includes all eleven literal identity fields.
// sourceMetadata is the unchanged registered source; it does not endorse our exercise.
export const PERSONAL_COURSE_MAPPING_EXTENSION_CONSTRUCTS = deepFreeze([
  {
    "definitionKey": "hh-weekly-pulse",
    "definitionVersion": "v1",
    "dimensionKey": "weekly.load",
    "sourceSkillId": "pace-one-action",
    "rationale": {
      "en": "The weekly item asks about perceived stress or mental load. The existing pace-one-action family rehearses reducing one ordinary demand, setting a stopping point, or choosing rest; this is a limited manageable-load response.",
      "ru": "Еженедельный пункт спрашивает об ощущаемом стрессе или умственной нагрузке. В уже подготовленном семействе pace-one-action можно уменьшить одно обычное дело, обозначить точку остановки или выбрать отдых; это ограниченный способ соотнести нагрузку с силами."
    },
    "limitations": {
      "en": "The past-week load rating does not establish today’s capacity or identify the cause of stress. External demands may be unchangeable. Do not assign individual responsibility for structural workload, change actual commitments, prescribe productivity, or promise a lower score.",
      "ru": "Оценка нагрузки за неделю не определяет сегодняшние силы и не устанавливает причину стресса. Внешние требования могут быть неизменяемыми. Нельзя возлагать на человека ответственность за системную перегрузку, менять реальные обязательства, предписывать продуктивность или обещать снижение балла."
    },
    "limitedFacet": {
      "en": "Choosing a smaller ordinary demand or rest within the user’s actual control.",
      "ru": "Выбор меньшего обычного дела или отдыха в пределах реальных возможностей человека."
    },
    "reviewRequired": {
      "exactScaleToFamily": true,
      "allObjectiveBindings": true,
      "contentSafety": true,
      "enLanguage": true,
      "ruLanguage": true,
      "sensitiveRelationshipContext": false,
      "professionalInstrument": false
    },
    "sourceEvidence": {
      "basis": "registered-instrument-and-scorer-snapshot",
      "registeredDimensionKey": "weekly.load",
      "registeredItemIds": [
        "weekly.load"
      ],
      "auditProposalStatus": "existing-family-reuse-candidate",
      "auditSnapshot": "2026-10-12",
      "sourceRecommendsExercise": false
    },
    "bindings": [
      {
        "identity": {
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
        "expectedDimensionShape": {
          "min": 0,
          "max": 10,
          "unit": "points",
          "timeframe": "past-7-days",
          "direction": "lower-reported-load",
          "dimensionClass": "symptoms",
          "sourceConstruct": "weekly.load"
        },
        "source": "registered-definition:7dc3058b-c939-5577-9226-9c5b50aa4aee@sha256:e0db859b3e3c888643ef199e1034507687b0692b77ea6932c2cbacacfb2767d7#weekly.load",
        "sourceMetadata": {
          "title": "Holistic House Weekly Pulse",
          "status": "original-non-diagnostic-self-monitoring",
          "reviewedAt": "2026-10-05"
        }
      },
      {
        "identity": {
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
        },
        "expectedDimensionShape": {
          "min": 0,
          "max": 10,
          "unit": "points",
          "timeframe": "past-7-days",
          "direction": "lower-reported-load",
          "dimensionClass": "symptoms",
          "sourceConstruct": "weekly.load"
        },
        "source": "registered-definition:7780802c-603b-5382-aebf-8f6c5ef3ddcc@sha256:1580de6223f16ba1806e446a0fc10bf35510b01d696bc149f49eed67a037cc82#weekly.load",
        "sourceMetadata": {
          "title": "Holistic House Weekly Pulse",
          "status": "original-non-diagnostic-self-monitoring",
          "reviewedAt": "2026-10-05"
        }
      }
    ]
  },
  {
    "definitionKey": "hh-weekly-pulse",
    "definitionVersion": "v1",
    "dimensionKey": "weekly.energy",
    "sourceSkillId": "pace-one-action",
    "rationale": {
      "en": "The weekly item asks about usable energy. Matching one ordinary activity to available capacity, with rest as an equal option, fits the energy-budgeting facet of the existing pace-one-action family.",
      "ru": "Еженедельный пункт спрашивает о доступной для дел энергии. Соотнесение одного обычного действия с текущими силами, с равноправным выбором отдыха, соответствует бережному распределению сил в семействе pace-one-action."
    },
    "limitations": {
      "en": "Past-week reported energy is not a current capacity test. The user chooses today’s load independently of the score. Do not infer a medical or psychological cause, escalate activity, require catching up, or promise restored energy; new or persistent fatigue may need medical advice.",
      "ru": "Сообщённый уровень энергии за неделю не является проверкой текущих возможностей. Сегодняшнюю нагрузку человек выбирает независимо от балла. Нельзя выводить медицинскую или психологическую причину, увеличивать активность, требовать наверстывания или обещать восстановление сил; новая или стойкая усталость может требовать консультации врача."
    },
    "limitedFacet": {
      "en": "Adjusting one harmless activity to today’s chosen capacity or resting.",
      "ru": "Соотнесение одного безопасного дела с выбранным сегодня объёмом сил или отдых."
    },
    "reviewRequired": {
      "exactScaleToFamily": true,
      "allObjectiveBindings": true,
      "contentSafety": true,
      "enLanguage": true,
      "ruLanguage": true,
      "sensitiveRelationshipContext": false,
      "professionalInstrument": false
    },
    "sourceEvidence": {
      "basis": "registered-instrument-and-scorer-snapshot",
      "registeredDimensionKey": "weekly.energy",
      "registeredItemIds": [
        "weekly.energy"
      ],
      "auditProposalStatus": "existing-family-reuse-candidate",
      "auditSnapshot": "2026-10-12",
      "sourceRecommendsExercise": false
    },
    "bindings": [
      {
        "identity": {
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
        "expectedDimensionShape": {
          "min": 0,
          "max": 10,
          "unit": "points",
          "timeframe": "past-7-days",
          "direction": "higher-reported-energy",
          "dimensionClass": "state",
          "sourceConstruct": "weekly.energy"
        },
        "source": "registered-definition:7dc3058b-c939-5577-9226-9c5b50aa4aee@sha256:e0db859b3e3c888643ef199e1034507687b0692b77ea6932c2cbacacfb2767d7#weekly.energy",
        "sourceMetadata": {
          "title": "Holistic House Weekly Pulse",
          "status": "original-non-diagnostic-self-monitoring",
          "reviewedAt": "2026-10-05"
        }
      },
      {
        "identity": {
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
        },
        "expectedDimensionShape": {
          "min": 0,
          "max": 10,
          "unit": "points",
          "timeframe": "past-7-days",
          "direction": "higher-reported-energy",
          "dimensionClass": "state",
          "sourceConstruct": "weekly.energy"
        },
        "source": "registered-definition:7780802c-603b-5382-aebf-8f6c5ef3ddcc@sha256:1580de6223f16ba1806e446a0fc10bf35510b01d696bc149f49eed67a037cc82#weekly.energy",
        "sourceMetadata": {
          "title": "Holistic House Weekly Pulse",
          "status": "original-non-diagnostic-self-monitoring",
          "reviewedAt": "2026-10-05"
        }
      }
    ]
  },
  {
    "definitionKey": "hh-weekly-pulse",
    "definitionVersion": "v1",
    "dimensionKey": "weekly.connection",
    "sourceSkillId": "safe-request",
    "rationale": {
      "en": "The weekly item combines felt connection and support. The existing safe-request family offers private, voluntary rehearsal of one small request, choice of contact, or boundary. That supports a chosen communication facet without equating rehearsal with available support.",
      "ru": "Еженедельный пункт объединяет ощущение связи и поддержки. Семейство safe-request предлагает личную добровольную репетицию небольшой просьбы, выбора контакта или границы. Это относится к выбранному аспекту общения, но не приравнивает репетицию к наличию поддержки."
    },
    "limitations": {
      "en": "A private script cannot create safe relationships, available support, inclusion, or another person’s response. Relationship safety and power context require explicit review. No contact, disclosure, reassurance demand, confrontation, or message sending is required; an imagined low-stakes example or opting out remains valid.",
      "ru": "Личная репетиция не создаёт безопасных отношений, доступной поддержки, включённости или нужного ответа другого человека. Безопасность отношений и неравенство влияния требуют отдельной проверки. Контакт, раскрытие личного, требование заверений, конфронтация или отправка сообщения не нужны; можно взять малозначимый вымышленный пример или отказаться."
    },
    "limitedFacet": {
      "en": "Privately rehearsing a freely chosen small request or boundary in a safe or imagined contact.",
      "ru": "Личная репетиция добровольно выбранной небольшой просьбы или границы в безопасном либо вымышленном общении."
    },
    "reviewRequired": {
      "exactScaleToFamily": true,
      "allObjectiveBindings": true,
      "contentSafety": true,
      "enLanguage": true,
      "ruLanguage": true,
      "sensitiveRelationshipContext": true,
      "professionalInstrument": false
    },
    "sourceEvidence": {
      "basis": "registered-instrument-and-scorer-snapshot",
      "registeredDimensionKey": "weekly.connection",
      "registeredItemIds": [
        "weekly.connection"
      ],
      "auditProposalStatus": "existing-family-reuse-candidate",
      "auditSnapshot": "2026-10-12",
      "sourceRecommendsExercise": false
    },
    "bindings": [
      {
        "identity": {
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
        "expectedDimensionShape": {
          "min": 0,
          "max": 10,
          "unit": "points",
          "timeframe": "past-7-days",
          "direction": "higher-reported-support",
          "dimensionClass": "resources",
          "sourceConstruct": "weekly.connection"
        },
        "source": "registered-definition:7dc3058b-c939-5577-9226-9c5b50aa4aee@sha256:e0db859b3e3c888643ef199e1034507687b0692b77ea6932c2cbacacfb2767d7#weekly.connection",
        "sourceMetadata": {
          "title": "Holistic House Weekly Pulse",
          "status": "original-non-diagnostic-self-monitoring",
          "reviewedAt": "2026-10-05"
        }
      },
      {
        "identity": {
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
        },
        "expectedDimensionShape": {
          "min": 0,
          "max": 10,
          "unit": "points",
          "timeframe": "past-7-days",
          "direction": "higher-reported-support",
          "dimensionClass": "resources",
          "sourceConstruct": "weekly.connection"
        },
        "source": "registered-definition:7780802c-603b-5382-aebf-8f6c5ef3ddcc@sha256:1580de6223f16ba1806e446a0fc10bf35510b01d696bc149f49eed67a037cc82#weekly.connection",
        "sourceMetadata": {
          "title": "Holistic House Weekly Pulse",
          "status": "original-non-diagnostic-self-monitoring",
          "reviewedAt": "2026-10-05"
        }
      }
    ]
  },
  {
    "definitionKey": "hh-weekly-pulse",
    "definitionVersion": "v1",
    "dimensionKey": "weekly.functioning",
    "sourceSkillId": "pace-one-action",
    "rationale": {
      "en": "The weekly item concerns doing needed or wanted daily activities. The existing pace-one-action family rehearses making one such ordinary task smaller, identifying a practical aid, and stopping at enough, which supports a narrow task-adjustment facet.",
      "ru": "Еженедельный пункт касается выполнения нужных или желаемых повседневных дел. Семейство pace-one-action позволяет уменьшить одно обычное дело, выбрать практическую опору и остановиться на достаточном; это соответствует узкому аспекту адаптации задачи."
    },
    "limitations": {
      "en": "Do not infer the cause of functional difficulty, disability, motivation, or ability from the rating. One adjusted task cannot address all daily-life barriers. Rest and practical help remain valid, and actual responsibilities or safety requirements must not be dropped. No productivity target or whole-scale improvement is promised.",
      "ru": "По оценке нельзя устанавливать причину повседневных затруднений, ограничения возможностей, мотивацию или способности. Изменение одной задачи не устраняет все препятствия в жизни. Отдых и практическая помощь допустимы; нельзя отменять реальные обязанности или требования безопасности. Цель продуктивности и улучшение всей шкалы не обещаются."
    },
    "limitedFacet": {
      "en": "Making one needed or wanted everyday activity manageable while preserving safety and real commitments.",
      "ru": "Посильный объём одного нужного или желаемого повседневного дела с сохранением безопасности и реальных обязательств."
    },
    "reviewRequired": {
      "exactScaleToFamily": true,
      "allObjectiveBindings": true,
      "contentSafety": true,
      "enLanguage": true,
      "ruLanguage": true,
      "sensitiveRelationshipContext": false,
      "professionalInstrument": false
    },
    "sourceEvidence": {
      "basis": "registered-instrument-and-scorer-snapshot",
      "registeredDimensionKey": "weekly.functioning",
      "registeredItemIds": [
        "weekly.functioning"
      ],
      "auditProposalStatus": "existing-family-reuse-candidate",
      "auditSnapshot": "2026-10-12",
      "sourceRecommendsExercise": false
    },
    "bindings": [
      {
        "identity": {
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
        "expectedDimensionShape": {
          "min": 0,
          "max": 10,
          "unit": "points",
          "timeframe": "past-7-days",
          "direction": "higher-reported-functioning",
          "dimensionClass": "function",
          "sourceConstruct": "weekly.functioning"
        },
        "source": "registered-definition:7dc3058b-c939-5577-9226-9c5b50aa4aee@sha256:e0db859b3e3c888643ef199e1034507687b0692b77ea6932c2cbacacfb2767d7#weekly.functioning",
        "sourceMetadata": {
          "title": "Holistic House Weekly Pulse",
          "status": "original-non-diagnostic-self-monitoring",
          "reviewedAt": "2026-10-05"
        }
      },
      {
        "identity": {
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
        },
        "expectedDimensionShape": {
          "min": 0,
          "max": 10,
          "unit": "points",
          "timeframe": "past-7-days",
          "direction": "higher-reported-functioning",
          "dimensionClass": "function",
          "sourceConstruct": "weekly.functioning"
        },
        "source": "registered-definition:7780802c-603b-5382-aebf-8f6c5ef3ddcc@sha256:1580de6223f16ba1806e446a0fc10bf35510b01d696bc149f49eed67a037cc82#weekly.functioning",
        "sourceMetadata": {
          "title": "Holistic House Weekly Pulse",
          "status": "original-non-diagnostic-self-monitoring",
          "reviewedAt": "2026-10-05"
        }
      }
    ]
  },
  {
    "definitionKey": "hh-resource-pulse",
    "definitionVersion": "v1",
    "dimensionKey": "resource.agency",
    "sourceSkillId": "one-visible-task",
    "rationale": {
      "en": "This resource item asks about being able to influence the next step in life. The existing one-visible-task family rehearses choosing one concrete, controllable next step and leaving a return marker; this offers a limited next-step agency facet.",
      "ru": "Этот ресурсный пункт спрашивает о возможности повлиять на следующий шаг в своей жизни. Семейство one-visible-task позволяет выбрать один конкретный подконтрольный шаг и оставить метку для возвращения; это относится лишь к возможности выбрать ближайшее действие."
    },
    "limitations": {
      "en": "Clarity about one ordinary next step is not a measure or promise of control over life, other people, work, or structural constraints. Do not substitute attention for the full agency construct, require completion, or make decisions for the user. A pause or practical clarification remains an option.",
      "ru": "Ясность одного обычного следующего шага не измеряет и не обещает контроль над жизнью, другими людьми, работой или внешними ограничениями. Нельзя подменять весь конструкт влияния вниманием, требовать завершения или решать за человека. Можно выбрать паузу или практическое уточнение."
    },
    "limitedFacet": {
      "en": "Choosing and marking one ordinary next step that is genuinely within the user’s control.",
      "ru": "Выбор и обозначение одного обычного следующего шага, на который человек действительно может повлиять."
    },
    "reviewRequired": {
      "exactScaleToFamily": true,
      "allObjectiveBindings": true,
      "contentSafety": true,
      "enLanguage": true,
      "ruLanguage": true,
      "sensitiveRelationshipContext": false,
      "professionalInstrument": false
    },
    "sourceEvidence": {
      "basis": "registered-instrument-and-scorer-snapshot",
      "registeredDimensionKey": "resource.agency",
      "registeredItemIds": [
        "resource.agency"
      ],
      "auditProposalStatus": "existing-family-reuse-candidate",
      "auditSnapshot": "2026-10-12",
      "sourceRecommendsExercise": false
    },
    "bindings": [
      {
        "identity": {
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
        "expectedDimensionShape": {
          "min": 0,
          "max": 10,
          "unit": "points",
          "timeframe": "right-now",
          "direction": "higher-reported-resource",
          "dimensionClass": "resources",
          "sourceConstruct": "Agency"
        },
        "source": "registered-definition:435985a5-94fc-4c2b-9a7f-a2e6c33f94be@sha256:80621529165c1c239cf93a30129ece25d010da05a01bd71e560231a3711d7afb#resource.agency",
        "sourceMetadata": {
          "title": "Holistic House Resource Pulse",
          "status": "original-non-diagnostic-self-monitoring",
          "reviewedAt": "2026-10-05"
        }
      },
      {
        "identity": {
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
        },
        "expectedDimensionShape": {
          "min": 0,
          "max": 10,
          "unit": "points",
          "timeframe": "right-now",
          "direction": "higher-reported-resource",
          "dimensionClass": "resources",
          "sourceConstruct": "Влияние"
        },
        "source": "registered-definition:aa30b3c7-f35a-4b52-a335-9a74366c2927@sha256:bdba0d174efd8c4acc1bdd950a329949c0ed5fc9c4c237bd66a78b36f28f7c1b#resource.agency",
        "sourceMetadata": {
          "title": "Holistic House Resource Pulse",
          "status": "original-non-diagnostic-self-monitoring",
          "reviewedAt": "2026-10-05"
        }
      }
    ]
  }
])

const SOURCE_CLAIM = {
  en: 'Instrument metadata identifies the measured construct only. The exercise reuse proposal is original Holistic House editorial work; the instrument source does not recommend or validate this exercise.',
  ru: 'Метаданные методики указывают только источник измеряемого конструкта. Предложение повторно использовать упражнение является редакторской работой Holistic House; источник методики не рекомендует и не подтверждает это упражнение.',
}
function exactPreparedReferences(family) {
  const sourceMapping = getPersonalCoursePilotMapping(family.sourcePilotIdentity)
  if (!sourceMapping || sourceMapping.mappingVersion !== family.sourceMappingVersion ||
    sourceMapping.curriculumVersion !== family.sourceCurriculumVersion || sourceMapping.topicId !== family.topicId) return []
  // All selectors are pinned here. A later content version remains unavailable
  // until its objective relation and this exact scale binding are reviewed again.
  return sourceMapping.practices.filter(reference =>
    reference.skillId === family.sourceSkillId && reference.contentVersion === family.sourceContentVersion &&
    family.sourceObjectiveIds.includes(reference.objectiveId) && ['en', 'ru'].includes(reference.contentLocale)
  ).map(reference => ({ ...clone(reference), reviewStatus: 'draft', exactMappingReviewStatus: 'pending-exact-mapping-review' }))
}

export const PERSONAL_COURSE_MAPPING_EXTENSIONS = deepFreeze(PERSONAL_COURSE_MAPPING_EXTENSION_CONSTRUCTS.flatMap(construct => {
  const family = PERSONAL_COURSE_MAPPING_EXTENSION_FAMILIES.find(entry => entry.sourceSkillId === construct.sourceSkillId)
  return construct.bindings.map(binding => ({
    ...clone(binding),
    mappingVersion: PERSONAL_COURSE_MAPPING_EXTENSIONS_VERSION + '/mapping/' + binding.identity.definitionId + '/' + binding.identity.dimensionKey,
    status: 'draft', contentStatus: PERSONAL_COURSE_MAPPING_EXTENSIONS_STATUS,
    reviewStatus: 'pending-exact-mapping-review', reviewRequired: clone(construct.reviewRequired),
    topicId: family.topicId, curriculumVersion: family.sourceCurriculumVersion,
    rationale: clone(construct.rationale), limitations: clone(construct.limitations),
    sourceEvidence: clone(construct.sourceEvidence), sourceClaim: clone(SOURCE_CLAIM),
    mappingAuthorship: 'Holistic House original editorial proposal; exact mapping, content safety and language review pending',
    familyReuse: {
      ...clone(family), limitedFacet: clone(construct.limitedFacet),
      selectedScaleRemainsExact: true, originalCardDimensionIsAuthoringContext: true,
      completeConstructCoverage: false, originalSourceExerciseRecommendation: false,
    },
    practices: exactPreparedReferences(family),
    clinicalValidation: false, efficacyClaim: false, automaticTreatment: false,
    productionEligible: false, productionIntegrated: false,
  }))
}))

export const PERSONAL_COURSE_MAPPING_EXTENSIONS_DRAFT_BUNDLE = deepFreeze({
  version: PERSONAL_COURSE_MAPPING_EXTENSIONS_VERSION, status: 'draft',
  contentStatus: PERSONAL_COURSE_MAPPING_EXTENSIONS_STATUS,
  scope: {
    constructCount: 5, exactScaleBindingCount: 10, instrumentFormCount: 4,
    definitionKeys: ['hh-weekly-pulse', 'hh-resource-pulse'],
    dimensionKeys: ['weekly.load', 'weekly.energy', 'weekly.connection', 'weekly.functioning', 'resource.agency'],
    contentLocales: ['en', 'ru'], contentLocaleIndependentOfInstrumentLocale: true,
    practiceDays: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20],
    otherScales: 'unsupported-outside-this-five-construct-extension',
    deferredWithinTwoTestPath: ['weekly.recovery', 'resource.support', 'resource.meaning'],
    originalPilotReplaced: false, completeAssessmentBatteryCovered: false,
    practiceContentCopiedOrRelabelled: false, reviewMaterialApprovedForExtensions: false,
  },
  mappings: PERSONAL_COURSE_MAPPING_EXTENSIONS,
  reviewMapping: null,
  clinicalValidation: false, efficacyClaim: false, productionEligible: false, productionIntegrated: false,
  reviewApprovalMeans: 'editorial-and-exact-mapping-approval-only-not-clinical-efficacy',
})

// Editorial lookup only: no locale default, label inference, score selection, or
// automatic upgrade to a newly registered instrument/content/curriculum version.
export function getPersonalCourseMappingExtension(identity) {
  const found = PERSONAL_COURSE_MAPPING_EXTENSIONS.find(mapping => sameIdentity(identity, mapping.identity))
  return found ? clone(found) : null
}
export function personalCourseMappingExtensionSupport(identity) {
  const mapping = getPersonalCourseMappingExtension(identity)
  return mapping
    ? { status: 'draft-review-required', reason: 'pending-exact-mapping-review', productionEligible: false, mappingVersion: mapping.mappingVersion, topicId: mapping.topicId, limitations: clone(mapping.limitations), reviewRequired: clone(mapping.reviewRequired) }
    : { status: 'unsupported', reason: 'outside-extension-or-exact-identity-mismatch', productionEligible: false, mappingVersion: null, topicId: null }
}
