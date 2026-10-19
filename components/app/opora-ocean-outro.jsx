'use client'

import {useEffect,useRef,useState} from 'react'
import {Headphones,Pause,Play,RotateCcw,Volume2,VolumeX,Waves} from 'lucide-react'
import {useOceanPracticeAudio} from '../ocean-practice-audio'
import styles from './opora-ocean-outro.module.css'

const DURATION=120

const COPY={
  en:{
    instruction:'Listen to the gentle waves and rest for two quiet minutes.',
    optional:'You can also rest quietly without audio.',
    play:'Start 2 minutes',resume:'Resume',pause:'Pause',restart:'Restart',
    wavesOn:'Waves on',wavesOff:'Waves off',unavailable:'Audio is unavailable. You can still rest quietly.',
    loading:'Loading the waves and soft music…',blocked:'Sound could not start. Check your phone volume, then tap Play again.',
    playing:'Waves and soft music are playing.',
    complete:'Your two quiet minutes are complete.',ready:'No rush. Start when you feel ready.',
  },
  ru:{
    instruction:'Послушайте мягкий шум волн и отдохните две минуты.',
    optional:'Можно просто спокойно отдохнуть без звука.',
    play:'Включить на 2 минуты',resume:'Продолжить',pause:'Пауза',restart:'Сначала',
    wavesOn:'Волны включены',wavesOff:'Волны выключены',unavailable:'Аудио недоступно. Можно отдохнуть в тишине.',
    loading:'Загружаются волны и мягкая музыка…',blocked:'Не удалось включить звук. Проверьте громкость телефона и нажмите «Продолжить».',
    playing:'Шум волн и мягкая музыка звучат.',
    complete:'Две минуты спокойствия завершены.',ready:'Не торопитесь. Начните, когда будете готовы.',
  },
  es:{
    instruction:'Escucha las suaves olas y descansa dos minutos.',
    optional:'También puedes descansar en silencio.',
    play:'Escuchar 2 minutos',resume:'Continuar',pause:'Pausar',restart:'Reiniciar',
    wavesOn:'Olas activadas',wavesOff:'Olas desactivadas',unavailable:'El audio no está disponible. También puedes descansar en silencio.',
    loading:'Cargando las olas y la música suave…',blocked:'No se pudo reproducir el sonido. Revisa el volumen del teléfono y pulsa Reanudar.',
    playing:'Se están reproduciendo olas y música suave.',
    complete:'Terminaron tus dos minutos de calma.',ready:'Sin prisa. Empieza cuando quieras.',
  },
}

