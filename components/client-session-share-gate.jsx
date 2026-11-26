'use client'
import { useEffect,useRef,useState } from 'react'
import {ArrowRight,BarChart3,Compass,Download,FileText,Layers,LockKeyhole,Sparkles,Target} from 'lucide-react'
import {appFetch} from '@/lib/app/client-fetch'
import styles from './client-report-invitation.module.css'

export function ClientSessionShareGate({locale='en',selector,invitationReady=false}) {
  const ru=locale==='ru'
  const [status,setStatus]=useState(invitationReady?'ready':'checking')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState(false)
  const pendingInvite=useRef(null),verifiedSelector=useRef(null)
  useEffect(()=>{
    let active=true
    const fragment=window.location.hash.slice(1)
    if(fragment){
      // Remove the capability before any network request, even on rejection.
      // A memory-only ref survives Strict Mode effect replay, never storage.
      pendingInvite.current={selector,secret:fragment}
      verifiedSelector.current=null
      window.history.replaceState(window.history.state,'',window.location.pathname+window.location.search)
    }
    const secret=pendingInvite.current?.selector===selector?pendingInvite.current.secret:''
    if(!secret){setStatus(invitationReady||verifiedSelector.current===selector?'ready':'unavailable');return}
    if(!/^[a-zA-Z0-9_-]{43}$/.test(secret)){pendingInvite.current=null;setStatus('unavailable');return}
    const controller=new AbortController()
    setStatus('checking')
    fetch('/api/client-session-access',{method:'POST',credentials:'same-origin',cache:'no-store',
      headers:{'content-type':'application/json'},body:JSON.stringify({selector,secret}),signal:controller.signal})
      .then(res=>{
        if(!res.ok)throw new Error('Access unavailable')
        if(active){
          pendingInvite.current=null
          verifiedSelector.current=selector
          setStatus('ready')
        }
      })
      .catch(()=>{if(active){pendingInvite.current=null;setStatus('unavailable')}})
    return ()=>{active=false;controller.abort()}
  },[selector,invitationReady])

  async function openWithGoogle(){
    if(busy||status!=='ready')return
    setBusy(true);setError(false)
    try{
      const intent=await appFetch('save-intents',{sourceKind:'client_session',selector,operationId:crypto.randomUUID()})
      // Always use Google for this first invitation claim. The same browser-
      // bound intent survives the existing PKCE handoff; no report goes to OAuth.
      const auth=await appFetch('auth/start',{locale,intentId:intent.id,provider:'google'})
      const url=new URL(auth.redirectUrl)
      if(url.protocol!=='https:'||!url.hostname)throw new Error('SIGN_IN_UNAVAILABLE')
      window.location.assign(url.href)
    }catch{setError(true);setBusy(false)}
  }

  const copy=ru?{
    label:'Ваш личный отчёт',title:'Ваш отчёт готов',description:'Персональный анализ вашей ситуации, основные выводы и рекомендации по дальнейшим шагам.',
    features:['Анализ ситуации','Основные выводы','Рекомендации'],cta:'Войти через Google и открыть отчёт',busy:'Открываем Google…',
    note:'Войдите или создайте личный кабинет через Google, чтобы прочитать, сохранить и скачать отчёт.',
    trust:['Конфиденциально','Скачать PDF','В личном кабинете'],
    identity:'Доступ только для подтверждённого аккаунта клиента. Если ваш адрес Google отличается от указанного специалистом, свяжитесь с ним. Подтверждение связывает аккаунт с вашей карточкой у специалиста для получения отчёта. Подписка на рассылку не оформляется.',
    checking:'Проверяем приглашение…',unavailable:'Ссылка недоступна или срок её действия истёк. Попросите специалиста отправить новую ссылку.',error:'Не удалось начать вход. Попробуйте ещё раз.',cover:'Личный отчёт',caption:'Анализ · рекомендации'
  }:{
    label:'Your personal report',title:'Your report is ready',description:'A personalized analysis of your situation, key insights, recommendations and next steps.',
    features:['Situation analysis','Key insights','Recommendations'],cta:'Sign in with Google to access your report',busy:'Opening Google…',
    note:'Log in or create your personal account with Google to view, save and download your report.',
    trust:['Secure & private','Download PDF','In your Cabinet'],
    identity:'Only the verified client account can access the report. If your Google email differs from the address recorded by your practitioner, please contact them. Confirmation links your account to your practitioner’s client record for report delivery. It does not subscribe you to marketing.',
    checking:'Checking your invitation…',unavailable:'This link is unavailable or expired. Please ask your practitioner for a new link.',error:'Could not start sign-in. Please try again.',cover:'Personal report',caption:'Analysis · insights'
  }

  return <main className={styles.screen}>
    <section className={styles.card} aria-labelledby="report-invitation-title">
      <div className={styles.brand}><span className={styles.logo}><Sparkles size={23} aria-hidden="true"/></span>Holistic House</div>
      <div className={styles.hero}>
        <div>
          <span className={styles.kicker}><FileText size={15} aria-hidden="true"/>{copy.label}</span>
          <h1 id="report-invitation-title" className={styles.heading}>{status==='unavailable'?(ru?'Доступ к отчёту':'Report access'):copy.title}</h1>
          <span className={styles.rule} aria-hidden="true"/>
          <p className={styles.description}>{copy.description}</p>
        </div>
        <div className={styles.art} aria-hidden="true"><div className={styles.tablet}><div className={styles.cover}>
          <span className={styles.coverBrand}>✦ Holistic House</span><span className={styles.coverTitle}>{copy.cover}</span><span className={styles.coverCaption}>{copy.caption}</span>
          <svg className={styles.landscape} viewBox="0 0 240 240" preserveAspectRatio="xMidYMax slice">
            <defs><linearGradient id="hh-report-sky" x2="0" y2="1"><stop stopColor="#fff0d2"/><stop offset="1" stopColor="#c99658"/></linearGradient><linearGradient id="hh-report-hill" x2="0" y2="1"><stop stopColor="#4b674f"/><stop offset="1" stopColor="#163e30"/></linearGradient></defs>
            <path fill="url(#hh-report-sky)" d="M0 0H240V240H0Z"/><circle cx="146" cy="87" r="27" fill="#fff5cc"/>
            <path d="M0 137 42 87 68 107 104 67 154 122 187 86 240 132V240H0Z" fill="#a48e72"/>
            <path d="m0 151 59-41 45 37 39-36 34 28 63-37v138H0Z" fill="#6e826b"/>
            <path d="M0 180 41 131 83 165 116 153 171 176 240 132V240H0Z" fill="url(#hh-report-hill)"/>
            <path d="M0 203 55 169 108 196 154 183 240 204V240H0Z" fill="#163e30"/>
            <path d="M120 222c-15-5-22-17-21-26 12 1 19 7 21 19 2-12 9-18 21-19 1 9-6 21-21 26Zm0 0c-8-9-8-20 0-29 8 9 8 20 0 29Z" fill="none" stroke="#eacb82" strokeWidth="1.5"/>
          </svg>
        </div></div></div>
      </div>
      {status==='ready'?<>
        <ul className={styles.features}>{[BarChart3,Compass,Target].map((Icon,i)=><li key={i}><span className={styles.featureIcon}><Icon size={23} aria-hidden="true"/></span>{copy.features[i]}</li>)}</ul>
        <button type="button" className={styles.cta} disabled={busy} onClick={openWithGoogle}>
          <svg className={styles.google} viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.7-.4-4H24v7.6h11a9.4 9.4 0 0 1-4.1 6.2v5h6.6c3.9-3.6 6.1-8.8 6.1-14.8Z"/><path fill="#34A853" d="M24 44c5.5 0 10.2-1.8 13.5-4.8l-6.6-5a12 12 0 0 1-17.8-6.3H6.3V33A20 20 0 0 0 24 44Z"/><path fill="#FBBC05" d="M13.1 27.9a12 12 0 0 1 0-7.8V15H6.3a20 20 0 0 0 0 18Z"/><path fill="#EA4335" d="M24 12a11 11 0 0 1 7.7 3l5.8-5.8A20 20 0 0 0 6.3 15l6.8 5.1A12 12 0 0 1 24 12Z"/></svg>
          <span className={styles.ctaLabel}>{busy?copy.busy:copy.cta}</span><ArrowRight className={styles.arrow} size={21} aria-hidden="true"/>
        </button>
        <p className={styles.note}>{copy.note}</p>
        {error&&<p className={styles.error} role="alert">{copy.error}</p>}
        <ul className={styles.trust}>{[LockKeyhole,Download,Layers].map((Icon,i)=><li key={i}><Icon size={21} aria-hidden="true"/>{copy.trust[i]}</li>)}</ul>
        <p className={styles.identity}>{copy.identity}</p>
      </>:<p role="status" className={styles.status}>{status==='checking'?copy.checking:copy.unavailable}</p>}
    </section>
  </main>
}
