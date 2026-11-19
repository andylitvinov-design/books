// First-party, owner-reviewed natural motion clips. Old photographic
// face-stretch clips are deliberately never referenced by the player.
const PERSONAS=new Set(['mira','sofia','max','alex'])
const LISTENING_SCENES=new Set(['attentive','empathy','curiosity','closure'])
export const NATURAL_MOTION_VARIANTS=Object.freeze(['calm','attentive'])
export function coachNaturalTake(phase='idle',scene='calm'){
  return phase==='listening'||(phase==='speaking'&&LISTENING_SCENES.has(scene))
    ?'attentive':'calm'
}
export function coachNaturalVideoPath(personaId,phase='idle',scene='calm'){
  if(!PERSONAS.has(personaId))return null
  return '/images/holistic-house/my-coach-motion/'+personaId+
    '-natural-'+coachNaturalTake(phase,scene)+'-v1.mp4'
}
