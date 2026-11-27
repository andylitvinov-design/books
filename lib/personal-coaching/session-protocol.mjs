import {clarityCourseDay,clarityHomeworkEligible} from '../coaching/clarity-course.mjs'
// My Coach protocol: consented, bounded, client-reviewed dialogue only.
import {coachInformationClientTurns} from '../coaching/coach-information-checklist.mjs'
import {coachInformationCoverage,COACH_INFORMATION_PERSONA_METHODS,COACH_INFORMATION_METHOD_IDS} from '../coaching/coach-information-coverage.mjs'
import {verbatimClientClauses} from '../coaching/coach-ephemeral-context.mjs'
import {getCoachPersona,PUBLIC_COACH_PERSONA_IDS} from '../coaching/persona-registry.mjs'
import {normalizeCoachCourseSessionId,coachCourseFocusLabel} from '../coaching/coach-course-journey.mjs'
import {coachCourseProtocolOverview,normalizeCoachCourseFieldReview} from '../coaching/coach-course-protocol-schema.mjs'
import {goalReviewedResult} from '../coaching/goal-reviewed-results.mjs'
import {coachProfileArchiveEnvelope} from '../coaching/coach-profile-archive-v3.mjs'
import {coachSavedProfileV3Text} from '../coaching/coach-profile-report-v3.mjs'
import {COACH_PROFILE_AXES,COACH_PROFILE_VERSION,coachProfileScorePair} from '../coaching/coach-profile-intake.mjs'
import {COACH_PROFILE_REVIEW_VERSION,coachProfileSingleScore,coachProfileExplicitSkip} from '../coaching/coach-profile-review.mjs'
// This is not a clinical record and no AI suggestion is automatically an action.
import {coachTranscriptQualityFields} from './protocol-quality.mjs'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const localeSet=new Set(['en','ru','es'])
const personaSet=new Set(['mira','max','sofia','alex','merlin','harry','genie','caesar','lea','noah','iris','ray'])
const modeSet=new Set(['ai','offline','wisdom','safety','boundary'])
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
const openingKeys=new Set(['version','completed','declined','name','continuity','focus',
  'feelings','invitationQuote','confirmedQuote','checkmarks'])
