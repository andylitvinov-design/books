'use client'
import {useEffect,useRef,useState} from 'react'
import styles from './client-session-engagement.module.css'

const WORDS={
  en:{
    title:'Optional reading activity',intro:'Allow Holistic House to show your practitioner approximate active reading time and which general actions were chosen on this shared session page. This helps improve follow-up. We never record report text, test answers, what you type, IP addresses or individual clicks outside these buttons.',
    caveat:'This link may be shared; activity is associated with the invitation, not proof of your identity. Stored for up to 90 days. You can turn this off and erase activity from this browser session at any time. Reading your report does not require consent.',
    allow:'Allow optional activity',stop:'Stop and erase my activity',on:'Activity sharing is enabled for this visit.',off:'Activity sharing is off.',error:'Optional activity is unavailable; your report still works.',busy:'Saving preference…'
  },
  ru:{
    title:'Необязательная статистика просмотра',intro:'Разрешить Holistic House показать специалисту примерное активное время чтения и выбор основных действий на этой странице. Это помогает улучшить сопровождение. Текст отчёта, ответы тестов, вводимые данные, IP-адреса и остальные клики не записываются.',
    caveat:'Ссылку можно переслать: статистика относится к приглашению, а не подтверждает личность читателя. Хранение — до 90 дней. Разрешение можно отозвать и стереть активность этой браузерной сессии. Отчёт доступен и без согласия.',
    allow:'Разрешить статистику',stop:'Отключить и стереть мою активность',on:'Статистика включена для этого посещения.',off:'Статистика отключена.',error:'Статистика недоступна. Отчёт продолжает работать.',busy:'Сохраняем настройку…'
  },
  es:{
    title:'Actividad de lectura opcional',intro:'Permitir que Holistic House muestre al especialista el tiempo activo aproximado y las acciones generales elegidas en esta página. No registramos texto del informe, respuestas a pruebas, lo que escribes, direcciones IP ni otros clics.',
    caveat:'El enlace se puede compartir: la actividad corresponde a la invitación, no verifica tu identidad. Conservación máxima: 90 días. Puedes desactivar y borrar la actividad de esta sesión del navegador. El informe funciona sin consentimiento.',
    allow:'Permitir actividad opcional',stop:'Desactivar y borrar mi actividad',on:'Actividad habilitada para esta visita.',off:'Actividad desactivada.',error:'Actividad no disponible; el informe sigue funcionando.',busy:'Guardando…'
  }
}
const allowed=new Set(['next_step','pdf_preview','pdf_download','tests','cabinet','media_attempt','materials'])
export function ClientSessionEngagement({selector,locale='en'}) {
  const t=WORDS[locale]||WORDS.en
  const [accepted,setAccepted]=useState(false),[ready,setReady]=useState(false)
  const [busy,setBusy]=useState(false),[error,setError]=useState(false)
  const lastActivity=useRef(0),minuteBucket=useRef(0),secondsThisMinute=useRef(0),lastSent=useRef(0)
  const url='/api/client-session-viewer/'+encodeURIComponent(selector)+'/engagement'
  useEffect(()=>{
    const controller=new AbortController()
    fetch(url,{credentials:'same-origin',cache:'no-store',signal:controller.signal})
      .then(response=>{if(!response.ok)throw new Error('unavailable');return response.json()})
      .then(data=>{if(!controller.signal.aborted){setAccepted(data.accepted===true);setReady(true)}})
      .catch(()=>{if(!controller.signal.aborted){setReady(true);setError(true)}})
    return ()=>controller.abort()
  },[url])
  async function updateConsent(next) {
    if(!ready||busy)return
    setBusy(true);setError(false)
    try{
      const response=await fetch(url,{method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'content-type':'application/json'},body:JSON.stringify({op:'consent',accepted:next})})
      if(!response.ok)throw new Error('unavailable')
      setAccepted(next)
    }catch{setError(true)}finally{setBusy(false)}
  }
  useEffect(()=>{
    if(!ready||!accepted)return
    lastActivity.current=Date.now()
    minuteBucket.current=Math.floor(Date.now()/60000)
    secondsThisMinute.current=0
    lastSent.current=0
    const send=(kind,seconds=0,keepalive=false)=>{
      const command={op:'event',id:crypto.randomUUID(),kind,seconds}
      // No retries or persistent queue: failed events are not inferred as visits.
      void fetch(url,{method:'POST',credentials:'same-origin',cache:'no-store',keepalive,
        headers:{'content-type':'application/json'},body:JSON.stringify(command)}).catch(()=>{})
    }
    const root=document.querySelector('[data-hh-session-engagement-root]')
    const activity=()=>{lastActivity.current=Date.now()}
    const click=event=>{
      activity()
      const control=event.target.closest?.('a,button')
      const marked=control?.closest?.('[data-hh-engagement-action]')
      if(!marked||!root?.contains(marked))return
      const kind=marked.getAttribute('data-hh-engagement-action')
      if(allowed.has(kind))send(kind,0,true)
    }
    const flush=()=>{
      // Send cumulative active seconds for this minute. Server keeps MAX per
      // shared viewer/minute (not SUM), so retries and multiple tabs cannot
      // double-count the same elapsed interval.
      const seconds=Math.min(60,Math.max(0,secondsThisMinute.current))
      if(seconds>lastSent.current){lastSent.current=seconds;send('active',seconds,true)}
    }
    send('opened')
    const tick=setInterval(()=>{
      const now=Date.now(),currentMinute=Math.floor(now/60000)
      if(minuteBucket.current!==currentMinute){
        flush();minuteBucket.current=currentMinute;secondsThisMinute.current=0;lastSent.current=0
      }
      if(document.visibilityState==='visible'&&document.hasFocus()&&
         now-lastActivity.current<60000)secondsThisMinute.current=Math.min(60,secondsThisMinute.current+1)
    },1000)
    const batching=setInterval(flush,30000)
    const visibility=()=>{if(document.visibilityState!=='visible')flush()}
    root?.addEventListener('click',click)
    document.addEventListener('pointerdown',activity,{passive:true})
    document.addEventListener('keydown',activity)
    document.addEventListener('visibilitychange',visibility)
    window.addEventListener('pagehide',flush)
    return()=>{
      clearInterval(tick);clearInterval(batching);flush()
      root?.removeEventListener('click',click)
      document.removeEventListener('pointerdown',activity)
      document.removeEventListener('keydown',activity)
      document.removeEventListener('visibilitychange',visibility)
      window.removeEventListener('pagehide',flush)
    }
  },[accepted,ready,url])
  return <section className={styles.box} aria-label={t.title}>
    <details className={styles.details}>
      <summary>{t.title} <span aria-hidden="true">·</span> <span>{accepted?t.on:t.off}</span></summary>
      <p>{t.intro}</p><p className={styles.note}>{t.caveat}</p>
      {ready&&!error&&<button className={styles.control} type="button" disabled={busy}
        aria-pressed={accepted} onClick={()=>updateConsent(!accepted)}>
        {busy?t.busy:accepted?t.stop:t.allow}
      </button>}
      {!ready&&<p className={styles.note} role="status">{t.busy}</p>}
      {error&&<p role="status" className={styles.note}>{t.error}</p>}
    </details>
  </section>
}
