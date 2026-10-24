'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, ClipboardCopy, Clock3, Compass, LockKeyhole, Sparkles, UserRound } from 'lucide-react'
import { recommendCoachingForQuestion } from '@/lib/personal-coaching/model-matcher'
import styles from './public-coaching-discovery.module.css'

const copy={
  en:{
    eyebrow:'HOLISTIC HOUSE · IDEAS & COACHING',title:'Find your coaching session',
    lead:'Choose a self-guided method for free, or request a personal session with Andrey.',
    question:'What would you like to explore?',placeholder:'A goal, decision, relationship or challenge (optional)',
    privateQuestion:'Your question is matched only in this browser. It is not sent to AI, analytics or a coach.',
    format:'Session format',self:'Self-guided · free',human:'With a coach',filters:'Find a model',
    topic:'Topic',allTopics:'All topics',duration:'Time available',anyTime:'Any duration',
    style:'Approach',allStyles:'Any approach',quick:'Focused',reflective:'In-depth',
    models:'Choose a model',all:'All published coaching models',recommended:'Suggested for your question',
    noExact:'No specific match found. You can choose any model below.',
    empty:'No models match these filters. Try a different topic or duration.',
    unavailable:'Coaching models are temporarily unavailable. You can still request a personal session.',
    free:'Free',minutes:'min',start:'Start this free session',result:'What you will work toward',
    recommendedLabel:'Suggested',different:'Other options',about:'About this approach',
    humanTitle:'Personal coaching with Andrey',humanText:'Live, individual coaching or therapeutic conversation, online. Choose the duration and send a request.',
    half:'30-minute session',hour:'60-minute session',request:'Request this session',
    notBooking:'A request is not a confirmed booking or payment. The coach must accept and arrange the session.',
    safe:'Self-coaching is educational reflection, not psychotherapy, medical care or an AI conversation.',
    alert:'If you face an immediate safety concern, seek qualified human or emergency support instead of self-coaching.',
    back:'All models',stage:'QUESTION',of:'OF',yourQuestion:'Your question',choices:'Choose an answer',
    ownAnswer:'Or write your answer (optional)',answerPlaceholder:'Your own words…',
    next:'Next question',finish:'Finish session',previous:'Previous',required:'Choose or write an answer.',
    plan:'For WOOP, write your own specific if–then plan (at least 10 characters).',
    completed:'Session complete',summary:'Your reflection',nextStep:'Your last step',copy:'Copy my summary',
    copied:'Copied',copyFallback:'Select and copy your notes below.',
    restart:'Choose another model',memory:'This free session stays in this tab only. Nothing is saved to an account or sent to a coach.',
    discard:'Leave this session? Your unsaved answers will be lost.',noAnswer:'Skipped',
  },
  ru:{
    eyebrow:'HOLISTIC HOUSE · ИДЕИ И КОУЧИНГ',title:'Выберите свою коуч-сессию',
    lead:'Пройдите самостоятельную модель бесплатно или запросите личную сессию с Андреем.',
    question:'Какой вопрос хотите разобрать?',placeholder:'Цель, решение, отношения или сложность (необязательно)',
    privateQuestion:'Подбор по вопросу выполняется в браузере. Текст не отправляется в ИИ, аналитику или коучу.',
    format:'Формат сессии',self:'Самостоятельно · бесплатно',human:'С коучем',filters:'Подобрать модель',
    topic:'Тема',allTopics:'Все темы',duration:'Время',anyTime:'Любая длительность',
    style:'Стиль',allStyles:'Любой подход',quick:'Короткая',reflective:'Глубокая',
    models:'Выберите модель',all:'Все опубликованные модели',recommended:'Рекомендуем по вашему вопросу',
    noExact:'Точного совпадения нет. Выберите подходящую модель самостоятельно.',
    empty:'Нет моделей с такими фильтрами. Измените тему или длительность.',
    unavailable:'Каталог моделей временно недоступен. Можно запросить личную сессию.',
    free:'Бесплатно',minutes:'мин',start:'Начать бесплатную сессию',result:'Результат практики',
    recommendedLabel:'Подходит по запросу',different:'Другие модели',about:'Об этом подходе',
    humanTitle:'Личный коучинг с Андреем',humanText:'Индивидуальная коучинговая или терапевтическая беседа онлайн. Выберите длительность и отправьте запрос.',
    half:'Сессия 30 минут',hour:'Сессия 60 минут',request:'Запросить сессию',
    notBooking:'Запрос не является подтверждённой записью или оплатой. Специалист согласует условия и время.',
    safe:'Самостоятельный коучинг — практика размышления, не психотерапия, медпомощь или чат с ИИ.',
    alert:'При непосредственной угрозе безопасности обратитесь за квалифицированной или экстренной помощью.',
    back:'Все модели',stage:'ВОПРОС',of:'ИЗ',yourQuestion:'Ваш вопрос',choices:'Выберите ответ',
    ownAnswer:'Или напишите свой ответ (необязательно)',answerPlaceholder:'Вашими словами…',
    next:'Следующий вопрос',finish:'Завершить',previous:'Назад',required:'Выберите или напишите ответ.',
    plan:'Для WOOP напишите конкретный план «если — то» не короче 10 символов.',
    completed:'Сессия завершена',summary:'Ваши ответы',nextStep:'Ваш последний шаг',copy:'Скопировать результат',
    copied:'Скопировано',copyFallback:'Выделите и скопируйте текст ниже.',
    restart:'Выбрать другую модель',memory:'Бесплатная сессия хранится только в открытой вкладке. В личный кабинет или коучу ничего не отправляется.',
    discard:'Выйти из сессии? Несохранённые ответы будут потеряны.',noAnswer:'Пропущено',
  },
  es:{
    eyebrow:'HOLISTIC HOUSE · IDEAS Y COACHING',title:'Elige tu sesión de coaching',
    lead:'Prueba un método autoguiado gratis o solicita una sesión personal con Andrey.',
    question:'¿Qué te gustaría explorar?',placeholder:'Una meta, decisión, relación o reto (opcional)',
    privateQuestion:'Tu pregunta se analiza solo en este navegador. No se envía a IA, analíticas ni al coach.',
    format:'Formato',self:'Autoguiado · gratis',human:'Con coach',filters:'Encontrar un modelo',
    topic:'Tema',allTopics:'Todos los temas',duration:'Tiempo disponible',anyTime:'Cualquier duración',
    style:'Estilo',allStyles:'Cualquier enfoque',quick:'Breve',reflective:'Profundo',
    models:'Elige un modelo',all:'Todos los modelos publicados',recommended:'Sugeridos para tu pregunta',
    noExact:'No hay una coincidencia específica. Puedes elegir cualquier modelo.',
    empty:'No hay modelos con esos filtros. Cambia el tema o la duración.',
    unavailable:'El catálogo no está disponible temporalmente. Puedes solicitar una sesión personal.',
    free:'Gratis',minutes:'min',start:'Empezar sesión gratis',result:'Resultado de la práctica',
    recommendedLabel:'Sugerido',different:'Otras opciones',about:'Sobre este enfoque',
    humanTitle:'Coaching personal con Andrey',humanText:'Conversación individual de coaching o terapia en línea. Elige una duración y envía una solicitud.',
    half:'Sesión de 30 minutos',hour:'Sesión de 60 minutos',request:'Solicitar sesión',
    notBooking:'Una solicitud no confirma una reserva ni un pago. El profesional debe confirmar.',
    safe:'El autocoaching es reflexión educativa, no psicoterapia, atención médica ni chat con IA.',
    alert:'Ante un peligro inmediato, solicita ayuda profesional o de emergencia.',
    back:'Todos los modelos',stage:'PREGUNTA',of:'DE',yourQuestion:'Tu pregunta',choices:'Elige una respuesta',
    ownAnswer:'O escribe tu respuesta (opcional)',answerPlaceholder:'En tus palabras…',
    next:'Siguiente pregunta',finish:'Terminar',previous:'Atrás',required:'Elige o escribe una respuesta.',
    plan:'Para WOOP escribe un plan específico «si–entonces» de al menos 10 caracteres.',
    completed:'Sesión terminada',summary:'Tu reflexión',nextStep:'Tu último paso',copy:'Copiar resumen',
    copied:'Copiado',copyFallback:'Selecciona y copia tu texto abajo.',
    restart:'Elegir otro modelo',memory:'Esta sesión gratis solo vive en esta pestaña. No se guarda ni se envía al coach.',
    discard:'¿Salir? Se perderán tus respuestas.',noAnswer:'Omitido',
  },
}
const tr=(value,locale)=>value?.[locale]||value?.en||''
const answerText=(value,item,locale,t)=>{
  if(typeof value!=='string'||!value)return t.noAnswer
  if(!value.startsWith('choice:'))return value
  const id=value.slice(7)
  if(item.type==='scale_0_10')return id+'/10'
  return tr((item.choices||[]).find(c=>c.id===id)?.label,locale)||t.noAnswer
}

