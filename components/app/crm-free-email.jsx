'use client'
import { useMemo,useState } from 'react'
import { eligibleFreeEmailContacts,buildFreeEmailQueue,FREE_EMAIL_MAX_RECIPIENTS } from '../../lib/crm/free-email.js'
import styles from './crm-free-sms.module.css'
const COPY={
 en:{title:'Email from your own app · no mailing API',desc:'Prepare messages for verified, opted-in contacts. Copy the text and send each email manually with your own mail app.',
   note:'No Resend API charges. Your email provider may enforce sending limits; this is not an automated broadcast.',
   subject:'Subject',body:'Message',pick:'Contacts with verified email consent',empty:'No verified email contacts with documented opt-in. Record consent and verify addresses first.',
   prepare:'Prepare manual emails',copy:'Copy text',open:'Open email app',next:'Next',prev:'Previous',clear:'Close',
   ready:'Copy text, open your mail app, paste it, verify recipient and press Send yourself. No delivery confirmation is recorded.',
   copied:'Copied; paste in your mail app.',failed:'Select and copy the text below.',invalid:'Check recipients and text.',
   foot:'Holistic House contact details and a working unsubscribe method must be included in commercial emails. Honor replies asking to unsubscribe in CRM.',
   choose:'Select',size:'selected',cant:'No automatic sends. Do not use for private reports, assessments or treatment information.'},
 ru:{title:'Email из вашей почты · без платного API',desc:'Подготовка писем клиентам с подтверждённым email и согласием. Вы сами отправляете каждому письмо из своего приложения.',
   note:'Плата API Resend — 0. Почтовый провайдер может ограничивать отправки; автоматической рассылки нет.',
   subject:'Тема',body:'Текст',pick:'Контакты с подтверждённым согласием на email',empty:'Нет подтверждённых email с согласием. Сначала зафиксируйте согласие и подтвердите адрес.',
   prepare:'Подготовить письма',copy:'Копировать текст',open:'Открыть почтовое приложение',next:'Следующий',prev:'Предыдущий',clear:'Закрыть',
   ready:'Скопируйте текст, откройте почту, вставьте его, проверьте адрес и сами нажмите «Отправить». Статус доставки не фиксируется.',
   copied:'Скопировано. Вставьте в письмо.',failed:'Выделите и скопируйте текст ниже.',invalid:'Проверьте адресатов и текст.',
   foot:'Коммерческое письмо должно содержать контакты Holistic House и действующий способ отписки. Отказы нужно фиксировать в CRM.',
   choose:'Выбрать',size:'выбрано',cant:'Без авторассылки и без личных медицинских отчётов, анкет и сведений о лечении.'},
 es:{title:'Email con tu aplicación · sin API de pago',desc:'Prepara correos para contactos con email verificado y consentimiento. Cada envío es manual.',
   note:'Sin cargos API. Tu proveedor puede limitar los envíos; no es una campaña automática.',
   subject:'Asunto',body:'Mensaje',pick:'Contactos con consentimiento verificado',empty:'No hay contactos elegibles. Registra consentimiento y verifica direcciones.',
   prepare:'Preparar correos',copy:'Copiar texto',open:'Abrir correo',next:'Siguiente',prev:'Anterior',clear:'Cerrar',
   ready:'Copia el texto, abre correo, pégalo, revisa destinatario y pulsa Enviar manualmente.',
   copied:'Copiado. Pega en correo.',failed:'Selecciona y copia el texto.',invalid:'Revisa destinatarios y texto.',
   foot:'Incluye identificación y contacto de Holistic House y una forma de cancelar suscripción. Registra la baja en CRM.',
   choose:'Elegir',size:'elegidos',cant:'Sin envíos automáticos ni datos médicos privados.'}
}
const DEFAULT={
 en:['Holistic House — available appointments','Thank you for your interest. I can share upcoming availability.\n\nHolistic House — https://holistichouse.vercel.app\nTo stop receiving updates, please reply unsubscribe.'],
 ru:['Holistic House — консультации','Спасибо за интерес! Могу прислать доступное время для консультации.\n\nHolistic House — https://holistichouse.vercel.app\nЧтобы отказаться от сообщений, ответьте «Отписаться».'],
 es:['Holistic House — consultas','Gracias por tu interés. Puedo compartir los horarios disponibles.\n\nHolistic House — https://holistichouse.vercel.app\nPara cancelar mensajes, responde «Baja».']
}
export default function CrmFreeEmail({contacts=[],locale='en'}){
 const lang=COPY[locale]?locale:'en',t=COPY[lang]
 const [subject,setSubject]=useState(DEFAULT[lang][0]),[body,setBody]=useState(DEFAULT[lang][1])
 const [selected,setSelected]=useState([]),[queue,setQueue]=useState([]),[index,setIndex]=useState(0)
 const [status,setStatus]=useState(''),[error,setError]=useState('')
 const candidates=useMemo(()=>eligibleFreeEmailContacts(contacts),[contacts])
 const current=queue[index]
 function clearPrepared(){setQueue([]);setIndex(0);setStatus('');setError('')}
 function toggle(id){clearPrepared();setSelected(ids=>ids.includes(id)?ids.filter(x=>x!==id):ids.length<FREE_EMAIL_MAX_RECIPIENTS?[...ids,id]:ids)}
 function prepare(){
  setError('');try{if(!selected.length)throw new Error('empty')
   setQueue(buildFreeEmailQueue(contacts,selected,subject,body));setIndex(0)
  }catch{setError(t.invalid)}
 }
 async function copy(){
  if(!current)return
  try{await navigator.clipboard.writeText(current.body);setStatus(t.copied)}
  catch{setStatus(t.failed)}
 }
 const stillAllowed=current&&candidates.some(x=>x.id===current.id&&x.email.toLowerCase()===current.email)
 return <section className={styles.panel} aria-label={t.title}>
  <div className={styles.head}><div><h4>{t.title}</h4><p>{t.desc}</p></div><span className={styles.cost}>$0 API</span></div>
  <p className={styles.fine}>{t.note}</p>
  <label className={styles.field}>{t.subject}<input maxLength={120} value={subject} onChange={e=>{setSubject(e.target.value);clearPrepared()}} /></label>
  <label className={styles.field}>{t.body}<textarea rows={5} maxLength={2000} value={body} onChange={e=>{setBody(e.target.value);clearPrepared()}}/></label>
  <p className={styles.fine}>{t.cant} {t.foot}</p>
  <div className={styles.selectionHead}><strong>{t.pick} ({candidates.length})</strong><span>{selected.length}/{FREE_EMAIL_MAX_RECIPIENTS} {t.size}</span></div>
  {!candidates.length?<p className={styles.warning}>{t.empty}</p>:<div className={styles.picker}>
   {candidates.slice(0,80).map(c=><label key={c.id} className={styles.recipient}>
    <input type="checkbox" checked={selected.includes(c.id)} disabled={!selected.includes(c.id)&&selected.length>=FREE_EMAIL_MAX_RECIPIENTS} onChange={()=>toggle(c.id)}/>
    <span><strong>{c.displayName||c.email}</strong><small>{c.email}</small></span>
   </label>)}
  </div>}
  <div className={styles.actions}>
   <button className={styles.primary} type="button" disabled={!selected.length} onClick={prepare}>{t.prepare} ({selected.length})</button>
  </div>
  {error&&<p role="alert" className={styles.warning}>{error}</p>}
  {current&&<div className={styles.dispatch}>
   <div className={styles.step}><strong>{index+1}/{queue.length}</strong><span>{current.name} · {current.email}</span></div>
   {stillAllowed&&<><p>{t.ready}</p>
    <label className={styles.field}>{t.body}<textarea className={styles.readonly} readOnly rows={6} value={current.body}/></label>
    <div className={styles.actions}><button type="button" className={styles.primary} onClick={copy}>{t.copy}</button><a className={styles.link} href={current.mailto}>{t.open}</a></div>
    {status&&<p role="status" className={styles.success}>{status}</p>}
   </>}
   <div className={styles.actions}>
    <button className={styles.secondary} type="button" disabled={!index} onClick={()=>{setIndex(x=>x-1);setStatus('')}}>{t.prev}</button>
    <button className={styles.secondary} type="button" disabled={index===queue.length-1} onClick={()=>{setIndex(x=>x+1);setStatus('')}}>{t.next}</button>
    <button className={styles.secondary} type="button" onClick={clearPrepared}>{t.clear}</button>
   </div>
  </div>}
 </section>
}
