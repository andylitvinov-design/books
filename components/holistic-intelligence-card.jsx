'use client'
import { useEffect, useRef, useState } from 'react'
import { appFetch } from '@/lib/app/client-fetch'
import styles from './holistic-intelligence-card.module.css'

const COPY = {
  en:{title:'Choose your next step',intro:'Choose a topic and answer two safety questions. Your profile and test results are not used.',topic:'What would you like to explore?',choose:'Choose a topic',goals:{money:'Money',energy:'Energy',relationships:'Relationships',goals:'Goals',meaning:'Meaning'},next:'Continue',danger:'Are you in immediate danger of harming yourself or someone else, or do you need urgent help now?',thoughts:'Are you having thoughts of hurting yourself or ending your life?',yes:'Yes',no:'No',unsure:'Not sure',help:'If you may be in danger, contact local emergency services or a qualified crisis service now. This service is not monitored in real time.',wait:'Finding a suggestion…',start:'Start',other:'Another option',change:'Change topic',unsuitable:'Not for me',helpful:'Was this useful?',useful:'Yes',notUseful:'No',skip:'Skip',thanks:'Thank you. Your feedback stays in this session.',audio:'Audio language',unavailable:'Suggestions are temporarily unavailable. Please try again.',privacy:'Your answers are not a clinical assessment and are not saved by this tool.'},
  ru:{title:'Выберите следующий шаг',intro:'Выберите тему и ответьте на два вопроса о безопасности. Профиль и результаты тестов не используются.',topic:'Что вам хотелось бы изучить?',choose:'Выберите тему',goals:{money:'Деньги',energy:'Энергия',relationships:'Отношения',goals:'Цели',meaning:'Смысл'},next:'Продолжить',danger:'Вам сейчас угрожает опасность причинить вред себе или другому человеку, или вам нужна срочная помощь?',thoughts:'Возникают ли у вас мысли причинить себе вред или покончить с жизнью?',yes:'Да',no:'Нет',unsure:'Не уверен(а)',help:'Если вам угрожает опасность, немедленно обратитесь в местную экстренную или кризисную службу. Этот сервис не отслеживается в реальном времени.',wait:'Подбираем рекомендацию…',start:'Начать',other:'Другой вариант',change:'Изменить тему',unsuitable:'Не подходит',helpful:'Это было полезно?',useful:'Да',notUseful:'Нет',skip:'Пропустить',thanks:'Спасибо. Ответ останется только в этом сеансе.',audio:'Язык аудио',unavailable:'Рекомендации временно недоступны. Попробуйте ещё раз.',privacy:'Ваши ответы не являются клинической оценкой и не сохраняются этим инструментом.'},
  es:{title:'Elige tu próximo paso',intro:'Elige un tema y responde dos preguntas de seguridad. No usamos tu perfil ni tus resultados.',topic:'¿Qué te gustaría explorar?',choose:'Elige un tema',goals:{money:'Dinero',energy:'Energía',relationships:'Relaciones',goals:'Metas',meaning:'Sentido'},next:'Continuar',danger:'¿Corres peligro inmediato de hacerte daño o de dañar a otra persona, o necesitas ayuda urgente ahora?',thoughts:'¿Tienes pensamientos de hacerte daño o de quitarte la vida?',yes:'Sí',no:'No',unsure:'No estoy seguro/a',help:'Si puedes estar en peligro, contacta ahora con los servicios locales de emergencia o de crisis. Este servicio no se supervisa en tiempo real.',wait:'Buscando una sugerencia…',start:'Empezar',other:'Otra opción',change:'Cambiar tema',unsuitable:'No es para mí',helpful:'¿Te resultó útil?',useful:'Sí',notUseful:'No',skip:'Omitir',thanks:'Gracias. Tu respuesta se queda solo en esta sesión.',audio:'Idioma del audio',unavailable:'Las sugerencias no están disponibles temporalmente. Inténtalo de nuevo.',privacy:'Tus respuestas no constituyen una evaluación clínica y esta herramienta no las guarda.'},
}
const LANGUAGES = {en:'English',ru:'Русский',es:'Español'}
const FOCUS = {en:'Your focus',ru:'Выбранная тема',es:'Tu tema'}
const SAVED = {en:'Use my saved coaching topic for this request',ru:'Использовать мою сохранённую тему коучинга для этого запроса',es:'Usar mi tema de coaching guardado para esta solicitud'}
const PROFILE_NOTE = {en:'Your profile is used only if you select your saved coaching topic; test results are not used.',ru:'Профиль используется только если вы выберете сохранённую тему коучинга; результаты тестов не используются.',es:'Tu perfil se usa solo si eliges tu tema de coaching guardado; no se usan resultados de tests.'}
const CHECKIN = {
  en:{before:'Optional: how calm do you feel right now, from 0 to 10?',after:'After trying the practice, how calm do you feel, from 0 to 10?',save:'Use this answer',change:'Change in your self-report',note:'This is a personal observation, not proof of a treatment effect.'},
  ru:{before:'Необязательно: насколько спокойно вы чувствуете себя сейчас, от 0 до 10?',after:'После практики насколько спокойно вы чувствуете себя, от 0 до 10?',save:'Использовать ответ',change:'Изменение вашей самооценки',note:'Это личное наблюдение, а не доказательство лечебного эффекта.'},
  es:{before:'Opcional: ¿cuánta calma sientes ahora, de 0 a 10?',after:'Después de la práctica, ¿cuánta calma sientes, de 0 a 10?',save:'Usar respuesta',change:'Cambio en tu autoevaluación',note:'Es una observación personal, no una prueba de efecto terapéutico.'},
}

