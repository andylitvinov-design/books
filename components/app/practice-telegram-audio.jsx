'use client'
import Link from 'next/link'
import {useCallback,useEffect,useRef,useState} from 'react'
import {ChevronRight,Headphones,LockKeyhole,Pause,Play,RefreshCw} from 'lucide-react'
import {fetchPracticeTelegramAudio} from '@/lib/practitioners/practice-telegram-auth-fetch.mjs'
import {practiceTelegramRecentAudio} from '@/lib/practitioners/practice-telegram-recent-audio.mjs'
import styles from './practice-telegram-audio.module.css'

const COPY={
  en:{title:'Recently from Telegram',all:'All recordings',refresh:'Refresh Telegram audio',
    loading:'Loading recent recordings…',empty:'No Telegram recordings yet. Forward an audio to Dot first.',
    failed:'Could not load Telegram audio. Check your sign-in and retry.',
    play:'Play',pause:'Pause',playFailed:'Could not play this recording. Try again.',
    private:'Private · only you can listen',audio:'Audio from Telegram',dot:'Send audio via Dot'},
  ru:{title:'Последние аудио из Telegram',all:'Все записи',refresh:'Обновить аудио из Telegram',
    loading:'Загружаем последние записи…',empty:'Из Telegram пока нет записей. Перешлите аудио в Dot.',
    failed:'Не удалось загрузить аудио Telegram. Проверьте вход и повторите попытку.',
    play:'Воспроизвести',pause:'Пауза',playFailed:'Не удалось воспроизвести запись. Попробуйте ещё раз.',
    private:'Приватно · доступно только вам',audio:'Аудио из Telegram',dot:'Добавить через Dot'},
  es:{title:'Audios recientes de Telegram',all:'Todas las grabaciones',refresh:'Actualizar audios de Telegram',
    loading:'Cargando grabaciones recientes…',empty:'Aún no hay audios de Telegram. Reenvía uno a Dot.',
    failed:'No se pudieron cargar los audios. Comprueba tu sesión e inténtalo de nuevo.',
    play:'Reproducir',pause:'Pausar',playFailed:'No se pudo reproducir. Inténtalo de nuevo.',
    private:'Privado · solo tú puedes escucharlo',audio:'Audio de Telegram',dot:'Añadir desde Dot'}
}
const timeLabel=seconds=>{
  const n=Math.max(0,Math.floor(Number(seconds)||0))
  return n?Math.floor(n/60)+':'+String(n%60).padStart(2,'0'):''
}
const dateLabel=(value,locale)=>{
  const date=new Date(value)
  if(!Number.isFinite(date.getTime()))return ''
  return date.toLocaleString(locale==='ru'?'ru-RU':locale==='es'?'es-ES':'en-CA',
    {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})
}

export default function PracticeTelegramAudio({locale='en',query=''}) {
  const lang=COPY[locale]?locale:'en',t=COPY[lang]
  const [files,setFiles]=useState([])
  const [busy,setBusy]=useState(true)
  const [failed,setFailed]=useState(false)
  const [playing,setPlaying]=useState('')
  const [playFailed,setPlayFailed]=useState('')
  const players=useRef(new Map())
  const pending=useRef(null)

  const refresh=useCallback(async()=>{
    pending.current?.abort()
    const controller=new AbortController()
    pending.current=controller
    setBusy(true);setFailed(false)
    try{
      const files=await fetchPracticeTelegramAudio(fetch,controller.signal)
      if(!controller.signal.aborted)setFiles(files)
    }catch{
      if(!controller.signal.aborted)setFailed(true)
    }finally{
      if(!controller.signal.aborted)setBusy(false)
    }
  },[])
  useEffect(()=>{
    void refresh()
    const currentPlayers=players.current
    // Refresh after returning from Telegram, not via a background poll.
    const onVisible=()=>{if(document.visibilityState==='visible')void refresh()}
    document.addEventListener('visibilitychange',onVisible)
    return ()=>{
      pending.current?.abort()
      document.removeEventListener('visibilitychange',onVisible)
      for(const player of currentPlayers.values())player.pause()
    }
  },[refresh])

  function toggle(id){
    const player=players.current.get(id)
    if(!player)return
    setPlayFailed('')
    if(!player.paused){player.pause();return}
    for(const [otherId,other] of players.current){
      if(otherId!==id&&!other.paused)other.pause()
    }
    // The gesture invokes play() directly, so Safari can start without autoplay.
    void player.play().then(()=>setPlaying(id)).catch(()=>{
      setPlayFailed(id)
      setPlaying(current=>current===id?'':current)
    })
  }

  const recent=practiceTelegramRecentAudio(files,query,4)
  return <section className={styles.root} data-practice-telegram-audio>
    <div className={styles.header}>
      <h4><Headphones size={16} aria-hidden="true"/>{t.title}</h4>
      <div className={styles.actions}>
        <button type="button" className={styles.refresh} onClick={()=>void refresh()}
          disabled={busy} aria-label={t.refresh} title={t.refresh}
          data-practice-telegram-refresh>
          <RefreshCw size={16} aria-hidden="true"/>
        </button>
        <Link href="/admin/materials/telegram" className={styles.all} data-practice-telegram-all>
          {t.all}<ChevronRight size={15} aria-hidden="true"/>
        </Link>
      </div>
    </div>
    {busy&&<p className={styles.note} role="status">{t.loading}</p>}
    {failed&&<p className={styles.error} role="alert">{t.failed}</p>}
    {!busy&&!failed&&recent.length===0&&<p className={styles.note}>
      {query?({ru:'Совпадений нет.',es:'No hay coincidencias.',en:'No matching audio.'}[lang]):t.empty}
    </p>}
    {recent.length>0&&<div className={styles.list}>
      {recent.map(file=>{
        const isPlaying=playing===file.id
        const mediaPath='/api/admin/materials/telegram/file/'+file.id
        const date=dateLabel(file.received_at,lang)
        const length=timeLabel(file.duration_seconds)
        return <article key={file.id} className={styles.row} data-practice-telegram-record={file.id}>
          <button type="button" className={styles.play} aria-pressed={isPlaying}
            aria-label={(isPlaying?t.pause:t.play)+': '+file.title}
            onClick={()=>toggle(file.id)} data-practice-telegram-play={file.id}>
            {isPlaying?<Pause size={18} aria-hidden="true"/>:<Play size={18} aria-hidden="true"/>}
          </button>
          <div className={styles.copy}>
            <strong title={file.title}>{file.title}</strong>
            <small>{[date,length].filter(Boolean).join(' · ')||t.audio}</small>
          </div>
          <audio ref={node=>{
              if(node)players.current.set(file.id,node)
              else players.current.delete(file.id)
            }} controls={isPlaying} hidden={!isPlaying} preload="none" src={mediaPath}
            className={styles.player} aria-label={file.title}
            onPlay={()=>setPlaying(file.id)}
            onPause={()=>setPlaying(current=>current===file.id?'':current)}
            onEnded={()=>setPlaying(current=>current===file.id?'':current)}
            onError={()=>{setPlayFailed(file.id);setPlaying(current=>current===file.id?'':current)}}
          />
          {playFailed===file.id&&<small className={styles.error} role="alert">{t.playFailed}</small>}
        </article>
      })}
    </div>}
    <div className={styles.bottom}>
      <p className={styles.privacy}><LockKeyhole size={13} aria-hidden="true"/>{t.private}</p>
      <a href="https://t.me/Andydotbot" target="_blank" rel="noopener noreferrer"
        className={styles.dotLink} data-practice-telegram-dot>{t.dot}</a>
    </div>
  </section>
}
