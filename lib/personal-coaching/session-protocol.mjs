// My Coach protocol: consented, bounded, client-reviewed dialogue only.
import {coachInformationClientTurns} from '../coaching/coach-information-checklist.mjs'
import {coachInformationCoverage,COACH_INFORMATION_PERSONA_METHODS,COACH_INFORMATION_METHOD_IDS} from '../coaching/coach-information-coverage.mjs'
import {verbatimClientClauses} from '../coaching/coach-ephemeral-context.mjs'
import {getCoachPersona} from '../coaching/persona-registry.mjs'
// This is not a clinical record and no AI suggestion is automatically an action.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const localeSet=new Set(['en','ru','es'])
const personaSet=new Set(['mira','max','sofia','alex','merlin','harry','lea','noah','iris','ray'])
const modeSet=new Set(['ai','offline','wisdom','safety','boundary','opening'])
const methodNames=Object.freeze({grow:'GROW',tgrow:'T-GROW',woop:'WOOP',oskar:'OSKAR',solution_focused:'Solution-Focused',appreciative_inquiry:'Appreciative Inquiry'})
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
    value.turns.length<1||value.turns.length>MY_COACH_PROTOCOL_MAX_TURNS||
    (value.turns.at(-1)?.role==='user'&&value.turns.at(-1)?.unanswered!==true))
    throw Error('MY_COACH_PROTOCOL_INVALID')
  const methodId=value.methodId===undefined?COACH_INFORMATION_PERSONA_METHODS[value.personaId]:value.methodId
  const persona=getCoachPersona(value.personaId)
  if(typeof methodId!=='string'||!persona?.methods?.some(name=>COACH_INFORMATION_METHOD_IDS[name]===methodId))
    throw Error('MY_COACH_PROTOCOL_INVALID')
  const startedAt=iso(value.startedAt),completedAt=iso(value.completedAt)
  if(Date.parse(completedAt)<Date.parse(startedAt)||Date.parse(completedAt)>Date.now()+120000)
    throw Error('MY_COACH_PROTOCOL_INVALID')
  const durationSeconds=value.durationSeconds===undefined?null:value.durationSeconds
  if(durationSeconds!==null&&(!Number.isInteger(durationSeconds)||durationSeconds<0||durationSeconds>7200))
    throw Error('MY_COACH_PROTOCOL_INVALID')
  // A client-reviewed, optional opening summary. Stored only when the client
  // explicitly saves the entire protocol; never a separate background memory.
  const rawOpening=value.opening
  let opening
  if(rawOpening!==undefined){
    if(!plain(rawOpening)||Object.keys(rawOpening).some(key=>!
      ['version','done','name','continuity','focus','feelings','topic','invitationQuote'].includes(key))||
      rawOpening.version!=='hh-coach-opening-v1-20261122'||
      !Array.isArray(rawOpening.done)||rawOpening.done.length!==6||
      rawOpening.done.some(flag=>typeof flag!=='boolean')||
      !['new','continue',null].includes(rawOpening.continuity)||
      !['challenge','goal','self_exploration',null].includes(rawOpening.focus))
      throw Error('MY_COACH_PROTOCOL_INVALID')
    opening={
      version:rawOpening.version,done:[...rawOpening.done],
      name:clip(rawOpening.name||'',48),
      continuity:rawOpening.continuity,
      focus:rawOpening.focus,
      feelings:clip(rawOpening.feelings||'',220),
      topic:clip(rawOpening.topic||'',180),
      invitationQuote:clip(rawOpening.invitationQuote||'',240),
    }
  }
  let chars=0
  // A native Gemini Live coach may speak the initial invitation before the
  // client responds. Keep that audible introduction in the reviewed protocol
  // instead of falsely reconstructing a preceding user turn.
  const startsWithCoach=value.turns[0]?.role==='assistant'
  const turns=value.turns.map((item,index)=>{
    const role=(index+(startsWithCoach?1:0))%2===0?'user':'assistant'
    if(!plain(item)||item.role!==role)throw Error('MY_COACH_PROTOCOL_INVALID')
    const content=clip(item.content,1200)
    if(!content)throw Error('MY_COACH_PROTOCOL_INVALID')
    chars+=content.length
    const clean={role,content}
    if(role==='user'){
      if(item.unanswered===true){
        if(index!==value.turns.length-1)throw Error('MY_COACH_PROTOCOL_INVALID')
        clean.unanswered=true
      }else if(item.unanswered!==undefined)throw Error('MY_COACH_PROTOCOL_INVALID')
    }else if(item.unanswered!==undefined)throw Error('MY_COACH_PROTOCOL_INVALID')
    if(role==='assistant'){
      if(item.interrupted===true)clean.interrupted=true
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
    version:1,id:value.id,personaId:value.personaId,methodId,locale:value.locale,
    startedAt,completedAt,durationSeconds,
    goal:clip(value.goal||'',180),
    clientSummary:clip(value.clientSummary||'',1000),
    clientNextStep:clip(value.clientNextStep||'',500),
    turns,
    ...(opening?{opening}:{}),
    provenance:'client_reviewed_dialogue',
  }
}

const words={
  en:{title:'Coaching session protocol',user:'You',coach:'AI coach',proposal:'Unconfirmed AI suggestion',interrupted:'Coach response interrupted (may not have been fully heard)',stage:'Coaching stage (provisional)',note:'Only the reviewed dialogue is included; no audio recording.'},
  ru:{title:'Протокол коучинг-сессии',user:'Вы',coach:'AI-коуч',proposal:'Предложение ИИ (не подтверждено)',interrupted:'Ответ коуча был перебит (мог быть услышан не полностью)',stage:'Этап коучинга (предварительно)',note:'Только просмотренный диалог, без аудиозаписи.'},
  es:{title:'Protocolo de sesión de coaching',user:'Tú',coach:'Coach IA',proposal:'Sugerencia de IA sin confirmar',interrupted:'Respuesta interrumpida (quizá no se escuchó completa)',stage:'Etapa de coaching (provisional)',note:'Solo diálogo revisado, sin grabación de audio.'},
}
const COACH_OPENING_TITLES={en:['Invite','Name','Continuity','Focus','Feelings','Confirm'],ru:['Согласие','Имя','Тема','Фокус','Чувства','Подтверждение'],es:['Invitación','Nombre','Tema','Enfoque','Emociones','Confirmación']}
const methodInformationCopy={
  en:{heading:'Method-specific information · client statements, not verified',partial:'mentioned (not confirmed)',missing:'not yet clarified',unanswered:'No AI reply recorded — session ended before the response'},
  ru:{heading:'Информация по методике · слова клиента, не проверено',partial:'упомянуто (не подтверждено)',missing:'не выяснено',unanswered:'Ответ ИИ отсутствует — сессия завершилась до ответа'},
  es:{heading:'Información por método · palabras del cliente, sin verificar',partial:'mencionado (sin confirmar)',missing:'aún no aclarado',unanswered:'Sin respuesta de IA — sesión terminada antes de recibirla'},
}
export function myCoachProtocolPdfOptions(value,{locale}={}){
  const protocol=normalizeMyCoachProtocol(value)
  const lang=localeSet.has(locale)?locale:protocol.locale
  const t=words[lang]
  const methodCopy=methodInformationCopy[lang]
  // These are provisional verbatim client statements only. A PDF cannot
  // reconstruct verified Director signals, truth, or client confirmation.
  const clientClauses=coachInformationClientTurns(protocol.turns).flatMap(verbatimClientClauses)
  const methodCoverage=coachInformationCoverage({
    personaId:protocol.personaId,methodId:protocol.methodId,
    clientClauses,evidence:{}
  })
  const methodOverview=[
    methodCopy.heading+' · '+(methodNames[protocol.methodId]||protocol.methodId),
    ...(methodCoverage?.fields||[]).map(item=>
      item.label[lang]+': '+(item.quote?methodCopy.partial:methodCopy.missing)+
      (item.quote?' — “'+item.quote.slice(0,130)+'”':''))
  ].join('\n')
  const start=protocol.opening
  const openingOverview=start?[
    ({en:'Session opening (client-reviewed)',ru:'Начало сессии (проверено клиентом)',es:'Inicio de la sesión (revisado)'}[lang]),
    COACH_OPENING_TITLES[lang].map((label,index)=>label+': '+(start.done[index]?'✓':'—')).join(' · '),
    start.name?({en:'Preferred name: ',ru:'Имя: ',es:'Nombre: '}[lang]+start.name):'',
    start.continuity?({en:'Topic continuity: ',ru:'Тип темы: ',es:'Tipo de tema: '}[lang]+start.continuity):'',
    start.focus?({en:'Working format: ',ru:'Формат работы: ',es:'Enfoque: '}[lang]+start.focus):'',
    start.feelings?({en:'Client feelings: ',ru:'Чувства клиента: ',es:'Emociones: '}[lang]+start.feelings):''
  ].filter(Boolean).join('\n'):null
  const entries=[]
  let firstDialogueIndex=0
  if(protocol.turns[0]?.role==='assistant'){
    const greeting=protocol.turns[0]
    entries.push({question:'',answer:t.coach+': '+greeting.content,
      reflection:greeting.interrupted?t.interrupted:''})
    firstDialogueIndex=1
  }
  for(let index=firstDialogueIndex;index<protocol.turns.length;index+=2){
    const user=protocol.turns[index],coach=protocol.turns[index+1]
    if(!coach){
      entries.push({question:t.user+': '+user.content,answer:methodCopy.unanswered,reflection:''})
      continue
    }
    const meta=[
      coach.stage?t.stage+': '+coach.stage:'',
      coach.interrupted?t.interrupted:'',
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
    protocolOverview:[openingOverview,methodOverview].filter(Boolean).join('\n\n'),
    protocolNote:t.note,
  }
}
