'use client'

import {useCallback,useEffect,useRef,useState} from 'react'
import {Volume2,LoaderCircle,Pause,RotateCcw,Square} from 'lucide-react'
import styles from './report-narration-player.module.css'

/**
 * Local Mac narration: never sends a report body or a voice model to the phone.
 * Every POST and GET uses the original private report access and session.
 * No synthesis is initiated by initial render/scroll or browser preload.
 */
export function LocalReportNarrationPlayer({locale='en',access}) {
  const ru=locale==='ru'
  const audio=useRef(null)
  const abort=useRef(null)
  const timer=useRef(null)
  const mounted=useRef(true)
  const requested=useRef(false)
  const audioSrc=useRef('')
  const [state,setState]=useState('idle')
  const [error,setError]=useState('')
  const [part,setPart]=useState(0)
  const [total,setTotal]=useState(1)

  const clean=useCallback(()=>{
    abort.current?.abort()
    if(timer.current)clearTimeout(timer.current)
    timer.current=null
  },[])

  useEffect(()=>{
    mounted.current=true
    return ()=>{
      mounted.current=false
      clean()
      audio.current?.pause()
      audioSrc.current=''
    }
  },[clean])

  async function loadPart(index) {
    if(!mounted.current)return
    clean()
    const controller=new AbortController()
    abort.current=controller
    setPart(index)
    setState('loading')
    setError('')
    try {
      const response=await fetch('/api/report-narration/local',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({...access,locale,part:index}),
        signal:controller.signal,
      })
      if(!response.ok)throw new Error(response.status===429?'limit':'unavailable')
      const result=await response.json()
      if(!['ready','queued','processing','failed'].includes(result.status)||
        !Number.isSafeInteger(result.parts)||result.parts<1||result.parts>8)
        throw new Error('unavailable')
      if(!mounted.current||controller.signal.aborted)return
      setTotal(result.parts)
      if(result.status==='failed')throw new Error('failed')
      if(result.status!=='ready') {
        setState(result.status)
        timer.current=setTimeout(()=>{if(mounted.current&&requested.current)void loadPart(index)},15000)
        return
      }
      if(typeof result.audioUrl!=='string'||
        !result.audioUrl.startsWith('/api/report-narration/local/audio?'))
        throw new Error('unavailable')
      const player=audio.current
      if(!player)return
      audioSrc.current=result.audioUrl
      player.src=result.audioUrl
      player.load()
      setState('ready')
      try{await player.play()}catch{/* Safari requires a second tap after async preparation */}
    }catch(e) {
      if(e?.name==='AbortError'||!mounted.current)return
      setState('error')
      setError(e?.message==='limit'
        ?(ru?'Лимит новых озвучек достигнут. Попробуйте позже.':'Too many new recordings today. Try later.')
        :e?.message==='failed'
          ?(ru?'Не удалось подготовить аудио. Отчёт доступен для чтения.':'Audio preparation failed. You can still read the report.')
          :(ru?'Озвучка сейчас недоступна. Текст отчёта сохранён.':'Narration is not ready yet. Your report text is still available.'))
    }
  }

  function toggle() {
    if(['loading','queued','processing'].includes(state))return
    const player=audio.current
    if(state==='playing'&&player){player.pause();return}
    if(['ready','paused'].includes(state)&&player?.src){
      void player.play().catch(()=>setState('ready'))
      return
    }
    requested.current=true
    void loadPart(state==='done'?0:part)
  }
  function stop() {
    requested.current=false
    clean()
    const player=audio.current
    if(player){player.pause();player.removeAttribute('src');player.load()}
    audioSrc.current=''
    setState('idle');setPart(0);setError('')
  }
  function ended() {
    if(part+1<total){requested.current=true;void loadPart(part+1)}
    else setState('done')
  }

  return <div className={styles.root} aria-label={ru?'Озвучка голосом Андрея':'Andrey voice narration'}>
    <button type="button" className={styles.primary} onClick={toggle}
      disabled={['loading','queued','processing'].includes(state)}>
      {['loading','queued','processing'].includes(state)
        ?<LoaderCircle className={styles.spinner} size={18} aria-hidden="true"/>
        :state==='playing'?<Pause size={18} aria-hidden="true"/>
        :state==='done'?<RotateCcw size={18} aria-hidden="true"/>
        :<Volume2 size={18} aria-hidden="true"/>}
      {state==='playing'?(ru?'Пауза':'Pause')
        :state==='paused'||state==='ready'?(ru?'Продолжить':'Resume')
        :state==='done'?(ru?'Сначала':'Restart')
        :(ru?'Прослушать':'Listen')}
    </button>
    {state!=='idle'&&<div className={styles.panel} role="region">
      {['loading','queued','processing'].includes(state)&&
        <small className={styles.help} role="status">{ru
          ?'Запись готовится на компьютере Андрея. Если компьютер выключен, она останется в очереди.'
          :'Andrey’s computer will prepare your recording when it is online. The request remains queued.'}</small>}
      <audio ref={audio} controls preload="none" className={styles.audio}
        hidden={!['playing','paused','ready','done'].includes(state)}
        onPlay={()=>setState('playing')}
        onPause={()=>setState(v=>v==='playing'?'paused':v)}
        onEnded={ended} aria-label={ru?'Аудиоплеер анализа':'Analysis audio player'}/>
      {total>1&&<small className={styles.part}>
        {ru?'Часть':'Part'} {part+1}/{total}
      </small>}
      {state==='ready'&&<small className={styles.help}>{ru
        ?'Если звук не запустился, нажмите Play в плеере.'
        :'If audio did not start automatically, tap Play in the player.'}</small>}
      <small className={styles.privacy}>{ru
        ?'AI-копия голоса Андрея. Генерация на его компьютере, без платного внешнего сервиса.'
        :'Andrey’s AI-cloned voice. Generated on his own computer without paid cloud speech APIs.'}</small>
      {error&&<small className={styles.error} role="alert">{error}</small>}
      {state!=='error'&&<button type="button" className={styles.stop}
        onClick={stop}><Square size={14} aria-hidden="true"/>{ru?'Стоп':'Stop'}</button>}
    </div>}
  </div>
}
