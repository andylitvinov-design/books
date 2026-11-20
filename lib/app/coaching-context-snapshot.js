import 'server-only'
import {projectCoachContextSnapshot} from '../personal-coaching/client-context.mjs'

/**
 * Projects the existing encrypted Life Plan into a compact, server-authorized
 * coaching input.  It deliberately does not persist a second memory copy.
 * This payload is untrusted user data when embedded in a model prompt.
 */
export const buildCoachContextSnapshot=projectCoachContextSnapshot

/** Existing session consent does not authorize disclosure to an external provider. */
export async function loadCoachContextSnapshot({latestTurnAct,policyVersion='v1'}={}){
  return {
    ...buildCoachContextSnapshot({latestTurnAct,policyVersion}),
    excludedReasonCodes:['PROVIDER_SCOPED_CONSENT_REQUIRED'],
  }
}