export default function PublicCoachingDiscovery({locale='en',catalog=null}){
  const lang=copy[locale]?locale:'en',t=copy[lang]
  const [format,setFormat]=useState('self')
  const [question,setQuestion]=useState('')
  const [topic,setTopic]=useState('all')
  const [duration,setDuration]=useState(0)
  const [style,setStyle]=useState('all')
  const [session,setSession]=useState(null)
  const [index,setIndex]=useState(0)
  const [answers,setAnswers]=useState({})
  const [draft,setDraft]=useState('')
  const [finished,setFinished]=useState(false)
  const [error,setError]=useState('')
  const [copyError,setCopyError]=useState(false)
  const [copied,setCopied]=useState(false)
  const titleRef=useRef(null)
  const models=useMemo(()=>new Map((catalog?.models||[]).map(m=>[m.modelKey,m])),[catalog])
  const schemes=useMemo(()=>(catalog?.schemes||[]).filter(s=>models.has(s.modelKey)&&Array.isArray(s.questions)&&s.questions.length>0),[catalog,models])
  const recommendation=useMemo(()=>recommendCoachingForQuestion(question,catalog||{models:[],schemes:[],signals:[]},{minutes:duration||30,style}),[question,catalog,duration,style])
  const suggestionKeys=useMemo(()=>new Set(question.trim().length>=8&&recommendation.recognized?recommendation.suggestions.filter(s=>s.matchedTags.length>0).map(s=>s.schemeKey):[]),[question,recommendation])
  const shown=useMemo(()=>schemes.filter(s=>(topic==='all'||s.tags?.includes(topic))&&(duration===0||s.minutes<=duration)&&(style==='all'||s.style===style))
    .sort((a,b)=>Number(suggestionKeys.has(b.schemeKey))-Number(suggestionKeys.has(a.schemeKey))||a.minutes-b.minutes||a.schemeKey.localeCompare(b.schemeKey)),[schemes,topic,duration,style,suggestionKeys])
  const current=session?.questions?.[index]
  const options=current?.type==='scale_0_10'
    ?Array.from({length:11},(_,n)=>({id:String(n),label:{en:String(n),ru:String(n),es:String(n)}}))
    :(current?.choices||[])

  function start(scheme){
    if(recommendation.blocked)return
    setSession(scheme);setIndex(0);setAnswers({});setDraft('');setFinished(false);setCopied(false);setCopyError(false);setError('')
    window.scrollTo({top:0,behavior:'smooth'})
  }
  function backToModels(){
    if(!finished&&Object.keys(answers).length>0&&!window.confirm(t.discard))return
    setSession(null);setIndex(0);setAnswers({});setDraft('');setFinished(false);setError('')
  }
  function moveBack(){
    if(index===0){backToModels();return}
    const prev=index-1
    setIndex(prev);setDraft(answers[session.questions[prev].id]||'');setError('')
  }
  function advance(){
    const value=draft.trim()
    if(current.required&&!value){setError(t.required);return}
    if(session.requiredCustomPlan&&index===session.questions.length-1&&(value.startsWith('choice:')||value.length<10)){
      setError(t.plan);return
    }
    const nextAnswers={...answers,[current.id]:value}
    setAnswers(nextAnswers);setError('')
    if(index===session.questions.length-1){setFinished(true);return}
    const next=index+1;setIndex(next);setDraft(nextAnswers[session.questions[next].id]||'')
  }
  function summaryText(){
    if(!session)return ''
    return [t.summary+' · '+tr(session.name,lang),question.trim()?t.yourQuestion+': '+question.trim():'',
      ...session.questions.map(item=>tr(item.prompt,lang)+': '+answerText(answers[item.id],item,lang,t))].filter(Boolean).join('\n\n')
  }
  async function copySummary(){
    try{await navigator.clipboard.writeText(summaryText());setCopied(true);setCopyError(false)}
    catch{setCopyError(true)}
  }
  return <main className={styles.root} data-public-coaching lang={lang}>
    <div className={styles.wrap}>
      {!session?<>
        <header className={styles.hero}>
          <p className={styles.eyebrow}><Sparkles size={16}/>{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <p>{t.lead}</p>
        </header>
        <section className={styles.controls} aria-label={t.filters}>
          <fieldset className={styles.format}>
            <legend>{t.format}</legend>
            <button type="button" className={format==='self'?styles.active:''} aria-pressed={format==='self'} onClick={()=>setFormat('self')}><Compass size={18}/>{t.self}</button>
            <button type="button" className={format==='human'?styles.active:''} aria-pressed={format==='human'} onClick={()=>setFormat('human')}><UserRound size={18}/>{t.human}</button>
          </fieldset>
          {format==='self'&&<>
            <label className={styles.questionLabel} htmlFor="public-coaching-question">{t.question}</label>
            <textarea id="public-coaching-question" className={styles.questionInput} rows={2} maxLength={600}
              value={question} placeholder={t.placeholder} autoComplete="off"
              onChange={e=>setQuestion(e.target.value)}/>
            <p className={styles.privacy}><LockKeyhole size={14}/>{t.privateQuestion}</p>
            <div className={styles.filters}>
              <label>{t.topic}
                <select value={topic} onChange={e=>setTopic(e.target.value)}>
                  <option value="all">{t.allTopics}</option>
                  {(catalog?.signals||[]).filter(signal=>schemes.some(s=>s.tags?.includes(signal.tag))).map(signal=>
                    <option key={signal.tag} value={signal.tag}>{tr(signal.label,lang)}</option>)}
                </select>
              </label>
              <label>{t.duration}
                <select value={duration} onChange={e=>setDuration(Number(e.target.value))}>
                  <option value="0">{t.anyTime}</option>
                  {[10,20,30].map(m=><option key={m} value={m}>{m} {t.minutes}</option>)}
                </select>
              </label>
              <label>{t.style}
                <select value={style} onChange={e=>setStyle(e.target.value)}>
                  <option value="all">{t.allStyles}</option>
                  <option value="quick">{t.quick}</option>
                  <option value="reflective">{t.reflective}</option>
                </select>
              </label>
            </div>
          </>}
        </section>
        {format==='self'?<section aria-labelledby="coaching-models-title" className={styles.catalog}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>{t.all}</p>
            <h2 id="coaching-models-title">{question.trim().length>=8&&recommendation.recognized?t.recommended:t.models}</h2>
            {question.trim().length>=8&&!recommendation.recognized&&!recommendation.blocked&&<p>{t.noExact}</p>}
          </div>
          {recommendation.blocked?<p className={styles.alert} role="alert">{t.alert}</p>:
            !catalog?<p className={styles.alert} role="status">{t.unavailable}</p>:
            shown.length===0?<p className={styles.alert}>{t.empty}</p>:
            <div className={styles.cards} data-public-coaching-models>
              {shown.map(s=>{
                const model=models.get(s.modelKey)
                return <article key={s.schemeKey} className={styles.card} data-coaching-scheme={s.schemeKey}>
                  <div className={styles.cardTop}><span>{s.style==='quick'?t.quick:t.reflective} · {s.minutes} {t.minutes}</span><strong>{t.free} · €0</strong></div>
                  <h3>{tr(model.name,lang)}</h3>
                  <p className={styles.schemeName}>{tr(s.name,lang)}</p>
                  <p>{tr(model.selectionComment,lang)||tr(model.focus,lang)}</p>
                  <p className={styles.outcome}><Check size={15}/>{t.result}: {tr(s.result,lang)}</p>
                  {suggestionKeys.has(s.schemeKey)&&<span className={styles.recommended}><Sparkles size={14}/>{t.recommendedLabel}</span>}
                  <details><summary>{t.about}</summary><p>{tr(model.caution,lang)}</p></details>
                  <button type="button" className={styles.cardButton} onClick={()=>start(s)}>{t.start}<ArrowRight size={17}/></button>
                </article>
              })}
            </div>}
          <p className={styles.disclaimer}>{t.safe}</p>
        </section>:<section className={styles.catalog} aria-labelledby="human-coaching-title">
          <h2 id="human-coaching-title">{t.humanTitle}</h2><p>{t.humanText}</p>
          <div className={styles.cards}>
            {[{name:t.half,minutes:30,price:'€50'},{name:t.hour,minutes:60,price:'€100'}].map(option=>
              <article className={styles.card} key={option.minutes}>
                <div className={styles.cardTop}><span><Clock3 size={14}/> {option.minutes} {t.minutes}</span><strong>{option.price}</strong></div>
                <h3>{option.name}</h3><p>{t.humanText}</p>
                <Link className={styles.cardButton} href={'/'+lang+'/services#consultation'}>{t.request}<ArrowRight size={17}/></Link>
              </article>)}
          </div>
          <p className={styles.disclaimer}>{t.notBooking}</p>
        </section>}
      </>:<section className={styles.session} data-public-coaching-session>
        <button type="button" className={styles.back} onClick={backToModels}><ArrowLeft size={18}/>{t.back}</button>
        <p className={styles.eyebrow}>{tr(session.name,lang)} · {t.free}</p>
        {finished?<div className={styles.finish} data-public-coaching-complete>
          <span className={styles.completed}><Check size={16}/>{t.completed}</span>
          <h1>{t.summary}</h1>
          <div className={styles.summary}>
            {question.trim()&&<p><strong>{t.yourQuestion}:</strong> {question}</p>}
            {session.questions.map(item=><div key={item.id}><strong>{tr(item.prompt,lang)}</strong><p>{answerText(answers[item.id],item,lang,t)}</p></div>)}
          </div>
          <button type="button" className={styles.primary} onClick={copySummary}><ClipboardCopy size={17}/>{copied?t.copied:t.copy}</button>
          {copyError&&<><p className={styles.alert} role="alert">{t.copyFallback}</p><textarea className={styles.copyFallback} readOnly value={summaryText()} rows={7}/></>}
          <button type="button" className={styles.secondary} onClick={backToModels}>{t.restart}</button>
        </div>:<>
          <div className={styles.progress}><span>{t.stage} {index+1} {t.of} {session.questions.length}</span><div role="progressbar" aria-valuemin={0} aria-valuemax={session.questions.length} aria-valuenow={index+1} aria-label={t.stage}><span style={{width:((index+1)/session.questions.length*100)+'%'}}/></div></div>
          <p className={styles.stage}>{tr(current.stageTitle,lang)}</p>
          <h1 ref={titleRef} tabIndex={-1}>{tr(current.prompt,lang)}</h1>
          {question.trim()&&<p className={styles.context}><strong>{t.yourQuestion}:</strong> {question}</p>}
          {tr(current.reflection,lang)&&<p className={styles.hint}>{tr(current.reflection,lang)}</p>}
          {options.length>0&&!(session.requiredCustomPlan&&index===session.questions.length-1)&&<>
            <p className={styles.questionLabel}>{t.choices}</p>
            <div className={styles.choices}>{options.map(option=><button type="button" key={option.id}
              aria-pressed={draft==='choice:'+option.id} onClick={()=>{setDraft('choice:'+option.id);setError('')}}>{tr(option.label,lang)}</button>)}</div>
          </>}
          <label className={styles.questionLabel} htmlFor="public-coaching-answer">{session.requiredCustomPlan&&index===session.questions.length-1?t.plan:t.ownAnswer}</label>
          <textarea id="public-coaching-answer" className={styles.questionInput} rows={3} maxLength={800}
            placeholder={t.answerPlaceholder} value={draft.startsWith('choice:')?'':draft}
            onChange={e=>{setDraft(e.target.value);setError('')}}/>
          {error&&<p className={styles.alert} role="alert">{error}</p>}
          <div className={styles.sessionActions}>
            <button type="button" className={styles.secondary} onClick={moveBack}>{t.previous}</button>
            <button type="button" className={styles.primary} onClick={advance}>{index===session.questions.length-1?t.finish:t.next}<ArrowRight size={17}/></button>
          </div>
        </>}
        <p className={styles.disclaimer}><LockKeyhole size={14}/>{t.memory}</p>
      </section>}
    </div>
  </main>
}
