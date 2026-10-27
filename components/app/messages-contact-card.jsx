'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {ArrowLeft,ExternalLink,Images,UserRound} from 'lucide-react'
import CrmTelegramPhoto from './crm-telegram-photo'
import styles from './messages-contact-card.module.css'

const COPY={
 en:{title:'Client card',back:'Back to chat',contact:'Contact details',email:'Email',phone:'Phone',status:'Status',
 source:'Channel',date:'Received',photos:'Saved photos',hint:'Photos in this conversation’s recent messages.',
 none:'No recent photos saved here.',loading:'Opening private client details…',error:'Could not open private details. Reopen the card to retry.',
 master:'Master profile',openMaster:'Open verified master profile',full:'Full private request and files',
 empty:'No other verified contact details yet.',privacy:'CRM contacts, private client records and master profiles are not merged without a verified link.'},
 ru:{title:'Карточка клиента',back:'К переписке',contact:'Данные клиента',email:'Email',phone:'Телефон',status:'Статус',
 source:'Канал',date:'Получена',photos:'Сохранённые фотографии',hint:'Фото из последних сообщений этого диалога.',
 none:'В последних сообщениях фотографий нет.',loading:'Открываю защищённую карточку…',error:'Не удалось открыть сведения. Повторите открытие карточки.',
 master:'Профиль мастера',openMaster:'Открыть подтверждённый профиль мастера',full:'Полная защищённая заявка и материалы',
 empty:'Других подтверждённых данных пока нет.',privacy:'Контакты CRM, приватные данные клиентов и профили мастеров не объединяются без проверенной связи.'},
 es:{title:'Ficha del cliente',back:'Volver al chat',contact:'Datos de contacto',email:'Correo',phone:'Teléfono',status:'Estado',
 source:'Canal',date:'Recibida',photos:'Fotos guardadas',hint:'Fotos de los últimos mensajes de este chat.',
 none:'No hay fotos recientes.',loading:'Abriendo ficha privada…',error:'No se pueden abrir los datos. Vuelve a intentar.',
 master:'Perfil profesional',openMaster:'Abrir perfil profesional verificado',full:'Solicitud privada completa y archivos',
 empty:'No hay más datos verificados.',privacy:'Los contactos CRM, registros privados y perfiles profesionales no se vinculan sin identidad verificada.'}
}
const validId=value=>/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(String(value||''))
const validSlug=value=>typeof value==='string'&&/^[a-z0-9-]{2,90}$/.test(value)
const field=(value,...keys)=>{
 if(!value||typeof value!=='object')return ''
 for(const key of keys){if(typeof value[key]==='string'&&value[key].trim())return value[key].trim().slice(0,200)}
 return ''
}
function displayDate(value,locale){
 const date=new Date(value||'')
 return Number.isFinite(date.getTime())?
   new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeZone:'America/Toronto'}).format(date):''
}

