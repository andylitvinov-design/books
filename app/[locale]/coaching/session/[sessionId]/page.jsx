import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, Check, Clock3, ShieldCheck } from 'lucide-react'
import { PublicSiteHeader } from '@/components/public-site-header'
import { getPublicCoachingCatalog } from '@/lib/coaching/public-coaching-catalog'
import { coachingArt, coachingSchemeArt, humanCoachingArt } from '@/lib/coaching/public-session-art'
import { coachingSessionTitle, coachingSessionSummary } from '@/lib/coaching/session-presentation'
import { cardArtworkUrl } from '@/lib/public-card-artwork'
import { metadataBaseFor } from '@/data/site-metadata'
import styles from './page.module.css'

export const dynamic='force-dynamic'
export const revalidate=0
const locales=['en','ru','es']
const copy={
 en:{
   back:'All coaching sessions',eyebrow:'HOLISTIC HOUSE · SESSION GUIDE',
   model:'Free self-guided coaching',human:'Personal coaching with Andrey',method:'Method',
   minutes:'minutes',free:'Free · €0',about:'About this session',
   fits:'When this model is useful',result:'What you can work toward',
   steps:'How the guided session works',questions:'Questions you will explore',
   examples:'Example client questions',caution:'What to keep in mind',
   begin:'Start free session',request:'Request this session',
   humanIntro:'A personal conversation with Andrey, arranged by request. Choose a suitable duration and agree the time and format before any payment.',
   humanBenefit:'Explore your situation and choose an achievable next step in an individual conversation.',
   humanLimit:'Submitting a request does not confirm a booking or payment. This service does not promise a medical or psychological outcome.',
   privacy:'Free guided coaching is a self-reflection tool, not psychotherapy, diagnosis or a live AI agent. Guest answers remain in browser memory; only explicit copying shares them.',
   humanPrivacy:'Your request is submitted through the existing consent-based consultation workflow, not a checkout or automatic booking.',
 },
 ru:{
   back:'Все коуч-сессии',eyebrow:'HOLISTIC HOUSE · ПОДРОБНО О СЕССИИ',
   model:'Бесплатная самостоятельная сессия',human:'Личный коучинг с Андреем',method:'Методика',
   minutes:'минут',free:'Бесплатно · €0',about:'О сессии',
   fits:'Для каких запросов подходит',result:'К чему можно прийти',
   steps:'Как проходит сессия',questions:'Вопросы, с которыми будете работать',
   examples:'Примеры вопросов клиента',caution:'Что важно учитывать',
   begin:'Начать бесплатно',request:'Заказать сессию',
   humanIntro:'Индивидуальная коучинговая беседа с Андреем по предварительной заявке. Время и формат согласовываются до какой-либо оплаты.',
   humanBenefit:'Вместе прояснить ситуацию, рассмотреть варианты и определить следующий посильный шаг.',
   humanLimit:'Отправленная заявка ещё не означает подтверждённую запись или оплату. Результаты и медицинский эффект не гарантируются.',
   privacy:'Бесплатные вопросы — практика самоисследования, а не психотерапия, диагноз или беседа с живым ИИ. Гостевые ответы остаются в памяти браузера до явного копирования.',
   humanPrivacy:'Заявка оформляется через существующий процесс консультации с согласием на связь, а не через автоматическую оплату.',
 },
 es:{
   back:'Todas las sesiones',eyebrow:'HOLISTIC HOUSE · GUÍA DE LA SESIÓN',
   model:'Coaching gratuito autoguiado',human:'Coaching personal con Andrey',method:'Método',
   minutes:'minutos',free:'Gratis · €0',about:'Sobre esta sesión',
   fits:'Para qué consultas es útil',result:'Resultado posible',
   steps:'Cómo funciona la sesión',questions:'Preguntas que explorarás',
   examples:'Ejemplos de preguntas',caution:'Limitaciones',
   begin:'Empezar gratis',request:'Solicitar sesión',
   humanIntro:'Conversación individual con Andrey previa solicitud. El horario y el formato se confirman antes de cualquier pago.',
   humanBenefit:'Aclarar la situación y encontrar un siguiente paso realista.',
   humanLimit:'Una solicitud no confirma una reserva ni un pago y no garantiza resultados clínicos.',
   privacy:'La sesión gratuita es reflexión personal, no psicoterapia, diagnóstico ni un coach IA en vivo. Las respuestas de invitados no se guardan ni envían automáticamente.',
   humanPrivacy:'Las solicitudes usan el proceso existente de consulta con consentimiento, no una reserva automática.',
 }
}
const tr=(value,lang)=>value?.[lang]||value?.en||''
const paid={ 'personal-30':{minutes:30,price:'€50'},
  'personal-60':{minutes:60,price:'€100'} }
