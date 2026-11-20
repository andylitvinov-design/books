import 'server-only'
import {readCoachingLifePlan} from './coaching-life-plan.js'
import {projectCoachContextSnapshot} from '../personal-coaching/client-context.mjs'

/**
 * Projects the existing encrypted Life Plan into a compact, server-authorized
 * coaching input.  It deliberately does not persist a second memory copy.
 * This payload is untrusted user data when embedded in a model prompt.
 */
export const buildCoachContextSnapshot=projectCoachContextSnapshot

/** Server-side retrieval for each substantive My Coach turn. */
export async function loadCoachContextSnapshot({config,actor,latestUserTurn,latestTurnAct,selectedGoalId,policyVersion='v1',locale='en'}={}){
  if(!config||!actor?.id)return buildCoachContextSnapshot({latestUserTurn,latestTurnAct,selectedGoalId,policyVersion})
  const plan=await readCoachingLifePlan(config,actor,{locale})
  return buildCoachContextSnapshot({plan,latestUserTurn,latestTurnAct,selectedGoalId,policyVersion})
}
