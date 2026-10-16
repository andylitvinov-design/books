'use client'
import {useState} from 'react'
import {SessionMaterialPicker} from './session-material-picker'
import styles from './session-material-picker.module.css'

async function call(url,method='GET',body){
  const response=await fetch(url,{method,credentials:'same-origin',cache:'no-store',
    ...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})})
  const data=await response.json()
  if(!response.ok)throw new Error(data.error||'MATERIAL_UNAVAILABLE')
  return data
}
export function ConsultationMaterialAssignment({clientId,documentId,locale='en'}){
  const ru=locale==='ru'
  const [session,setSession]=useState(null)
  const [selected,setSelected]=useState([])
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const [dirty,setDirty]=useState(false)
  async function initialize(){
    if(session||busy)return
    setBusy(true);setError('')
    try{
      // Creating a consultation-linked session is idempotent. It is never
      // published by this editor; only the owner can publish the session.
      const start=await call('/api/admin/clients/'+clientId+'/sessions','POST',{documentId})
      const result=await call('/api/admin/clients/'+clientId+'/sessions/'+start.id)
      setSession(result.session)
      setSelected(result.session.draft?.plan?.materialIds||
        result.session.draft?.plan?.materials?.map(item=>item.id)||[])
      setDirty(false)
    }catch(e){setError(e.message)}
    finally{setBusy(false)}
  }
  async function save(){
    if(!session||busy)return
    setBusy(true);setError('');setMessage('')
    try{
      // Rebase selection onto the latest full draft, retaining audio/photos,
      // written recommendations and media added in another editor tab.
      const base='/api/admin/clients/'+clientId+'/sessions/'+session.id
      const current=(await call(base)).session
      const draft={...current.draft,plan:{...current.draft.plan,materialIds:selected}}
      await call(base,'PATCH',{expectedRevision:current.draftRevision,draft})
      setDirty(false)
      setMessage(ru?'Выбор сохранён. Для отображения клиенту опубликуйте обновлённый отчёт.':
        'Selection saved. Publish the updated session to make it visible to the client.')
    }catch(e){setError(e.message)}
    finally{setBusy(false)}
  }
  return <section style={{background:'#fff',borderRadius:16,padding:'14px 18px',
    margin:'16px auto',maxWidth:850,border:'1px solid #dce6ef'}}>
    <SessionMaterialPicker locale={locale} selectedIds={selected} onOpen={initialize}
      disabled={busy||!session} onChange={ids=>{setSelected(ids);setDirty(true);setMessage('')}}/>
    {error&&<p role="alert" className={styles.alert}>{error}</p>}
    {message&&<p role="status" className={styles.success}>{message}</p>}
    {busy&&<p>{ru?'Подготовка…':'Preparing…'}</p>}
    {session&&<div className={styles.footer}>
      <button className={styles.save} type="button" disabled={busy||!dirty}
        onClick={()=>void save()}>{ru?'Сохранить выбранные материалы':'Save selected materials'}</button>
      <a className={styles.link} href={'/admin/clients/'+clientId+'/sessions/'+session.id}>
        {ru?'Открыть редактор отчёта':'Open full report editor'} ↗</a>
    </div>}
  </section>
}
