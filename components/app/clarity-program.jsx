'use client'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {useSearchParams} from 'next/navigation'
import {reportDaybookWeek} from '@/lib/consultations/report-program.mjs'
import {ArrowRight,BookOpen,CheckCircle2,Compass,LockKeyhole} from 'lucide-react'
import {appFetch} from '@/lib/app/client-fetch'
import {isNativeHolisticHouse} from '@/lib/native/client'
import {createJournalSaver} from '@/lib/app/daybook-journal-save.mjs'
import {localJournalDay} from '@/lib/app/daybook-journal-contract.mjs'
import {CLARITY_SYLLABUS,CLARITY_FREE_REFLECTION_TAG,clarityLocale,clarityDaybookPath,clarityOnboardingPath,savedClarityReflection} from '@/lib/app/clarity-program.mjs'
import {programContinuation,programDaybookPath,programOnboardingPath} from '@/lib/app/program-daybook-entry.mjs'
import css from './clarity-program.module.css'
import DaybookWeekReports from './daybook-week-reports'
const COPY={
 en:{title:'Find Clarity & Support',details:'Program details',start:'Start Free Program',week:'Week',free:'Free',paid:'Paid session',intro:'Four sessions to understand yourself, find support and choose a clear direction.',terms:'The first session is free. Later sessions require completion of the previous session and confirmed payment for that week.',progress:'Saved sessions',locked:'Locked · payment required',notYet:'Complete the first session before continuing.',payment:'Payment for this session is not configured yet. No payment is taken and access remains locked.',steps:'Your instructions',tasks:[['Life Balance Wheel','Rate each area now and as you would like it to be. Notice the largest gap.'],['My wishes & meaning','Explore the meaning axes and choose one area you want to understand better. You do not need to choose a goal yet.'],['Personal reflection','Write what you noticed, why it matters and one thing you want to observe this week.']],reflection:'My private reflection',placeholder:'What did I notice? What matters most now? What will I observe this week?',save:'Save and finish session',saved:'Your free-session reflection is saved.',edit:'Update reflection',retry:'Retry saving',error:'Could not confirm the save. Your draft is retained; retry before editing.',authError:'Could not open Google sign-in. Try again.',working:'Opening…',load:'Load saved progress',loadError:'Could not read all saved progress. Retry.',privacy:'Your reflections are private. These practices are not medical diagnosis or treatment.',back:'Back to Profile',goals:'My Goal'},
 ru:{title:'Ясность и поддержка',details:'Программа курса',start:'Начать бесплатно',week:'Неделя',free:'Бесплатно',paid:'Платная сессия',intro:'Четыре сессии, чтобы лучше понять себя, найти опору и выбрать направление.',terms:'Первая сессия бесплатна. Следующие требуют завершения предыдущей сессии и подтверждённой оплаты соответствующей недели.',progress:'Сохранённые сессии',locked:'Закрыто · нужна оплата',notYet:'Завершите первую сессию, чтобы продолжить.',payment:'Оплата этой сессии ещё не настроена. Деньги не списываются, доступ закрыт.',steps:'Что нужно сделать',tasks:[['Колесо баланса','Оцените каждую сферу сейчас и в желаемом состоянии. Заметьте наибольшую разницу.'],['Мои желания и смыслы','Исследуйте смысловые оси и выберите область, которую хотите лучше понять. Не обязательно уже выбирать цель.'],['Личная рефлексия','Запишите, что заметили, почему это важно и за чем хотите понаблюдать на этой неделе.']],reflection:'Моя личная рефлексия',placeholder:'Что я заметил? Что для меня важно сейчас? За чем я буду наблюдать на этой неделе?',save:'Сохранить и завершить сессию',saved:'Рефлексия первой сессии сохранена.',edit:'Обновить рефлексию',retry:'Повторить сохранение',error:'Сохранение не подтверждено. Черновик сохранён на экране; повторите попытку перед редактированием.',authError:'Не удалось открыть вход через Google. Повторите попытку.',working:'Открываем…',load:'Загрузить сохранённый прогресс',loadError:'Не удалось прочитать весь прогресс. Повторите попытку.',privacy:'Ваши записи конфиденциальны. Эти практики не заменяют медицинскую диагностику и лечение.',back:'В профиль',goals:'Моя цель'},
 es:{title:'Claridad y apoyo',details:'Detalles del programa',start:'Empezar gratis',week:'Semana',free:'Gratis',paid:'Sesión de pago',intro:'Cuatro sesiones para conocerte, encontrar apoyo y elegir tu rumbo.',terms:'La primera sesión es gratis. Las siguientes requieren finalizar la sesión anterior y confirmar el pago de esa semana.',progress:'Sesiones guardadas',locked:'Bloqueada · requiere pago',notYet:'Completa la primera sesión antes de continuar.',payment:'El pago de esta sesión aún no está configurado. No se cobra nada y el acceso sigue bloqueado.',steps:'Tus instrucciones',tasks:[['Rueda de equilibrio','Valora cada área ahora y como te gustaría que fuera. Observa la mayor diferencia.'],['Mis deseos y sentido','Explora los ejes de significado y elige un área que quieras comprender mejor. No necesitas elegir una meta todavía.'],['Reflexión personal','Escribe qué observaste, por qué importa y qué quieres observar esta semana.']],reflection:'Mi reflexión privada',placeholder:'¿Qué observé? ¿Qué importa ahora? ¿Qué observaré esta semana?',save:'Guardar y terminar sesión',saved:'Tu reflexión de la sesión gratuita está guardada.',edit:'Actualizar reflexión',retry:'Reintentar guardado',error:'No se confirmó el guardado. Conservamos el borrador en pantalla; reintenta antes de editar.',authError:'No se pudo abrir el acceso de Google. Reintenta.',working:'Abriendo…',load:'Cargar progreso guardado',loadError:'No se pudo leer todo el progreso. Reintenta.',privacy:'Tus reflexiones son privadas. Estas prácticas no sustituyen el diagnóstico ni el tratamiento médico.',back:'Volver al perfil',goals:'Mi meta'}
}
function useProgramStart(locale,program){
 const lang=clarityLocale(locale),t=COPY[lang]
 const [busy,setBusy]=useState(false),[error,setError]=useState(false)
 const live=useRef(true),pending=useRef(false)
 useEffect(()=>{live.current=true;return()=>{live.current=false}},[])
 async function begin(){
  if(pending.current)return
  pending.current=true;setBusy(true);setError(false)
  try{
   try{
    const boot=await appFetch('bootstrap?view=portrait')
    if(!live.current)return
    window.location.assign(boot.account.onboardingState==='active'?programDaybookPath(lang,program):programOnboardingPath(lang,program))
    return
   }catch(e){if(e.status!==401)throw e}
   if(!live.current)return
   const native=isNativeHolisticHouse()
   const result=await appFetch('auth/start',{locale:lang,continueTo:programContinuation(program),...(native?{native:true}:{})})
   if(!live.current)return
   if(native){const {Browser}=await import('@capacitor/browser');await Browser.open({url:result.redirectUrl})}
   else window.location.assign(result.redirectUrl)
  }catch{if(live.current)setError(true)}
  finally{pending.current=false;if(live.current)setBusy(false)}
 }
 return {lang,t,busy,error,begin}
}
export function ClarityStartButton({locale='en',children}){
 const {t,busy,error,begin}=useProgramStart(locale,'clarity')
 return <><button type="button" data-clarity-start className={css.primary} onClick={()=>void begin()} disabled={busy}><Compass size={20} aria-hidden="true"/>{busy?t.working:children||t.start}</button>{error&&<p role="alert" className={css.notice}>{t.authError}</p>}</>
}
// Keep the approved guidance card's link layout while using the same Google
// continuation as the hero. Modified clicks still open the protected Daybook.
export function ClarityStartLink({locale='en',className,children}){
 const {lang,t,busy,error,begin}=useProgramStart(locale,'clarity')
 return <><Link href={clarityDaybookPath(lang)} className={className} prefetch={false}
  data-clarity-start data-clarity-personal aria-busy={busy}
  onClick={event=>{
   if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return
   event.preventDefault()
   if(!busy)void begin()
  }}>{children}</Link>{busy&&<p role="status" className={css.notice}>{t.working}</p>}{error&&<p role="alert" className={css.notice}>{t.authError}</p>}</>
}
// All public program starts use fixed first-party destinations, never a supplied URL.
export function ProgramStartLink({locale='en',program,className,children}){
 const {lang,t,busy,error,begin}=useProgramStart(locale,program)
 return <><Link href={programDaybookPath(lang,program)} className={className} prefetch={false}
  data-program-start={program} aria-busy={busy}
  onClick={event=>{
   if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return
   event.preventDefault()
   if(!busy)void begin()
  }}>{children}</Link>{busy&&<p role="status" className={css.notice}>{t.working}</p>}{error&&<p role="alert" className={css.notice}>{t.authError}</p>}</>
}
export function ClarityDetails({locale='en'}){
 const lang=clarityLocale(locale),t=COPY[lang]
 return <main className={css.shell} data-clarity-program-details>
  <Link href={'/'+lang+'/app/portrait'} className={css.back}>{t.back}</Link>
  <header className={css.hero}><span>{t.details}</span><h1>{t.title}</h1><p>{t.intro}</p><ClarityStartButton locale={lang}/></header>
  <p className={css.terms}>{t.terms}</p>
  {CLARITY_SYLLABUS[lang].map(([title,description],index)=><article className={css.card} key={title}><span className={css.eyebrow}>{t.week} {index+1} · {index===0?t.free:t.paid}</span><h2>{title}</h2><p>{description}</p></article>)}
  <p className={css.notice}>{t.privacy}</p>
 </main>
}
function FreeReflection({accountId,locale,entry,onSaved,onSessionLost}){
 const t=COPY[locale]
 const [text,setText]=useState(entry?.text||''),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false)
 const saver=useRef(null),draft=useRef(null),alive=useRef(true),inFlight=useRef(false)
 useEffect(()=>{alive.current=true;saver.current=createJournalSaver(appFetch,accountId);return()=>{alive.current=false;saver.current?.discard()}},[accountId])
 async function save(){
  if(inFlight.current||!saver.current||!text.trim())return
  inFlight.current=true;setBusy(true)
  if(!draft.current){
   const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone
   draft.current={id:entry?.id||crypto.randomUUID(),revision:entry?.revision||0,text:text.trim(),tags:[CLARITY_FREE_REFLECTION_TAG],kind:'note',locale,timezone,localDay:localJournalDay(new Date().toISOString(),timezone),goalId:null}
  }
  try{
   const saved=await saver.current.save(draft.current)
   if(!alive.current)return
   draft.current=null;setFailed(false);onSaved(saved)
  }catch(error){
   if(!alive.current)return
   if(error.status===401||error.status===403||error.code==='ACCOUNT_CHANGED')onSessionLost()
   else setFailed(true)
  }finally{inFlight.current=false;if(alive.current)setBusy(false)}
 }
 return <div className={css.reflection}>
  <label>{t.reflection}<textarea rows={6} maxLength={20000} value={text} placeholder={t.placeholder} onChange={e=>setText(e.target.value)} disabled={busy||failed}/></label>
  {entry&&<p role="status" className={css.saved}><CheckCircle2 size={18}/>{t.saved}</p>}
  {failed&&<p role="alert">{t.error}</p>}
  <button type="button" className={css.primary} onClick={()=>void save()} disabled={busy||!text.trim()}>{busy?t.working:failed?t.retry:entry?t.edit:t.save}<ArrowRight size={18}/></button>
 </div>
}
export function ClarityDaybook({locale='en',accountId,entries,hasMore,loadingAll,onLoadAll,loadError,onSaved,onSessionLost}){
 const lang=clarityLocale(locale),t=COPY[lang],weeks=CLARITY_SYLLABUS[lang]
 const entry=savedClarityReflection(entries)
 const searchParams=useSearchParams()
 const requestedWeek=searchParams?.getAll('week')
 const routeWeek=reportDaybookWeek('clarity',requestedWeek?.length===1?requestedWeek[0]:null)
 const [selected,setSelected]=useState(null),week=selected??routeWeek??(entry?2:1)
 const root='/'+lang
 return <section className={css.shell} data-clarity-daybook>
  <header className={css.hero}><span>CLARITY · DAYBOOK</span><h1>{t.title}</h1><p>{t.intro}</p></header>
  <div className={css.progress}><span>{t.progress}</span><strong>{entry?1:0} / 4</strong><progress max={4} value={entry?1:0} aria-label={t.progress}/></div>
  <nav className={css.weeks} aria-label={t.details}>{weeks.map(([title],i)=><button key={title} type="button" aria-pressed={week===i+1} onClick={()=>setSelected(i+1)}>{i===0?(entry?<CheckCircle2 size={18}/>:<BookOpen size={18}/>):<LockKeyhole size={17}/>}<span>{t.week} {i+1}</span></button>)}</nav>
  <article className={css.card}><span className={css.eyebrow}>{t.week} {week} · {week===1?t.free:t.locked}</span><h2>{weeks[week-1][0]}</h2><p>{weeks[week-1][1]}</p>
  {week===1?<><h3>{t.steps}</h3><ol className={css.tasks}>{t.tasks.map(([title,body],index)=><li key={title}><strong>{title}</strong><p>{body}</p>{index<2&&<Link href={root+'/development-vectors'} prefetch={false}>{title}<ArrowRight size={16}/></Link>}</li>)}</ol>
  {hasMore&&!entry?<><button type="button" onClick={onLoadAll} disabled={loadingAll}>{loadingAll?t.working:t.load}</button>{loadError&&<p role="alert">{t.loadError}</p>}</>:<FreeReflection key={entry?entry.id+':'+entry.revision:'new'} accountId={accountId} locale={lang} entry={entry} onSaved={onSaved} onSessionLost={onSessionLost}/>}</>:
  <div className={css.locked}><LockKeyhole size={22}/><p>{!entry?t.notYet:t.payment}</p><p>{t.terms}</p></div>}
  </article>
  <DaybookWeekReports key={accountId+':clarity'} locale={lang} accountId={accountId} program="clarity" week={week}/>
  <p className={css.notice}>{t.privacy}</p>
  <Link href={root+'/coaching/clarity'} prefetch={false} className={css.back}>{t.details}</Link>
  <Link href={root+'/app/portrait'} prefetch={false} className={css.back}>{t.back}</Link>
 </section>
}