/** @param {{locale?:string, surface?:string, accountId?:string, videos?:object[], publishedSourceIds?:string[], audioLanguage?:string}} props */
export function HolisticIntelligenceCard({ locale='en', surface='cabinet', accountId, videos, publishedSourceIds, audioLanguage }) {
  const lang=COPY[locale]?locale:'en', t=COPY[lang]
  const [step,setStep]=useState('topic'), [goal,setGoal]=useState(''), [first,setFirst]=useState('')
  const [answers,setAnswers]=useState(null), [result,setResult]=useState(null), [dismissed,setDismissed]=useState([])
  const [feedback,setFeedback]=useState(''), [started,setStarted]=useState(false), [busy,setBusy]=useState(false)
  const [baseline,setBaseline]=useState(null), [checkin,setCheckin]=useState(''), [followupDone,setFollowupDone]=useState(false), [comparison,setComparison]=useState(null)
  const generation=useRef(0)
  useEffect(()=>()=>{generation.current+=1},[])
  function edit(){generation.current+=1;setStep('topic');setFirst('');setAnswers(null);setResult(null);setFeedback('');setStarted(false);setBusy(false);setBaseline(null);setCheckin('');setFollowupDone(false);setComparison(null)}
  async function suggest(preflight,excluded=dismissed){
    const current=++generation.current
    setBusy(true);setFeedback('');setStarted(false)
    try {
      const body={requestId:globalThis.crypto.randomUUID(),surface,intent:{language:lang,audioLanguage:audioLanguage||lang,selectedTopics:goal==='saved'?[]:[goal],formats:['video']},preflight,session:{dismissedIds:excluded},...(goal==='saved'?{profileFocus:'confirmed_coaching_topic'}:{})}
      let output
      if(surface==='meditation'){
        const { planIntelligenceRequest }=await import('@/lib/holistic-support/intelligence-plan.mjs')
        output=await planIntelligenceRequest(body,{loadCatalog:async()=>({videos,publishedSourceIds})})
      }else output=await appFetch('intelligence/plan',body,'POST',{accountId})
      if(current===generation.current){setResult(output);setAnswers(preflight);setStep('result')}
    } catch {if(current===generation.current){setResult({status:'unavailable',explanation:t.unavailable});setStep('result')}}
    finally {if(current===generation.current)setBusy(false)}
  }
  function answerFirst(value){setFirst(value);if(value==='no')setStep('thoughts');else{setResult({status:'safety_handoff',explanation:t.help});setStep('result')}}
  function answerSecond(value){if(value!=='no'){setResult({status:'safety_handoff',explanation:t.help});setStep('result');return}setAnswers({immediateDanger:first,selfHarmThoughts:value});setStep('checkin')}
  function beforeCheckin(save){if(save)setBaseline({promptKey:'self_calm',value:Number(checkin),measuredAt:new Date().toISOString()});setCheckin('');void suggest(answers)}
  async function afterCheckin(save){
    try {if(save&&baseline){const {compareVoluntaryCheckins}=await import('@/lib/holistic-support/client-reasoning-core.mjs');setComparison(compareVoluntaryCheckins(baseline,{promptKey:'self_calm',value:Number(checkin),measuredAt:new Date().toISOString()}))}}
    catch {setComparison(null)}
    finally {setCheckin('');setFollowupDone(true)}
  }
  function another(){if(!answers||!result?.primary)return;const next=[...new Set([...dismissed,result.primary.id])].slice(-80);setDismissed(next);setBaseline(null);setCheckin('');setFollowupDone(false);setComparison(null);void suggest(answers,next)}
  const choices=handler=><div className={styles.actions}>{['yes','no','unsure'].map(value=><button key={value} type="button" onClick={()=>handler(value)}>{t[value]}</button>)}</div>
  return <section className={styles.root} aria-label={t.title} data-holistic-intelligence>
    <h3>{t.title}</h3><p>{surface==='cabinet'?PROFILE_NOTE[lang]:t.intro}</p>
    {step==='topic'&&<div className={styles.question}><label htmlFor={`hh-intelligence-topic-${surface}`}>{t.topic}</label><select id={`hh-intelligence-topic-${surface}`} value={goal} onChange={event=>{setGoal(event.target.value);setDismissed([])}}><option value="">{t.choose}</option>{Object.entries(t.goals).map(([key,label])=><option key={key} value={key}>{label}</option>)}{surface==='cabinet'&&<option value="saved">{SAVED[lang]}</option>}</select><button type="button" disabled={!goal} onClick={()=>setStep('danger')}>{t.next}</button></div>}
    {step==='danger'&&<div className={styles.question}><p>{t.danger}</p>{choices(answerFirst)}</div>}
    {step==='thoughts'&&!busy&&<div className={styles.question}><p>{t.thoughts}</p>{choices(answerSecond)}</div>}
    {step==='checkin'&&!busy&&<div className={styles.question}><label htmlFor={`hh-checkin-before-${surface}`}>{CHECKIN[lang].before}</label><input id={`hh-checkin-before-${surface}`} type="number" min="0" max="10" step="1" value={checkin} onChange={event=>setCheckin(event.target.value)}/><div className={styles.actions}><button type="button" disabled={checkin===''||!Number.isInteger(Number(checkin))||Number(checkin)<0||Number(checkin)>10} onClick={()=>beforeCheckin(true)}>{CHECKIN[lang].save}</button><button type="button" onClick={()=>beforeCheckin(false)}>{t.skip}</button></div></div>}
    {busy&&<p role="status">{t.wait}</p>}
    {step==='result'&&!busy&&result&&<div className={styles.result} role={result.status==='safety_handoff'?'alert':'status'}>
      {result.primary?<><small>{FOCUS[lang]}: {goal==='saved'?SAVED[lang]:t.goals[goal]}</small><strong>{result.primary.title}</strong><p>{result.explanation}</p><small>{t.audio}: {LANGUAGES[result.primary.audioLanguage]||result.primary.audioLanguage}</small>
        <div className={styles.actions}><a href={result.primary.href} target="_blank" rel="noopener noreferrer" onClick={()=>setStarted(true)}>{t.start}</a><button type="button" onClick={another}>{t.other}</button><button type="button" onClick={another}>{t.unsuitable}</button></div>
        {started&&baseline&&!followupDone&&<div className={styles.question}><label htmlFor={`hh-checkin-after-${surface}`}>{CHECKIN[lang].after}</label><input id={`hh-checkin-after-${surface}`} type="number" min="0" max="10" step="1" value={checkin} onChange={event=>setCheckin(event.target.value)}/><div className={styles.actions}><button type="button" disabled={checkin===''||!Number.isInteger(Number(checkin))||Number(checkin)<0||Number(checkin)>10} onClick={()=>void afterCheckin(true)}>{CHECKIN[lang].save}</button><button type="button" onClick={()=>void afterCheckin(false)}>{t.skip}</button></div></div>}
        {comparison&&<p>{CHECKIN[lang].change}: {comparison.change>0?'+':''}{comparison.change}. {CHECKIN[lang].note}</p>}
        {started&&(!baseline||followupDone)&&(!feedback?<div className={styles.feedback}><span>{t.helpful}</span>{['useful','notUseful','skip'].map(key=><button type="button" key={key} onClick={()=>key==='notUseful'?another():setFeedback(key)}>{t[key]}</button>)}</div>:feedback==='skip'?null:<p>{t.thanks}</p>)}
      </>:<p>{result.explanation||t.unavailable}</p>}
      {result.status!=='safety_handoff'&&<button type="button" onClick={edit}>{t.change}</button>}
    </div>}
    <small>{t.privacy}</small>
  </section>
}
