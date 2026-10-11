'use client'
import { useEffect, useState } from 'react'
import styles from './course-guided-timer.module.css'

// Optional pacing aid for the approved original text practice; no autoplay or forced waiting.
export default function CourseGuidedTimer({ seconds=60, locale='en' }) {
  const duration=Math.max(1,Math.min(900,Math.trunc(Number(seconds)||60)))
  const [remaining,setRemaining]=useState(duration)
  const [active,setActive]=useState(false)
  useEffect(()=>{
    if(!active||remaining===0) return undefined
    const id=setInterval(()=>setRemaining(s=>Math.max(0,s-1)),1000)
    return ()=>clearInterval(id)
  },[active,remaining])
  const ru=locale==='ru'
  const format=(value)=>String(Math.floor(value/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0')
  return <div className={styles.timer} aria-label={ru?'Мягкий таймер практики':'Optional practice timer'} data-course-timer>
    <span className={styles.time} aria-live="off">{format(remaining)}</span>
    <progress max={duration} value={duration-remaining} aria-label={ru?'Время практики':'Practice time'}/>
    <button type="button" onClick={()=>setActive(v=>!v)} disabled={remaining===0}>
      {remaining===0?(ru?'Завершено':'Finished'):active?(ru?'Пауза':'Pause'):(ru?'Начать таймер':'Start timer')}
    </button>
    <button type="button" onClick={()=>{setRemaining(duration);setActive(false)}}>
      {ru?'Сброс':'Reset'}
    </button>
    <small>{ru?'Таймер необязателен. Можно переходить дальше в своём темпе.':'Timer is optional. You can move on at your own pace.'}</small>
  </div>
}
