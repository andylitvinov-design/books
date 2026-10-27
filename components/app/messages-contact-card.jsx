'use client'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {ArrowLeft,ExternalLink,Images,UserRound,Video,Music2} from 'lucide-react'
import CrmTelegramPhoto from './crm-telegram-photo'
import PrivateChatPhoto from './private-chat-photo'
import styles from './messages-contact-card.module.css'
import {mediaFromMessages,mergeMediaPages} from '@/lib/app/messenger-private-media.mjs'

const COPY={
 en:{title:'Client card',back:'Back to conversation',contact:'Contact details',email:'Email',phone:'Phone',
   status:'Status',source:'Channel',date:'Received',photos:'Conversation attachments',
   hint:'Private photos and recordings are linked to this conversation; nothing is copied into a different client profile.',
   none:'No attachments in the loaded history.',loading:'Opening private client details…',
   error:'Could not open private details. Reopen the card to retry.',older:'Load earlier attachments',
   olderBusy:'Loading earlier history…',olderError:'Could not load earlier history. Retry.',
   master:'Master profile',openMaster:'Open verified master profile',full:'Open private client request and materials',
   empty:'No other verified details yet.',privacy:'CRM contacts, private client records and master profiles are linked only after identity verification.',
   video:'Videos from the private client case are available through its protected case link, not from this messenger archive.',
   photo:'Photo',audio:'Audio',movie:'Video'},
 ru:{title:'Карточка клиента',back:'К переписке',contact:'Данные клиента',email:'Email',phone:'Телефон',
   status:'Статус',source:'Канал',date:'Получена',photos:'Материалы переписки',
   hint:'Приватные фотографии и записи привязаны к диалогу. В другой профиль клиента ничего не копируется.',
   none:'В загруженной истории вложений нет.',loading:'Открываю защищённую карточку…',
   error:'Не удалось открыть сведения. Повторите открытие карточки.',older:'Показать более ранние материалы',
   olderBusy:'Загружаю историю…',olderError:'Не удалось загрузить историю. Повторите.',
   master:'Профиль мастера',openMaster:'Открыть подтверждённый профиль мастера',full:'Открыть защищённую заявку и материалы',
   empty:'Других подтверждённых данных пока нет.',privacy:'Контакты CRM, приватные клиентские записи и профили мастеров связываются только после проверки личности.',
   video:'Видео из личного дела доступны через защищённую заявку, а не через общий архив мессенджера.',
   photo:'Фото',audio:'Аудио',movie:'Видео'},
 es:{title:'Ficha del cliente',back:'Volver al chat',contact:'Datos de contacto',email:'Correo',phone:'Teléfono',
   status:'Estado',source:'Canal',date:'Recibida',photos:'Adjuntos de la conversación',
   hint:'Fotos y grabaciones privadas pertenecen a esta conversación y no se copian a otras fichas.',
   none:'No hay adjuntos en el historial cargado.',loading:'Abriendo ficha privada…',
   error:'No se pueden abrir los datos. Vuelve a intentar.',older:'Ver adjuntos anteriores',
   olderBusy:'Cargando historial…',olderError:'No se pudo cargar el historial. Reintenta.',
   master:'Perfil profesional',openMaster:'Abrir perfil profesional verificado',full:'Abrir solicitud y archivos privados',
   empty:'No hay más datos verificados.',privacy:'Contactos CRM, expedientes privados y perfiles profesionales solo se enlazan tras verificar la identidad.',
   video:'Los videos del expediente privado están disponibles en la solicitud protegida, no en este archivo de mensajes.',
   photo:'Foto',audio:'Audio',movie:'Video'}
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
async function privateJson(url,{accountId,signal,postBody}){
 const response=await fetch(url,{method:postBody?'POST':'GET',credentials:'same-origin',cache:'no-store',
   signal,headers:{'X-HH-Account-Id':accountId,...(postBody?{'Content-Type':'application/json'}:{})},
   ...(postBody?{body:JSON.stringify(postBody)}:{})})
 if(!response.ok)throw Error('PRIVATE_CARD_UNAVAILABLE')
 return response.json()
}
function threadMatches(data,item){
 return data.threads?.some(row=>row.id===item.id&&row.contactId===item.contactId)
}
export default function MessagesContactCard({item,accountId,locale='en',onBack}){
 const lang=COPY[locale]?locale:'en',t=COPY[lang]
 const stateKey=String(accountId||'')+':'+String(item?.key||'')
 const [state,setState]=useState({key:'',loading:false,error:false,contact:null,media:[],cursor:null,olderBusy:false,olderError:false})
 const olderRef=useRef(null)
 const needsFetch=item?.kind==='crm'||item?.kind==='direct'
 const view=state.key===stateKey?state:{loading:needsFetch,error:false,contact:null,media:[],cursor:null,olderBusy:false}
 useEffect(()=>{
   const abort=new AbortController()
   if(!accountId||!validId(item?.id)||!needsFetch){
     setState({key:stateKey,loading:false,error:false,contact:null,media:[],cursor:null,olderBusy:false})
     return ()=>abort.abort()
   }
   setState({key:stateKey,loading:true,error:false,contact:null,media:[],cursor:null,olderBusy:false})
   async function load(){
     if(item.kind==='crm'){
       if(!validId(item.contactId))throw Error('UNLINKED_CONTACT')
       const [contactData,threadData]=await Promise.all([
         privateJson('/api/app/crm/contact',{accountId,signal:abort.signal,postBody:{contactId:item.contactId}}),
         privateJson('/api/app/crm/messenger?'+new URLSearchParams({thread:item.id}),{accountId,signal:abort.signal}),
       ])
       if(contactData.contact?.id!==item.contactId||!threadMatches(threadData,item))
         throw Error('CARD_IDENTITY_MISMATCH')
       return {contact:contactData.contact,media:mediaFromMessages('crm',threadData.messages),
         cursor:threadData.nextMessagesCursor||null}
     }
     const data=await privateJson('/api/app/direct-messages?'+new URLSearchParams({threadId:item.id}),
       {accountId,signal:abort.signal})
     if(data.accountId!==accountId||data.threadId!==item.id)throw Error('CARD_IDENTITY_MISMATCH')
     return {contact:null,media:mediaFromMessages('direct',data.messages),
       cursor:data.nextMessagesCursor||null}
   }
   load().then(result=>{if(!abort.signal.aborted)
     setState({key:stateKey,loading:false,error:false,olderBusy:false,olderError:false,...result})})
     .catch(()=>{if(!abort.signal.aborted)
       setState({key:stateKey,loading:false,error:true,contact:null,media:[],cursor:null,olderBusy:false})})
   return ()=>{abort.abort();olderRef.current?.abort()}
 },[accountId,item?.id,item?.contactId,item?.kind,needsFetch,stateKey])

 async function loadOlder(){
   if(!view.cursor||view.olderBusy||!accountId||!needsFetch)return
   olderRef.current?.abort()
   const abort=new AbortController()
   olderRef.current=abort
   setState(previous=>previous.key===stateKey?{...previous,olderBusy:true,olderError:false}:previous)
   try{
     const params=item.kind==='crm'
       ?new URLSearchParams({thread:item.id,messagesBefore:view.cursor})
       :new URLSearchParams({threadId:item.id,messagesBefore:view.cursor})
     const data=await privateJson((item.kind==='crm'?'/api/app/crm/messenger?':'/api/app/direct-messages?')+params,
       {accountId,signal:abort.signal})
     if(item.kind==='crm'&&!threadMatches(data,item))throw Error('CARD_IDENTITY_MISMATCH')
     if(item.kind==='direct'&&(data.accountId!==accountId||data.threadId!==item.id))
       throw Error('CARD_IDENTITY_MISMATCH')
     if(abort.signal.aborted)return
     const more=mediaFromMessages(item.kind,data.messages)
     setState(previous=>{
       if(previous.key!==stateKey||previous.cursor!==view.cursor)return previous
       return {...previous,media:mergeMediaPages(previous.media,more),
         cursor:data.nextMessagesCursor||null,olderBusy:false,olderError:false}
     })
   }catch{
     if(!abort.signal.aborted)setState(previous=>previous.key===stateKey?
       {...previous,olderBusy:false,olderError:true}:previous)
   }finally{if(olderRef.current===abort)olderRef.current=null}
 }
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
     {view.media.length>0?<div className={styles.gallery}>{view.media.map(media=>
       <div key={media.id} className={styles.mediaItem}>
         <small>{media.kind==='image'?t.photo:media.kind==='audio'?t.audio:t.movie}</small>
         {kind==='crm'
           ?<CrmTelegramPhoto accountId={accountId} threadId={item.id} messageId={media.id}
              locale={lang} purpose={media.purpose}/>
           :media.kind==='image'
             ?<PrivateChatPhoto src={'/api/app/direct-messages/media/'+media.id} alt={t.photo} locale={lang}/>
             :media.kind==='audio'
               ?<audio controls preload="none" aria-label={t.audio}
                  src={'/api/app/direct-messages/media/'+media.id}/>
               :<video controls playsInline preload="none" aria-label={t.movie}
                  src={'/api/app/direct-messages/media/'+media.id}/>}
       </div>)}</div>
       :!view.loading&&!view.error&&<p className={styles.muted}>{t.none}</p>}
     {view.cursor&&<button type="button" className={styles.olderButton} onClick={loadOlder}
        disabled={view.olderBusy}>{view.olderBusy?t.olderBusy:t.older}</button>}
     {view.olderError&&<p className={styles.notice} role="alert">{t.olderError}</p>}
   </section>}
   {kind==='request'&&validId(item.id)&&<section className={styles.section}>
     <h3><Video size={17}/>{t.photos}</h3><Link prefetch={false} className={styles.link}
       href={'/'+lang+'/app/practice?panel=clients&requestId='+encodeURIComponent(item.id)}>
       {t.full}<ExternalLink size={16}/></Link></section>}
   {(kind==='crm'||kind==='direct')&&<p className={styles.privacy}><Music2 size={13}/>{t.video}</p>}
   <p className={styles.privacy}>{t.privacy}</p>
 </section>
}
