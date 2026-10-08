import { MONITORING_CATALOG } from '../../data/assessments/catalog.js'
import { getAssessmentDefinition } from '../assessments/definitions.js'
import { fail, onlyKeys, requireUUID } from '../assessments/contracts.js'

const catalogByKey = new Map(MONITORING_CATALOG.map((item) => [item.key, item]))

function planItem(value) {
  onlyKeys(value, ['definitionKey', 'definitionVersion', 'instrumentLocale'])
  if (typeof value.definitionKey !== 'string' || typeof value.definitionVersion !== 'string' || typeof value.instrumentLocale !== 'string')
    fail('INVALID_PLAN_ITEM')
  const catalog = catalogByKey.get(value.definitionKey)
  if (!catalog || !catalog.startable || catalog.rightsStatus !== 'cleared') fail('UNKNOWN_INSTRUMENT')
  let definition
  try {
    definition = getAssessmentDefinition(value.definitionKey, value.definitionVersion, value.instrumentLocale)
  } catch {
    fail('UNKNOWN_INSTRUMENT')
  }
  if (definition.key !== catalog.key || definition.version !== catalog.version) fail('UNKNOWN_INSTRUMENT')
  return { catalog, definition }
}

export function validateTestPlanInput(input, { audience } = {}) {
  onlyKeys(input, ['items', 'operationId', 'replaceActive'])
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 12) fail('INVALID_PLAN_ITEMS')
  const operationId = requireUUID(input.operationId)
  if (input.replaceActive !== undefined && typeof input.replaceActive !== 'boolean') fail('INVALID_REPLACE_ACTIVE')
  const resolved = input.items.map(planItem)
  const ids = resolved.map(({ definition }) => definition.id)
  if (new Set(ids).size !== ids.length) fail('DUPLICATE_DEFINITION')
  if (audience === 'guest' && resolved.some(({ catalog }) => catalog.guestEligible !== true)) fail('GUEST_TEST_UNAVAILABLE', 403)
  if (!['guest', 'account'].includes(audience)) fail('INVALID_AUDIENCE')
  return Object.freeze({
    operationId,
    replaceActive: input.replaceActive === true,
    definitionIds: Object.freeze(ids),
    definitions: Object.freeze(resolved.map(({ definition }) => definition)),
  })
}


// A signed-in test battery is a choice of instruments, not a required testing order.
// The next index points to the first instrument not yet completed in this battery.
export function nextOutstandingDefinitionIndex(definitionIds, completedDefinitionIds) {
  const completed = new Set(completedDefinitionIds)
  const next = definitionIds.findIndex((id) => !completed.has(id))
  return next === -1 ? definitionIds.length : next
}
