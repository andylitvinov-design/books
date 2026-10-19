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
    wavesOn:'Waves on',wavesOff:'Waves off',unavailable:'Sound is unavailable here; the quiet practice still works.',
    complete:'Your two quiet minutes are complete.',ready:'No rush. Start when you feel ready.',
  },
  ru:{
    instruction:'Послушайте мягкий шум волн и отдохните две минуты.',
    optional:'Можно просто спокойно отдохнуть без звука.',
    play:'Включить на 2 минуты',resume:'Продолжить',pause:'Пауза',restart:'Сначала',
    wavesOn:'Волны включены',wavesOff:'Волны выключены',unavailable:'Звук недоступен, но можно выполнить практику в тишине.',
    complete:'Две минуты спокойствия завершены.',ready:'Не торопитесь. Начните, когда будете готовы.',
  },
  es:{
    instruction:'Escucha las suaves olas y descansa dos minutos.',
    optional:'También puedes descansar en silencio.',
    play:'Escuchar 2 minutos',resume:'Continuar',pause:'Pausar',restart:'Reiniciar',
    wavesOn:'Olas activadas',wavesOff:'Olas desactivadas',unavailable:'El sonido no está disponible; puedes descansar en silencio.',
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

  // A safety pause preserves the actual time left, including on slower phones.
  useEffect(()=>{
    if(!paused||!running)return
    setRemaining(Math.max(0,Math.ceil((deadline.current-Date.now())/1000)))
    setRunning(false)
    audio.pause()
  },[paused,running,audio.pause])

  // Backgrounding Safari stops both sound and timer without losing progress.
  useEffect(()=>{
    const stop=()=>{
      if(!document.hidden)return
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

  function play(){
    if(paused)return
    const seconds=remaining===0?DURATION:remaining
    if(remaining===0)setRemaining(DURATION)
    deadline.current=Date.now()+seconds*1000
    // Direct click → AudioContext.resume() keeps Safari/iOS user-gesture permission.
    audio.play()
    setRunning(true)
    setStarted(true)
  }
  function pause(){
    setRemaining(Math.max(0,Math.ceil((deadline.current-Date.now())/1000)))
    setRunning(false)
    audio.pause()
  }
  function restart(){
    setRunning(false)
    audio.pause()
    deadline.current=0
    setRemaining(DURATION)
    setStarted(false)
  }

  const time=`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`
  return <div className={styles.outro} data-opora-ocean-outro="true">
    <div className={styles.sea} data-playing={running?'true':'false'} aria-hidden="true">
      <span className={styles.seaCircle}><Waves size={43} strokeWidth={1.8}/></span>
    </div>
    <p className={styles.instruction}>{t.instruction}</p>
    <div className={styles.player}>
      <div className={styles.counter} role="timer" aria-label={time} aria-live="off">{time}</div>
      <button type="button" className={styles.play}
        disabled={paused} aria-pressed={running}
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
    <p className={styles.status} role={remaining===0?'status':undefined}>
      {!audio.supported?t.unavailable:remaining===0?t.complete:started?'':t.ready}
    </p>
  </div>
}
