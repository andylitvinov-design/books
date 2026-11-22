import {COACH_PROFILE_AXES,coachProfileScorePair} from './coach-profile-intake.mjs'

/** Owner-reviewed profile archive + voluntary, incremental Session 0.
 * Only the authenticated private preview may supply baseline data. It is
 * NEVER a model instruction, test score, grant or permission to save.
 */
export const COACH_PROFILE_REVIEW_VERSION='hh-coach-profile-intake-v2'
const idSet=new Set(COACH_PROFILE_AXES.map(axis=>axis.id))
const valid=n=>Number.isInteger(n)&&n>=0&&n<=10
const locale=v=>['ru','en','es'].includes(v)?v:'en'
const clean=v=>typeof v==='string'?v.trim().slice(0,300):''
const skip=/^(skip|pass|rather not|prefer not|пропуст|не хочу отвечать|затрудняюсь|omitir|paso|prefiero no)/iu
const oneday=when=>typeof when==='string'&&Number.isFinite(Date.parse(when))?new Date(when).toISOString():null

export function coachProfileSingleScore(value){
 const spoken=clean(value)
 if(!spoken||spoken.length>95)return null
 const pair=coachProfileScorePair(spoken+' / '+spoken)
 return pair?.kind==='rated'&&pair.current===pair.desired?pair.current:null
}
export const coachProfileExplicitSkip=value=>skip.test(clean(value))

export function buildCoachProfileAudit(protocols,{exhaustive=true}={}){
 const sources=(Array.isArray(protocols)?protocols:[])
  .filter(p=>p?.provenance==='client_reviewed_dialogue'&&oneday(p.completedAt)&&
    p.profileCheckin&&Array.isArray(p.profileCheckin.ratings)&&
    ['hh-coach-profile-intake-v1',COACH_PROFILE_REVIEW_VERSION].includes(p.profileCheckin.version))
  .sort((a,b)=>Date.parse(b.completedAt)-Date.parse(a.completedAt))
 const store=new Map(COACH_PROFILE_AXES.map(axis=>[axis.id,{
  axis:axis.id,current:null,desired:null,updatedAt:null,skipped:false,
  currentDate:null,desiredDate:null,
 }]))
 for(const saved of sources){
  const date=oneday(saved.completedAt)
  for(const item of saved.profileCheckin.ratings){
   if(!item||!idSet.has(item.axis))continue
   const row=store.get(item.axis)
   // Saved protocol values remain client-reviewed; sparse newer updates may
   // update one half without erasing the other half from an older protocol.
   for(const field of ['current','desired']){
    if(row[field]===null&&valid(item[field])){
     row[field]=item[field]
     row[field+'Date']=date
    }
   }
   if(item.kind==='skipped'&&!row.skipped)row.skipped=true
  }
 }
 const axes=COACH_PROFILE_AXES.map(axis=>{
  const row=store.get(axis.id)
  const filled=valid(row.current)&&valid(row.desired)
  const partial=valid(row.current)!==valid(row.desired)
  const state=filled?'present':!exhaustive?'unavailable':
   partial?'partial':row.skipped?'skipped_by_client':'missing'
  const updatedAt=[row.currentDate,row.desiredDate].filter(Boolean).sort().at(-1)||null
  return Object.freeze({id:axis.id,current:row.current,desired:row.desired,
   status:state,updatedAt,source:'client_reviewed_dialogue'})
 })
 return Object.freeze({version:COACH_PROFILE_REVIEW_VERSION,status:'available',
  completeArchive:exhaustive===true,axes:Object.freeze(axes),
  summary:Object.freeze({present:axes.filter(a=>a.status==='present').length,
   partial:axes.filter(a=>a.status==='partial').length,
   missing:axes.filter(a=>a.status==='missing').length,
   skipped:axes.filter(a=>a.status==='skipped_by_client').length,
   unavailable:axes.filter(a=>a.status==='unavailable').length,
  })})
}

