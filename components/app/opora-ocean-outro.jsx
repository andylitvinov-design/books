'use client'

import {useEffect,useState} from 'react'
import {Headphones,Pause,Play,RotateCcw,Volume2,VolumeX,Waves} from 'lucide-react'
import {useOceanPracticeAudio} from '../ocean-practice-audio'
import styles from './opora-ocean-outro.module.css'

const DURATION=60

const COPY={
  en:{
    instruction:'Listen to the gentle waves for one quiet minute.',
    optional:'You can also rest quietly without audio.',
    play:'Play one minute',resume:'Resume',pause:'Pause',restart:'Restart',
    wavesOn:'Waves on',wavesOff:'Waves off',unavailable:'Sound is unavailable here; the quiet practice still works.',
    complete:'Your quiet minute is complete.',ready:'No rush. Start when you feel ready.',
  },
  ru:{
    instruction:'Послушайте мягкий шум волн в течение одной минуты.',
    optional:'Можно просто спокойно отдохнуть без звука.',
    play:'Включить на минуту',resume:'Продолжить',pause:'Пауза',restart:'Сначала',
    wavesOn:'Волны включены',wavesOff:'Волны выключены',unavailable:'Звук недоступен, но можно выполнить практику в тишине.',
    complete:'Минута спокойствия завершена.',ready:'Не торопитесь. Начните, когда будете готовы.',
  },
  es:{
    instruction:'Escucha las suaves olas durante un minuto tranquilo.',
    optional:'También puedes descansar en silencio.',
    play:'Escuchar un minuto',resume:'Continuar',pause:'Pausar',restart:'Reiniciar',
    wavesOn:'Olas activadas',wavesOff:'Olas desactivadas',unavailable:'El sonido no está disponible; puedes descansar en silencio.',
    complete:'Terminó tu minuto tranquilo.',ready:'Sin prisa. Empieza cuando quieras.',
  },
}

export default function OporaOceanOutro({locale='en',paused=false}){
  const lang=locale==='ru'?'ru':locale==='es'?'es':'en'
  const t=COPY[lang]
  const audio=useOceanPracticeAudio()
  const [remaining,setRemaining]=useState(DURATION)
  const [running,setRunning]=useState(false)
  const [started,setStarted]=useState(false)

  // The soundscape and timer must stop on an accessible safety pause.
  useEffect(()=>{
    if(!paused)return
    setRunning(false)
    audio.pause()
  },[paused,audio.pause])

  // Backgrounding the browser must not leave a silent timer apparently playing.
  useEffect(()=>{
    const stop=()=>{
      if(!document.hidden)return
      setRunning(false)
      audio.pause()
    }
    document.addEventListener('visibilitychange',stop)
    return ()=>document.removeEventListener('visibilitychange',stop)
  },[audio.pause])

  useEffect(()=>{
    if(!running||paused)return
    const interval=window.setInterval(()=>setRemaining(value=>Math.max(0,value-1)),1000)
    return ()=>window.clearInterval(interval)
  },[running,paused])

  useEffect(()=>{
    if(remaining!==0)return
    setRunning(false)
    audio.pause()
  },[remaining,audio.pause])

  function play(){
    if(paused)return
    if(remaining===0)setRemaining(DURATION)
    // Direct click → AudioContext.resume() keeps Safari/iOS user-gesture permission.
    audio.play()
    setRunning(true)
    setStarted(true)
  }
  function pause(){
    setRunning(false)
    audio.pause()
  }
  function restart(){
    setRunning(false)
    audio.pause()
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
        {audio.enabled?t.wavesOn:t.wavesOff}
      </button>
      <span className={styles.optional}><Headphones size={15} aria-hidden="true"/>{t.optional}</span>
    </div>
    <p className={styles.status} role={remaining===0?'status':undefined}>
      {!audio.supported?t.unavailable:remaining===0?t.complete:started?'':t.ready}
    </p>
  </div>
}
