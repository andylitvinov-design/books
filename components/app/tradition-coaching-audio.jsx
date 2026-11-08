'use client'
import {useEffect,useState} from 'react'
import {Headphones,RefreshCw} from 'lucide-react'
import {appFetch} from '@/lib/app/client-fetch'
import styles from './tradition-coaching-audio.module.css'
const copy={
 en:{title:'Audio with your coach',retry:'Refresh audio',error:'The audio is temporarily unavailable. You can continue reading and answering.'},
 ru:{title:'Аудио с голосом наставника',retry:'Обновить аудио',error:'Запись сейчас недоступна. Вы можете продолжать читать и отвечать.'},
 es:{title:'Audio con tu guía',retry:'Recargar audio',error:'Audio no disponible. Puedes continuar leyendo y respondiendo.'},
}
export default function TraditionCoachingAudio({template,question,locale,accountId}){
 const lang=['en','ru','es'].includes(locale)?locale:'en',t=copy[lang]
 const [audio,setAudio]=useState(null),[error,setError]=useState(false),[retry,setRetry]=useState(0)
 useEffect(()=>{
  let current=true
  setAudio(null);setError(false)
  if(!question||!accountId)return()=>{current=false}
  const route='tradition-coaching-audio?'+new URLSearchParams({template,question,locale:lang})
  appFetch(route,undefined,'GET',{accountId}).then(response=>{
   if(current)setAudio(response?.audio?.url||null)
  }).catch(()=>{if(current)setError(true)})
  return()=>{current=false}
 },[template,question,lang,accountId,retry])
 if(!audio&&!error)return null
 return <div className={styles.player} data-author-coaching-audio={question}>
  <strong><Headphones size={17} aria-hidden="true"/>{t.title}</strong>
  {audio?<audio key={audio} controls preload="none" src={audio}
    aria-label={t.title} onError={()=>{setAudio(null);setError(true)}}/>:
    <span role="status">{t.error}</span>}
  {error&&<button type="button" onClick={()=>setRetry(v=>v+1)}><RefreshCw size={15}/>{t.retry}</button>}
 </div>
}
