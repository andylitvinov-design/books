'use client'
import {useEffect,useRef,useState} from 'react'
import {appFetch,getCabinetBootstrap} from '@/lib/app/client-fetch'
import {crossModeMemoryDisplay} from '@/lib/coaching/anti-stress-private-memory.mjs'
const copy={
 en:{title:'Previous sessions · private memory',load:'Show saved memory',close:'Hide memory',loading:'Loading…',error:'Could not verify saved memory.',empty:'No reviewed record.',unavailable:'This archive is unavailable.',coaching:'Coaching',therapy:'Therapy',topic:'Topic',conclusions:'Conclusions',next:'Next step',note:'Visible only here. Nothing is sent to an AI provider. Previous therapy practices require fresh permission.'},
 ru:{title:'Предыдущие сессии · личная память',load:'Показать сохранённую память',close:'Скрыть память',loading:'Загрузка…',error:'Не удалось проверить сохранённую память.',empty:'Нет подтверждённой записи.',unavailable:'Архив недоступен.',coaching:'Коучинг',therapy:'Терапия',topic:'Тема',conclusions:'Выводы',next:'Следующий шаг',note:'История видна только здесь. Она не отправляется поставщику ИИ. Для повторения терапевтических практик нужно новое согласие.'},
 es:{title:'Sesiones anteriores · memoria privada',load:'Mostrar memoria guardada',close:'Ocultar memoria',loading:'Cargando…',error:'No se pudo verificar la memoria.',empty:'No hay registro revisado.',unavailable:'Archivo no disponible.',coaching:'Coaching',therapy:'Terapia',topic:'Tema',conclusions:'Conclusiones',next:'Próximo paso',note:'Solo se muestra aquí. No se envía al proveedor de IA. Las prácticas terapéuticas requieren un nuevo consentimiento.'}
}
export default function AntiStressMemoryPanel({accountId,exclude=null,locale='en',allowShare=false,shareFingerprint='',onShare}){
 const lang=copy[locale]?locale:'en',t=copy[lang]
 const [state,setState]=useState(null),pending=useRef(null),[selected,setSelected]=useState('')
 const clearChoice=()=>{setSelected('');onShare?.(null)}
 const key=accountId+'|'+(exclude||'')+'|'+lang,scope=useRef(key);scope.current=key
 useEffect(()=>{setState(null);return()=>{pending.current?.abort();pending.current=null}},[key])
 async function load(){
  if(!accountId||pending.current)return
  const c=new AbortController();pending.current=c;setState({key,loading:true})
  try{
   // Recheck the account, not a stale browser cache, before requesting private memory.
   const owner=await getCabinetBootstrap('portrait',{refresh:true})
   if(c.signal.aborted||scope.current!==key)return
   if(owner?.account?.id!==accountId)throw Error('ACCOUNT_CHANGED')
   const q=new URLSearchParams({view:'continuity',locale:lang})
   if(exclude)q.set('exclude',exclude)
   const value=await appFetch('anti-stress/session?'+q,undefined,'GET',{accountId,signal:c.signal})
   if(c.signal.aborted||scope.current!==key)return
   setState({key,data:crossModeMemoryDisplay(value,exclude),shareOptions:Array.isArray(value.shareOptions)?value.shareOptions.filter(x=>['coaching','therapy'].includes(x.mode)&&typeof x.value==='string'&&x.value.length<=300&&/^[a-f0-9]{64}$/.test(x.fingerprint||'')).slice(0,10):[]})
  }catch{if(!c.signal.aborted&&scope.current===key)setState({key,error:true})}
  finally{if(pending.current===c)pending.current=null}
 }
 function hide(){pending.current?.abort();pending.current=null;clearChoice();setState(null)}
 if(!accountId)return null
 const current=state?.key===key?state:null
 return <section data-coach-owner-cross-mode-memory style={{margin:'12px 0',padding:12,border:'1px solid #b8b2a6',borderRadius:12}}>
  <strong>{t.title}</strong><p>{allowShare?({ru:'Архив остаётся приватным. При отдельном согласии только выбранная запись передаётся Google на следующем Play.',en:'Your archive stays private. Only a separately approved selected item is shared with Google on the next Play.',es:'Tu archivo sigue siendo privado. Solo se comparte con Google el dato elegido con permiso separado al pulsar Play.'})[lang]:t.note}</p>
  {allowShare&&current?.data&&current.shareOptions?.length>0&&<div data-clarity-cross-mode-share><select aria-label={t.title} value={selected} onChange={e=>{setSelected(e.target.value);onShare?.(null)}}><option value="">{({ru:'Не передавать память',en:'Do not share memory',es:'No compartir memoria'})[lang]}</option>{current.shareOptions.map(x=><option key={x.fingerprint} value={x.fingerprint}>{x.mode==='therapy'?t.therapy:t.coaching} · {x.value}</option>)}</select>{selected&&<label><input type="checkbox" checked={shareFingerprint===selected} onChange={e=>onShare?.(e.target.checked?{provider:'gemini_live_free',consent:true,fingerprint:selected}:null)}/>{({ru:'На следующем Play передать только выбранную запись Google Gemini Free (возможно обучение моделей). Это не согласие на практику.',en:'On the next Play share only this selected item with Google Gemini Free (may train models). Not practice consent.',es:'Al pulsar Play compartir solo este dato con Google Gemini Free (puede entrenar modelos). No autoriza prácticas.'})[lang]}</label>}</div>}
  {!current?<button type="button" onClick={load}>{t.load}</button>:<><button type="button" onClick={hide}>{t.close}</button>
  {current.loading?<p role="status">{t.loading}</p>:current.error?<p role="alert">{t.error} <button type="button" onClick={load}>{t.load}</button></p>:['coaching','therapy'].map(mode=>{
   const x=current.data[mode],r=x.record
   return <div key={mode}><h4>{t[mode]}</h4>{x.status==='empty'?<p>{t.empty}</p>:x.status==='unavailable'?<p>{t.unavailable}</p>:<><small>{new Date(r.reviewedAt).toLocaleDateString(lang)}</small><dl>{(mode==='coaching'?[[t.topic,r.topic],[t.conclusions,r.conclusions],[t.next,r.nextStep]]:r.fields.map(row=>[row.label,row.value])).filter(row=>row[1]).map(([label,value],i)=><div key={i}><dt>{label}</dt><dd style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{value}</dd></div>)}</dl></>}</div>
  })}</>}
 </section>
}
