'use client'
import { useState, useRef } from 'react'
import { ArrowLeft,FileDown,Headphones,LockKeyhole,PlayCircle,Video,BookOpen,ListChecks,ExternalLink,FolderOpen,ShieldCheck } from 'lucide-react'
import { SessionPrescriptionOverview } from './client-session-prescription'
import { ClientSessionCabinetEntry } from './client-session-cabinet-entry'
import styles from './client-session.module.css'

function PrivatePlayer({item,session,mode,selector,locale}) {
  const [source,setSource]=useState('')
  const [expiry,setExpiry]=useState(0)
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(false)
  const busy=useRef(false),player=useRef(null),resume=useRef(null)
  const isVideo=item.kind==='video',ru=locale==='ru'
  const route=mode==='guest'
    ? '/api/client-session-viewer/'+selector+'/media/'+item.assetId
    : '/api/client/'+selector+'/sessions/'+session.id+'/media/'+item.assetId

  async function load(renew=false) {
    if(busy.current)return
    busy.current=true;setLoading(true);setError('')
    const element=player.current
    resume.current=renew&&element?{time:element.currentTime,play:!element.paused}:null
    try{
      const response=await fetch(route,{method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'content-type':'application/json'},body:'{}'})
      if(!response.ok)throw new Error('unavailable')
      const data=await response.json()
      if(typeof data.url!=='string'||data.url!==route)throw new Error('unavailable')
      setExpiry(Date.now()+Math.min(300,Math.max(1,Number(data.expiresIn)||300))*1000)
      setSource(data.url)
    }catch{
      setError(ru?'Запись недоступна. Попробуйте ещё раз.':'Recording unavailable. Please try again.')
      if(renew)setSource('')
    }finally{busy.current=false;setLoading(false)}
  }
  function maybeRenew(){
    // A 5-minute signed URL is valid for initial playback but can expire while
    // listening to a 10-minute practice or after seeking on a slow phone.
    // New media range requests are authorized server-side; no expiring Storage
    // bearer is exposed to the player, so continuous playback needs no URL swap.
  }
  function restorePosition(){
    const checkpoint=resume.current,element=player.current
    if(!checkpoint||!element)return
    resume.current=null
    try{if(Number.isFinite(checkpoint.time)&&checkpoint.time>0)element.currentTime=checkpoint.time}catch{}
    if(checkpoint.play)void element.play().catch(()=>{})
  }
  function playbackError(){
    if(expiry&&Date.now()>expiry-45000&&!busy.current)void load(true)
    else{setSource('');setError(ru?'Откройте запись повторно':'Please reopen the recording')}
  }
  return <article className={styles.clientMediaCard}>
    <div className={styles.mediaHeading}>{isVideo?<Video size={20}/>:<Headphones size={20}/>}
      <div><strong>{item.title||(isVideo?(ru?'Видеообращение':'Video message'):(ru?'Голосовое сообщение':'Voice message'))}</strong>
        <small>{isVideo?(ru?'Личное видео':'Personal video'):(ru?'Личная аудиозапись':'Personal audio')}</small></div>
    </div>
    {!source?<button className={styles.playButton} type="button" disabled={loading} onClick={()=>load(false)}>
      <PlayCircle size={26}/>{loading?(ru?'Подключаем…':'Loading…'):(ru?'Слушать / смотреть':'Play recording')}</button>
      :isVideo?<video ref={player} className={styles.video} controls playsInline preload="metadata" src={source}
        onLoadedMetadata={restorePosition} onPlay={maybeRenew} onTimeUpdate={maybeRenew} onSeeking={maybeRenew} onError={playbackError}/>:
        <audio ref={player} className={styles.audio} controls preload="metadata" src={source}
          onLoadedMetadata={restorePosition} onPlay={maybeRenew} onTimeUpdate={maybeRenew} onSeeking={maybeRenew} onError={playbackError}/>}
    {item.transcript&&<details className={styles.transcript}><summary>{ru?'Текст записи':'Transcript'}</summary>
      <p>{item.transcript}</p></details>}
    {error&&<p role="alert" className={styles.error}>{error} <button type="button" onClick={()=>load(false)}>{ru?'Повторить':'Retry'}</button></p>}
  </article>
}
export function ClientSessionPage({session,selector,locale='en',mode='guest',reportContent=null,recommendation=null,clientName='',appAvailable=true}) {
  const ru=locale==='ru'
  const date=new Intl.DateTimeFormat(ru?'ru-RU':'en-CA',{dateStyle:'long',timeZone:'UTC'})
    .format(new Date(session.occurredOn+'T12:00:00Z'))
  const plan=session.plan||{}
  const takeaways=Array.isArray(plan.takeaways)?plan.takeaways:[]
  const practices=Array.isArray(plan.practices)?plan.practices:[]
  const resources=Array.isArray(plan.resources)?plan.resources:[]
  const media=session.media||[]
  const personalMedia=media.filter(item=>['audio','video'].includes(item.kind)&&(!item.role||item.role==='personal'))
    .sort((a,b)=>(a.kind==='audio'?0:1)-(b.kind==='audio'?0:1))
  const guideMedia=media.filter(item=>item.kind==='video'&&item.role==='instruction')
  const supplementary=media.filter(item=>item.kind==='pdf'||['meditation','additional'].includes(item.role)||
    (item.role==='instruction'&&item.kind==='audio'))
  const hasRecommendation=Boolean(recommendation?.items?.length)
  const pdfPath=mode==='guest'?'/api/client-session-viewer/'+selector+'/pdf?locale='+locale:
    '/api/client/'+selector+'/documents/'+(session.report?.id||'')+'/pdf?locale='+locale
  const assetBase=mode==='guest'?'/api/client-session-viewer/'+selector+'/media/':
    '/api/client/'+selector+'/sessions/'+session.id+'/media/'
  const nextAnchor=hasRecommendation?'#session-prescription':personalMedia.length?'#session-message':
    session.report?'#session-report':guideMedia.length?'#session-guide':(supplementary.length||resources.length)?'#session-resources':'#session-title'
  const hasAdvice=Boolean(plan.additionalRecommendations||takeaways.length||practices.length||
    recommendation?.additionalNotes||recommendation?.followUp||recommendation?.analysis)
  return <main className={styles.clientPage+' '+styles.courseSessionPage+' '+styles.cabinetSessionPage} lang={locale}>
    <header className={styles.clientHeader}>
      <div className={styles.clientBrand}><span className={styles.eyebrow}>HOLISTIC HOUSE · {ru?'МОЯ КОНСУЛЬТАЦИЯ':'MY CONSULTATION'}</span>
        <span className={styles.privateLabel}><ShieldCheck size={15}/>{ru?'Защищённые материалы':'Private materials'}</span>
      </div>
      <ClientSessionCabinetEntry locale={locale} variant="header" appAvailable={appAvailable}/>
    </header>
    <section className={styles.sessionHero} aria-labelledby="session-title">
      <span className={styles.sectionKicker}>{ru?'ПЕРСОНАЛЬНЫЙ ПЛАН ПОСЛЕ КОНСУЛЬТАЦИИ':'YOUR PERSONAL SESSION GUIDE'}</span>
      <h1 id="session-title">{session.title}</h1>
      <dl className={styles.sessionIdentity}>
        {clientName&&<div><dt>{ru?'Клиент':'Client'}</dt><dd>{clientName}</dd></div>}
        <div><dt>{ru?'Дата консультации':'Consultation date'}</dt><dd><time dateTime={session.occurredOn}>{date}</time></dd></div>
      </dl>
      {session.summary&&(session.summary.length>700?<details className={styles.summaryDetails}>
        <summary>{ru?'Личное сообщение от специалиста':'Read your personal message'}</summary>
        <p className={styles.sessionSummary}>{session.summary}</p>
      </details>:<p className={styles.sessionSummary}>{session.summary}</p>)}
      {(plan.nextStep||plan.focus||hasRecommendation)&&<div className={styles.nextStepCard}>
        <span className={styles.sectionKicker}>{ru?'С ЧЕГО НАЧАТЬ':'START HERE'}</span>
        {plan.nextStep&&<p><strong>{ru?'Ваш следующий шаг':'Your next step'}:</strong> {plan.nextStep}</p>}
        {!plan.nextStep&&plan.focus&&<p>{plan.focus}</p>}
        {!plan.nextStep&&!plan.focus&&hasRecommendation&&<p>{
          ru?'Просмотрите назначения и индивидуальные инструкции ниже.':
          'Review the assigned items and your practitioner’s individual instructions below.'
        }</p>}
        <a href={nextAnchor} className={styles.nextStepLink}>{hasRecommendation?(ru?'Смотреть назначения ↓':'Review recommendations ↓'):(ru?'Перейти к материалам ↓':'Continue to materials ↓')}</a>
      </div>}
      <div className={styles.practitionerCredit}>{ru?'Подготовлено специалистом':'Prepared by'} · Andrii Litvinov · Holistic House</div>
    </section>

    {personalMedia.length>0&&<section id="session-message" className={styles.clientSection} aria-label={ru?'Личное обращение':'Personal message'}>
      <header className={styles.sectionHeader}>
        <span className={styles.sectionIcon}><Headphones size={21}/></span>
        <div><span className={styles.sectionKicker}>{ru?'01 · ЛИЧНОЕ ОБРАЩЕНИЕ':'01 · PERSONAL MESSAGE'}</span>
          <h2>{ru?'Сообщение для вас':'A message for you'}</h2></div>
      </header>
      <div className={styles.mediaList}>
        {personalMedia.map(item=><PrivatePlayer key={item.assetId} item={item}
          session={session} mode={mode} selector={selector} locale={locale}/>)}
      </div>
    </section>}

    {hasRecommendation&&<>
      <SessionPrescriptionOverview recommendation={recommendation} locale={locale} part="summary"/>
      <SessionPrescriptionOverview recommendation={recommendation} locale={locale} part="remedies"/>
    </>}

    {session.report&&<section id="session-report" className={styles.clientSection}>
      <header className={styles.sectionHeader}>
        <span className={styles.sectionIcon}><FileDown size={20}/></span>
        <div><span className={styles.sectionKicker}>{ru?'ДОКУМЕНТ КОНСУЛЬТАЦИИ':'SESSION DOCUMENT'}</span>
          <h2>{ru?'Скачать полный отчёт':'Keep your full report'}</h2></div>
      </header>
      <div className={styles.reportPanel}>
        <p>{ru?'Все назначения и дополнительные пояснения сохранены в оригинальном PDF.':
          'Your original PDF contains the complete recommendations and additional details.'}</p>
        <a href={pdfPath} className={styles.downloadButton} download><FileDown size={20}/>
          {ru?'Скачать PDF-отчёт':'Download the full PDF'}</a>
      </div>
      {reportContent&&<details className={styles.reportDetails}>
        <summary>{ru?'Развернуть полную HTML-версию':'Read the full HTML document'}</summary>
        <div className={styles.reportContent}>{reportContent}</div>
      </details>}
    </section>}

    {guideMedia.length>0&&<section id="session-guide" className={styles.clientSection}>
      <header className={styles.sectionHeader}>
        <span className={styles.sectionIcon}><Video size={21}/></span>
        <div><span className={styles.sectionKicker}>{ru?'ВИДЕОИНСТРУКЦИЯ':'VIDEO GUIDE'}</span>
          <h2>{ru?'Как принимать назначенные препараты':'How to follow the recommendations'}</h2></div>
      </header>
      <p className={styles.sectionIntro}>{ru?'Дополнительное видео от специалиста. Индивидуальные дозировки остаются в вашем назначении выше.':
        'Your practitioner’s guidance video. Your personal dosage details remain in the written recommendation above.'}</p>
      <div className={styles.mediaList}>{guideMedia.map(item=><PrivatePlayer key={item.assetId} item={item}
        session={session} selector={selector} mode={mode} locale={locale}/>)}</div>
    </section>}

    {hasAdvice&&<section id="session-recommendations" className={styles.clientSection}>
      <header className={styles.sectionHeader}>
        <span className={styles.sectionIcon}><ListChecks size={20}/></span>
        <div><span className={styles.sectionKicker}>{ru?'ДАЛЬНЕЙШИЕ ШАГИ':'NEXT STEPS'}</span>
          <h2>{ru?'Дополнительные рекомендации':'Additional recommendations'}</h2></div>
      </header>
      {plan.additionalRecommendations&&<div className={styles.adviceCard}>
        <p>{plan.additionalRecommendations}</p>
      </div>}
      {takeaways.length>0&&<ol className={styles.takeawayList}>
        {takeaways.map((text,index)=><li key={index}>
          <span aria-hidden="true">{String(index+1).padStart(2,'0')}</span><p>{text}</p>
        </li>)}
      </ol>}
      {practices.length>0&&<div className={styles.practiceList}>
        {practices.map((practice,index)=><article className={styles.practiceCard} key={index}>
          <div className={styles.practiceNumber}>{index+1}</div>
          <div><h3>{practice.title}</h3>{practice.instructions&&<p>{practice.instructions}</p>}</div>
        </article>)}
      </div>}
      {hasRecommendation&&<SessionPrescriptionOverview recommendation={recommendation} locale={locale} part="extra"/>}
    </section>}

    {(supplementary.length>0||resources.length>0)&&<section id="session-resources" className={styles.clientSection}>
      <header className={styles.sectionHeader}>
        <span className={styles.sectionIcon}><FolderOpen size={20}/></span>
        <div><span className={styles.sectionKicker}>{ru?'ЛИЧНАЯ БИБЛИОТЕКА СЕССИИ':'YOUR SESSION MATERIALS'}</span>
          <h2>{ru?'Дополнительные материалы и медитации':'Additional materials & meditations'}</h2></div>
      </header>
      {supplementary.map(item=>item.kind==='pdf'
        ?<article className={styles.attachmentCard} key={item.assetId}>
          <FileDown size={21} aria-hidden="true"/><div><strong>{item.title||'PDF'}</strong>
            <small>{ru?'Приватный документ':'Private document'}</small></div>
          <a href={assetBase+item.assetId} target="_blank" rel="noopener noreferrer">
            {ru?'Скачать PDF':'Download PDF'} <ExternalLink size={16}/>
          </a>
        </article>
        :<PrivatePlayer key={item.assetId} item={item} session={session} selector={selector} mode={mode} locale={locale}/>)}
      {resources.map((item,index)=><a className={styles.attachmentCard} key={index}
        href={item.url} target="_blank" rel="noopener noreferrer">
        <BookOpen size={20} aria-hidden="true"/><div><strong>{item.title}</strong>
          {item.description&&<small>{item.description}</small>}</div>
        <ExternalLink size={17} aria-hidden="true"/>
      </a>)}
    </section>}

    <ClientSessionCabinetEntry locale={locale} variant="footer" appAvailable={appAvailable}/>

    <footer className={styles.clientFooter}>
      <p><LockKeyhole size={14}/>{ru?'Эта защищённая ссылка относится только к данной консультации. Не пересылайте её другим людям.':
        'This private invitation is for this session only. Please do not forward it.'}</p>
      <p className={styles.safetyLine}>{ru?
        'Информация носит справочный характер и не заменяет медицинскую диагностику или необходимую помощь.':
        'This information does not replace appropriate medical assessment or care.'}</p>
      {mode==='cabinet'&&<a href={'/'+locale+'/client/'+selector}><ArrowLeft size={17}/>
        {ru?'Все мои консультации':'All my sessions'}</a>}
    </footer>
  </main>
}
