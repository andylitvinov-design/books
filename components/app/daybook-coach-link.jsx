'use client'
import { useEffect, useRef, useState } from 'react'
import { appFetch } from '@/lib/app/client-fetch'
import { createDaybookCoachClient } from '@/lib/app/daybook-coach-client.mjs'
import { PUBLIC_COACH_PERSONAS, coachSessionHref, localCoachText } from '@/lib/coaching/persona-registry.mjs'

const copy = {
  en: { open:'Discuss with a coach', coach:'Choose a coach', go:'Open selected coach', waiting:'Opening…', error:'Could not open this saved version. Reload the entry and try again.', privacy:'Opening a coach does not share this entry. Review and allow a selected excerpt in the conversation context panel.' },
  ru: { open:'Обсудить с коучем', coach:'Выберите коуча', go:'Открыть выбранного коуча', waiting:'Открываем…', error:'Не удалось открыть сохранённую версию. Обновите запись и повторите.', privacy:'Переход к коучу не передаёт запись. Проверьте выбранный фрагмент и разрешите передачу в панели контекста разговора.' },
  es: { open:'Hablar con un coach', coach:'Elige un coach', go:'Abrir coach elegido', waiting:'Abriendo…', error:'No se pudo abrir esta versión guardada. Recarga la entrada e inténtalo de nuevo.', privacy:'Abrir un coach no comparte la entrada. Revisa y autoriza un fragmento en el panel de contexto de la conversación.' },
}
export default function DaybookCoachLink(props) {
  return <OwnerCoachLink key={[props.accountId,props.kind,props.itemId,props.revision].join(':')} {...props}/>
}
function OwnerCoachLink({ accountId, kind, itemId, revision, locale, disabled, onSessionLost }) {
  const c=copy[locale]||copy.en
  const [coachId,setCoachId]=useState(''),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false)
  const client=useRef(null)
  useEffect(()=>{
    const current=createDaybookCoachClient(appFetch,accountId)
    client.current=current
    return ()=>{current.dispose();client.current=null}
  },[accountId])
  async function open() {
    if (!coachId||busy||disabled||!client.current) return
    setBusy(true);setFailed(false)
    try {
      const result=await client.current.run({operation:'issue',kind,itemId,revision,coachId})
      if(typeof result.token!=='string'||result.token.length>2048||
        !Number.isFinite(result.expiresAt)||result.expiresAt<=Date.now()) throw new Error('INVALID_HANDOFF')
      const href=coachSessionHref(locale,coachId)
      if(!href)throw new Error('INVALID_HANDOFF')
      window.location.assign(href+'&daybook='+encodeURIComponent(result.token))
    } catch(error) {
      if(error.code==='DAYBOOK_COACH_STALE')return
      if(error.status===401||error.code==='ACCOUNT_CHANGED')onSessionLost?.()
      else setFailed(true)
      setBusy(false)
    }
  }
  return <details>
    <summary>{c.open}</summary>
    <p>{c.privacy}</p>
    <label>{c.coach}<select value={coachId} disabled={busy||disabled} onChange={event=>setCoachId(event.target.value)}>
      <option value="">—</option>
      {PUBLIC_COACH_PERSONAS.map(coach=><option key={coach.id} value={coach.id}>{localCoachText(coach.name,locale)}</option>)}
    </select></label>
    <button type="button" disabled={!coachId||busy||disabled} onClick={()=>void open()}>{busy?c.waiting:c.go}</button>
    {failed&&<p role="status">{c.error}</p>}
  </details>
}
