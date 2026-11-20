// My Coach protocol: consented, bounded, client-reviewed dialogue only.
// This is not a clinical record and no AI suggestion is automatically an action.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const localeSet=new Set(['en','ru','es'])
const personaSet=new Set(['mira','max','sofia','alex','merlin','harry','lea','noah','iris','ray'])
const modeSet=new Set(['ai','offline','wisdom','safety','boundary'])
const badChars=/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)
const clip=(value,max)=>{
  if(typeof value!=='string'||value.length>max||badChars.test(value))throw Error('MY_COACH_PROTOCOL_INVALID')
  return value.trim()
}
const iso=value=>{
  if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d/.test(value)||
    !Number.isFinite(Date.parse(value)))throw Error('MY_COACH_PROTOCOL_INVALID')
  return new Date(value).toISOString()
}
export const MY_COACH_PROTOCOL_MAX_TURNS=160
export const MY_COACH_PROTOCOL_MAX_CHARS=70000

/**
 * Validate the complete *visible* exchange before creating a private record.
 * Role/ordering and bounds are checked again server-side; do not silently
 * discard turns from a long session. Partial speech and hidden AI reasoning
 * are never report material.
 */
export function normalizeMyCoachProtocol(value){
  if(!plain(value)||!uuid.test(value.id||'')||!personaSet.has(value.personaId)||
    !localeSet.has(value.locale)||!Array.isArray(value.turns)||
    value.turns.length<2||value.turns.length>MY_COACH_PROTOCOL_MAX_TURNS||
    value.turns.length%2!==0)throw Error('MY_COACH_PROTOCOL_INVALID')
  const startedAt=iso(value.startedAt),completedAt=iso(value.completedAt)
  if(Date.parse(completedAt)<Date.parse(startedAt)||Date.parse(completedAt)>Date.now()+120000)
    throw Error('MY_COACH_PROTOCOL_INVALID')
  const durationSeconds=value.durationSeconds===undefined?null:value.durationSeconds
  if(durationSeconds!==null&&(!Number.isInteger(durationSeconds)||durationSeconds<0||durationSeconds>7200))
    throw Error('MY_COACH_PROTOCOL_INVALID')
  let chars=0
  const turns=value.turns.map((item,index)=>{
    const role=index%2===0?'user':'assistant'
    if(!plain(item)||item.role!==role)throw Error('MY_COACH_PROTOCOL_INVALID')
    const content=clip(item.content,1200)
    if(!content)throw Error('MY_COACH_PROTOCOL_INVALID')
    chars+=content.length
    const clean={role,content}
    if(role==='assistant'){
      if(item.mode!==undefined){
        if(!modeSet.has(item.mode))throw Error('MY_COACH_PROTOCOL_INVALID')
        clean.mode=item.mode
      }
      if(item.stage!==undefined){
        const stage=clip(item.stage,64)
        if(stage)clean.stage=stage
      }
      if(item.suggestion!==undefined){
        const suggestion=clip(item.suggestion,300)
        if(suggestion){clean.suggestion=suggestion;chars+=suggestion.length}
      }
    }
    return clean
  })
  if(chars>MY_COACH_PROTOCOL_MAX_CHARS)throw Error('MY_COACH_PROTOCOL_TOO_LARGE')
  return {
    version:1,id:value.id,personaId:value.personaId,locale:value.locale,
    startedAt,completedAt,durationSeconds,
    goal:clip(value.goal||'',180),
    clientSummary:clip(value.clientSummary||'',1000),
    clientNextStep:clip(value.clientNextStep||'',500),
    turns,
    provenance:'client_reviewed_dialogue',
  }
}

const words={
  en:{title:'Coaching session protocol',user:'You',coach:'AI coach',proposal:'Unconfirmed AI suggestion',stage:'Coaching stage (provisional)',note:'Only the reviewed dialogue is included; no audio recording.'},
  ru:{title:'Протокол коучинг-сессии',user:'Вы',coach:'AI-коуч',proposal:'Предложение ИИ (не подтверждено)',stage:'Этап коучинга (предварительно)',note:'Только просмотренный диалог, без аудиозаписи.'},
  es:{title:'Protocolo de sesión de coaching',user:'Tú',coach:'Coach IA',proposal:'Sugerencia de IA sin confirmar',stage:'Etapa de coaching (provisional)',note:'Solo diálogo revisado, sin grabación de audio.'},
}
export function myCoachProtocolPdfOptions(value,{locale}={}){
  const protocol=normalizeMyCoachProtocol(value)
  const lang=localeSet.has(locale)?locale:protocol.locale
  const t=words[lang]
  const entries=[]
  for(let index=0;index<protocol.turns.length;index+=2){
    const user=protocol.turns[index],coach=protocol.turns[index+1]
    const meta=[
      coach.stage?t.stage+': '+coach.stage:'',
      coach.suggestion?t.proposal+': '+coach.suggestion:'',
    ].filter(Boolean).join('\n')
    entries.push({question:t.user+': '+user.content,answer:t.coach+': '+coach.content,reflection:meta})
  }
  return {
    locale:lang,slug:'my-coach-'+protocol.personaId,entryKind:'dialogue',
    title:t.title+' · '+protocol.personaId,
    sessionDate:protocol.completedAt,topic:protocol.goal,
    clientQuestion:'',actionPlan:'',entries,
    clientReflection:protocol.clientSummary,
    clientNextStep:protocol.clientNextStep,
    protocolNote:t.note,
  }
}
