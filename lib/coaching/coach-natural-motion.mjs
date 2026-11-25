// First-party, owner-reviewed natural motion clips. Old photographic
// face-stretch clips are deliberately never referenced by the player.
const PERSONAS=new Set(['mira','sofia','max','alex'])
const LISTENING_SCENES=new Set(['attentive','empathy','curiosity','closure'])
export const NATURAL_MOTION_VARIANTS=Object.freeze(['calm','attentive'])
// The build pipeline and browser must use the SAME filename, not variant-first aliases.
export function coachNaturalFilename(personaId,take){
  if(!PERSONAS.has(personaId)||!NATURAL_MOTION_VARIANTS.includes(take))return null
  return personaId+'-natural-'+take+'-v2.mp4'
}
export function coachNaturalTake(phase='idle',scene='calm'){
  return phase==='listening'||(phase==='speaking'&&LISTENING_SCENES.has(scene))
    ?'attentive':'calm'
}
export function coachNaturalVideoPath(personaId,phase='idle',scene='calm'){
  const filename=coachNaturalFilename(personaId,coachNaturalTake(phase,scene))
  return filename?'/images/holistic-house/my-coach-motion/'+filename:null
}

export function coachVideoPosterPath(videoPath) {
  if (typeof videoPath !== 'string' || !videoPath.endsWith('.mp4')) return null
  return videoPath.slice(0, -4) + '.webp'
}
