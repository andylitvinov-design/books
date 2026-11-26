/**
 * Voluntary baseline profile inside the existing My Coach conversation.
 * Scores are user-reported 0..10 observations, NOT psychometric test results.
 * No network calls, diagnosis, fabricated scores or automatic persistence.
 */
import {coachProtocolEvidenceVeto} from './coach-protocol-relevance.mjs'
export const COACH_PROFILE_VERSION = 'hh-coach-profile-intake-v1'
const L=(en,ru,es)=>Object.freeze({en,ru,es})
export const COACH_PROFILE_AXES=Object.freeze([
 {id:'anchor',name:L('Safety & support','Опора','Seguridad y apoyo'),detail:L('stability and feeling safe','устойчивость и безопасность','estabilidad y seguridad')},
 {id:'connection',name:L('Connection','Связь','Vínculo'),detail:L('closeness and support from people','близость и поддержка людей','cercanía y apoyo de personas')},
 {id:'freedom',name:L('Freedom','Свобода','Libertad'),detail:L('being yourself and making choices','быть собой и выбирать','ser tú y elegir')},
 {id:'agency',name:L('Agency','Сила','Capacidad de actuar'),detail:L('acting and achieving what matters','действовать и достигать важного','actuar y lograr lo importante')},
 {id:'love',name:L('Love','Любовь','Amor'),detail:L('loving and feeling loved','любить и чувствовать любовь','amar y sentirte querido')},
 {id:'dignity',name:L('Dignity','Достоинство','Dignidad'),detail:L('respect and self-worth','уважение и ценность себя','respeto y valor propio')},
 {id:'self-realization',name:L('Self-realization','Самореализация','Autorrealización'),detail:L('using and growing your potential','раскрытие своих возможностей','desarrollar tu potencial')},
 {id:'recognition',name:L('Recognition','Признание','Reconocimiento'),detail:L('feeling seen, valued and heard','быть замеченным, ценимым и услышанным','sentirte visto, valorado y escuchado')},
].map(axis=>Object.freeze(axis)))
const lang=value=>['en','ru','es'].includes(value)?value:'en'
const human=v=>String(typeof v==='string'?v:v?.content||'').trim().slice(0,300)
const skip=/^(?:skip|pass|rather not|prefer not|не знаю|пропуст|не хочу отвечать|затрудняюсь|omitir|paso|no sé|prefiero no)/iu

