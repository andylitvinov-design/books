'use client'
import { useState } from 'react'
import { ArrowLeft,FileDown,Headphones,LockKeyhole,PlayCircle,Video,CalendarDays } from 'lucide-react'
import styles from './client-session.module.css'

async function requestPlayback(url) {
  const res=await fetch(url,{method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'content-type':'application/json'},body:'{}'})
  if(!res.ok) throw new Error('Private media unavailable')
  const data=await res.json()
  if(!data.url||!data.url.startsWith('https://')) throw new Error('Private media unavailable')
  return data.url
}
function PrivatePlayer({item,session,mode,selector,locale}) {
  const [source,setSource]=useState('')
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(false)
  const isVideo=item.kind==='video'
  const ru=locale==='ru'
  const route=mode==='guest'
    ? '/api/client-session-viewer/'+selector+'/media/'+item.assetId
    : '/api/client/'+selector+'/sessions/'+session.id+'/media/'+item.assetId
  async function load() {
    setLoading(true);setError('')
    try{setSource(await requestPlayback(route))}
    catch(e){setError(ru?'Запись недоступна. Попробуйте ещё раз.':'Recording unavailable. Please try again.')}
    finally{setLoading(false)}
  }
  return <article className={styles.clientMediaCard}>
    <div className={styles.mediaHeading}>{isVideo?<Video size={20}/>:<Headphones size={20}/>}
      <div><strong>{item.title||(isVideo?(ru?'Видеообращение':'Video message'):(ru?'Голосовое сообщение':'Voice message'))}</strong>
        <small>{isVideo?(ru?'Личное видео':'Personal video'):(ru?'Личная аудиозапись':'Personal audio')}</small></div>
    </div>
    {!source?<button className={styles.playButton} type="button" disabled={loading} onClick={load}>
      <PlayCircle size={26}/>{loading?(ru?'Подключаем…':'Loading…'):(ru?'Слушать / смотреть':'Play recording')}</button>
      :isVideo?<video className={styles.video} controls playsInline preload="metadata" src={source}
        onError={()=>{setSource('');setError(ru?'Откройте запись повторно':'Please reopen the recording')}}/>:
        <audio className={styles.audio} controls preload="metadata" src={source}
          onError={()=>{setSource('');setError(ru?'Откройте запись повторно':'Please reopen the recording')}}/>}
    {item.transcript&&<details className={styles.transcript}><summary>{ru?'Текст записи':'Transcript'}</summary>
      <p>{item.transcript}</p></details>}
    {error&&<p role="alert" className={styles.error}>{error} <button type="button" onClick={load}>{ru?'Повторить':'Retry'}</button></p>}
  </article>
}
export function ClientSessionPage({session,selector,locale='en',mode='guest',reportContent=null}) {
  const ru=locale==='ru'
  const date=new Intl.DateTimeFormat(ru?'ru-RU':'en-CA',{dateStyle:'long',timeZone:'UTC'})
    .format(new Date(session.occurredOn+'T12:00:00Z'))
  const path=mode==='guest'?'/api/client-session-viewer/'+selector+'/pdf?locale='+locale:
    '/api/client/'+selector+'/documents/'+(session.report?.id||'')+'/pdf?locale='+locale
  return <main className={styles.clientPage}>
    <header className={styles.clientHeader}>
      <div className={styles.clientBrand}><span className={styles.eyebrow}>HOLISTIC HOUSE · {ru?'ЛИЧНО':'PRIVATE'}</span>
        <h1>{ru?'Ваша консультация':'Your consultation'}</h1></div>
      <LockKeyhole size={22} aria-label={ru?'Приватная страница':'Private page'}/>
    </header>
    <section className={styles.welcomeCard}>
      <div className={styles.dateRow}><CalendarDays size={17}/><span>{date}</span></div>
      <h2>{session.title}</h2>
      {session.summary&&<p className={styles.sessionSummary}>{session.summary}</p>}
      <p className={styles.practitionerCredit}>Andrii Litvinov · Holistic House</p>
    </section>
    {session.media?.length>0&&<section className={styles.clientSection}>
      <h2>{ru?'Личные записи и практики':'Your voice messages & practices'}</h2>
      <div className={styles.mediaList}>{session.media.map(item=>
        <PrivatePlayer key={item.assetId} item={item} session={session} mode={mode} selector={selector} locale={locale}/>)}</div>
    </section>}
    {session.report&&<section className={styles.clientSection}>
      <h2>{ru?'Ваш персональный отчёт':'Your personal report'}</h2>
      <div className={styles.reportPanel}>
        <p>{ru?'Документ подготовлен для этой консультации. Скачать настоящий PDF можно по кнопке ниже.':
          'Your report is attached to this consultation. Download the original PDF below.'}</p>
        <a href={path} className={styles.downloadButton} download><FileDown size={20}/>{ru?'Скачать PDF-отчёт':'Download PDF report'}</a>
      </div>
      {reportContent&&<details className={styles.reportDetails}>
        <summary>{ru?'Прочитать отчёт на странице':'Read report on this page'}</summary>
        <div className={styles.reportContent}>{reportContent}</div>
      </details>}
    </section>}
    <footer className={styles.clientFooter}>
      <p><LockKeyhole size={14}/>{ru?'Этот материал относится только к данной консультации.':'This page only contains materials from this consultation.'}</p>
      {mode==='cabinet'&&<a href={'/'+locale+'/client/'+selector}><ArrowLeft size={17}/>{ru?'Ко всем документам':'Back to my cabinet'}</a>}
    </footer>
  </main>
}
