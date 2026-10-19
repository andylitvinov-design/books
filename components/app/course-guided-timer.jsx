'use client'
import { useEffect, useRef, useState } from 'react'
import { useOceanPracticeAudio } from '../ocean-practice-audio'
import OceanSoundToggle from '../ocean-sound-toggle'
import styles from './course-guided-timer.module.css'

// Optional pacing aid, with quiet ocean waves while the timer runs. No autoplay.
export default function CourseGuidedTimer({ seconds=60, locale='en' }) {
  const duration=Math.max(1,Math.min(900,Math.trunc(Number(seconds)||60)))
  const [remaining,setRemaining]=useState(duration)
  const [active,setActive]=useState(false)
  const deadline=useRef(0)
  const pendingStart=useRef(0)
  const ocean=useOceanPracticeAudio()

  useEffect(()=>{
    if(!active) return undefined
    const id=window.setInterval(()=>{
      const secondsLeft=Math.max(0,Math.ceil((deadline.current-Date.now())/1000))
      setRemaining(secondsLeft)
      if(secondsLeft===0){
        setActive(false)
        ocean.pause()
      }
    },500)
    return ()=>window.clearInterval(id)
  },[active,ocean.pause])

  // Pausing a practice when Safari is backgrounded prevents unexpected sound.
  useEffect(()=>{
    const hide=()=>{
      if(document.hidden){
        pendingStart.current+=1
        if(active)setRemaining(Math.max(0,Math.ceil((deadline.current-Date.now())/1000)))
        setActive(false)
        ocean.pause()
      }
    }
    document.addEventListener('visibilitychange',hide)
    return ()=>document.removeEventListener('visibilitychange',hide)
  },[active,ocean.pause])

  const toggle=async()=>{
    if(active){
      pendingStart.current+=1
      setRemaining(Math.max(0,Math.ceil((deadline.current-Date.now())/1000)))
      setActive(false)
      ocean.pause()
    }else{
      const ticket=++pendingStart.current
      const started=await ocean.play()
      if(ticket!==pendingStart.current||!started||document.hidden)return
      deadline.current=Date.now()+(remaining||duration)*1000
      if(remaining===0)setRemaining(duration)
      setActive(true)
    }
  }
  const reset=()=>{
    pendingStart.current+=1
    ocean.reset()
    setRemaining(duration)
    setActive(false)
  }
  useEffect(()=>{
    if(!active||!ocean.enabled||!['loading','blocked','paused'].includes(ocean.status))return
    setRemaining(Math.max(0,Math.ceil((deadline.current-Date.now())/1000)))
    setActive(false)
  },[active,ocean.enabled,ocean.status])
  const ru=locale==='ru'
  const format=(value)=>String(Math.floor(value/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0')
  return <div className={styles.timer} aria-label={ru?'Мягкий таймер практики':'Optional practice timer'} data-course-timer>
    <span className={styles.time} aria-live="off">{format(remaining)}</span>
    <progress max={duration} value={duration-remaining} aria-label={ru?'Время практики':'Practice time'}/>
    <button type="button" onClick={toggle} disabled={remaining===0||(ocean.enabled&&ocean.status==='loading')}>
      {remaining===0?(ru?'Завершено':'Finished'):active?(ru?'Пауза':'Pause'):(ru?'Начать таймер':'Start timer')}
    </button>
    <button type="button" onClick={reset}>{ru?'Сброс':'Reset'}</button>
    <small style={{display:'flex',alignItems:'center',gap:8}}>
      {ru?'Таймер необязателен. Можно переходить дальше в своём темпе.':'Timer is optional. You can move on at your own pace.'}
      <OceanSoundToggle locale={locale} timerRunning={active} audio={ocean}/>
    </small>
    {ocean.enabled&&ocean.status==='blocked'?<small role="alert">{ru?'Звук не запустился. Проверьте громкость и попробуйте снова или выключите волны.':'Sound did not start. Check volume and try again, or turn Waves off.'}</small>:null}
    {ocean.enabled&&ocean.status==='loading'?<small role="status">{ru?'Загружается аудио…':'Loading waves and soft music…'}</small>:null}
  </div>
}