// The existing authenticated endpoints own authorization. Never join by name,
// phone, email or Telegram identity; never fetch public Bot API media.
export default function MessagesContactCard({item,accountId,locale='en',onBack}){
 const lang=COPY[locale]?locale:'en',t=COPY[lang]
 const stateKey=String(accountId||'')+':'+String(item?.key||'')
 const [state,setState]=useState({key:'',loading:false,error:false,contact:null,photos:[]})
 const needsFetch=item?.kind==='crm'||item?.kind==='direct'
 const view=state.key===stateKey?state:{loading:needsFetch,error:false,contact:null,photos:[]}
 useEffect(()=>{
   const abort=new AbortController()
   if(!accountId||!validId(item?.id)||!needsFetch){
     setState({key:stateKey,loading:false,error:false,contact:null,photos:[]})
     return ()=>abort.abort()
   }
   setState({key:stateKey,loading:true,error:false,contact:null,photos:[]})
   async function load(){
     if(item.kind==='crm'){
       if(!validId(item.contactId))throw Error('UNLINKED_CONTACT')
       const [contactReply,threadReply]=await Promise.all([
         fetch('/api/app/crm/contact',{method:'POST',credentials:'same-origin',cache:'no-store',
           signal:abort.signal,headers:{'Content-Type':'application/json','X-HH-Account-Id':accountId},
           body:JSON.stringify({contactId:item.contactId})}),
         fetch('/api/app/crm/messenger?'+new URLSearchParams({thread:item.id}),{
           credentials:'same-origin',cache:'no-store',signal:abort.signal,
           headers:{'X-HH-Account-Id':accountId}}),
       ])
       if(!contactReply.ok||!threadReply.ok)throw Error('PRIVATE_CARD_UNAVAILABLE')
       const [contactData,threadData]=await Promise.all([contactReply.json(),threadReply.json()])
       if(contactData.contact?.id!==item.contactId||
          !threadData.threads?.some(row=>row.id===item.id&&row.contactId===item.contactId))
         throw Error('CARD_IDENTITY_MISMATCH')
       const photos=(threadData.messages||[]).filter(row=>row.photo===true&&validId(row.id))
         .slice(-12).map(row=>({id:row.id,purpose:row.photoPurpose==='drawing'?'drawing':'portrait'}))
       return {contact:contactData.contact,photos}
     }
     const reply=await fetch('/api/app/direct-messages?'+new URLSearchParams({threadId:item.id}),{
       credentials:'same-origin',cache:'no-store',signal:abort.signal})
     if(!reply.ok)throw Error('PRIVATE_CARD_UNAVAILABLE')
     const data=await reply.json()
     if(data.accountId!==accountId||data.threadId!==item.id)throw Error('CARD_IDENTITY_MISMATCH')
     const photos=(data.messages||[]).filter(row=>row.attachment?.kind==='image'&&validId(row.attachment.id))
       .slice(-12).map(row=>({id:row.attachment.id}))
     return {contact:null,photos}
   }
   load().then(result=>{if(!abort.signal.aborted)
     setState({key:stateKey,loading:false,error:false,...result})})
     .catch(()=>{if(!abort.signal.aborted)
       setState({key:stateKey,loading:false,error:true,contact:null,photos:[]})})
   return ()=>abort.abort()
 },[accountId,item?.id,item?.contactId,item?.kind,needsFetch,stateKey])
 const kind=item?.kind
 const contact=kind==='crm'?view.contact:kind==='request'?item.item?.contact:kind==='business'?item.item:null
 const email=field(contact,'email'),phone=field(contact,'phone'),status=field(contact,'lifecycle','status')||field(item?.item,'status')
 const masterSlug=kind==='direct'&&validSlug(item.peerMasterSlug)?item.peerMasterSlug:''
 const date=displayDate(item.at||item.item?.createdAt,lang)
 return <section className={styles.card} aria-label={t.title} data-messages-client-card data-kind={kind}>
   <header className={styles.head}>
     <button type="button" onClick={onBack}><ArrowLeft size={17}/>{t.back}</button>
     <h2>{t.title}</h2>
   </header>
   <div className={styles.identity}><span className={styles.avatar} aria-hidden="true"><UserRound size={22}/></span>
     <div><strong>{item.name}</strong><small>{item.source}</small></div></div>
   {view.loading&&<p role="status" className={styles.notice}>{t.loading}</p>}
   {view.error&&<p role="alert" className={styles.notice}>{t.error}</p>}
   <section className={styles.section}><h3>{t.contact}</h3>
     <dl className={styles.facts}>
       {email&&<div><dt>{t.email}</dt><dd>{email}</dd></div>}
       {phone&&<div><dt>{t.phone}</dt><dd>{phone}</dd></div>}
       {status&&<div><dt>{t.status}</dt><dd>{status}</dd></div>}
       {item.source&&<div><dt>{t.source}</dt><dd>{item.source}</dd></div>}
       {date&&<div><dt>{t.date}</dt><dd>{date}</dd></div>}
     </dl>
     {!email&&!phone&&!status&&!view.loading&&!view.error&&<p className={styles.muted}>{t.empty}</p>}
   </section>
   {masterSlug&&<section className={styles.section}><h3>{t.master}</h3>
     <Link prefetch={false} className={styles.link} href={'/'+lang+'/masters/'+masterSlug}>
       {t.openMaster}<ExternalLink size={16}/></Link></section>}
   {(kind==='crm'||kind==='direct')&&<section className={styles.section}>
     <h3><Images size={17}/>{t.photos}</h3><p className={styles.muted}>{t.hint}</p>
     {view.photos.length>0?<div className={styles.gallery}>{view.photos.map(photo=>kind==='crm'
       ?<CrmTelegramPhoto key={photo.id} accountId={accountId} threadId={item.id}
          messageId={photo.id} locale={lang} purpose={photo.purpose}/>
       :<a key={photo.id} href={'/api/app/direct-messages/media/'+photo.id}
          target="_blank" rel="noopener noreferrer" aria-label={t.photos}>
          <img src={'/api/app/direct-messages/media/'+photo.id} alt={t.photos} loading="lazy"/></a>)}</div>
       :!view.loading&&!view.error&&<p className={styles.muted}>{t.none}</p>}
   </section>}
   {kind==='request'&&validId(item.id)&&<section className={styles.section}>
     <h3>{t.photos}</h3><Link prefetch={false} className={styles.link}
       href={'/'+lang+'/app/practice?panel=clients&requestId='+encodeURIComponent(item.id)}>
       {t.full}<ExternalLink size={16}/></Link></section>}
   <p className={styles.privacy}>{t.privacy}</p>
 </section>
}
