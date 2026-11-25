// Editorial scene selection for the AI coach's completed reply only.
// No microphone data, recording, diagnosis, network calls or storage.
export const COACH_VISUAL_SCENES=Object.freeze([
  'welcome','calm','attentive','empathy','curiosity',
  'insight','encourage','action','closure','explain',
])
const allowed=new Set(COACH_VISUAL_SCENES)
export function normalizeCoachVisualScene(value,fallback='calm'){
  return typeof value==='string'&&allowed.has(value)?value:fallback
}
export function selectCoachVisualScene({phase='idle',text='',stage=''}={}){
  if(phase==='greeting')return 'welcome'
  if(phase==='listening')return 'attentive'
  if(phase!=='speaking')return 'calm'
  const speech=typeof text==='string'?text.toLocaleLowerCase().slice(0,1400):''
  // Grief or discomfort always takes priority over cheerful artwork.
  if(/\b(sorry|difficult|painful|hurt|overwhelmed|afraid|grief|hard for you|lonely|scared|tough)\b|трудн|больно|страшн|грустн|одинок|тяжело|сочувств|понимаю, как|lament|dolor|miedo|dif[ií]cil|triste|duelo/u.test(speech))return 'empathy'
  if(stage==='integration'||/подвед[её]м итог|завершим|в завершени|до встреч|to close|in summary|wrap up|para cerrar|en resumen/u.test(speech))return 'closure'
  if(['action','planning','commitment'].includes(stage)||/следующ(?:ий|им) шаг|что попробуете|маленький шаг|next step|small step|action plan|primer paso|pr[oó]ximo paso/u.test(speech))return 'action'
  if(/заметили|похоже, что|получается, что|новый взгляд|стало ясн|notice that|what stands out|new perspective|you've noticed|parece que|darte cuenta/u.test(speech))return 'insight'
  if(/получилось|уже справил|ваш ресурс|ваша сила|you managed|your strength|well done|you can try|lo has logrado|tus fortalezas/u.test(speech))return 'encourage'
  if(/[?？]/u.test(speech))return 'curiosity'
  return 'explain'
}
export function coachVisualClip(phase='idle',scene='calm'){
  if(phase==='greeting')return 'greeting'
  if(phase==='listening')return 'listening'
  if(phase!=='speaking')return 'idle'
  const cue=normalizeCoachVisualScene(scene,'explain')
  if(cue==='empathy')return 'listening'
  if(cue==='closure')return 'idle'
  if(cue==='encourage')return 'greeting'
  return 'speaking'
}