const openingSteps=['invitation','name','continuity','focus','feelings','confirmation']
function normalizeOpeningSnapshot(v){
  if(!plain(v)||Object.keys(v).some(k=>!openingKeys.has(k))||
     v.version!=='hh-coach-opening-v1-20261122'||
     typeof v.completed!=='boolean'||typeof v.declined!=='boolean'||
     !plain(v.checkmarks)||Object.keys(v.checkmarks).length!==6||
     openingSteps.some(k=>typeof v.checkmarks[k]!=='boolean')||
     (v.completed&&openingSteps.some(k=>!v.checkmarks[k]))||
     (v.completed&&v.declined))
    throw Error('MY_COACH_PROTOCOL_INVALID')
  const name=clip(v.name||'',60),continuity=clip(v.continuity||'',24),
    focus=clip(v.focus||'',24),feelings=clip(v.feelings||'',300),
    invitationQuote=clip(v.invitationQuote||'',300),
    confirmedQuote=clip(v.confirmedQuote||'',300)
  if(!['','new','previous'].includes(continuity)||
    !['','challenge','goal','profile','self_exploration','deferred'].includes(focus))
    throw Error('MY_COACH_PROTOCOL_INVALID')
  return {version:v.version,completed:v.completed,declined:v.declined,
    name,continuity,focus,feelings,invitationQuote,confirmedQuote,
    checkmarks:Object.fromEntries(openingSteps.map(k=>[k,v.checkmarks[k]]))}
}
// Eight client-selected observations can be archived only with the already
// established session-review and explicit save consent. The server validates
// every value and verifies the quotation appears in the client-side dialogue.
function normalizeProfileCheckin(value,turns){
  // Each assessment must cite a distinct actual client utterance, in order.
  // Repeated identical scores are valid only when the client said them again.
  let quoteCursor=0
  const consumeClientQuote=quote=>{
    const index=turns.findIndex((turn,i)=>i>=quoteCursor&&turn.role==='user'&&turn.unanswered!==true&&turn.content.trim().slice(0,300)===quote)
    if(index<0)return false
    quoteCursor=index+1;return true
  }
  if(plain(value)&&value.version===COACH_PROFILE_REVIEW_VERSION){
    // Only this session's sparse updates. Old saved quotations cannot be
    // replayed as if the client spoke them again.
    if(value.completed!==false||!Array.isArray(value.ratings)||
       value.ratings.length>COACH_PROFILE_AXES.length||
       Object.keys(value).some(k=>!['version','completed','ratings'].includes(k)))
      throw Error('MY_COACH_PROTOCOL_INVALID')
    const seen=new Set()
    const allowed=new Set(COACH_PROFILE_AXES.map(a=>a.id))
    const ratings=value.ratings.map(row=>{
      if(!plain(row)||!allowed.has(row.axis)||seen.has(row.axis)||
         !['rated','partial','skipped'].includes(row.kind)||
         Object.keys(row).some(k=>!['axis','kind','current','desired','quote'].includes(k)))
        throw Error('MY_COACH_PROTOCOL_INVALID')
      seen.add(row.axis)
      const quote=clip(row.quote,300)
      if(!quote||!consumeClientQuote(quote))
        throw Error('MY_COACH_PROTOCOL_INVALID')
      const valid=n=>Number.isInteger(n)&&n>=0&&n<=10
      if(row.kind==='rated'){
        const pair=coachProfileScorePair(quote)
        if(!valid(row.current)||!valid(row.desired)||
           pair?.kind!=='rated'||pair.current!==row.current||pair.desired!==row.desired)
          throw Error('MY_COACH_PROTOCOL_INVALID')
      }else if(row.kind==='partial'){
        const one=coachProfileSingleScore(quote)
        if(valid(row.current)===valid(row.desired)||
           (row.current!==null&&!valid(row.current))||
           (row.desired!==null&&!valid(row.desired))||
           one===null||(row.current??row.desired)!==one)
          throw Error('MY_COACH_PROTOCOL_INVALID')
      }else if(row.current!==null||row.desired!==null||!coachProfileExplicitSkip(quote))
        throw Error('MY_COACH_PROTOCOL_INVALID')
      return {axis:row.axis,kind:row.kind,current:row.current,desired:row.desired,quote}
    })
    return {version:COACH_PROFILE_REVIEW_VERSION,completed:false,ratings}
  }
  if(!plain(value)||value.version!==COACH_PROFILE_VERSION||
     typeof value.completed!=='boolean'||!Array.isArray(value.ratings)||
     value.ratings.length>COACH_PROFILE_AXES.length||
     Object.keys(value).some(key=>!['version','completed','ratings'].includes(key))||
     value.completed!==(value.ratings.length===COACH_PROFILE_AXES.length))
    throw Error('MY_COACH_PROTOCOL_INVALID')
  const ratings=value.ratings.map((item,index)=>{
    if(!plain(item)||item.axis!==COACH_PROFILE_AXES[index].id||
       !['rated','skipped'].includes(item.kind)||
       Object.keys(item).some(key=>!['axis','kind','current','desired','quote'].includes(key)))
      throw Error('MY_COACH_PROTOCOL_INVALID')
    const quote=clip(item.quote,300)
    if(!quote||!consumeClientQuote(quote))
      throw Error('MY_COACH_PROTOCOL_INVALID')
    const spoken=coachProfileScorePair(quote)
    if(item.kind==='rated'&&
       (![item.current,item.desired].every(n=>Number.isInteger(n)&&n>=0&&n<=10)||
        spoken?.kind!=='rated'||spoken.current!==item.current||spoken.desired!==item.desired)||
       item.kind==='skipped'&&(item.current!==null||item.desired!==null||spoken?.kind!=='skipped'))
      throw Error('MY_COACH_PROTOCOL_INVALID')
    return {axis:item.axis,kind:item.kind,current:item.current,desired:item.desired,quote}
  })
  return {version:value.version,completed:value.completed,ratings}
}
export const MY_COACH_PROTOCOL_MAX_TURNS=512
export const MY_COACH_PROTOCOL_MAX_CHARS=240000
export const MY_COACH_PROTOCOL_MAX_TURN_CHARS=32000
// Archive limits are independent of model context limits. JSON UTF-8 is bounded
// separately at the two owner-only endpoints.

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
    (value.turnLayout!==undefined&&value.turnLayout!=='chronological')||
    (value.turnLayout!=='chronological'&&value.turns.length%2!==0&&value.turns.at(-1)?.unanswered!==true))
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
  const chronological=value.turnLayout==='chronological'
  let chars=0
  const turns=value.turns.map((item,index)=>{
    const role=chronological?item?.role:index%2===0?'user':'assistant'
    if(!plain(item)||!['user','assistant'].includes(role)||item.role!==role)throw Error('MY_COACH_PROTOCOL_INVALID')
    const content=clip(item.content,MY_COACH_PROTOCOL_MAX_TURN_CHARS)
    if(!content)throw Error('MY_COACH_PROTOCOL_INVALID')
    chars+=content.length
    const clean={role,content,...coachTranscriptQualityFields(item)}
    if(item.visitId!==undefined||item.authorPersonaId!==undefined||role==='user'&&item.coachId!==undefined){
      if(!clarityCourseDay(value.courseSessionId)||!PUBLIC_COACH_PERSONA_IDS.includes(item.coachId)||!uuid.test(item.visitId||'')||
        (role==='assistant'&&item.authorPersonaId!==item.coachId)||(role==='user'&&item.authorPersonaId!==undefined))throw Error('MY_COACH_PROTOCOL_INVALID')
      clean.coachId=item.coachId;clean.visitId=item.visitId
      if(role==='assistant')clean.authorPersonaId=item.coachId
    }
    if(role==='user'){
      if(item.unanswered===true){
        if(!chronological&&index!==value.turns.length-1)throw Error('MY_COACH_PROTOCOL_INVALID')
        clean.unanswered=true
      }else if(item.unanswered!==undefined)throw Error('MY_COACH_PROTOCOL_INVALID')
      if(chronological&&index===value.turns.length-1)clean.unanswered=true
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
  const courseFieldReview=normalizeCoachCourseFieldReview(value.courseFieldReview,value.courseSessionId,turns)
  let structured
  try{structured=coachProfileArchiveEnvelope({...value,turns})}
  catch{throw Error('MY_COACH_PROTOCOL_INVALID')}
  return {
    version:1,id:value.id,personaId:value.personaId,methodId,locale:value.locale,
    ...(value.courseSessionId!==undefined?{courseSessionId:normalizeCoachCourseSessionId(value.courseSessionId)}:{}),
    ...(chronological?{turnLayout:'chronological'}:{}),
    startedAt,completedAt,durationSeconds,
    ...(clarityCourseDay(value.courseSessionId)&&value.clarityTimeLimitReached===true?{clarityTimeLimitReached:true}:{}),
    ...(value.clarityHomeworkAccepted===true&&clarityHomeworkEligible({...value,turns})?{clarityHomeworkAccepted:true}:{}),
    goal:clip(value.goal||'',180),
    clientSummary:clip(value.clientSummary||'',1000),
    clientNextStep:clip(value.clientNextStep||'',500),
    turns,
    ...(value.opening!==undefined?{opening:normalizeOpeningSnapshot(value.opening)}:{}),
    ...(value.profileCheckin!==undefined?{profileCheckin:normalizeProfileCheckin(value.profileCheckin,turns)}:{}),
    ...(structured?{[structured.key]:structured.value}:{}),
    ...(courseFieldReview?{courseFieldReview}:{}),
    provenance:'client_reviewed_dialogue',
  }
}

const words={
  en:{title:'Coaching session protocol',user:'You',coach:'AI coach',proposal:'Unconfirmed AI suggestion',interrupted:'Coach response interrupted (may not have been fully heard)',stage:'Coaching stage (provisional)',note:'Only the reviewed dialogue is included; no audio recording.'},
  ru:{title:'Протокол коучинг-сессии',user:'Вы',coach:'AI-коуч',proposal:'Предложение ИИ (не подтверждено)',interrupted:'Ответ коуча был перебит (мог быть услышан не полностью)',stage:'Этап коучинга (предварительно)',note:'Только просмотренный диалог, без аудиозаписи.'},
  es:{title:'Protocolo de sesión de coaching',user:'Tú',coach:'Coach IA',proposal:'Sugerencia de IA sin confirmar',interrupted:'Respuesta interrumpida (quizá no se escuchó completa)',stage:'Etapa de coaching (provisional)',note:'Solo diálogo revisado, sin grabación de audio.'},
}
const methodInformationCopy={
  en:{heading:'Method-specific information · client statements, not verified',partial:'mentioned (not confirmed)',missing:'not yet clarified',unanswered:'No AI reply recorded for this utterance'},
  ru:{heading:'Информация по методике · слова клиента, не проверено',partial:'упомянуто (не подтверждено)',missing:'не выяснено',unanswered:'Ответ ИИ отсутствует для этой реплики'},
  es:{heading:'Información por método · palabras del cliente, sin verificar',partial:'mencionado (sin confirmar)',missing:'aún no aclarado',unanswered:'Sin respuesta de IA registrada para esta intervención'},
}
// Session 0's seven approved content blocks. This is a conservative read-only
// projection of legacy evidence, not a server-issued question ledger. In
// particular, profileCheckin v1/v2 belongs to INNER axes, never the outer wheel.
const introductoryProtocolLabels={
 en:{sections:['Personal Information','Current Situation','Emotional State','Personal Profile','Goals & Motivation','Obstacles & Resources','Conclusions & Next Steps'],pending:'Not explored / not recorded',provisional:'Needs confirmation',name:'Preferred name',language:'Language',feelings:'Client words',wheel:'Wheel of Life: no verified outer ratings in this record',summary:'Client takeaway',next:'Client next step',focus:'Selected focus'},
 ru:{sections:['Личная информация','Текущая ситуация','Эмоциональное состояние','Личный профиль','Цели и мотивация','Препятствия и ресурсы','Выводы и следующие шаги'],pending:'Не исследовано / не зафиксировано',provisional:'Требует уточнения',name:'Предпочитаемое имя',language:'Язык',feelings:'Слова клиента',wheel:'Колесо жизненного баланса: подтверждённые внешние оценки в этой записи отсутствуют',summary:'Итог клиента',next:'Следующий шаг клиента',focus:'Выбранный фокус'},
 es:{sections:['Información personal','Situación actual','Estado emocional','Perfil personal','Objetivos y motivación','Obstáculos y recursos','Conclusiones y próximos pasos'],pending:'Sin explorar / sin registrar',provisional:'Requiere confirmación',name:'Nombre preferido',language:'Idioma',feelings:'Palabras del cliente',wheel:'Rueda de la vida: no hay valoraciones externas verificadas en este registro',summary:'Conclusión del cliente',next:'Próximo paso del cliente',focus:'Foco elegido'}
}
function introductoryOverview(protocol,lang,coverage){
 if(protocol.courseSessionId!=='introductory')return null
 const t=introductoryProtocolLabels[lang],o=protocol.opening
 const provisional=(label,value)=>value?label+': '+value+' ('+t.provisional+')':null
 const rows=ids=>(coverage?.fields||[]).filter(x=>ids.includes(x.id)&&x.quote)
   .map(x=>provisional(x.label[lang],x.quote))
 const sections=[
   [provisional(t.name,o?.name),t.language+': '+protocol.locale.toUpperCase()],
   [provisional(t.focus,o?.focus),...rows(['topic','situation'])],
   [provisional(t.feelings,o?.feelings)],
   [coachSavedProfileV3Text(protocol,lang)||t.wheel],
   rows(['goal','motivation','wish','outcome','future','dream','values']),
   rows(['obstacles','obstacle','resources','strengths','know_how','exceptions']),
   [protocol.clientSummary?t.summary+': '+protocol.clientSummary:null,protocol.clientNextStep?t.next+': '+protocol.clientNextStep:null]
 ]
 return sections.map((values,index)=>t.sections[index]+'\n'+(values.filter(Boolean).join('\n')||t.pending)).join('\n\n')
}

export function myCoachProtocolPdfOptions(value,{locale,documentKind='combined'}={}){
  if(!['combined','protocol','transcript','results'].includes(documentKind))throw Error('MY_COACH_PROTOCOL_INVALID')
  const protocol=normalizeMyCoachProtocol(value)
  const lang=localeSet.has(locale)?locale:protocol.locale
  if(documentKind==='results'){
    const result=goalReviewedResult(protocol,lang)
    if(!result)throw Error('MY_COACH_PROTOCOL_INVALID')
    return {locale:lang,slug:'my-coach-goal-results-'+protocol.courseSessionId,entryKind:'protocol',title:result.title,sessionDate:protocol.completedAt,topic:'',clientQuestion:'',actionPlan:'',entries:[],clientReflection:'',clientNextStep:'',protocolOverview:result.overview,protocolNote:result.note}
  }
  const t=words[lang]
  const methodCopy=methodInformationCopy[lang]
  // These are provisional verbatim client statements only. A PDF cannot
  // reconstruct verified Director signals, truth, or client confirmation.
  const clientClauses=coachInformationClientTurns(protocol.turns).flatMap(verbatimClientClauses)
  const methodCoverage=coachInformationCoverage({
    personaId:protocol.personaId,methodId:protocol.methodId,
    clientClauses,evidence:{}
  })
  const startCopy={
    en:'Opening · invitation, name, continuity, focus, feelings, confirmation',
    ru:'Начало · приглашение, имя, продолжение, фокус, чувства, подтверждение',
    es:'Inicio · invitación, nombre, continuidad, foco, emociones, confirmación'
  }[lang]
  const openingOverview=protocol.opening?[
    startCopy,
    ...(protocol.opening.name?['Name: '+protocol.opening.name]:[]),
    ...(protocol.opening.continuity?['Continuity: '+protocol.opening.continuity]:[]),
    ...(protocol.opening.focus?['Focus: '+protocol.opening.focus]:[]),
    ...(protocol.opening.feelings?['Feelings (client words): '+protocol.opening.feelings]:[]),
    'Steps: '+openingSteps.map((key,index)=>
      (index+1)+'. '+key+' '+(protocol.opening.checkmarks[key]?'✓':'–')).join(' · '),
  ].join('\n'):null
  const reviewProfile=protocol.profileCheckin?.version===COACH_PROFILE_REVIEW_VERSION
  const profileOverview=protocol.profileCheckin?[
    (reviewProfile?{ru:'Профиль · уточнения этой сессии',en:'Profile · updates this session',
      es:'Perfil · cambios en esta sesión'}[lang]:
      {ru:'Профиль · личные оценки сейчас / хотелось бы',en:'Profile · self-ratings now / desired',
        es:'Perfil · valoraciones ahora / deseado'}[lang])+
      ' · '+protocol.profileCheckin.ratings.length+(reviewProfile?'':('/'+COACH_PROFILE_AXES.length)),
    ...protocol.profileCheckin.ratings.map((rating,index)=>{
      const title=(reviewProfile?COACH_PROFILE_AXES.find(x=>x.id===rating.axis):
        COACH_PROFILE_AXES[index])?.name[lang]||rating.axis
      return title+': '+(rating.kind==='skipped'?
        {ru:'пропущено',en:'skipped',es:'omitido'}[lang]:
        (rating.current===null?'—':rating.current)+' → '+
        (rating.desired===null?'—':rating.desired)+
        (rating.kind==='rated'?' (Δ '+(rating.desired-rating.current)+')':''))
    })
  ].join('\n'):null
  const methodOverview=[
    methodCopy.heading+' · '+(methodNames[protocol.methodId]||protocol.methodId),
    ...(methodCoverage?.fields||[]).map(item=>
      item.label[lang]+': '+(item.quote?methodCopy.partial:methodCopy.missing)+
      (item.quote?' — “'+item.quote.slice(0,130)+'”':''))
  ].join('\n')
  const entries=[]
  if(protocol.turnLayout==='chronological'){
    for(const turn of protocol.turns){
      if(turn.role==='user')entries.push({question:t.user+': '+turn.content,answer:turn.unanswered?methodCopy.unanswered:'',reflection:''})
      else entries.push({question:'',answer:(turn.authorPersonaId?t.coach+' ('+turn.authorPersonaId+')':t.coach)+': '+turn.content,reflection:[turn.stage?t.stage+': '+turn.stage:'',turn.interrupted?t.interrupted:'',turn.suggestion?t.proposal+': '+turn.suggestion:''].filter(Boolean).join('\n')})
    }
  }else for(let index=0;index<protocol.turns.length;index+=2){
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
    entries.push({question:t.user+': '+user.content,answer:(coach.authorPersonaId?t.coach+' ('+coach.authorPersonaId+')':t.coach)+': '+coach.content,reflection:meta})
  }
  const courseOverview=protocol.courseSessionId?coachCourseProtocolOverview(protocol.courseSessionId,coachCourseFocusLabel(protocol.courseSessionId,lang),lang,protocol.turns,protocol.courseFieldReview):''
  const transcriptOnly=documentKind==='transcript',protocolOnly=documentKind==='protocol'
  const exportCopy={en:{transcript:'Conversation transcript',protocolNote:'Session checkpoints and provisional client statements, not a full transcript. No audio.'},ru:{transcript:'Стенограмма разговора',protocolNote:'Контрольные пункты и предварительные слова клиента, без полной стенограммы и аудиозаписи.'},es:{transcript:'Transcripción de la conversación',protocolNote:'Puntos de la sesión y declaraciones provisionales, sin transcripción completa ni audio.'}}[lang]
  return {
    locale:lang,slug:'my-coach-'+protocol.personaId+(transcriptOnly?'-transcript':protocolOnly?'-protocol':''),entryKind:protocolOnly?'protocol':'dialogue',
    title:(transcriptOnly?exportCopy.transcript:t.title)+' · '+protocol.personaId,
    sessionDate:protocol.completedAt,topic:transcriptOnly?'':protocol.goal,
    clientQuestion:'',actionPlan:'',entries:protocolOnly?[]:entries,
    clientReflection:transcriptOnly?'':protocol.clientSummary,
    clientNextStep:transcriptOnly?'':protocol.clientNextStep,
    protocolOverview:transcriptOnly?'':[introductoryOverview(protocol,lang,methodCoverage),courseOverview,openingOverview,profileOverview,protocol.courseSessionId==='introductory'?'':coachSavedProfileV3Text(protocol,lang),methodOverview].filter(Boolean).join('\n\n'),
    protocolNote:protocolOnly?exportCopy.protocolNote:t.note,
  }
}
