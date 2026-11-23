'use client'
import {useEffect,useRef,useState} from 'react'
import {appFetch} from '@/lib/app/client-fetch'
import {createDaybookCoachClient} from '@/lib/app/daybook-coach-client.mjs'
import {daybookCoachExcerpt} from '@/lib/app/daybook-coach-excerpt.mjs'
import css from './my-coaching-plan.module.css'
const copy={
 en:{title:'Selected Daybook source',loading:'Checking the saved version…',unavailable:'This source link is unavailable or expired. Open the saved item in Daybook again. You can continue without it.',privacy:'This private preview is not shared. Select a short excerpt, then review the provider and allow sharing separately.',topic:'Topic for this excerpt',entry:'Saved journal entry — private preview',selected:'Use selected text',whole:'Use this short entry',invalid:'Choose a nonempty excerpt of up to 240 characters. Some sensitive content cannot be shared here.',chosen:'Excerpt selected for review.'},
 ru:{title:'Выбранная запись дневника',loading:'Проверяем сохранённую версию…',unavailable:'Ссылка недоступна или истекла. Откройте сохранённую запись в дневнике ещё раз. Можно продолжить без неё.',privacy:'Этот личный просмотр не передаётся коучу. Выделите короткий фрагмент, затем отдельно проверьте провайдера и разрешите передачу.',topic:'Тема фрагмента',entry:'Сохранённая запись — личный просмотр',selected:'Использовать выделенное',whole:'Использовать короткую запись',invalid:'Выберите непустой фрагмент до 240 символов. Некоторые чувствительные сведения здесь передавать нельзя.',chosen:'Фрагмент выбран для проверки.'},
 es:{title:'Fuente elegida del diario',loading:'Comprobando la versión guardada…',unavailable:'El enlace no está disponible o ha caducado. Abre de nuevo la entrada guardada en el diario. Puedes continuar sin ella.',privacy:'Esta vista privada no se comparte. Selecciona un fragmento breve y después revisa el proveedor y autoriza el envío por separado.',topic:'Tema del fragmento',entry:'Entrada guardada — vista privada',selected:'Usar texto seleccionado',whole:'Usar esta entrada breve',invalid:'Elige un fragmento de hasta 240 caracteres que no esté vacío. Algunos datos sensibles no se pueden compartir aquí.',chosen:'Fragmento elegido para revisión.'},
}
export default function DaybookCoachPreview({accountId,locale,contextSessionToken,domains,onSelect}){
 const c=copy[locale]||copy.en
 const [state,setState]=useState({phase:'absent',source:null}),[topic,setTopic]=useState(''),[message,setMessage]=useState('')
 const field=useRef(null)
 useEffect(()=>{
  if(!contextSessionToken)return
  const url=new URL(window.location.href),tokens=url.searchParams.getAll('daybook'),coaches=url.searchParams.getAll('coach')
  if(!tokens.length)return
  if(tokens.length!==1||coaches.length!==1){setState({phase:'error',source:null});return}
  const client=createDaybookCoachClient(appFetch,accountId)
  setState({phase:'loading',source:null})
  void client.run({operation:'resolve',token:tokens[0],coachId:coaches[0],contextSessionToken}).then(result=>{
   const source=result.source
   if(!source||!['journal','goal'].includes(source.kind)||typeof source.text!=='string')throw new Error('SOURCE_INVALID')
   setState({phase:'ready',source})
   if(source.kind==='goal')onSelect({itemId:source.itemId,category:'goals',topicKey:source.topicKey,label:source.text})
  }).catch(error=>{if(error.code!=='DAYBOOK_COACH_STALE')setState({phase:'error',source:null})})
  return ()=>client.dispose()
 },[accountId,contextSessionToken,onSelect])
 if(state.phase==='absent')return null
 const source=state.source
 function choose(start,end){
  try{
   daybookCoachExcerpt(source,{revision:source.revision,topicKey:topic,start,end})
   onSelect({itemId:source.itemId,category:'journal_excerpt',topicKey:topic,
    label:source.localDay,excerpt:{revision:source.revision,start,end}})
   setMessage(c.chosen)
  }catch{onSelect(null);setMessage(c.invalid)}
 }
 return <section aria-label={c.title}>
  <h3>{c.title}</h3>
  {state.phase==='loading'?<p role="status">{c.loading}</p>:state.phase==='error'?<p role="status">{c.unavailable}</p>:source.kind==='goal'?<p>{source.text}</p>:<>
   <p>{c.privacy}</p>
   <label>{c.topic}<select value={topic} onChange={event=>{setTopic(event.target.value);onSelect(null);setMessage('')}}>
    <option value="">—</option>{domains.map(area=><option key={area.areaKey} value={area.areaKey}>{area.label}</option>)}
   </select></label>
   <label>{c.entry}<textarea className={css.daybookExcerpt} ref={field} readOnly rows={7} value={source.text}/></label>
   <div className={css.contextControls}>
    <button type="button" disabled={!topic} onClick={()=>choose(field.current?.selectionStart??0,field.current?.selectionEnd??0)}>{c.selected}</button>
    {source.text.length<=240&&<button type="button" disabled={!topic} onClick={()=>choose(0,source.text.length)}>{c.whole}</button>}
   </div>
   <p role="status">{message}</p>
  </>}
 </section>
}
