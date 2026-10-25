// Owner-recorded educational narration for existing Egyptian and Greek coaching.
// This is a whitelist of EXACT canonical question IDs, not learner answers or client media.
import {traditionStages} from '../personal-coaching/tradition-visuals.js'
import {REIKI_INTRO_MIME,reikiIntroCanonicalMime,reikiIntroMime} from './reiki-intro-audio-model.js'

export const COACHING_AUDIO_BUCKET = 'hh-practitioner-course-media' // private, existing
export const COACHING_AUDIO_INDEX_BUCKET = 'hh-reiki-course-audio' // JSON index only; never audio bytes
export const COACHING_AUDIO_MANIFEST = 'coaching/active-narration-v1.json'
export const COACHING_AUDIO_MAX_BYTES = 20000000
export const COACHING_AUDIO_LANGUAGES = Object.freeze(['en','ru','es'])
const keys = Object.freeze({
  egyptian: [
    ['egyptian_ka_desire_v1','ka'],
    ['egyptian_ba_result_v1','ba'],
    ['egyptian_ib_values_v1','ib'],
    ['egyptian_sah_contribution_v1','sah'],
    ['egyptian_haibit_experience_v1','haibit'],
    ['egyptian_haibit_first_action_v1','haibit'],
    ['egyptian_hu_strength_v1','hu'],
    ['egyptian_ren_identity_v1','ren'],
    ['egyptian_sekhem_support_v1','sekhem'],
  ],
  greek: [
    ['greek_epithymia_attraction_v1','epithymia'],
    ['greek_thymos_resolve_v1','thymos'],
    ['greek_logos_order_v1','logos'],
    ['greek_nous_meaning_v1','nous'],
    ['greek_eidos_ideal_v1','eidos'],
    ['greek_idea_central_v1','idea'],
    ['greek_daimon_becoming_v1','daimon'],
    ['greek_telos_potential_v1','telos'],
  ],
})
export const COACHING_AUDIO_COURSES = Object.freeze(Object.keys(keys))
export const coachingAudioMime = reikiIntroMime
export function coachingAudioQuestions(course) {
  if(!Object.hasOwn(keys,course))return []
  const stages=traditionStages(course)
  return [
    {id:'goal',stage:'start',title:{en:'01 · My goal',ru:'01 · Моя цель',es:'01 · Mi objetivo'}},
    ...keys[course].map(([id,stage],index)=>({
      id,stage,title:stages.find(item=>item.id===stage)?.title || {en:stage,ru:stage,es:stage},
      index:index+2,
      suffix:id==='egyptian_haibit_experience_v1'
        ? {en:' · Experience',ru:' · Опыт',es:' · Experiencia'}
        :id==='egyptian_haibit_first_action_v1'
        ? {en:' · First action',ru:' · Первое действие',es:' · Primera acción'}:null,
    })),
    {id:'action_24h',stage:'finish',title:{en:'Final · My next step',ru:'Финал · Следующий шаг',es:'Final · Mi siguiente paso'}},
  ]
}
export function coachingAudioSlot(course,question,locale) {
  return COACHING_AUDIO_LANGUAGES.includes(locale) &&
    coachingAudioQuestions(course).some(item=>item.id===question)
    ? [course,question,locale].join(':'):null
}
export function coachingAudioFolder(course,question,locale){
  return coachingAudioSlot(course,question,locale)
    ? 'coaching/'+course+'/'+question+'/'+locale :null
}
export function coachingAudioPath(course,question,locale,uuid,mime){
  const folder=coachingAudioFolder(course,question,locale)
  const extension=REIKI_INTRO_MIME[reikiIntroCanonicalMime(mime)]
  return folder && typeof uuid==='string' && /^[a-f0-9]{32}$/.test(uuid) && extension
    ? folder+'/'+uuid+'.'+extension:null
}
export function validCoachingAudioPath(path,course,question,locale){
  const folder=coachingAudioFolder(course,question,locale)
  return !!folder && typeof path==='string' && path.startsWith(folder+'/') &&
    /^[a-f0-9]{32}\.(mp3|m4a|wav)$/.test(path.slice(folder.length+1))
}
export function validCoachingAudioEntry(entry,course,question,locale){
  if(!entry || typeof entry!=='object' || Array.isArray(entry) ||
    !validCoachingAudioPath(entry.path,course,question,locale))return false
  const mime=reikiIntroCanonicalMime(entry.mime), ext=REIKI_INTRO_MIME[mime]
  return !!ext && entry.path.endsWith('.'+ext) &&
    Number.isSafeInteger(entry.bytes) && entry.bytes>=512 && entry.bytes<=COACHING_AUDIO_MAX_BYTES &&
    typeof entry.publishedAt==='string' && !Number.isNaN(Date.parse(entry.publishedAt))
}
export function cleanCoachingAudioManifest(value){
  const slots=value?.version===1 && value.slots && typeof value.slots==='object' &&
    !Array.isArray(value.slots) ? value.slots : {}
  const safe={}
  for(const course of COACHING_AUDIO_COURSES)
    for(const question of coachingAudioQuestions(course))
      for(const locale of COACHING_AUDIO_LANGUAGES){
        const key=coachingAudioSlot(course,question.id,locale),entry=slots[key]
        if(validCoachingAudioEntry(entry,course,question.id,locale))
          safe[key]={path:entry.path,mime:reikiIntroCanonicalMime(entry.mime),
            bytes:entry.bytes,publishedAt:entry.publishedAt}
      }
  return {version:1,slots:safe}
}
