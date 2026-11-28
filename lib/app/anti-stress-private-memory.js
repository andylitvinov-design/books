import 'server-only'
import {AppError} from '../assessments/contracts.js'
import {readMyCoachGreetingIdentity,listMyCoachProtocols} from './personal-coaching.js'
import {antiStressStorageEnabled,readLatestAntiStressPrivateMemory} from './anti-stress-runs.js'
import {latestReviewedCoachingMemory,assembleOwnerCrossModeMemory} from '../coaching/anti-stress-private-memory.mjs'
import {crossModeShareOptions,resolveCrossModeShare} from '../coaching/anti-stress-memory-share.mjs'
// Internal first-party read. No consent to share with Gemini/Groq or to reuse
// any resource in a practice. Existing owner-specific reads are reused.
export async function readOwnedCrossModeMemory(config,actor,exclude=null,locale='en'){
 if(!actor?.id||!antiStressStorageEnabled())throw new AppError('ANTI_STRESS_UNAVAILABLE',503)
 if(exclude!==null&&(typeof exclude!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(exclude)))throw new AppError('ANTI_STRESS_INVALID',400)
 const [identity,coaching,therapy]=await Promise.allSettled([
  readMyCoachGreetingIdentity(config,actor),
  latestReviewedCoachingMemory(cursor=>listMyCoachProtocols(config,actor,cursor||{}),exclude),
  readLatestAntiStressPrivateMemory(config,actor,exclude,locale)
 ])
 return assembleOwnerCrossModeMemory({identity,coaching,therapy})
}

// Re-read at the moment of authorized use. Stale, corrected, deleted, or
// unavailable records cannot silently fall back to another memory item.
export async function readApprovedCrossModeReference(config,actor,protocolId,selection,locale){
 const memory=await readOwnedCrossModeMemory(config,actor,protocolId,locale)
 const note=resolveCrossModeShare(memory,actor.id,protocolId,selection)
 if(!note)throw new AppError('ANTI_STRESS_CONFLICT',409)
 return note
}
export function ownerCrossModeShareOptions(memory,actor,protocolId){return crossModeShareOptions(memory,actor.id,protocolId)}
