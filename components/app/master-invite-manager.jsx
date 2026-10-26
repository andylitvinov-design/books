'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import styles from './master-invite-manager.module.css'

const COPY={
 en:{title:'Add a master',desc:'Create a private master card, exchange files, and send an invitation whenever you are ready.',name:'Master name',create:'Add master',loading:'Loading…',creating:'Creating…',pending:'Awaiting Google registration',linked:'Google account linked',expired:'Invitation expired',revoked:'Invitation revoked',copy:'Copy registration link',copied:'Copied',renew:'Renew link',chat:'Open private conversation',empty:'No invited masters yet.',privacy:'Private by default. Public practitioner pages require the master to complete onboarding and pass review. No messages are sent automatically.',error:'Could not complete the request.',duplicate:'A pending invitation with this name already exists. Use its link below.',linkedNote:'Files in the conversation become available to the master only after their Google account is linked.'},
 ru:{title:'Добавить мастера',desc:'Создайте карточку мастера, обменивайтесь файлами и позднее передайте ссылку регистрации.',name:'Имя мастера',create:'Добавить мастера',loading:'Загрузка…',creating:'Создаём…',pending:'Ожидает входа через Google',linked:'Google-аккаунт привязан',expired:'Ссылка устарела',revoked:'Ссылка отозвана',copy:'Копировать ссылку регистрации',copied:'Скопировано',renew:'Обновить ссылку',chat:'Открыть личную переписку',empty:'Добавленных мастеров пока нет.',privacy:'Карточка приватная. Публичная страница станет доступна после заполнения профиля и модерации. Сообщения не отправляются автоматически.',error:'Не удалось выполнить действие.',duplicate:'Приглашение с таким именем уже создано. Воспользуйтесь ссылкой ниже.',linkedNote:'Мастер получит доступ к файлам в переписке только после привязки Google-аккаунта.'},
 es:{title:'Añadir profesional',desc:'Crea una ficha privada, comparte archivos y envía el enlace cuando quieras.',name:'Nombre del profesional',create:'Añadir profesional',loading:'Cargando…',creating:'Creando…',pending:'Pendiente de Google',linked:'Cuenta de Google vinculada',expired:'Invitación caducada',revoked:'Invitación revocada',copy:'Copiar invitación',copied:'Copiado',renew:'Renovar enlace',chat:'Abrir conversación privada',empty:'Todavía no hay profesionales invitados.',privacy:'Privado de forma predeterminada. La página pública requiere completar el perfil y superar la revisión. No se envían mensajes automáticamente.',error:'No se pudo completar.',duplicate:'Ya hay una invitación pendiente con este nombre. Usa el enlace de abajo.',linkedNote:'El profesional solo podrá ver los archivos después de vincular su cuenta Google.'},
}
export default function MasterInviteManager({locale='en',accountId}){
 const t=COPY[locale]||COPY.en
 const [name,setName]=useState(''),[items,setItems]=useState([])
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false)
 const [error,setError]=useState(''),[copied,setCopied]=useState('')
 const operation=useRef(null)
 const reload=useCallback(async()=>{
   const response=await fetch('/api/app/practitioner-master-invites',{cache:'no-store',credentials:'same-origin'})
   const result=await response.json().catch(()=>({}))
   if(!response.ok||result.accountId!==accountId||!Array.isArray(result.invitations))
     throw new Error(result.error||'UNAVAILABLE')
   setItems(result.invitations)
 },[accountId])
 useEffect(()=>{
   if(!accountId)return
   let alive=true
   setLoading(true)
   reload().catch(()=>{if(alive)setError(t.error)}).finally(()=>{if(alive)setLoading(false)})
   return()=>{alive=false}
 },[reload,accountId,t.error])
 async function add(event){
   event.preventDefault()
   if(busy||!name.trim()||!accountId)return
   setBusy(true);setError('')
   try{
     if(!operation.current)operation.current=crypto.randomUUID()
     const response=await fetch('/api/app/practitioner-master-invites',{
       method:'POST',credentials:'same-origin',cache:'no-store',
       headers:{'Content-Type':'application/json','x-hh-account-id':accountId},
       body:JSON.stringify({action:'create',name:name.trim(),locale,operationId:operation.current}),
     })
     const result=await response.json().catch(()=>({}))
     if(!response.ok)throw new Error(result.error||'UNAVAILABLE')
     setName('');operation.current=null
     await reload()
   }catch(failure){setError(failure.message==='MASTER_ALREADY_INVITED'?t.duplicate:t.error)}
   finally{setBusy(false)}
 }
 return <section className={styles.shell} data-master-invite-manager>
   <header><div><h3>{t.title}</h3><p>{t.desc}</p></div></header>
   <form onSubmit={add} className={styles.form}>
     <label>{t.name}<input required minLength={2} maxLength={120} value={name}
       onChange={event=>{setName(event.target.value);operation.current=null}}
       autoComplete="off" disabled={busy}/></label>
     <button type="submit" disabled={busy||name.trim().length<2}>{busy?t.creating:t.create}</button>
   </form>
   {error&&<p role="alert" className={styles.error}>{error}</p>}
   {loading?<p role="status">{t.loading}</p>:items.length===0?<p>{t.empty}</p>:
   <div className={styles.list}>{items.map(item=><article key={item.id} className={styles.item}>
     <div className={styles.person}><span className={styles.avatar} aria-hidden="true">{item.name.slice(0,1).toUpperCase()}</span>
       <span><strong>{item.name}</strong><small>{t[item.status]||item.status}</small></span></div>
     <div className={styles.actions}>
       <Link href={'/'+locale+'/app/messages?source=direct&thread='+encodeURIComponent(item.threadId)} prefetch={false}>{t.chat}</Link>
       {item.status==='expired'&&<button type="button" disabled={busy} onClick={async()=>{
         setBusy(true);setError('')
         try{const response=await fetch('/api/app/practitioner-master-invites',{method:'POST',cache:'no-store',credentials:'same-origin',headers:{'Content-Type':'application/json','x-hh-account-id':accountId},body:JSON.stringify({action:'renew',invitationId:item.id})});if(!response.ok)throw new Error('UNAVAILABLE');await reload()}
         catch{setError(t.error)}finally{setBusy(false)}
       }}>{t.renew}</button>}
       {item.inviteUrl&&<button type="button" onClick={async()=>{
         try{await navigator.clipboard.writeText(item.inviteUrl);setCopied(item.id)}
         catch{setError(t.error)}
       }}>{copied===item.id?t.copied:t.copy}</button>}
     </div>
   </article>)}</div>}
   <p className={styles.note}>{t.linkedNote} {t.privacy}</p>
 </section>
}