async function resolveSession(id){
  if(Object.prototype.hasOwnProperty.call(paid,id))return {paid:paid[id]}
  if(!/^[a-z0-9_]+_v[0-9]+$/.test(id||''))return null
  const catalog=await getPublicCoachingCatalog()
  const scheme=catalog.schemes.find(s=>s.schemeKey===id)
  const model=catalog.models.find(m=>m.modelKey===scheme?.modelKey)
  return scheme&&model?{scheme,model}:null
}
export async function generateMetadata({params}){
 const {locale,sessionId}=await params
 if(!locales.includes(locale))return {robots:{index:false}}
 const current=await resolveSession(sessionId)
 if(!current)return {robots:{index:false}}
 const t=copy[locale]
 const name=current.paid
   ? t.human+' · '+current.paid.minutes+' '+t.minutes
   : coachingSessionTitle(current.scheme.schemeKey,locale,tr(current.scheme.name,locale))
 const description=current.paid?t.humanIntro:coachingSessionSummary(current.scheme.schemeKey,locale,tr(current.model.selectionComment,locale))
 const path='/'+locale+'/coaching/session/'+sessionId
 return {metadataBase:metadataBaseFor(),title:name+' | Holistic House',
   description,alternates:{canonical:path,
     languages:Object.fromEntries(locales.map(l=>[l,'/'+l+'/coaching/session/'+sessionId]))},
   robots:{index:true,follow:true}}
}
export default async function CoachingSessionDetails({params}){
 const {locale,sessionId}=await params
 if(!locales.includes(locale))notFound()
 const current=await resolveSession(sessionId)
 if(!current)notFound()
 const t=copy[locale],isPaid=Boolean(current.paid),scheme=current.scheme,model=current.model
 const title=isPaid?t.human+' · '+current.paid.minutes+' '+t.minutes:coachingSessionTitle(scheme.schemeKey,locale,tr(scheme.name,locale))
 const description=isPaid?t.humanIntro:coachingSessionSummary(scheme.schemeKey,locale,tr(model.selectionComment,locale)||tr(model.focus,locale))
 const image=isPaid?humanCoachingArt:coachingSchemeArt[scheme.schemeKey]||coachingArt[model.modelKey]||coachingArt.grow_v1
 const href=isPaid?'/'+locale+'/services#consultation':
   '/'+locale+'/coaching?start='+encodeURIComponent(scheme.schemeKey)
 const action=isPaid?t.request:t.begin
 const price=isPaid?current.paid.price:t.free
 const questions=scheme?.questions||[]
 return <div className={styles.page} lang={locale} data-coaching-session-landing={sessionId}>
   <div className={styles.siteHeader}><PublicSiteHeader locale={locale}/></div>
   <main className={styles.main}>
     <Link href={'/'+locale+'/coaching'} className={styles.back} prefetch={false}>
       <ArrowLeft size={17}/>{t.back}
     </Link>
     <section className={styles.hero}>
       <div className={styles.heroText}>
         <p className={styles.eyebrow}>{t.eyebrow}</p>
         <p className={styles.category}>{isPaid?t.human:t.model}{!isPaid&&<> · {t.method}: {tr(model.name,locale)}</>}</p>
         <h1>{title}</h1>
         <p className={styles.intro}>{description}</p>
         <div className={styles.meta}><span><Clock3 size={16}/>
           {isPaid?current.paid.minutes:scheme.minutes} {t.minutes}</span>
           <strong>{price}</strong></div>
         <Link href={href} className={styles.primary} prefetch={false}>
           {action}<ArrowRight size={18}/>
         </Link>
       </div>
       <div className={styles.heroPhoto}>
         <Image src={cardArtworkUrl(image)} unoptimized alt="" aria-hidden="true"
           fill priority sizes="(max-width:720px) 100vw, 430px"/>
       </div>
     </section>
     <section className={styles.section} aria-labelledby="coach-landing-fit">
       <div className={styles.sectionText}>
         <h2 id="coach-landing-fit">{t.fits}</h2>
         <p>{isPaid?t.humanBenefit:tr(model.focus,locale)}</p>
         {!isPaid&&<p>{tr(model.selectionComment,locale)}</p>}
       </div>
       <aside className={styles.result}>
         <span><Check size={17}/>{t.result}</span>
         <p>{isPaid?t.humanBenefit:tr(scheme.result,locale)}</p>
       </aside>
     </section>
     {!isPaid&&<>
       <section className={styles.section} aria-labelledby="coach-landing-questions">
         <div className={styles.full}>
           <h2 id="coach-landing-questions">{t.questions}</h2>
           <p className={styles.small}>{t.steps} · {questions.length}</p>
           <ol className={styles.steps}>
             {questions.map((q,i)=><li key={q.id}>
               <span className={styles.index}>{String(i+1).padStart(2,'0')}</span>
               <div>
                 <strong>{tr(q.stageTitle,locale)}</strong>
                 <p>{tr(q.prompt,locale)}</p>
               </div>
             </li>)}
           </ol>
         </div>
       </section>
       {Array.isArray(model.exampleQuestions?.[locale]||model.exampleQuestions?.en)&&
         <section className={styles.section} aria-labelledby="coach-landing-examples">
           <div className={styles.full}>
             <h2 id="coach-landing-examples">{t.examples}</h2>
             <ul className={styles.examples}>
               {(model.exampleQuestions[locale]||model.exampleQuestions.en).map((q,i)=><li key={i}>{q}</li>)}
             </ul>
           </div>
         </section>}
     </>}
     <section className={styles.section} aria-labelledby="coach-landing-limits">
       <div className={styles.full}>
         <h2 id="coach-landing-limits">{t.caution}</h2>
         <p>{isPaid?t.humanLimit:tr(model.caution,locale)}</p>
         <p>{isPaid?t.humanPrivacy:t.privacy}</p>
         <div className={styles.bottomActions}>
           <Link href={href} className={styles.primary} prefetch={false}>
             {action}<ArrowRight size={17}/>
           </Link>
           <Link href={'/'+locale+'/coaching'} className={styles.secondary} prefetch={false}>
             {t.back}
           </Link>
         </div>
       </div>
     </section>
   </main>
 </div>
}