// The state machine only schedules genuinely empty halves, never inferred
// scores. Prior client-skipped axes are not re-asked automatically.
export function coachProfileReviewProgress({audit,turns=[],locale:requested='en'}={}){
 if(audit?.version!==COACH_PROFILE_REVIEW_VERSION||audit.status!=='available'||
    !Array.isArray(audit.axes)||audit.axes.length!==8||
    audit.axes.some(axis=>axis?.status==='unavailable'))return null
 const language=locale(requested)
 const saved=new Map()
 for(const axis of audit.axes){
  if(!axis||!idSet.has(axis.id)||saved.has(axis.id)||
      ![axis.current,axis.desired].every(x=>x===null||valid(x)))return null
  saved.set(axis.id,{axis:axis.id,current:axis.current,desired:axis.desired,
   skipped:axis.status==='skipped_by_client'})
 }
 if(saved.size!==8)return null
 const updates=[],answered=new Set()
 const next=()=>COACH_PROFILE_AXES.map(x=>saved.get(x.id)).find(x=>!answered.has(x.axis)&&
   !x.skipped&&(x.current===null||x.desired===null))
 let attempts=0
 for(const turn of (Array.isArray(turns)?turns:[]).slice(0,64)){
  if(typeof turn!=='string'&&turn?.role!=='user')continue
  const task=next()
  if(!task)break
  const quote=clean(typeof turn==='string'?turn:turn.content)
  if(!quote){attempts++;continue}
  if(coachProfileExplicitSkip(quote)){
   updates.push({axis:task.axis,kind:'skipped',current:null,desired:null,quote})
   answered.add(task.axis);task.skipped=true;attempts=0;continue
  }
  const pair=coachProfileScorePair(quote)
  let current=null,desired=null
  if(pair?.kind==='rated'){
   current=pair.current;desired=pair.desired
  }else{
   const number=coachProfileSingleScore(quote)
   if(number!==null){
    if(task.current===null&&task.desired!==null)current=number
    else if(task.desired===null&&task.current!==null)desired=number
   }
  }
  if(current===null&&desired===null){attempts++;continue}
  const kind=current!==null&&desired!==null?'rated':'partial'
  updates.push({axis:task.axis,kind,current,desired,quote})
  if(current!==null)task.current=current
  if(desired!==null)task.desired=desired
  if(task.current!==null&&task.desired!==null)answered.add(task.axis)
  attempts=0
 }
 const unfinished=next()
 const ratings=COACH_PROFILE_AXES.map(a=>{
  const x=saved.get(a.id),full=valid(x.current)&&valid(x.desired)
  const partial=valid(x.current)!==valid(x.desired)
  return Object.freeze({axis:a.id,current:x.current,desired:x.desired,
    kind:full?'rated':partial?'partial':x.skipped?'skipped':'missing'})
 })
 const completed=ratings.every(x=>x.kind==='rated')
 const finished=!unfinished
 const step=unfinished?COACH_PROFILE_AXES.findIndex(a=>a.id===unfinished.axis)+1:8
 return Object.freeze({version:COACH_PROFILE_REVIEW_VERSION,locale:language,
  completed,finished,step,total:8,current:unfinished?.axis||'complete',
  axisTitle:unfinished?.axis?COACH_PROFILE_AXES.find(x=>x.id===unfinished.axis)?.name[language]||'':'',
  neededFields:unfinished?['current','desired'].filter(k=>unfinished[k]===null):[],
  attempts,ratings:Object.freeze(ratings),updates:Object.freeze(updates),
  savedCount:audit.summary?.present??0,
  missingCount:ratings.filter(r=>r.kind==='missing'||r.kind==='partial').length})
}

const say=(en,ru,es,l)=>({en,ru,es})[l]
export function coachProfileReviewNextReply(progress,{goals=null,measurements=null}={}){
 const p=progress,l=locale(p?.locale)
 if(!p)return say('Saved profile is not available. You may allow access in Coach memory or continue without it.',
  'Сохранённый профиль пока недоступен. Разрешите просмотр в разделе «Память коуча» или продолжите без него.',
  'El perfil guardado no está disponible. Autoriza su revisión o continúa sin él.',l)
 if(p.finished){
  const done=say('The profile review is complete. ','Проверка профиля завершена. ','La revisión del perfil está terminada. ',l)
  const edits=say('Updated axes: ','Обновлено осей: ','Ejes actualizados: ',l)+
   new Set(p.updates.filter(x=>x.kind!=='skipped').map(x=>x.axis)).size+'. '
  const goalNote=goals?.status==='available'&&goals.missingOutcome>0?
   say('Some saved goals still need their desired result. ', 'Некоторым сохранённым целям не хватает желаемого результата. ',
    'Algunas metas guardadas necesitan un resultado deseado. ',l):''
  return done+edits+goalNote+say(
   'Would you like to review goals, see available measurements, or save this session protocol?',
   'Хотите уточнить цели, посмотреть доступные измерения или сохранить протокол сессии?',
   '¿Quieres revisar metas, ver mediciones o guardar el protocolo?',l)
 }
 const axis=COACH_PROFILE_AXES.find(x=>x.id===p.current)
 const title=axis?.name[l]||''
 const intro=p.updates.length===0?say(
  'I checked the saved profile you authorized. Already complete: '+p.savedCount+' of 8 axes. ',
  'Проверил разрешённый сохранённый профиль. Полностью заполнено '+p.savedCount+' из 8 осей. ',
  'Revisé el perfil autorizado. Hay '+p.savedCount+' de 8 ejes completos. ',l):''
 const follow=p.attempts>0?say('Please give a number from 0 to 10, or say skip. ',
  'Укажите число от 0 до 10 или скажите «пропустить». ',
  'Indica un número de 0 a 10 o di omitir. ',l):''
 const single=p.neededFields.length===1
 const which=p.neededFields[0]
 const question=single?
  (which==='current'?say('How much '+title+' do you feel now, from 0 to 10?',
    'Сколько сейчас в вашей жизни «'+title+'», от 0 до 10?',
    '¿Cuánto tienes ahora de '+title+', de 0 a 10?',l):
   say('How much '+title+' would you like, from 0 to 10?',
    'А сколько «'+title+'» хотелось бы, от 0 до 10?',
    '¿Cuánto de '+title+' desearías, de 0 a 10?',l)):
  say('For '+title+', please give two numbers: how much now and how much desired? For example, 3 and 8.',
   'По оси «'+title+'» назовите два числа: сколько сейчас и сколько хотелось бы? Например, 3 и 8.',
   'Para '+title+', di dos números: cuánto hay ahora y cuánto desearías. Por ejemplo, 3 y 8.',l)
 return intro+follow+question
}

export function coachProfileReviewProtocolSnapshot(progress){
 if(progress?.version!==COACH_PROFILE_REVIEW_VERSION)return null
 return Object.freeze({version:COACH_PROFILE_REVIEW_VERSION,completed:false,
  ratings:progress.updates.map(x=>Object.freeze({axis:x.axis,kind:x.kind,
    current:x.current,desired:x.desired,quote:x.quote}))})
}
