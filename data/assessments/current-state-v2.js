import { deepFreeze } from '../../lib/assessments/contracts.js'
import { CURRENT_STATE_EN_V1, CURRENT_STATE_RU_V1 } from './current-state-v1.js'

const optionalContext = [
  { id: 'current_focus', maxLength: 1000 },
  { id: 'trigger', maxLength: 1000 },
  { id: 'what_helps', maxLength: 1000 },
  { id: 'desired_change', maxLength: 1000 },
  { id: 'note', maxLength: 1000 },
]

function versionedContext(base, id, translationVersion, contentHash) {
  const body = {
    ...base,
    id,
    version: 'v2',
    translationVersion,
    optionalContext,
  }
  delete body.contentHash
  return deepFreeze({ ...body, contentHash })
}

export const CURRENT_STATE_EN_V2 = versionedContext(
  CURRENT_STATE_EN_V1,
  '5d365ee9-fc71-5f07-8414-8f5668b43d13',
  'hh-en-v2',
  'sha256:ff9cb8875304b744829e570dacb39c1fd2feebca158184cb5e56ac9ef794423d',
)
export const CURRENT_STATE_RU_V2 = versionedContext(
  CURRENT_STATE_RU_V1,
  '7c967f29-90a1-5a87-8dc5-a4be8c4f0194',
  'hh-ru-v2',
  'sha256:fc208ce58fd75ee66c33b13520af01b981593efedffff91284451b010e3f1771',
)
