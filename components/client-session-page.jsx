'use client'
import { useState, useRef } from 'react'
import { FileDown,Headphones,LockKeyhole,PlayCircle,Video,Images,BookOpen,ListChecks,ExternalLink,FolderOpen,ShieldCheck,Gift,BookmarkCheck } from 'lucide-react'
import { SessionPrescriptionOverview } from './client-session-prescription'
import { DaoStageDisclosure } from './dao-resource-stage'
import { PublicSiteHeader } from './public-site-header'
import { recommendationItemType } from '@/lib/documents/recommendation'
import { GRANULES_GUIDE_ID, GRANULES_GUIDE_TRANSCRIPT_RU } from '@/lib/clients/shared-education-model'
import { SaveClientSessionToAccount } from './save-client-session-to-account'
import { SessionExitSaveGuard } from './session-exit-save-guard'
import { SessionYouTubePlayer } from './session-youtube-player'
import { SessionPrivateVideoPoster } from './session-private-video-poster'
import styles from './client-session.module.css'

function PrivatePlayer({item,session,mode,selector,locale,savedId}) {
  const [source,setSource]=useState('')
  const [expiry,setExpiry]=useState(0)
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(false)
  const busy=useRef(false),player=useRef(null),resume=useRef(null)
  const isVideo=item.kind==='video',ru=locale==='ru',educational=item.role==='education',library=item.role==='library'
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
        <small>{library?(ru?'Дополнительное видео':'Supplementary video'):educational?(ru?'Общее видео · 1:02':'General video · Russian audio · 1:02'):
          isVideo?(ru?'Личное видео':'Personal video'):(ru?'Личная аудиозапись':'Personal audio')}</small></div>
    </div>
    {!source?(isVideo?
      <div className={styles.privateVideoPreview}>
        <SessionPrivateVideoPoster src={route}/>
        <button className={styles.privateVideoPreviewButton} type="button"
          disabled={loading} onClick={()=>load(false)}>
          <PlayCircle size={44} aria-hidden="true"/>
          <span>{loading?(ru?'Подключаем видео…':'Loading video…'):(ru?'Смотреть видео':'Play video')}</span>
        </button>
      </div>:
      <button className={styles.playButton} type="button" disabled={loading} onClick={()=>load(false)}>
        <PlayCircle size={26}/>{loading?(ru?'Подключаем…':'Loading…'):(ru?'Слушать / смотреть':'Play recording')}
      </button>)
      :isVideo?<video ref={player} className={styles.video} controls playsInline preload="metadata" src={source}
        onLoadedMetadata={restorePosition} onPlay={maybeRenew} onTimeUpdate={maybeRenew} onSeeking={maybeRenew} onError={playbackError}/>:
        <audio ref={player} className={styles.audio} controls preload="metadata" src={source}
          onLoadedMetadata={restorePosition} onPlay={maybeRenew} onTimeUpdate={maybeRenew} onSeeking={maybeRenew} onError={playbackError}/>}
    {item.transcript&&<details className={styles.transcript}><summary>{ru?'Текст записи':'Transcript'}</summary>
      <p lang={educational?'ru':undefined}>{item.transcript}</p></details>}
    {error&&<p role="alert" className={styles.error}>{error} <button type="button" onClick={()=>load(false)}>{ru?'Повторить':'Retry'}</button>{isMov&&<> <a href={route} download="consultation-video.mov">{ru?'Открыть оригинал MOV':'Open original MOV'}</a></>}</p>}
  </article>
}
// Embed the same private audio player directly after the signed report cover.
export function ClientSessionVoiceMessage({session,selector,locale='en',mode='guest',savedId=null}) {
  const ru=locale==='ru'
  const audio=(session?.media||[]).filter(item=>item.kind==='audio'&&item.role!=='hidden'&&
    (!item.role||item.role==='personal'))
  if(!audio.length)return null
  return <section id="session-message" className={styles.clientSection+' '+styles.reportVoiceSection}
    aria-label={ru?'Голосовое обращение':'Voice message'}>
    <header className={styles.sectionHeader}>
      <span className={styles.sectionIcon}><Headphones size={21}/></span>
      <div><span className={styles.sectionKicker}>{ru?'ГОЛОСОВОЕ ОБРАЩЕНИЕ':'VOICE MESSAGE'}</span>
        <h2>{ru?'Аудиосообщение для вас':'An audio message for you'}</h2></div>
    </header>
    <div className={styles.mediaList}>
      {audio.map(item=><PrivatePlayer key={item.assetId} item={item}
        session={session} mode={mode} selector={selector} locale={locale} savedId={savedId}/>)}
    </div>
  </section>
}
export function ClientSessionPage({session,selector,locale='en',mode='guest',reportContent=null,recommendation=null,clientName='',appAvailable=true,savedId=null,sharedGuideReady=false,audioEmbedded=false}) {
  const ru=locale==='ru'
  const date=new Intl.DateTimeFormat(ru?'ru-RU':'en-CA',{dateStyle:'long',timeZone:'UTC'})
    .format(new Date(session.occurredOn+'T12:00:00Z'))
  const plan=session.plan||{}
  const takeaways=Array.isArray(plan.takeaways)?plan.takeaways:[]
  const practices=Array.isArray(plan.practices)?plan.practices:[]
  const resources=Array.isArray(plan.resources)?plan.resources:[]
  const libraryMaterials=Array.isArray(plan.materials)?plan.materials:[]
  const youtubeResources=resources.filter(resource=>resource.kind==='youtube')
  const topYoutubeResources=youtubeResources.filter(resource=>resource.placement!=='materials')
  const materialsYoutubeResources=youtubeResources.filter(resource=>resource.placement==='materials')
  const linkedResources=resources.filter(resource=>resource.kind!=='youtube')
  const media=(session.media||[]).filter(item=>item.role!=='hidden')
  // Retain existing introductory videos; only explicitly selected videos
  // and approved study links appear in the final Materials section.
  const videoMedia=media.filter(item=>item.kind==='video'&&!['meditation','additional'].includes(item.role))
  const materialsVideos=media.filter(item=>item.kind==='video'&&['meditation','additional'].includes(item.role))
  const personalAudio=media.filter(item=>item.kind==='audio'&&(!item.role||item.role==='personal'))
  const photos=media.filter(item=>item.kind==='image')
  const supplementary=media.filter(item=>item.kind!=='image'&&item.kind!=='video'&&
    (item.kind==='pdf'||['meditation','additional'].includes(item.role)||
    (item.role==='instruction'&&item.kind==='audio')))
  const hasMaterials=Boolean(materialsVideos.length||materialsYoutubeResources.length||supplementary.length||linkedResources.length||libraryMaterials.length)
  const hasFullReport=Boolean(reportContent)
  const hasRecommendation=Boolean(recommendation?.items?.length)
  const recommendedTests=Array.isArray(recommendation?.recommendedTests)?recommendation.recommendedTests:[]
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
      hasMaterials?'#session-resources':'#session-title'
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
        {mode==='owner'&&!hasFullReport&&<span className={styles.clientWordmark}>Holistic House</span>}
        <span className={styles.sessionCrumb}>{ru?'МОЯ КОНСУЛЬТАЦИЯ':'MY CONSULTATION'}</span>
        <span className={styles.privateLabel}><ShieldCheck size={15}/>{ru?'Защищённые материалы':'Private materials'}</span>
      </div>
      {mode==='owner'&&<span className={styles.privateLabel}>{ru?'Предпросмотр специалиста':'Practitioner preview'}</span>}
    </header>
    {(videoMedia.length>0||topYoutubeResources.length>0)&&
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
        {topYoutubeResources.length>0&&<div className={styles.youtubeLessonList}>
          {topYoutubeResources.map((item,index)=><SessionYouTubePlayer
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
        <a href={nextAnchor} className={styles.nextStepLink}>{hasRecommendation?(ru?'Смотреть назначения ↓':'View prescriptions ↓'):(ru?'Перейти к материалам ↓':'Continue to materials ↓')}</a>
      </div>}
      <div className={styles.practitionerCredit}>{ru?'Подготовлено специалистом':'Prepared by'} · Andrii Litvinov · Holistic House</div>
    </section>}

    {!audioEmbedded&&!hasFullReport&&<ClientSessionVoiceMessage session={session}
      selector={selector} mode={mode} locale={locale} savedId={savedId}/>}
    {hasFullReport&&<section id="session-report" className={styles.fullReportSection}
      aria-label={ru?'Полный отчёт консультации':'Complete consultation report'}>
      <div className={styles.fullReportContent}>{reportContent}</div>
    </section>}

    {!audioEmbedded&&hasFullReport&&<ClientSessionVoiceMessage session={session}
      selector={selector} mode={mode} locale={locale} savedId={savedId}/>}

    {!hasFullReport&&hasRecommendation&&<>
      <SessionPrescriptionOverview recommendation={recommendation} locale={locale} part="summary"/>
      <SessionPrescriptionOverview recommendation={recommendation} locale={locale} part="remedies"/>
      <DaoStageDisclosure score={recommendation?.daoResourceScore} locale={locale}/>
    </>}

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


    {(hasFullReport||hasMaterials)&&<section id="session-resources"
      className={styles.clientSection+' '+styles.reportMaterialsSection}
      aria-labelledby="session-materials-title">
      <header className={styles.sectionHeader}>
        <span className={styles.sectionIcon}><FolderOpen size={20} aria-hidden="true"/></span>
        <div>
          <span className={styles.sectionKicker}>{ru?'К ВАШЕМУ ОТЧЁТУ':'WITH YOUR REPORT'}</span>
          <h2 id="session-materials-title">{ru?'Материалы':'Materials'}</h2>
          <p className={styles.reportMaterialsIntro}>{ru?
            'Подобрано специально для вашей консультации: видео, аудио и полезные материалы.':
            'Selected for your consultation: video, audio and helpful resources.'}</p>
        </div>
      </header>
      {materialsYoutubeResources.length>0&&<div className={styles.youtubeLessonList}>
        {materialsYoutubeResources.map((item,index)=><SessionYouTubePlayer
          key={item.url+'-'+index} title={item.title} url={item.url}
          description={item.description} locale={locale}/>)}
      </div>}
      {materialsVideos.length>0&&<div className={styles.mediaList}>
        {materialsVideos.map(item=><PrivatePlayer key={item.assetId} item={item}
          session={session} selector={selector} mode={mode} locale={locale} savedId={savedId}/>)}
      </div>}
      {supplementary.map(item=>item.kind==='pdf'
        ?<article className={styles.attachmentCard} key={item.assetId}>
          <FileDown size={21} aria-hidden="true"/><div><strong>{item.title||'PDF'}</strong>
            <small>{ru?'Приватный документ':'Private document'}</small></div>
          <a href={assetBase+encodeURIComponent(item.assetId)} target="_blank" rel="noopener noreferrer">
            {ru?'Скачать PDF':'Download PDF'} <ExternalLink size={16}/></a>
        </article>
        :<PrivatePlayer key={item.assetId} item={item} session={session} selector={selector}
          mode={mode} locale={locale} savedId={savedId}/>)}
      {linkedResources.map((item,index)=><a className={styles.attachmentCard} key={index}
        href={item.url} target="_blank" rel="noopener noreferrer">
        <BookOpen size={20} aria-hidden="true"/><div><strong>{item.title}</strong>
          {item.description&&<small>{item.description}</small>}</div>
        <ExternalLink size={17} aria-hidden="true"/>
      </a>)}
      {libraryMaterials.length>0&&<div className={styles.reportLibraryList}>
        {libraryMaterials.map(item=>item.kind==='youtube'
          ?<SessionYouTubePlayer key={item.id} title={item.title} description={item.description}
            url={item.url} locale={locale}/>
          :item.kind==='image'
            ?<figure className={styles.sessionPhotoCard} key={item.id}>
              <a href={assetBase+encodeURIComponent(item.id)} target="_blank"
                rel="noopener noreferrer" aria-label={ru?'Открыть фотографию в полном размере':'Open full-size photo'}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={assetBase+encodeURIComponent(item.id)} alt={item.title}
                  loading="lazy" decoding="async"/>
              </a>
              <figcaption>{item.title}</figcaption>
              {item.description&&<p>{item.description}</p>}
            </figure>
            :<PrivatePlayer key={item.id}
              item={{assetId:item.id,kind:'video',mime:item.mime,title:item.title,role:'library',transcript:''}}
              session={session} mode={mode} selector={selector} locale={locale} savedId={savedId}/>)}
      </div>}
      {!hasMaterials&&<p className={styles.reportMaterialsEmpty}>
        {ru?'Дополнительные материалы пока не выбраны.':'No additional materials have been selected yet.'}</p>}
    </section>}

    {recommendedTests.length>0&&<section id="session-recommended-tests"
      className={styles.clientSection+' '+styles.reportRecommendedTestsSection}
      aria-labelledby="session-recommended-tests-title">
      <header className={styles.sectionHeader}>
        <span className={styles.sectionIcon}><BookOpen size={20} aria-hidden="true"/></span>
        <div>
          <span className={styles.sectionKicker}>{ru?'ДЛЯ САМОСТОЯТЕЛЬНОЙ РАБОТЫ':'FOR YOUR NEXT STEP'}</span>
          <h2 id="session-recommended-tests-title">{ru?'Рекомендуемые тесты':'Recommended tests'}</h2>
        </div>
      </header>
      <p className={styles.reportRecommendedTestsIntro}>{ru
        ? 'Выберите тест, чтобы начать.'
        : 'Choose a test to begin.'}</p>
      <div className={styles.reportRecommendedTestList}>
        {recommendedTests.map(test=><a key={test.key} className={styles.reportRecommendedTestCard}
          href={test.href}>
          <span className={styles.reportRecommendedTestIcon}><BookOpen size={22} aria-hidden="true"/></span>
          <span className={styles.reportRecommendedTestText}>
            <strong>{test.title}</strong>
            <small>{test.startLocale!==locale
              ?(ru?'Откроется на доступном языке':'Opens in the available language')
              :(ru?'Пройти тест':'Take the test')}</small>
          </span>
          <ExternalLink size={18} className={styles.reportRecommendedTestArrow} aria-hidden="true"/>
        </a>)}
      </div>
    </section>}

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

    <nav className={styles.sessionBottomActions} data-hh-report-next-actions
      aria-label={ru?'Дальнейшие действия после отчёта':'After your report'}>
      <div className={styles.sessionBottomHeading}>
        <span className={styles.sectionKicker}>{ru?'СОХРАНИТЕ И ПРОДОЛЖАЙТЕ':'SAVE & CONTINUE'}</span>
        <h2>{ru?'Ваши следующие шаги':'Your next steps'}</h2>
      </div>
      {mode!=='saved'&&mode!=='owner'&&<SaveClientSessionToAccount
        locale={locale} appAvailable={appAvailable} compact/>}
      {mode==='owner'&&<button className={styles.sessionBottomPrimary} type="button" disabled>
        <BookmarkCheck size={20} aria-hidden="true"/>
        {ru?'Войти в мой кабинет и сохранить отчёт':'Sign in to my Cabinet and save report'}
      </button>}
      {mode==='saved'&&<a href={'/'+locale+'/app/portrait#personal-reports'}
        className={styles.sessionBottomPrimary}>
        <BookmarkCheck size={20} aria-hidden="true"/>
        {ru?'Открыть мой кабинет — отчёт сохранён':'Open my Cabinet — report saved'}
      </a>}
      <a href={'/'+locale+'/client'} className={styles.sessionBottomSecondary}>
        <Gift size={21} aria-hidden="true"/>
        {ru?'Пройти дополнительное тестирование (бонус)':'Take additional tests (bonus)'}
      </a>
      {mode==='owner'&&<p className={styles.sessionBottomHint} role="note">
        {ru?'Предпросмотр специалиста: кнопка сохранения становится активной у клиента по защищённой ссылке.':
          'Practitioner preview: the save button is enabled only for the client with an authorized report link.'}
      </p>}
      {!appAvailable&&mode!=='owner'&&mode!=='guest'&&<p className={styles.sessionBottomHint} role="status">
        {ru?'Сохранение через Google временно недоступно. Этот отчёт остаётся доступным по защищённой ссылке.':
          'Google saving is temporarily unavailable. This report remains accessible through its protected link.'}
      </p>}
    </nav>

    <footer className={styles.clientFooter}>
      <p><LockKeyhole size={14}/>{mode==='owner'?(ru?'Закрытый предпросмотр специалиста. Для клиента используйте отдельную ссылку на опубликованную сессию.':'Practitioner-only preview. Send clients only an approved session invitation.'):
        ru?'Эта защищённая ссылка относится только к данной консультации. Не пересылайте её другим людям.':
        'This private invitation is for this session only. Please do not forward it.'}</p>
      <p className={styles.safetyLine}>{ru?
        'Информация носит справочный характер и не заменяет медицинскую диагностику или необходимую помощь.':
        'This information does not replace appropriate medical assessment or care.'}</p>
    </footer>
  </main>
  const reportView=<div className={styles.sessionSiteShell} data-hh-report-theme="coastal-v2" lang={locale}>
    <PublicSiteHeader locale={locale} showAssessmentStrip={false}/>
    {content}
  </div>
  return mode==='saved'||mode==='owner'?reportView:<SessionExitSaveGuard locale={locale} selector={selector}
    sessionId={session.id} cabinetMode={mode==='cabinet'} appAvailable={appAvailable}>{reportView}</SessionExitSaveGuard>
}
