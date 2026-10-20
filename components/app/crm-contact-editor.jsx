'use client'
import { useState } from 'react'
import styles from './crm-contact-editor.module.css'

const COPY={
 en:{title:'Edit contact',name:'Name',email:'Email',phone:'Phone / WhatsApp',source:'Source (manually recorded)',locale:'Language',
  save:'Save changes',hint:'Business contact details only. Changing a verified or previously consented email requires a new contact. Suppression never resets.',
  readonly:'Archived contacts cannot be edited. Reopen the contact stage first.',
  sources:{manual:'Added manually',website:'Website enquiry',referral:'Referral',event:'Event',academy:'Academy',other:'Other'}},
 ru:{title:'Изменить контакт',name:'Имя',email:'Email',phone:'Телефон / WhatsApp',source:'Источник (указывается вручную)',locale:'Язык',
  save:'Сохранить изменения',hint:'Только деловые данные. Подтверждённый email или адрес с историей согласия менять нельзя — нужен новый контакт. Отписка не отменяется.',
  readonly:'Архивный контакт нельзя редактировать. Сначала измените этап.',
  sources:{manual:'Добавлен вручную',website:'Заявка с сайта',referral:'Рекомендация',event:'Мероприятие',academy:'Академия',other:'Другое'}},
 es:{title:'Editar contacto',name:'Nombre',email:'Correo',phone:'Teléfono / WhatsApp',source:'Origen (indicado manualmente)',locale:'Idioma',
  save:'Guardar cambios',hint:'Solo datos comerciales. No se puede trasladar un correo verificado o con historial de consentimiento. El bloqueo de mensajes sigue vigente.',
  readonly:'Los contactos archivados no se pueden editar; cambia su etapa primero.',
  sources:{manual:'Añadido manualmente',website:'Consulta web',referral:'Recomendación',event:'Evento',academy:'Academia',other:'Otro'}},
}

export default function CrmContactEditor({contact,locale='en',busy=false,onAction}) {
 const lang=COPY[locale]?locale:'en',t=COPY[lang]
 const [open,setOpen]=useState(false)
 const [values,setValues]=useState({
  displayName:contact.displayName||'',email:contact.email||'',phone:contact.phone||'',
  locale:contact.locale||lang,source:contact.source||'manual',
 })
 const archived=contact.lifecycle==='archived'
 const update=(key,value)=>setValues(v=>({...v,[key]:value}))
 const submit=async event=>{
  event.preventDefault()
  if(busy||archived)return
  const result=await onAction('edit_contact',{
   id:contact.id,expectedRevision:contact.revision,...values,
  })
  if(result?.updated||result?.unchanged) setOpen(false)
 }
 return <div className={styles.wrap}>
  <button type="button" className={styles.toggle} aria-expanded={open} onClick={()=>setOpen(x=>!x)}>{t.title}</button>
  {open&&<div className={styles.inner}>
    {archived?<p>{t.readonly}</p>:<form onSubmit={submit} className={styles.form}>
      <label>{t.name}<input required maxLength={120} value={values.displayName}
        onChange={e=>update('displayName',e.target.value)}/></label>
      <label>{t.email}<input type="email" maxLength={254} value={values.email}
        onChange={e=>update('email',e.target.value)}/></label>
      <label>{t.phone}<input type="tel" maxLength={40} placeholder="+14165551234" value={values.phone}
        onChange={e=>update('phone',e.target.value)}/></label>
      <label>{t.source}<select value={values.source} onChange={e=>update('source',e.target.value)}>
        {Object.entries(t.sources).map(([id,label])=><option key={id} value={id}>{label}</option>)}
      </select></label>
      <label>{t.locale}<select value={values.locale} onChange={e=>update('locale',e.target.value)}>
        <option value="en">English</option><option value="ru">Русский</option><option value="es">Español</option>
      </select></label>
      <p className={styles.hint}>{t.hint}</p>
      <button className={styles.save} type="submit" disabled={busy||!values.displayName.trim()||(!values.email.trim()&&!values.phone.trim())}>{t.save}</button>
    </form>}
  </div>}
 </div>
}
