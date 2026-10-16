'use client'
import { useState, useRef } from 'react'
import { ArrowLeft,ChevronDown,FileDown,Headphones,LockKeyhole,PlayCircle,Video,Images,BookOpen,ListChecks,ExternalLink,FolderOpen,ShieldCheck } from 'lucide-react'
import { SessionPrescriptionOverview } from './client-session-prescription'
import { ClientSessionCabinetEntry } from './client-session-cabinet-entry'
import { recommendationItemType } from '@/lib/documents/recommendation'
import { GRANULES_GUIDE_ID, GRANULES_GUIDE_TRANSCRIPT_RU } from '@/lib/clients/shared-education-model'
import { SaveClientSessionToAccount } from './save-client-session-to-account'
import { SessionExitSaveGuard } from './session-exit-save-guard'
import styles from './client-session.module.css'

function PrivatePlayer({item,session,mode,selector,locale,savedId}) {
  const [source,setSource]=useState('')
  const [expiry,setExpiry]=useState(0)
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(false)
  const busy=useRef(false),player=useRef(null),resume=useRef(null)
  const isVideo=item.kind==='video',ru=locale==='ru',educational=item.role==='education'
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
    else{setSource('');setError(ru?'Откройте запись повторно':'Please reopen the recording')}
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
    {item.transcript&&<div className={styles.transcriptText}>
      <strong>{ru?'Текст записи':'Transcript'}</strong>
      <p lang={educational?'ru':undefined}>{item.transcript}</p>
    </div>}
    {error&&<p role="alert" className={styles.error}>{error} <button type="button" onClick={()=>load(false)}>{ru?'Повторить':'Retry'}</button></p>}
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
  const media=session.media||[]
  const personalMedia=media.filter(item=>['audio','video'].includes(item.kind)&&(!item.role||item.role==='personal'))
    .sort((a,b)=>(a.kind==='video'?0:1)-(b.kind==='video'?0:1))
  const guideMedia=media.filter(item=>item.kind==='video'&&item.role==='instruction')
  const photos=media.filter(item=>item.kind==='image')
  const supplementary=media.filter(item=>item.kind!=='image'&&(item.kind==='pdf'||['meditation','additional'].includes(item.role)||
    (item.role==='instruction'&&item.kind==='audio')))
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
  const hasReportAppendix=Boolean(recommendation?.includeDistanceHomeopathy||
    recommendation?.items?.some(item=>item?.remedySlug))
  const hasAdvice=Boolean(plan.nextStep||plan.focus||plan.additionalRecommendations||takeaways.length||practices.length||
    recommendation?.generalInstructions||recommendation?.includeDistanceHomeopathy||recommendation?.followUpDate||
    recommendation?.additionalNotes||recommendation?.followUp||recommendation?.analysis)
  const content=<main className={styles.clientPage+' '+styles.courseSessionPage+' '+styles.cabinetSessionPage} lang={locale}>
    <header className={styles.clientHeader}>
      <div className={styles.clientBrand}><span className={styles.clientWordmark}>Holistic House</span>
        <span className={styles.privateLabel}><ShieldCheck size={15}/>{ru?'Защищённые материалы':'Private materials'}</span>
      </div>
      {mode==='saved'?<a href={'/'+locale+'/app/portrait#personal-reports'} className={styles.savedSessionBack}>
        {ru?'← Мой кабинет':'← My Cabinet'}</a>
        :mode==='owner'?<span className={styles.privateLabel}>{ru?'Предпросмотр специалиста':'Practitioner preview'}</span>
        : <ClientSessionCabinetEntry locale={locale} variant="header" appAvailable={appAvailable}/>} 
    </header>
    <section className={styles.sessionHero} aria-labelledby="session-title">
      <span className={styles.sectionKicker}>{ru?'ПЕРСОНАЛЬНЫЙ ПЛАН':'PERSONAL SESSION GUIDE'}</span>
      <h1 id="session-title">{session.title}</h1>
      <dl className={styles.sessionIdentity}>
        {clientName&&<div><dt>{ru?'Клиент':'Client'}</dt><dd>{clientName}</dd></div>}
        <div><dt>{ru?'Дата консультации':'Consultation date'}</dt>
          <dd><time dateTime={session.occurredOn}>{date}</time></dd></div>
      </dl>
      {session.summary&&<details className={styles.sessionDisclosure+' '+styles.heroDisclosure}>
        <summary className={styles.heroDisclosureTitle}>
          <span>{ru?'Итог консультации':'Session summary'}</span>
          <ChevronDown size={19} className={styles.disclosureChevron} aria-hidden="true"/>
        </summary>
        <div className={styles.disclosureBody}><p className={styles.sessionSummary}>{session.summary}</p></div>
      </details>}
      <div className={styles.practitionerCredit}>{ru?'Подготовлено специалистом':'Prepared by'} · Andrii Litvinov · Holistic House</div>
    </section>

    {hasRecommendation&&<SessionPrescriptionOverview recommendation={recommendation} locale={locale} part="remedies"/>}

    {hasAdvice&&<section id="session-recommendations" className={styles.clientSection}>
      <details className={styles.sessionDisclosure}>
      <summary className={styles.sectionHeader}>
        <span className={styles.sectionIcon}><ListChecks size={20}/></span>
        <div><span className={styles.sectionKicker}>{ru?'ДАЛЬНЕЙШИЕ ШАГИ':'NEXT STEPS'}</span>
          <h2>{ru?'Дополнительные рекомендации':'Additional recommendations'}</h2></div>
      <ChevronDown size={20} className={styles.disclosureChevron} aria-hidden="true"/>
      </summary>
      <div className={styles.disclosureBody}>
      {plan.nextStep&&<div className={styles.adviceCard}><p><strong>{ru?'Следующий шаг':'Next step'}:</strong> {plan.nextStep}</p></div>}
      {plan.focus&&plan.focus!==plan.nextStep&&<div className={styles.adviceCard}><p>{plan.focus}</p></div>}
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
    </div>
    </details>
  </section>}

    {personalMedia.length>0&&<section id="session-message" className={styles.clientSection} aria-label={ru?'Личное обращение':'Personal message'}>
      <details className={styles.sessionDisclosure}>
      <summary className={styles.sectionHeader}>
        <span className={styles.sectionIcon}><Headphones size={21}/></span>
        <div><span className={styles.sectionKicker}>{ru?'ЛИЧНОЕ ОБРАЩЕНИЕ':'PERSONAL MESSAGE'}</span>
          <h2>{ru?'Сообщение для вас':'A message for you'}</h2></div>
      <ChevronDown size={20} className={styles.disclosureChevron} aria-hidden="true"/>
      </summary>
      <div className={styles.disclosureBody}>
      <div className={styles.mediaList}>
        {personalMedia.map(item=><PrivatePlayer key={item.assetId} item={item}
          session={session} mode={mode} selector={selector} locale={locale} savedId={savedId}/>)}
      </div>
    </div>
    </details>
  </section>}

    {photos.length>0&&<section id="session-photos" className={styles.clientSection}>
      <details className={styles.sessionDisclosure}>
      <summary className={styles.sectionHeader}>
        <span className={styles.sectionIcon}><Images size={21}/></span>
        <div><span className={styles.sectionKicker}>{ru?'ФОТОМАТЕРИАЛЫ':'PHOTO ATTACHMENTS'}</span>
          <h2>{ru?'Фотографии к вашей консультации':'Photos from your consultation'}</h2></div>
      <ChevronDown size={20} className={styles.disclosureChevron} aria-hidden="true"/>
      </summary>
      <div className={styles.disclosureBody}>
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
    </div>
    </details>
  </section>}

    {guideMedia.length>0&&<section id="session-guide" className={styles.clientSection}>
      <details className={styles.sessionDisclosure}>
      <summary className={styles.sectionHeader}>
        <span className={styles.sectionIcon}><Video size={21}/></span>
        <div><span className={styles.sectionKicker}>{ru?'ВИДЕОИНСТРУКЦИЯ':'VIDEO GUIDE'}</span>
          <h2>{ru?'Как принимать назначенные препараты':'How to follow the recommendations'}</h2></div>
      <ChevronDown size={20} className={styles.disclosureChevron} aria-hidden="true"/>
      </summary>
      <div className={styles.disclosureBody}>
      <p className={styles.sectionIntro}>{ru?'Дополнительное видео от специалиста. Индивидуальные дозировки остаются в вашем назначении выше.':
        'Your practitioner’s guidance video. Your personal dosage details remain in the written recommendation above.'}</p>
      <div className={styles.mediaList}>{guideMedia.map(item=><PrivatePlayer key={item.assetId} item={item}
        session={session} selector={selector} mode={mode} locale={locale} savedId={savedId}/>)}</div>
    </div>
    </details>
  </section>}

    {(supplementary.length>0||resources.length>0)&&<section id="session-resources" className={styles.clientSection}>
      <details className={styles.sessionDisclosure}>
      <summary className={styles.sectionHeader}>
        <span className={styles.sectionIcon}><FolderOpen size={20}/></span>
        <div><span className={styles.sectionKicker}>{ru?'ЛИЧНАЯ БИБЛИОТЕКА СЕССИИ':'YOUR SESSION MATERIALS'}</span>
          <h2>{ru?'Дополнительные материалы и медитации':'Additional materials & meditations'}</h2></div>
      <ChevronDown size={20} className={styles.disclosureChevron} aria-hidden="true"/>
      </summary>
      <div className={styles.disclosureBody}>
      {supplementary.map(item=>item.kind==='pdf'
        ?<article className={styles.attachmentCard} key={item.assetId}>
          <FileDown size={21} aria-hidden="true"/><div><strong>{item.title||'PDF'}</strong>
            <small>{ru?'Приватный документ':'Private document'}</small></div>
          <a href={assetBase+item.assetId} target="_blank" rel="noopener noreferrer">
            {ru?'Скачать PDF':'Download PDF'} <ExternalLink size={16}/>
          </a>
        </article>
        :<PrivatePlayer key={item.assetId} item={item} session={session} selector={selector} mode={mode} locale={locale} savedId={savedId}/>)}
      {resources.map((item,index)=><a className={styles.attachmentCard} key={index}
        href={item.url} target="_blank" rel="noopener noreferrer">
        <BookOpen size={20} aria-hidden="true"/><div><strong>{item.title}</strong>
          {item.description&&<small>{item.description}</small>}</div>
        <ExternalLink size={17} aria-hidden="true"/>
      </a>)}
    </div>
    </details>
  </section>}

    {hasHomeopathyRecommendation&&sharedGuideReady&&
      <section id="session-granules-guide" className={styles.clientSection+' '+styles.sharedEducationSection}
        aria-labelledby="session-granules-guide-title">
        <details className={styles.sessionDisclosure}>
      <summary className={styles.sectionHeader}>
          <span className={styles.sectionIcon}><Video size={21}/></span>
          <div><span className={styles.sectionKicker}>{ru?'ПОЛЕЗНО ПОСЛЕ КОНСУЛЬТАЦИИ':'AFTER YOUR CONSULTATION'}</span>
            <h2 id="session-granules-guide-title">{ru?'Видео: сколько гранул гомеопатии принимать?':
              'Video: How many homeopathic pellets?'}</h2></div>
        <ChevronDown size={20} className={styles.disclosureChevron} aria-hidden="true"/>
      </summary>
      <div className={styles.disclosureBody}>
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
      </div>
    </details>
  </section>}

    {reportContent&&(!hasRecommendation||hasReportAppendix)&&<section id="session-report-content" className={styles.clientSection}>
      <details className={styles.sessionDisclosure}>
        <summary className={styles.sectionHeader}>
          <span className={styles.sectionIcon}><BookOpen size={20}/></span>
          <div>
              <span className={styles.sectionKicker}>{hasRecommendation
                ?(ru?'СПРАВОЧНЫЕ МАТЕРИАЛЫ':'REFERENCE MATERIALS')
                :(ru?'ДОКУМЕНТ КОНСУЛЬТАЦИИ':'SESSION DOCUMENT')}</span>
              <h2>{hasRecommendation
                ?(ru?'Приложения к отчёту':'Report appendices')
                :(ru?'Полный текст консультации':'Full consultation text')}</h2>
            </div>
          <ChevronDown size={20} className={styles.disclosureChevron} aria-hidden="true"/>
        </summary>
        <div className={styles.disclosureBody+' '+styles.reportContent}>{reportContent}</div>
      </details>
    </section>}

    {session.report&&<section id="session-report" className={styles.clientSection+' '+styles.downloadSection}>
      <div className={styles.reportPanel}>
        <div className={styles.downloadCopy}>
          <FileDown size={20} aria-hidden="true"/>
          <div><span className={styles.sectionKicker}>{ru?'ВАШ ДОКУМЕНТ':'YOUR DOCUMENT'}</span>
            <h2>{ru?'Полный отчёт':'Full report'}</h2></div>
        </div>
        <a href={pdfPath} className={styles.downloadButton} download>
          <FileDown size={20} aria-hidden="true"/>{ru?'Скачать отчёт':'Download report'}
        </a>
      </div>
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
