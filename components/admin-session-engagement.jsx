'use client'
import {useEffect,useRef,useState} from 'react'
import styles from './admin-session-engagement.module.css'

const C={
 en:{title:'Post-report journey',intro:'Optional first-party interactions from the protected session link (last 90 days). No report contents or personal test results.',privacy:'A shared-link visitor is NOT a verified client identity. No verified lead, booking or payment is inferred from clicks. No consent or no events = not measured, not disinterest.',refresh:'Refresh',loading:'Loading…',error:'Could not load activity.',none:'No opted-in activity measured yet.',noLink:'No share link has been created.',views:'Report opens',sessions:'Browser sessions',time:'Approx. active time',actions:'Chosen actions',recent:'Recent steps',notMeasured:'Not measured',labels:{opened:'Report opened',next_step:'Next step',pdf_preview:'PDF preview',pdf_download:'PDF download',tests:'Tests link',cabinet:'Cabinet link',media_attempt:'Media play requested',materials:'Materials link'}},
 ru:{title:'Путь после отчёта',intro:'Добровольные действия по защищённой ссылке за последние 90 дней. Без текста отчёта и результатов тестов.',privacy:'Читатель ссылки НЕ подтверждён как клиент. Клики не являются доказательством заявки, записи или оплаты. Нет согласия или событий — «не измерено», а не «не интересуется».',refresh:'Обновить',loading:'Загрузка…',error:'Не удалось загрузить активность.',none:'Активность с согласием пока не измерена.',noLink:'Ссылка ещё не создана.',views:'Открытий отчёта',sessions:'Браузерных сессий',time:'Активное время ~',actions:'Выбранные действия',recent:'Последние шаги',notMeasured:'Не измерено',labels:{opened:'Открыл отчёт',next_step:'Следующий шаг',pdf_preview:'Открыл PDF',pdf_download:'Скачал PDF',tests:'Перешёл к тестам',cabinet:'Перешёл в кабинет',media_attempt:'Запросил медиа',materials:'Открыл материалы'}},
 es:{title:'Ruta tras el informe',intro:'Interacciones voluntarias del enlace privado, últimos 90 días. Sin contenido del informe ni resultados de pruebas.',privacy:'Quien abre un enlace NO es un cliente verificado. Los clics no prueban una solicitud, reserva o pago. Sin permiso o eventos significa «no medido».',refresh:'Actualizar',loading:'Cargando…',error:'No se puede cargar la actividad.',none:'Sin actividad medida con consentimiento.',noLink:'Todavía no hay enlace.',views:'Aperturas',sessions:'Sesiones del navegador',time:'Tiempo activo aprox.',actions:'Acciones',recent:'Acciones recientes',notMeasured:'No medido',labels:{opened:'Abrió el informe',next_step:'Siguiente paso',pdf_preview:'Abrió PDF',pdf_download:'Descargó PDF',tests:'Enlace a pruebas',cabinet:'Enlace al perfil',media_attempt:'Pidió reproducir multimedia',materials:'Materiales'}}
}
export function AdminSessionEngagement({clientId,sessionId,locale='en'}) {
 const t=C[locale]||C.en
 const [result,setResult]=useState(null),[status,setStatus]=useState('idle')
 const sequence=useRef(0),active=useRef(null)
 useEffect(()=>()=>{sequence.current++;active.current?.abort()},[])
 async function load(){
   active.current?.abort()
   const controller=new AbortController()
   active.current=controller
   const id=++sequence.current
   setStatus('loading')
   try{
     const path='/api/admin/clients/'+encodeURIComponent(clientId)+'/sessions/'+encodeURIComponent(sessionId)+'/engagement'
     const response=await fetch(path,{cache:'no-store',credentials:'same-origin',signal:controller.signal})
     if(!response.ok)throw new Error('unavailable')
     const data=await response.json()
     if(typeof data.hasLink!=='boolean'||!Array.isArray(data.recent)||!Array.isArray(data.actions))throw new Error('invalid')
     if(controller.signal.aborted||id!==sequence.current)return
     setResult(data);setStatus('ready')
   }catch(e){if(e?.name!=='AbortError'&&!controller.signal.aborted&&id===sequence.current)setStatus('error')}
 }
 const measured=Boolean(result&&(result.viewCount>0||result.activeSeconds>0||result.actions.length>0))
 return <details className={styles.panel} onToggle={event=>{
   if(event.currentTarget.open&&status==='idle')void load()
 }}>
   <summary>{t.title}</summary>
   <p className={styles.intro}>{t.intro}</p>
   {status==='loading'&&<p role="status">{t.loading}</p>}
   {status==='error'&&<p role="alert">{t.error}</p>}
   {status==='ready'&&result&&!result.hasLink&&<p>{t.noLink}</p>}
   {status==='ready'&&result?.hasLink&&!measured&&<p>{t.none}</p>}
   {status==='ready'&&measured&&<>
      <div className={styles.metrics}>
       <div><strong>{result.viewCount}</strong><span>{t.views}</span></div>
       <div><strong>{result.viewerSessions}</strong><span>{t.sessions}</span></div>
       <div><strong>{Math.round(result.activeSeconds/60)} min</strong><span>{t.time}</span></div>
      </div>
      {result.actions.length>0&&<section className={styles.summary}><h4>{t.actions}</h4><ul>{
       result.actions.map(a=><li key={a.kind}><span>{t.labels[a.kind]||a.kind}</span><b>{a.count}</b></li>)
      }</ul></section>}
      {result.recent.length>0&&<section className={styles.summary}><h4>{t.recent}</h4><ol>{
       result.recent.map((item,i)=><li key={i}>
         <span>{t.labels[item.kind]||item.kind}</span>
         <time dateTime={item.occurredAt}>{new Date(item.occurredAt).toLocaleString(locale,{dateStyle:'short',timeStyle:'short',timeZone:'America/Toronto'})}</time>
       </li>)
      }</ol></section>}
   </>}
   <p className={styles.privacy}>{t.privacy}</p>
   <button className={styles.refresh} type="button" onClick={()=>load()} disabled={status==='loading'}>{t.refresh}</button>
 </details>
}