export function coachProfileScorePair(value){
 const quote=human(value)
 if(!quote)return null
 if(skip.test(quote))return Object.freeze({kind:'skipped',current:null,desired:null,quote})
 // Live speech often transcribes scores as words rather than numerals.
 // Use exact word boundaries (not substrings inside ordinary words).
 const words={
  zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,
  ноль:0,один:1,одна:1,два:2,две:2,три:3,четыре:4,пять:5,шесть:6,семь:7,восемь:8,девять:9,десять:10,
  cero:0,uno:1,una:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,
 }
 const wordKeys=Object.keys(words).sort((a,b)=>b.length-a.length)
 const pattern=new RegExp('(?<![\\p{L}\\p{N}])(?:10|[0-9]|'+wordKeys.join('|')+')(?![\\p{L}\\p{N}])','giu')
 const numbers=[...quote.matchAll(pattern)].map(match=>
  /^[0-9]+$/.test(match[0])?Number(match[0]):words[match[0].toLowerCase()])
 if(numbers.length!==2)return null
 // Do not read incidental ages, dates, counts, negative values or examples
 // as profile ratings. Accept a plain pair or explicitly labelled now/wanted.
 if(/(?:^|\s)[−-]\s*\d|\d[.,]\d|[#]/u.test(quote))return null
 const shape=quote.toLowerCase().replace(pattern,'#').replace(/[.!?]+$/u,'').trim()
 const plainPair=/^#\s*(?:[,;/→]|и|and|y|a|to|до|к|\s)\s*#$/u
 const labelled=/^(?:сейчас|на данный момент|текущая оценка|now|currently|current(?: score)?|ahora|actualmente|actual)\s*[:=]?\s*#(?:\s+(?:балл(?:а|ов)?|points?|puntos?))?\s*[,;–—-]?\s*(?:а\s+)?(?:хочу|хотел(?:а)? бы|хотелось бы|желаем(?:ая оценка|ое)|в идеале|want|i want|desired(?: score)?|ideally|would like|quiero|deseo|desead[oa]|me gustar[ií]a)\s*[:=]?\s*#(?:\s+(?:балл(?:а|ов)?|points?|puntos?))?$/u
 if(!plainPair.test(shape)&&!labelled.test(shape))return null
 return Object.freeze({kind:'rated',current:numbers[0],desired:numbers[1],quote})
}
export function coachProfileProgress({turns=[],locale='en'}={}){
 const language=lang(locale),ratings=[]
 let attempts=0
 for(const turn of Array.isArray(turns)?turns.slice(0,64):[]){
  if(ratings.length>=COACH_PROFILE_AXES.length)break
  if(typeof turn!=='string'&&turn?.role!=='user')continue
  const quote=human(turn)
  if(coachProtocolEvidenceVeto(quote)||/^(?:not sure|i don't know|не знаю|затрудняюсь|no sé)[.!]*$/iu.test(quote)){
   attempts++;continue
  }
  const item=coachProfileScorePair(turn)
  if(!item){attempts++;continue}
  ratings.push(Object.freeze({axis:COACH_PROFILE_AXES[ratings.length].id,...item}))
  attempts=0
 }
 const completed=ratings.length===COACH_PROFILE_AXES.length
 const axis=completed?null:COACH_PROFILE_AXES[ratings.length]
 return Object.freeze({
  version:COACH_PROFILE_VERSION,locale:language,completed,
  step:completed?COACH_PROFILE_AXES.length:ratings.length+1,total:COACH_PROFILE_AXES.length,
  current:completed?'complete':axis.id,
  axisTitle:axis?.name?.[language]||'',
  ratings:Object.freeze(ratings),attempts
 })
}
export function coachProfileNextReply(progress){
 const p=progress||coachProfileProgress(),locale=lang(p.locale)
 if(p.completed){
  const rank=p.ratings.filter(item=>item.kind==='rated')
   .map(item=>({...item,delta:item.desired-item.current}))
   .filter(item=>item.delta>0)
   .sort((a,b)=>b.delta-a.delta)
  const labels=rank.slice(0,3).map(item=>{
   const axis=COACH_PROFILE_AXES.find(axis=>axis.id===item.axis)
   const prefix=axis?.name?.[locale]||item.axis
   return prefix+' '+item.current+'→'+item.desired+' ('+(item.delta>0?'+':'')+item.delta+')'
  })
  const lead=L(
   'Your first profile check-in is complete. The three largest desired increases: ',
   'Первый профиль заполнен. Три наибольших желаемых изменения: ',
   'Tu primer perfil está completo. Los tres cambios deseados mayores: '
  )[locale]
  const empty=L('No positive increases were requested in the recorded ratings; that is fine.',
    'В отмеченных оценках нет запросов на увеличение — это нормально.',
    'No hay aumentos solicitados en las valoraciones registradas; está bien.')[locale]
  const end=L('The introductory profile is complete. Review and save your session protocol if you wish; for a goal or problem start a separate coaching session. Saving requires your approval.',
    'Вступительный профиль заполнен. При желании просмотрите и сохраните протокол; для работы с целью или проблемой начните отдельную коучинговую сессию. Сохранение — только с вашего согласия.',
    'Tu perfil inicial está completo. Revisa y guarda el protocolo si quieres; para una meta o dificultad inicia otra sesión. Solo se guarda con tu permiso.')[locale]
  return (labels.length?lead+labels.join('; ')+'. ':empty+' ')+end
 }
 const axis=COACH_PROFILE_AXES[p.step-1]
 const title=axis.name[locale],description=axis.detail[locale]
 const start=p.step===1?L(
  'You chose a personal profile. Eight brief areas, one at a time, with two self-ratings: now and desired. ',
  'Вы выбрали личный профиль. Восемь коротких сфер — по одной за раз, две оценки: сейчас и хотелось бы. ',
  'Elegiste tu perfil personal. Ocho áreas breves, una por vez, con dos valoraciones: ahora y deseado. '
 )[locale]:''
 const retry=p.attempts>0?L(
  'Please give two numbers from 0 to 10 (or say “skip”). ',
  'Назовите две цифры от 0 до 10 (или скажите «пропустить»). ',
  'Indica dos números de 0 a 10 (o di «omitir»). '
 )[locale]:''
 const q=L(
  'Area: '+title+' ('+description+'). From 0 to 10, where are you now and where would you like to be? For example: 3 and 8. You may skip.',
  'Сфера «'+title+'» ('+description+'). Оцените от 0 до 10: сколько сейчас и сколько хотелось бы? Например: 3 и 8. Можно пропустить.',
  'Área: '+title+' ('+description+'). Del 0 al 10, ¿dónde estás ahora y dónde te gustaría estar? Por ejemplo: 3 y 8. Puedes omitir.'
 )[locale]
 return start+retry+q
}
export function coachProfileProtocolSnapshot(progress){
 if(!progress||progress.version!==COACH_PROFILE_VERSION)return null
 return Object.freeze({version:COACH_PROFILE_VERSION,completed:progress.completed===true,
  ratings:progress.ratings.map(item=>Object.freeze({
   axis:item.axis,kind:item.kind,current:item.current,desired:item.desired,quote:item.quote
  }))})
}
