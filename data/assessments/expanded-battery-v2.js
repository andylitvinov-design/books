import { deepFreeze } from '../../lib/assessments/contracts.js'
import { EXPANDED_BATTERY_V2_PROFESSIONAL } from './expanded-battery-v2-professional.js'
import { EXPANDED_BATTERY_V2_FUN_A } from './expanded-battery-v2-fun-a.js'
import { EXPANDED_BATTERY_V2_FUN_B } from './expanded-battery-v2-fun-b.js'
import { EXPANDED_BATTERY_V2_FUN_C } from './expanded-battery-v2-fun-c.js'
import { EXPANDED_BATTERY_V2_FUN_D } from './expanded-battery-v2-fun-d.js'

export const EXPANDED_BATTERY_V2_DEFINITIONS = deepFreeze([
  ...EXPANDED_BATTERY_V2_PROFESSIONAL,
  ...EXPANDED_BATTERY_V2_FUN_A,
  ...EXPANDED_BATTERY_V2_FUN_B,
  ...EXPANDED_BATTERY_V2_FUN_C,
  ...EXPANDED_BATTERY_V2_FUN_D,
])
