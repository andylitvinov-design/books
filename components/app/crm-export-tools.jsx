'use client'
import { useState } from 'react'
import styles from './crm-export-tools.module.css'

const COPY={
 en:{title:'Export business contacts',note:'This CSV contains names, email addresses and phone numbers. Keep it private and do not share it with other people or marketing services.',button:'Download CSV',confirm:'Download your private business-contact list as CSV to this device?',busy:'Preparing private file…',saved:'File prepared for download.',fail:'Could not export contacts. Try again.',tooMany:'There are more than 5,000 contacts. Export is paused for privacy and size protection.',history:'Recent downloads',count:'contacts',privacy:'Only business contact details. No medical information, tests or private reports are included.'},
 ru:{title:'Экспорт деловых контактов',note:'CSV содержит имена, адреса и телефоны. Храните файл в защищённом месте и не передавайте его другим людям или рекламным сервисам.',button:'Скачать CSV',confirm:'Скачать на это устройство файл с личными деловыми контактами?',busy:'Подготавливаем файл…',saved:'Файл подготовлен для скачивания.',fail:'Не удалось выгрузить контакты. Повторите.',tooMany:'В CRM более 5 000 контактов; выгрузка остановлена из-за ограничений безопасности и размера.',history:'Недавние выгрузки',count:'контактов',privacy:'Только деловые данные, без диагнозов, тестов и личных отчётов.'},
 es:{title:'Exportar contactos profesionales',note:'El CSV contiene nombres, correos y teléfonos. Guarda el archivo de forma privada y no lo compartas con terceros o servicios de publicidad.',button:'Descargar CSV',confirm:'¿Descargar a este dispositivo la lista privada de contactos profesionales?',busy:'Preparando el archivo…',saved:'Archivo preparado para descargar.',fail:'No se pudieron exportar los contactos. Inténtalo otra vez.',tooMany:'Hay más de 5.000 contactos. Se bloqueó la exportación por límites de privacidad y tamaño.',history:'Descargas recientes',count:'contactos',privacy:'Solo datos profesionales. No incluye información médica ni informes privados.'},
}
export default function CrmExportTools({accountId,locale='en',recentExports=[],onCompleted}) {
 const t=COPY[locale]||COPY.en
 const [busy,setBusy]=useState(false)
 const [notice,setNotice]=useState('')
 async function download() {
  if(busy||!accountId||!window.confirm(t.confirm))return
  setBusy(true);setNotice('')
  try {
   const response=await fetch('/api/app/crm/export',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json','X-HH-Account-Id':accountId},
    body:JSON.stringify({format:'csv',scope:'business_contacts'}),
   })
   if(!response.ok) {
    const body=await response.json().catch(()=>({}))
    throw new Error(body.error==='CRM_EXPORT_TOO_LARGE'?'too_large':'failed')
   }
   const blob=await response.blob()
   if(blob.type&&!blob.type.startsWith('text/csv'))throw new Error('failed')
   const href=URL.createObjectURL(blob)
   try {
    const a=document.createElement('a')
    a.href=href
    a.download='holistic-house-crm-'+new Date().toISOString().slice(0,10)+'.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
   } finally {setTimeout(()=>URL.revokeObjectURL(href),30000)}
   setNotice(t.saved)
   onCompleted?.()
  } catch(error) {
   setNotice(error?.message==='too_large'?t.tooMany:t.fail)
  } finally {setBusy(false)}
 }
 return <details className={styles.panel}>
  <summary>{t.title}</summary>
  <p>{t.note}</p>
  <p className={styles.fine}>{t.privacy}</p>
  <button disabled={busy||!accountId} type="button" onClick={download}>{busy?t.busy:t.button}</button>
  {notice&&<p role="status" className={styles.notice}>{notice}</p>}
  {!!recentExports.length&&<div className={styles.history}>
   <strong>{t.history}</strong>
   <ul>{recentExports.map(event=><li key={event.id}>
    {new Date(event.at).toLocaleDateString(locale)} · {event.count} {t.count}
   </li>)}</ul>
  </div>}
 </details>
}
