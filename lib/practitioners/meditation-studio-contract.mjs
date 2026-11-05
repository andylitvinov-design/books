// Shared, provider-independent contract for a practitioner's private guided meditation.
// No third-party audio is copied, no AI generation is purchased by this module.
export const MEDITATION_BUCKET = 'hh-practitioner-meditation-drafts'
export const MEDITATION_AUDIO_MAX = 20_000_000
export const MEDITATION_VIDEO_MAX = 45_000_000
export const MEDITATION_MIME = Object.freeze({
  'audio/webm': {ext:'webm',kind:'audio',max:MEDITATION_AUDIO_MAX},
  'audio/mp4': {ext:'m4a',kind:'audio',max:MEDITATION_AUDIO_MAX},
  'audio/mpeg': {ext:'mp3',kind:'audio',max:MEDITATION_AUDIO_MAX},
  'audio/ogg': {ext:'ogg',kind:'audio',max:MEDITATION_AUDIO_MAX},
  'audio/wav': {ext:'wav',kind:'audio',max:MEDITATION_AUDIO_MAX},
  'video/mp4': {ext:'mp4',kind:'video',max:MEDITATION_VIDEO_MAX},
  'video/quicktime': {ext:'mov',kind:'video',max:MEDITATION_VIDEO_MAX},
  'video/webm': {ext:'webm',kind:'video',max:MEDITATION_VIDEO_MAX},
})
export const MEDITATION_MUSIC = Object.freeze(['none','harmony','meditation','energy','love','prosperity'])
// Existing curated website loops; do not accept arbitrary third-party media URLs.
export const MEDITATION_SCENES = Object.freeze({
  none: null,
  'cosmic-flow':'/videos/holistic-house/money-films-v1/cosmic-flow.mp4',
  dreams:'/videos/holistic-house/money-films-v1/dreams.mp4',
  'abundance-tree':'/videos/holistic-house/money-films-v1/abundance-tree.mp4',
  'path-to-goals':'/videos/holistic-house/money-films-v1/path-to-goals.mp4',
})
export const MEDITATION_LANGUAGES = Object.freeze(['en','ru'])
export const MEDITATION_STATES = Object.freeze(['draft','submitted','changes_requested','approved','uploading','upload_uncertain','uploaded','rejected'])
export const MEDITATION_MODES = Object.freeze(['free','ai_quote','original'])
const text=(value,max,required=false)=>{
  if(typeof value!=='string'||value.length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value))throw Error('INVALID_MEDITATION_TEXT')
  const trimmed=value.trim()
  if(required&&!trimmed)throw Error('INVALID_MEDITATION_TEXT')
  return trimmed
}
const only=(value,keys)=>{
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!keys.includes(key)))
    throw Error('INVALID_MEDITATION_INPUT')
}
export function meditationMime(mime,bytes,kind=null){
  const info=MEDITATION_MIME[String(mime||'').toLowerCase()]
  if(!info||(kind&&info.kind!==kind))throw Error('MEDIA_TYPE_NOT_ALLOWED')
  if(!Number.isSafeInteger(bytes)||bytes<128||bytes>info.max)throw Error('MEDIA_SIZE_NOT_ALLOWED')
  return {...info,mime:String(mime).toLowerCase(),bytes}
}
export function meditationMetadata(input){
  only(input,['title','description','language','music','scene','mode','rightsConfirmed'])
  if(!MEDITATION_LANGUAGES.includes(input.language))throw Error('INVALID_MEDITATION_LANGUAGE')
  if(!MEDITATION_MUSIC.includes(input.music))throw Error('INVALID_MEDITATION_MUSIC')
  if(!Object.hasOwn(MEDITATION_SCENES,input.scene))throw Error('INVALID_MEDITATION_SCENE')
  if(!MEDITATION_MODES.includes(input.mode))throw Error('INVALID_MEDITATION_MODE')
  if(input.rightsConfirmed!==true)throw Error('RIGHTS_CONFIRMATION_REQUIRED')
  return {title:text(input.title,120,true),description:text(input.description||'',600),
    language:input.language,music:input.music,scene:input.scene,mode:input.mode,rightsConfirmed:true}
}
export function meditationModerationAction(action,note=''){
  if(!['approve','changes_requested','reject'].includes(action))throw Error('INVALID_MODERATION_ACTION')
  if(typeof note!=='string')throw Error('INVALID_MODERATION_NOTE')
  const reviewNote=text(note,500)
  if(action!=='approve'&&!reviewNote)throw Error('MODERATION_NOTE_REQUIRED')
  return {action,note:reviewNote}
}
export function meditationCanModerate(state,action){
  if(action==='approve')return state==='submitted'
  if(action==='changes_requested'||action==='reject')return state==='submitted'
  return false
}
export function meditationForOwner(row){
  return {id:row.id,title:row.title,description:row.description,language:row.language,
    kind:row.kind,sourceMime:row.source_mime,sourceReady:row.source_ready===true,
    videoReady:row.video_ready===true,videoMime:row.video_mime,music:row.music,scene:row.scene,
    mode:row.mode,status:row.status,reviewNote:row.review_note||'',
    youtubeVideoId:row.youtube_video_id||null,
    createdAt:row.created_at,submittedAt:row.submitted_at||null,approvedAt:row.approved_at||null,
    publishedAt:row.published_at||null}
}
