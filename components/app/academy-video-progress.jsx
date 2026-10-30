'use client'

import { useEffect,useState } from 'react'
import Link from 'next/link'
import { appFetch } from '@/lib/app/client-fetch'

const WORDS={
  en:{watched:'I watched this',mastered:'I practised / mastered this',saved:'Saved in My Progress',login:'Sign in to save this video in My Progress',
    notice:'A self-confirmed learning mark, not an automatic playback record.',error:'Could not save this mark. Please retry.',busy:'Saving…'},
  ru:{watched:'Я посмотрел(а)',mastered:'Я освоил(а) / применил(а)',saved:'Сохранено в «Мой прогресс»',login:'Войдите, чтобы сохранить видео в «Мой прогресс»',
    notice:'Ваше личное подтверждение, а не автоматическая запись просмотра.',error:'Не удалось сохранить отметку. Повторите.',busy:'Сохранение…'},
  es:{watched:'He visto este vídeo',mastered:'Lo he practicado / aprendido',saved:'Guardado en Mi progreso',login:'Inicia sesión para guardar el progreso del vídeo',
    notice:'Confirmación personal, no una reproducción medida automáticamente.',error:'No se pudo guardar. Inténtalo otra vez.',busy:'Guardando…'},
}
const buttonStyle={minHeight:44,border:'1px solid #bed1c1',borderRadius:11,padding:'10px 13px',background:'#eff5ef',color:'#21533b',fontWeight:700,cursor:'pointer'}

export default function AcademyVideoProgress({videoId,title,locale='en'}) {
  const lang=Object.hasOwn(WORDS,locale)?locale:'en'
  // The private cabinet currently supports EN/RU; keep Spanish public copy,
  // but route guest sign-in to the existing EN account progress screen.
  const accountLang=lang==='es'?'en':lang
  const t=WORDS[lang]
  const [state,setState]=useState('loading')
  const [status,setStatus]=useState(null)
  const [error,setError]=useState(false)
  useEffect(()=>{
    let live=true
    setState('loading');setStatus(null);setError(false)
    appFetch('video-progress').then(data=>{
      if(!live)return
      const record=data.records?.find(record=>record.videoId===videoId)
      setStatus(record?.status||null);setState('ready')
    }).catch(failure=>{
      if(!live)return
      setState(failure.status===401?'guest':'unavailable')
    })
    return ()=>{live=false}
  },[videoId])
  const save=async nextStatus=>{
    if(state!=='ready')return
    setState('saving');setError(false)
    try{
      const record=await appFetch('video-progress',{videoId,title,status:nextStatus},'POST')
      setStatus(record.status);setState('ready')
    }catch(failure){
      setError(true);setState(failure.status===401?'guest':'ready')
    }
  }
  return <div data-academy-video-learning-progress
    style={{marginTop:12,padding:'12px 13px',background:'#faf8f2',border:'1px solid #ebe4d5',borderRadius:13,fontSize:13}}>
    {state==='guest' ? <Link href={'/'+accountLang+'/app/progress'} prefetch={false}>{t.login}</Link> :
      state==='ready'||state==='saving' ?
      <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
        <button type="button" style={buttonStyle} disabled={state==='saving'||Boolean(status)}
          onClick={()=>void save('watched')}>{state==='saving'?t.busy:status?t.saved:t.watched}</button>
        {status&&<button type="button" style={buttonStyle}
          disabled={state==='saving'||status==='mastered'} onClick={()=>void save('mastered')}>
          {status==='mastered'?t.saved:t.mastered}</button>}
      </div> : null}
    <p style={{margin:'8px 0 0',color:'#647166'}}>{t.notice}</p>
    {error&&<p role="alert">{t.error}</p>}
    {state==='unavailable'&&<p role="alert">{t.error}</p>}
  </div>
}
