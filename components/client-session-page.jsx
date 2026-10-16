'use client'
import { useState, useRef } from 'react'
import { ArrowLeft,FileDown,Headphones,LockKeyhole,PlayCircle,Video,Images,BookOpen,ListChecks,ExternalLink,FolderOpen,ShieldCheck } from 'lucide-react'
import { SessionPrescriptionOverview } from './client-session-prescription'
import { ClientSessionCabinetEntry } from './client-session-cabinet-entry'
import { recommendationItemType } from '@/lib/documents/recommendation'
import { GRANULES_GUIDE_ID, GRANULES_GUIDE_TRANSCRIPT_RU } from '@/lib/clients/shared-education-model'
import { SaveClientSessionToAccount } from './save-client-session-to-account'
import { SessionExitSaveGuard } from './session-exit-save-guard'
import { SessionYouTubePlayer } from './session-youtube-player'
import styles from './client-session.module.css'

function PrivatePlayer({item,session,mode,selector,locale,savedId}) {
  const [source,setSource]=useState('')
  const [expiry,setExpiry]=useState(0)
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(false)
  const busy=useRef(false),player=useRef(null),resume=useRef(null)
  const isVideo=item.kind==='video',ru=locale==='ru',educational=item.role==='education'
  const isMov=isVideo&&item.mime==='video/quicktime'
  const route=mode==='owner'?'/api/admin/clients/'+selector+'/sessions/'+session.id+'/media/'+item.assetId:
    mode==='saved'?'/api/app/saved-sessions/'+savedId+'/media/'+item.assetId:
    mode==='guest'?'/api/client-session-viewer/'+selector+'/media/'+item.assetId:
    '/api/client/'+selector+'/sessions/'+session.id+'/media/'+item.assetId

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
    else{setSource('');setError(isMov?
      (ru?'Этот MOV/HEVC может не поддерживаться вашим браузером. Попробуйте открыть оригинальный файл.':'This MOV/HEVC may not play in your browser. Try opening the original file.'):
      (ru?'Откройте запись повторно':'Please reopen the recording'))}
  }
  return <article className={styles.clientMediaCard}>
    <div className={styles.mediaHeading}>{isVideo?<Video size={20}/>:<Headphones size={20}/>}
      <div><strong>{item.title||(isVideo?(ru?'Видеообращение':'Video message'):(ru?'Голосовое сообщение':'Voice message'))}</strong>
        <small>{educational?(ru?'Общее видео · 1:02':'General video · Russian audio · 1:02'):
          isVideo?(ru?'Личное видео':'Personal video'):(ru?'Личная аудиозапись':'Personal audio')}</small></div>
    </div>
    {!source?<button className={styles.playButton} type="button" disabled={loading} onClick={()=>load(false)}>
      <PlayCircle size={26}/>{loading?(ru?'Подключаем…':'Loading…'):(ru?'Слушать / смотреть':'Play recording')}</button>
      :isVideo?<video ref={player} className={styles.video} controls playsInline preload="metadata" src={source}
        onLoadedMetadata={restorePosition} onPlay={maybeRenew} onTimeUpdate={maybeRenew} onSeeking={maybeRenew} onError={playbackError}/>:
        <audio ref={player} className={styles.audio} controls preload="metadata" src={source}
          onLoadedMetadata={restorePosition} onPlay={maybeRenew} onTimeUpdate={maybeRenew} onSeeking={maybeRenew} onError={playbackError}/>}
    {item.transcript&&<details className={styles.transcript}><summary>{ru?'Текст записи':'Transcript'}</summary>
      <p lang={educational?'ru':undefined}>{item.transcript}</p></details>}
    {error&&<p role="alert" className={styles.error}>{error} <button type="button" onClick={()=>load(false)}>{ru?'Повторить':'Retry'}</button>{isMov&&<> <a href={route} download="consultation-video.mov">{ru?'Открыть оригинал MOV':'Open original MOV'}</a></>}</p>}
  </article>
}
export function ClientSessionPage({session,selector,locale='en',mode='guest',reportContent=null,recommendation=null,clientName='',appAvailable=true,savedId=null,sharedGuideReady=false}) {
  const ru=locale==='ru'
  const date=new Intl.DateTimeFormat(ru?'ru-RU':'en-CA',{dateStyle:'long',timeZone:'UTC'})
    .format(new Date(session.occurredOn+'T12:00:00Z'))
  const plan=session.plan||{}
  const takeaways=Array.isArray(plan.takeaways)?plan.takeaways:[]
  const practices=Array.isArray(plan.practices)?plan.practices:[]
  const resources=Array.isArray(plan.resources)?plan.resources:[]
  const youtubeResources=resources.filter(resource=>resource.kind==='youtube')
  const linkedResources=resources.filter(resource=>resource.kind!=='youtube')
  const media=session.media||[]
  // Private and approved YouTube videos go together above the report body.
  // Audio, PDF and photos remain in their own sections, without duplicates.
  const videoMedia=media.filter(item=>item.kind==='video')
  const personalAudio=media.filter(item=>item.kind==='audio'&&(!item.role||item.role==='personal'))
  const photos=media.filter(item=>item.kind==='image')
  const supplementary=media.filter(item=>item.kind!=='image'&&item.kind!=='video'&&
    (item.kind==='pdf'||['meditation','additional'].includes(item.role)||
    (item.role==='instruction'&&item.kind==='audio')))
  const hasFullReport=Boolean(reportContent)
  const hasRecommendation=Boolean(recommendation?.items?.length)
  const hasHomeopathyRecommendation=hasRecommendation&&recommendation.items.some(item=>
    recommendationItemType(item,recommendation.recommendationType)==='homeopathy')
  const pdfPath=mode==='owner'?'/admin/api/documents/'+(session.report?.id||'')+'/pdf?locale='+locale:
    mode==='saved'?'/api/app/saved-sessions/'+savedId+'/pdf?locale='+locale:
    mode==='guest'?'/api/client-session-viewer/'+selector+'/pdf?locale='+locale:
    '/api/client/'+selector+'/documents/'+(session.report?.id||'')+'/pdf?locale='+locale
  const assetBase=mode==='owner'?'/api/admin/clients/'+selector+'/sessions/'+session.id+'/media/':
    mode==='saved'?'/api/app/saved-sessions/'+savedId+'/media/':
    mode==='guest'?'/api/client-session-viewer/'+selector+'/media/':
    '/api/client/'+selector+'/sessions/'+session.id+'/media/'
  const nextAnchor=hasRecommendation?'#session-prescription':personalAudio.length?'#session-message':
    session.report?'#session-report':photos.length?'#session-photos':
      (supplementary.length||linkedResources.length)?'#session-resources':'#session-title'
  // The approved HTML document is the only source of report narrative and prescriptions.
  // Keep independently authored session messages visible without repeating report text.
  const authoredMessage=typeof session.summary==='string'?session.summary.trim():''
  const alreadyInReport=Boolean(hasFullReport&&authoredMessage&&[
    recommendation?.analysis,recommendation?.additionalNotes,recommendation?.generalInstructions,
  ].some(text=>typeof text==='string'&&text.includes(authoredMessage)))
  const extraSessionMessage=hasFullReport&&!alreadyInReport?authoredMessage:''
  const hasAdvice=Boolean(plan.additionalRecommendations||takeaways.length||practices.length||
    (hasFullReport?(extraSessionMessage||plan.nextStep||plan.focus):
      (recommendation?.additionalNotes||recommendation?.followUp||recommendation?.analysis)))
  const content=<main className={styles.clientPage+' '+styles.courseSessionPage+' '+styles.cabinetSessionPage} lang={locale}>
    <header className={styles.clientHeader}>
      <div className={styles.clientBrand}>
        {!hasFullReport&&<span className={styles.clientWordmark}>Holistic House</span>}
        <span className={styles.privateLabel}><ShieldCheck size={15}/>{ru?'Защищённые материалы':'Private materials'}</span>
      </div>
      {mode==='saved'?<a href={'/'+locale+'/app/portrait#personal-reports'} className={styles.savedSessionBack}>
        {ru?'← Мой кабинет':'← My Cabinet'}</a>
        :mode==='owner'?<span className={styles.privateLabel}>{ru?'Предпросмотр специалиста':'Practitioner preview'}</span>
        : <ClientSessionCabinetEntry locale={locale} variant="header" appAvailable={appAvailable}/>} 
    </header>
    {(videoMedia.length>0||youtubeResources.length>0)&&
      <section id="session-video" className={styles.clientSection+' '+styles.videoFirstSection}
        aria-label={ru?'Видео к вашей консультации':'Videos for your consultation'}>
        <header className={styles.sectionHeader}>
          <span className={styles.sectionIcon}><Video size={21}/></span>
          <div><span className={styles.sectionKicker}>{ru?'ВИДЕО К КОНСУЛЬТАЦИИ':'CONSULTATION VIDEOS'}</span>
            <h2>{ru?'Видео для вас':'Videos for you'}</h2></div>
        </header>
        {videoMedia.length>0&&<div className={styles.mediaList}>
          {videoMedia.map(item=><PrivatePlayer key={item.assetId} item={item}
            session={session} selector={selector} mode={mode} locale={locale} savedId={savedId}/>)}
        </div>}
        {youtubeResources.length>0&&<div className={styles.youtubeLessonList}>
          {youtubeResources.map((item,index)=><SessionYouTubePlayer
            key={item.url+'-'+index} title={item.title} url={item.url}
            description={item.description} locale={locale}/>)}
        </div>}
      </section>}
    {!hasFullReport&&<section className={styles.sessionHero} aria-labelledby="session-title">
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
    </section>}

    {hasFullReport&&<section id="session-report" className={styles.fullReportSection}
      aria-label={ru?'Полный отчёт консультации':'Complete consultation report'}>
      <div className={styles.fullReportContent}>{reportContent}</div>
    </section>}

    {personalAudio.length>0&&<section id="session-message" className={styles.clientSection} aria-label={ru?'Голосовое обращение':'Voice message'}>
      <header className={styles.sectionHeader}>
        <span className={styles.sectionIcon}><Headphones size={21}/></span>
        <div><span className={styles.sectionKicker}>{ru?'ГОЛОСОВОЕ ОБРАЩЕНИЕ':'VOICE MESSAGE'}</span>
          <h2>{ru?'Аудиосообщение для вас':'An audio message for you'}</h2></div>
      </header>
      <div className={styles.mediaList}>
        {personalAudio.map(item=><PrivatePlayer key={item.assetId} item={item}
          session={session} mode={mode} selector={selector} locale={locale} savedId={savedId}/>)}
      </div>
    </section>}

    {!hasFullReport&&hasRecommendation&&<>
      <SessionPrescriptionOverview recommendation={recommendation} locale={locale} part="summary"/>
      <SessionPrescriptionOverview recommendation={recommendation} locale={locale} part="remedies"/>
    </>}

    {session.report&&<section id={hasFullReport?'session-download':'session-report'} className={styles.clientSection+' '+styles.reportDownloadSection}>
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
    </section>}

    {photos.length>0&&<section id="session-photos" className={styles.clientSection}>
      <header className={styles.sectionHeader}>
        <span className={styles.sectionIcon}><Images size={21}/></span>
        <div><span className={styles.sectionKicker}>{ru?'ФОТОМАТЕРИАЛЫ':'PHOTO ATTACHMENTS'}</span>
          <h2>{ru?'Фотографии к вашей консультации':'Photos from your consultation'}</h2></div>
      </header>
      <div className={styles.sessionPhotoGallery}>
        {photos.map(item=><figure key={item.assetId} className={styles.sessionPhotoCard}>
          <a href={assetBase+encodeURIComponent(item.assetId)} target="_blank" rel="noopener noreferrer"
            aria-label={ru?'Открыть фотографию в полном размере':'Open full-size photo'}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={assetBase+encodeURIComponent(item.assetId)}
              alt={item.title||(ru?'Фото консультации':'Consultation photo')} loading="lazy" decoding="async"/>
          </a>
          {item.title&&<figcaption>{item.title}</figcaption>}
        </figure>)}
      </div>
    </section>}

    {hasAdvice&&<section id="session-recommendations" className={styles.clientSection}>
      <header className={styles.sectionHeader}>
        <span className={styles.sectionIcon}><ListChecks size={20}/></span>
        <div><span className={styles.sectionKicker}>{ru?'ДАЛЬНЕЙШИЕ ШАГИ':'NEXT STEPS'}</span>
          <h2>{ru?'Дополнительные рекомендации':'Additional recommendations'}</h2></div>
      </header>
      {extraSessionMessage&&<div className={styles.adviceCard}>
        <strong>{ru?'Личное сообщение специалиста':'Personal message from your practitioner'}</strong>
        <p className={styles.plainReportText}>{extraSessionMessage}</p>
      </div>}
      {hasFullReport&&plan.nextStep&&<div className={styles.adviceCard}><p className={styles.plainReportText}>{plan.nextStep}</p></div>}
      {hasFullReport&&plan.focus&&plan.focus!==plan.nextStep&&<div className={styles.adviceCard}><p className={styles.plainReportText}>{plan.focus}</p></div>}
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
      {!hasFullReport&&hasRecommendation&&<SessionPrescriptionOverview recommendation={recommendation} locale={locale} part="extra"/>}
    </section>}

    {(supplementary.length>0||linkedResources.length>0)&&<section id="session-resources" className={styles.clientSection}>
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
        :<PrivatePlayer key={item.assetId} item={item} session={session} selector={selector} mode={mode} locale={locale} savedId={savedId}/>)}
      {linkedResources.map((item,index)=><a className={styles.attachmentCard} key={index}
        href={item.url} target="_blank" rel="noopener noreferrer">
        <BookOpen size={20} aria-hidden="true"/><div><strong>{item.title}</strong>
          {item.description&&<small>{item.description}</small>}</div>
        <ExternalLink size={17} aria-hidden="true"/>
      </a>)}
    </section>}

    {hasHomeopathyRecommendation&&sharedGuideReady&&
      <section id="session-granules-guide" className={styles.clientSection+' '+styles.sharedEducationSection}
        aria-labelledby="session-granules-guide-title">
        <header className={styles.sectionHeader}>
          <span className={styles.sectionIcon}><Video size={21}/></span>
          <div><span className={styles.sectionKicker}>{ru?'ПОЛЕЗНО ПОСЛЕ КОНСУЛЬТАЦИИ':'AFTER YOUR CONSULTATION'}</span>
            <h2 id="session-granules-guide-title">{ru?'Видео: сколько гранул гомеопатии принимать?':
              'Video: How many homeopathic pellets?'}</h2></div>
        </header>
        <p className={styles.sectionIntro}>{ru?
          'Короткое общее объяснение от Андрея Литвинова. Ваша индивидуальная схема указана выше в отчёте.':
          'A short explanation from Andrey Litvinov, in Russian. Your personal instructions are in the report above.'}</p>
        <div className={styles.mediaList}>
          <PrivatePlayer item={{
            assetId:GRANULES_GUIDE_ID,kind:'video',role:'education',
            title:ru?'Сколько гранул принимать?':'How many pellets? (Russian audio)',
            transcript:GRANULES_GUIDE_TRANSCRIPT_RU,
          }} session={session} mode={mode} selector={selector} locale={locale} savedId={savedId}/>
        </div>
        <p className={styles.sharedGuideCaution}>{ru?
          'Сравнения количества гранул в видео — личные наблюдения, а не научно подтверждённая зависимость эффекта от дозы. Не меняйте назначение по этому ролику и следуйте рекомендациям в вашем отчёте.':
          'The video’s comparisons are personal impressions and do not prove that more pellets have a stronger effect. Do not change your amount based on this video; follow your individual written instructions.'}</p>
      </section>}

    {mode!=='saved'&&mode!=='owner'&&<SaveClientSessionToAccount locale={locale} selector={selector}
      sessionId={mode==='cabinet'?session.id:null} appAvailable={appAvailable}/>}
    {mode!=='saved'&&mode!=='owner'&&<ClientSessionCabinetEntry locale={locale} variant="footer" appAvailable={appAvailable}/>}


    <footer className={styles.clientFooter}>
      <p><LockKeyhole size={14}/>{mode==='owner'?(ru?'Закрытый предпросмотр специалиста. Для клиента используйте отдельную ссылку на опубликованную сессию.':'Practitioner-only preview. Send clients only an approved session invitation.'):
        ru?'Эта защищённая ссылка относится только к данной консультации. Не пересылайте её другим людям.':
        'This private invitation is for this session only. Please do not forward it.'}</p>
      <p className={styles.safetyLine}>{ru?
        'Информация носит справочный характер и не заменяет медицинскую диагностику или необходимую помощь.':
        'This information does not replace appropriate medical assessment or care.'}</p>
      {mode==='saved'&&<a href={'/'+locale+'/app/portrait#personal-reports'}>
        <ArrowLeft size={17}/>{ru?'Мои сохранённые отчёты':'My saved reports'}</a>}
      {mode==='cabinet'&&<a href={'/'+locale+'/client/'+selector}><ArrowLeft size={17}/>
        {ru?'Все мои консультации':'All my sessions'}</a>}
    </footer>
  </main>
  return mode==='saved'||mode==='owner'?content:<SessionExitSaveGuard locale={locale} selector={selector}
    sessionId={session.id} cabinetMode={mode==='cabinet'} appAvailable={appAvailable}>{content}</SessionExitSaveGuard>
}