export default function OporaOceanOutro({locale='en',paused=false}){
  const lang=locale==='ru'?'ru':locale==='es'?'es':'en'
  const t=COPY[lang]
  const audio=useOceanPracticeAudio()
  const [remaining,setRemaining]=useState(DURATION)
  const [running,setRunning]=useState(false)
  const [started,setStarted]=useState(false)
  const deadline=useRef(0)
  const pendingStart=useRef(0)

  // A safety pause preserves the actual time left, including on slower phones.
  useEffect(()=>{
    if(!paused)return
    pendingStart.current+=1
    if(running)setRemaining(Math.max(0,Math.ceil((deadline.current-Date.now())/1000)))
    setRunning(false)
    audio.pause()
  },[paused,running,audio.pause])

  // Backgrounding Safari stops both sound and timer without losing progress.
  useEffect(()=>{
    const stop=()=>{
      if(!document.hidden)return
      pendingStart.current+=1
      if(running)setRemaining(Math.max(0,Math.ceil((deadline.current-Date.now())/1000)))
      setRunning(false)
      audio.pause()
    }
    document.addEventListener('visibilitychange',stop)
    return ()=>document.removeEventListener('visibilitychange',stop)
  },[running,audio.pause])

  // Wall-clock seconds prevent browser timer throttling from extending the rest.
  useEffect(()=>{
    if(!running||paused)return
    const tick=()=>setRemaining(Math.max(0,Math.ceil((deadline.current-Date.now())/1000)))
    const interval=window.setInterval(tick,250)
    return ()=>window.clearInterval(interval)
  },[running,paused])

  useEffect(()=>{
    if(remaining!==0)return
    setRunning(false)
    audio.pause()
  },[remaining,audio.pause])

  async function play(){
    if(paused)return
    const ticket=++pendingStart.current
    // Audio.play() begins directly in this click. Wait for actual media playback
    // before starting the timer, so iPhone does not count two silent minutes.
    const audible=await audio.play()
    if(ticket!==pendingStart.current||paused||!audible||document.hidden)return
    const seconds=remaining===0?DURATION:remaining
    if(remaining===0)setRemaining(DURATION)
    deadline.current=Date.now()+seconds*1000
    setRunning(true)
    setStarted(true)
  }
  function pause(){
    pendingStart.current+=1
    setRemaining(Math.max(0,Math.ceil((deadline.current-Date.now())/1000)))
    setRunning(false)
    audio.pause()
  }
  function restart(){
    pendingStart.current+=1
    setRunning(false)
    audio.reset()
    deadline.current=0
    setRemaining(DURATION)
    setStarted(false)
  }

  // A stalled, interrupted or blocked sound must also pause the visual timer.
  useEffect(()=>{
    if(!running||!audio.enabled)return
    if(!['loading','blocked','paused'].includes(audio.status))return
    setRemaining(Math.max(0,Math.ceil((deadline.current-Date.now())/1000)))
    setRunning(false)
  },[running,audio.enabled,audio.status])

  const time=`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`
  return <div className={styles.outro} data-opora-ocean-outro="true">
    <div className={styles.sea} data-audio-status={audio.status} data-playing={running?'true':'false'} aria-hidden="true">
      <span className={styles.seaCircle}><Waves size={43} strokeWidth={1.8}/></span>
    </div>
    <p className={styles.instruction}>{t.instruction}</p>
    <div className={styles.player}>
      <div className={styles.counter} role="timer" aria-label={time} aria-live="off">{time}</div>
      <button type="button" className={styles.play}
        disabled={paused||(audio.enabled&&audio.status==='loading')} aria-pressed={running}
        onClick={running?pause:play}>
        {running?<Pause size={18} fill="currentColor"/>:<Play size={18} fill="currentColor"/>}
        {running?t.pause:remaining<DURATION&&remaining>0?t.resume:t.play}
      </button>
      <button type="button" className={styles.restart}
        onClick={restart} aria-label={t.restart} title={t.restart}>
        <RotateCcw size={19}/>
      </button>
    </div>
    <div className={styles.track} role="progressbar" aria-valuemin={0}
      aria-valuemax={DURATION} aria-valuenow={DURATION-remaining} aria-label={t.instruction}>
      <span style={{width:`${((DURATION-remaining)/DURATION)*100}%`}}/>
    </div>
    <div className={styles.underPlayer}>
      <button type="button" className={styles.soundToggle} disabled={!audio.supported}
        aria-pressed={audio.supported&&audio.enabled} onClick={()=>audio.toggle(running)}>
        {audio.supported&&audio.enabled?<Volume2 size={16}/>:<VolumeX size={16}/>}
        {audio.supported&&audio.enabled?t.wavesOn:t.wavesOff}
      </button>
      <span className={styles.optional}><Headphones size={15} aria-hidden="true"/>{t.optional}</span>
    </div>
    <p className={styles.status} role="status" aria-live="polite">
      {!audio.supported?t.unavailable:audio.enabled&&audio.status==='blocked'?t.blocked:
        audio.enabled&&audio.status==='loading'?t.loading:remaining===0?t.complete:
        running&&audio.enabled&&audio.status==='playing'?t.playing:started?'':t.ready}
    </p>
  </div>
}
