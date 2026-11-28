'use client'

import {useState} from 'react'
import {appFetch} from '@/lib/app/client-fetch'
import {localJournalDay} from '@/lib/app/daybook-journal-contract.mjs'
import {createJournalSaver} from '@/lib/app/daybook-journal-save.mjs'
import DaybookCoachLink from './daybook-coach-link'

const copy={
 en:{open:'Add a Daybook note',label:'What should a coach know about this material?',save:'Save privately',retry:'Retry save',error:'Save could not be verified.',saved:'Note saved in Daybook.'},
 ru:{open:'Добавить запись в дневник',label:'Что коучу стоит знать об этом материале?',save:'Сохранить приватно',retry:'Повторить сохранение',error:'Не удалось подтвердить сохранение.',saved:'Запись сохранена в дневнике.'},
 es:{open:'Añadir una nota al diario',label:'¿Qué debería saber un coach sobre este material?',save:'Guardar en privado',retry:'Reintentar',error:'No se pudo confirmar el guardado.',saved:'Nota guardada en el diario.'},
}

export default function CoachMaterialNote({accountId,locale,kind,id}){
 return <MaterialNote key={[accountId,kind,id].join(':')} accountId={accountId} locale={locale} kind={kind} id={id}/>
}

function MaterialNote({accountId,locale,kind,id}){
 const t=copy[locale]||copy.en
 const [text,setText]=useState(''),[draft,setDraft]=useState(null)
 const [saved,setSaved]=useState(null),[status,setStatus]=useState('')
 const [saver]=useState(()=>createJournalSaver(appFetch,accountId))

 async function save(){
  if(!text.trim()||status==='saving'||saved)return
  const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'
  const next=draft||{id:crypto.randomUUID(),revision:0,text:text.trim(),tags:[],kind:'note',locale,
   timezone,localDay:localJournalDay(new Date().toISOString(),timezone),goalId:null,material:{kind,id}}
  setDraft(next);setStatus('saving')
  try{setSaved(await saver.save(next));setStatus('saved')}
  catch{setStatus('error')}
 }

 return <details>
  <summary>{t.open}</summary>
  {saved?<><p role="status">{t.saved}</p>
   <DaybookCoachLink accountId={accountId} locale={locale} kind="journal" itemId={saved.id} revision={saved.revision}/>
  </>:<>
   <label>{t.label}<textarea rows={3} maxLength={240} value={text} disabled={Boolean(draft)}
    onChange={event=>setText(event.target.value)} style={{display:'block',width:'100%'}}/></label>
   <button type="button" disabled={!text.trim()||status==='saving'} onClick={()=>void save()}>{status==='error'?t.retry:t.save}</button>
   {status==='error'&&<p role="status">{t.error}</p>}
  </>}
 </details>
}
