// Author's Dao Resource Ladder: 18 levels, as defined by
// alchemy-method/method/dao-resource-scale.md (not the five-element balance).
// This is a descriptive framework, not a medical or psychological diagnosis.
export const DAO_RESOURCE_SCALE_VERSION = 'dao-resource-ladder-18-v1'

// Lower-inclusive ranges. The final level is exactly 10.
const LEVELS = [
  [0, 'Шторм', 'Storm', 'Поиск устойчивости и точки опоры.', 'Finding stability and a first point of support.', 'Поддержка и безопасность.', 'Support and safety.'],
  [2, 'Снежная королева', 'Snow Queen', 'Ресурс заморожен, появляется первая возможность согреться и ожить.', 'Resources feel frozen; warmth and gentle reconnection begin.', 'Тепло и мягкий контакт.', 'Warmth and gentle contact.'],
  [2.5, 'Прометей', 'Prometheus', 'Силы появляются, но пока нестабильны.', 'Strength begins to appear, but is not yet stable.', 'Ритм и внутренняя структура.', 'Rhythm and inner structure.'],
  [3, 'Крепость', 'Fortress', 'Формируются опора, личные границы и ощущение своего Я.', 'An inner foundation, boundaries and a sense of self are forming.', 'Бережное укрепление себя и безопасное проявление.', 'Strengthen the self and practice safe expression.'],
  [3.5, 'Король / Королева в башне', 'King / Queen in the Tower', 'Появляются личная воля и желание проявляться, но внешний контакт ещё может быть непростым.', 'Personal will and the wish to express yourself are emerging, while contact may still feel challenging.', 'Укреплять достоинство и мягко открываться людям.', 'Support dignity and gradually open to connection.'],
  [4, 'Капитан', 'Captain', 'Уже есть внутренний стержень и способность управлять своими действиями.', 'There is a stronger inner core and growing ability to steer your actions.', 'Смягчать избыточный контроль и сохранять направление.', 'Soften excessive control while keeping direction.'],
  [4.5, 'Ручей', 'Stream', 'Сил хватает на повседневную жизнь, появляется интерес к контакту.', 'There is enough capacity for daily life and growing curiosity about connection.', 'Развивать лёгкость и радость жизни.', 'Cultivate ease and enjoyment of life.'],
  [5, 'Река', 'River', 'Ресурс начинает свободнее двигаться к миру.', 'Resources begin to flow more freely into the world.', 'Учиться получать и делиться, не теряя себя.', 'Practice receiving and sharing without losing yourself.'],
  [5.5, 'Озеро', 'Lake', 'Появляется более устойчивый ресурс для связей и обмена.', 'A more stable foundation for connection and exchange develops.', 'Укреплять доверие и глубокие связи.', 'Strengthen trust and deeper connections.'],
  [6, 'Хозяин гавани', 'Harbor Master', 'Возникает готовность к более широкому взаимодействию с миром.', 'Readiness for broader engagement with the world grows.', 'Открывать новые возможности и контакты.', 'Open new opportunities and connections.'],
  [6.5, 'Парусник', 'Sailboat', 'Становятся яснее цели и направление движения.', 'Goals and a sense of direction become clearer.', 'Поддерживать последовательное движение к целям.', 'Maintain steady progress toward goals.'],
  [7, 'Владыка водопада', 'Waterfall Lord', 'Укрепляется уверенность в способности выражаться и действовать.', 'Confidence in expression and action grows.', 'Проявлять силу осознанно.', 'Express strength consciously.'],
  [7.5, 'Дельта реки', 'River Delta', 'Расширяются направления, связи и чувство значимости.', 'Projects, connections and a sense of meaning expand.', 'Соединять масштаб с ответственностью.', 'Balance greater reach with responsibility.'],
  [8, 'Океан / Хранитель морей', 'Ocean / Keeper of Seas', 'Появляется возможность удерживать более крупные процессы.', 'There is capacity to hold larger processes.', 'Укреплять зрелое лидерство и спокойствие.', 'Develop mature leadership and calm.'],
  [8.5, 'Провидец / Исток', 'Seer / Source', 'Личные действия связываются с более широким смыслом и миссией.', 'Personal action is linked with wider meaning and purpose.', 'Соотносить выбор с ценностями и направлением жизни.', 'Align choices with values and purpose.'],
  [9, 'Пустота / Дао Сюй', 'Emptiness / Dao Xu', 'Образ модели: меньше усилия, больше тонкой сонастройки.', 'Model image: less forcing and more subtle alignment.', 'Углублять присутствие и непривязанность.', 'Deepen presence and non-attachment.'],
  [9.5, 'У-вэй / Закон', 'Wu-Wei / Law', 'Образ модели: действие без лишнего напряжения.', 'Model image: action without unnecessary forcing.', 'Сохранять естественность действия.', 'Sustain effortless action.'],
  [10, 'У-цзи / Безграничность', 'Wu-Ji / Boundless', 'Образ модели: устойчивое присутствие и единство с Дао.', 'Model image: abiding presence and attunement to Dao.', 'Беречь устойчивость и воплощать ценности.', 'Preserve alignment and embody values.'],
]
export const DAO_RESOURCE_STAGES = Object.freeze(LEVELS.map(([min,ru,en,descriptionRu,descriptionEn,focusRu,focusEn],index) => Object.freeze({
  level: index+1, min,
  max: index+1<LEVELS.length ? LEVELS[index+1][0] : 10,
  ru, en, descriptionRu, descriptionEn, focusRu, focusEn,
})))

export function parseDaoResourceScore(raw) {
  if (raw === null || raw === undefined || raw === '') return null
  if (typeof raw !== 'number' && typeof raw !== 'string') throw new Error('INVALID_DAO_RESOURCE_SCORE')
  const text = String(raw).trim().replace(',', '.')
  if (!text) return null
  // Deliberately one decimal place: the owner's resource scale is scored in tenths.
  if (!/^(?:0|[1-9]|10)(?:\.\d)?$/.test(text)) throw new Error('INVALID_DAO_RESOURCE_SCORE')
  const number = Number(text)
  if (!Number.isFinite(number) || number<0 || number>10) throw new Error('INVALID_DAO_RESOURCE_SCORE')
  return number
}

export function daoResourceStage(raw, locale='ru') {
  const score = parseDaoResourceScore(raw)
  if (score === null) return null
  const i = DAO_RESOURCE_STAGES.findIndex((stage,index) =>
    score >= stage.min && (index===DAO_RESOURCE_STAGES.length-1 ? score<=10 : score<stage.max))
  if (i<0) throw new Error('INVALID_DAO_RESOURCE_SCORE')
  const stage = DAO_RESOURCE_STAGES[i]
  const ru = locale==='ru'
  const next = DAO_RESOURCE_STAGES[i+1]
  return {
    level:stage.level, score, scaleVersion:DAO_RESOURCE_SCALE_VERSION,
    name:ru?stage.ru:stage.en,
    range:`${stage.min.toFixed(1)}–${stage.max.toFixed(1)}`,
    description:ru?stage.descriptionRu:stage.descriptionEn,
    focus:ru?stage.focusRu:stage.focusEn,
    nextLevel:next?.level ?? null,
    nextName:next ? (ru?next.ru:next.en) : null,
  }
}
