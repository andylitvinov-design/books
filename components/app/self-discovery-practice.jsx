'use client'
import {useEffect,useRef,useState} from 'react'
import {appFetch} from '@/lib/app/client-fetch'
import {createJournalSaver} from '@/lib/app/daybook-journal-save.mjs'
import {collectJournalExport} from '@/lib/app/daybook-journal-export.mjs'
import {localJournalDay} from '@/lib/app/daybook-journal-contract.mjs'
import {discoveryTag} from '@/lib/app/self-discovery-themes.mjs'
import styles from './self-discovery.module.css'
const COPY={
 en:{choose:'Choose one action',do:'Try it now or during your day. You can stop or change your choice.',save:'I tried it — save privately',saved:'Practice saved',retry:'Retry',loading:'Reading saved practices…',error:'Could not confirm private data. Retry.',history:'Previous practices',again:'Practice again',privacy:'Optional. Your own observation, not a test score.'},
 ru:{choose:'Выберите одно действие',do:'Попробуйте сделать это сейчас или в течение дня. Можно остановиться или изменить выбор.',save:'Попробовал(а) — сохранить приватно',saved:'Практика сохранена',retry:'Повторить',loading:'Загружаем сохранённые практики…',error:'Не удалось подтвердить личные данные. Повторите попытку.',history:'Предыдущие практики',again:'Повторить практику',privacy:'Добровольная практика. Личное наблюдение, а не балл теста.'},
 es:{choose:'Elige una acción',do:'Prueba ahora o durante el día. Puedes detenerte o cambiar de opción.',save:'Lo probé — guardar en privado',saved:'Práctica guardada',retry:'Reintentar',loading:'Leyendo prácticas guardadas…',error:'No se pudieron confirmar los datos privados. Reintenta.',history:'Prácticas anteriores',again:'Repetir práctica',privacy:'Opcional. Observación personal, no puntuación.'}}
const auth=e=>e?.status===401||e?.status===403||e?.code==='ACCOUNT_CHANGED'
export default function SelfDiscoveryPractice({accountId,locale,theme,onSessionLost}){
 const t=COPY[locale]||COPY.en
 const [phase,setPhase]=useState('loading'),[notes,setNotes]=useState([]),[choice,setChoice]=useState(null),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false),[saved,setSaved]=useState(false),[retry,setRetry]=useState(0)
 const saver=useRef(null),pending=useRef(null),live=useRef(false),inFlight=useRef(false)
 const tag=discoveryTag(theme.id)
 useEffect(()=>{
  let current=true;live.current=true
  const instance=createJournalSaver(appFetch,accountId);saver.current=instance
  setPhase('loading');setNotes([])
  collectJournalExport(appFetch,accountId,()=>current).then(data=>{
   if(!current)return
   setNotes(data.entries.filter(row=>row.tags.includes(tag)));setPhase('ready')
  }).catch(e=>{if(current){if(auth(e))onSessionLost();else setPhase('error')}})
  return()=>{current=false;live.current=false;instance.discard();saver.current=null}
 },[accountId,tag,retry,onSessionLost])
 async function save(){
  if(inFlight.current||!saver.current||choice===null||phase!=='ready')return
  inFlight.current=true;setBusy(true)
  try{
   if(!pending.current){const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone
    pending.current={id:crypto.randomUUID(),revision:0,text:theme.title[locale]+': '+theme.choices[choice][locale],tags:[tag],kind:'note',locale,timezone,localDay:localJournalDay(new Date().toISOString(),timezone),goalId:null}}
   const result=await saver.current.save(pending.current)
   if(!live.current)return
   pending.current=null;setNotes(old=>[result,...old.filter(row=>row.id!==result.id)]);setSaved(true);setFailed(false)
  }catch(e){if(live.current){if(auth(e))onSessionLost();else setFailed(true)}}
  finally{inFlight.current=false;if(live.current)setBusy(false)}
 }
 if(phase==='loading')return <p role="status">{t.loading}</p>
 if(phase==='error')return <><p role="alert">{t.error}</p><button className={styles.action} onClick={()=>setRetry(n=>n+1)}>{t.retry}</button></>
 return <div data-self-discovery-practice>
  <p>{theme.prompt[locale]}</p><p className={styles.note}>{t.privacy}</p>
  {saved?<><p role="status">✓ {t.saved}</p><button className={styles.action} onClick={()=>{setSaved(false);setChoice(null)}}>{t.again}</button></>:<>
   <h3>{t.choose}</h3><div className={styles.choices}>{theme.choices.map((item,i)=><button type="button" key={i} aria-pressed={choice===i} disabled={busy||failed} onClick={()=>setChoice(i)}>{item[locale]}</button>)}</div>
   {choice!==null&&<><p>{t.do}</p><button className={styles.action} disabled={busy} onClick={()=>void save()}>{failed?t.retry:t.save}</button></>}
   {failed&&<p role="alert">{t.error}</p>}
  </>}
  {notes.length>0&&<details><summary>{t.history} ({notes.length})</summary><ul className={styles.history}>{notes.map(row=><li key={row.id}><span>{row.text}</span><small>{new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short'}).format(new Date(row.createdAt))}</small></li>)}</ul></details>}
 </div>
}
