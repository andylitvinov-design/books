// Existing, already generated HeyGen coach takes, mirrored as first-party
// public MP4 assets at build time. No new generation, copy or provider request.
import {coachNaturalFilename} from '../coaching/coach-natural-motion.mjs'

const ROOT='/images/holistic-house/my-coach-motion/'
const COACHES=Object.freeze([
  {id:'mira',names:{en:'Mira',ru:'Мира',es:'Mira'}},
  {id:'sofia',names:{en:'Sofia',ru:'София',es:'Sofía'}},
  {id:'max',names:{en:'Max',ru:'Макс',es:'Max'}},
  {id:'alex',names:{en:'Alex',ru:'Алекс',es:'Alex'}},
])
const TAKES=Object.freeze(['calm','attentive'])
export const SITE_COACH_AVATAR_CATALOG=Object.freeze(COACHES.flatMap(coach=>
  TAKES.map(take=>Object.freeze({
    id:coach.id+'-'+take,
    personaId:coach.id,
    take,
    names:coach.names,
    poster:ROOT+coach.id+'-still.webp',
    video:ROOT+coachNaturalFilename(coach.id,take),
  }))
))
const IDS=new Set(SITE_COACH_AVATAR_CATALOG.map(item=>item.id))
export function isSiteCoachAvatarId(value){
  return typeof value==='string'&&IDS.has(value)
}
