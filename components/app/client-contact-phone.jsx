'use client'
import {useEffect,useRef,useState} from 'react'
import {appFetch} from '@/lib/app/client-fetch'
import {PhoneCountryInput} from '@/components/phone-country-input'
import {PHONE_STORAGE_CONSENT_VERSION,normalizeClientPhone} from '@/lib/app/client-phone-policy.js'
import styles from './client-contact-phone.module.css'

const COPY={
 en:{
  title:'My contact phone',intro:'Add an optional phone number for future account notifications. It stays separate from practitioner CRM and private reports.',
  number:'Phone with country code',hint:'Select the country calling code, then enter your number. No SMS is sent.',
  consent:'I allow Holistic House to securely store this phone in my private account contact settings. This is not consent to receive marketing or SMS.',
  save:'Save phone',saving:'Saving…',remove:'Remove my phone',removePrompt:'Remove your saved contact phone from this account?',
  saved:'Saved phone',unverified:'Not verified: no carrier SMS will be sent to this number until a verified service and separate notification consent exist.',
  none:'No contact phone saved.',privacy:'Only your signed-in account can view or change this encrypted record. This phone is not copied into marketing CRM automatically.',
  success:'Phone saved privately. No SMS sent.',removed:'Phone removed.',invalid:'Enter a valid international number and tick the storage-permission box.',
  failure:'Phone settings could not be saved. Try again.',loading:'Loading private phone settings…',
  usePush:'For free device alerts now, enable Web Push below. It is not an SMS.',
 },
 ru:{
  title:'Мой контактный телефон',intro:'По желанию сохраните телефон для будущих уведомлений кабинета. Он хранится отдельно от маркетинговой CRM и личных отчётов.',
  number:'Телефон с кодом страны',hint:'Выберите страну и введите номер без кода. SMS не отправляется.',
  consent:'Разрешаю Holistic House защищённо хранить этот номер в контактных настройках моего кабинета. Это не согласие на рекламу или SMS.',
  save:'Сохранить телефон',saving:'Сохраняю…',remove:'Удалить мой номер',removePrompt:'Удалить сохранённый телефон из вашего кабинета?',
  saved:'Сохранённый номер',unverified:'Номер не подтверждён. SMS не будут отправляться до настройки проверенного оператора и отдельного согласия.',
  none:'Телефон пока не сохранён.',privacy:'Только ваш авторизованный аккаунт может просматривать и изменять эту зашифрованную запись. В CRM мастеров номер не импортируется автоматически.',
  success:'Телефон сохранён защищённо. SMS не отправлялась.',removed:'Номер удалён.',invalid:'Проверьте номер с кодом страны и отметьте согласие на хранение.',
  failure:'Не удалось сохранить номер. Повторите попытку.',loading:'Загружаем настройки телефона…',
  usePush:'Для бесплатных уведомлений включите Web Push ниже. Это не обычные SMS.',
 },
 es:{
  title:'Mi teléfono de contacto',intro:'Guarda opcionalmente tu número para futuras notificaciones privadas; no se une a la CRM comercial.',
  number:'Teléfono con código de país',hint:'Selecciona el prefijo del país e introduce tu número. No enviamos SMS.',
  consent:'Autorizo a Holistic House a guardar este teléfono cifrado en mi cuenta. No es consentimiento para SMS ni publicidad.',
  save:'Guardar teléfono',saving:'Guardando…',remove:'Eliminar mi teléfono',removePrompt:'¿Eliminar el teléfono de tu cuenta?',
  saved:'Teléfono guardado',unverified:'No verificado. No se enviarán SMS sin un proveedor aprobado y consentimiento separado.',
  none:'No hay teléfono guardado.',privacy:'Solo tu cuenta autenticada puede consultar o cambiar estos datos cifrados. No se copian a la CRM automáticamente.',
  success:'Teléfono guardado. Ningún SMS enviado.',removed:'Teléfono eliminado.',invalid:'Introduce un número válido y acepta guardar el teléfono.',
  failure:'Error al guardar el teléfono.',loading:'Cargando ajustes privados…',
  usePush:'Para avisos gratuitos, activa Web Push abajo. No son SMS.',
 },
}

export default function ClientContactPhone({accountId,locale='en'}){
 const t=COPY[locale]||COPY.en
 const sessionRef=useRef(null)
 const [status,setStatus]=useState(null),[phone,setPhone]=useState(''),
   [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),
   [notice,setNotice]=useState(''),[error,setError]=useState('')
 useEffect(()=>{
  const session={accountId,controller:new AbortController()}
  sessionRef.current=session
  setStatus(null);setBusy(false);setPhone('');setConsent(false);setNotice('');setError('')
  appFetch('contact-phone',undefined,undefined,{accountId,signal:session.controller.signal})
   .then(data=>{if(sessionRef.current===session)setStatus(data)})
   .catch(()=>{if(sessionRef.current===session)setError(t.failure)})
  return ()=>{session.controller.abort();if(sessionRef.current===session)sessionRef.current=null}
 },[accountId,t.failure])
 async function act(body){
  const session=sessionRef.current
  if(!session||session.accountId!==accountId||busy)return
  setBusy(true);setError('');setNotice('')
  try{
   const value=await appFetch('contact-phone',body,undefined,{accountId,signal:session.controller.signal})
   if(sessionRef.current!==session)return
   setStatus(value);setPhone('');setConsent(false)
   setNotice(body.action==='remove'?t.removed:t.success)
  }catch{if(sessionRef.current===session)setError(t.failure)}
  finally{if(sessionRef.current===session)setBusy(false)}
 }
 function submit(event){
  event.preventDefault()
  let number
  try{number=normalizeClientPhone(phone)}catch{setError(t.invalid);return}
  if(!consent){setError(t.invalid);return}
  act({action:'save',phone:number,storageConsent:true,consentVersion:PHONE_STORAGE_CONSENT_VERSION})
 }
 return <section className={styles.panel} aria-label={t.title} id="hh-client-contact-phone">
  <h2>{t.title}</h2><p>{t.intro}</p>
  {status?<div className={styles.saved} role="status">
   {status.stored?<><strong>{t.saved}: {status.maskedPhone}</strong><span>{t.unverified}</span></>:
     <span>{t.none}</span>}
  </div>:<p role="status">{error||t.loading}</p>}
  {status&&<form onSubmit={submit} className={styles.form}>
   <div className={styles.phoneField}>
    <label htmlFor="hh-client-phone-input">{t.number}</label>
    <PhoneCountryInput id="hh-client-phone-input" value={phone} locale={locale}
      onChange={value=>setPhone(value)} disabled={busy} required/>
   </div>
   <p>{t.hint}</p>
   <label className={styles.consent}><input type="checkbox" checked={consent}
      onChange={e=>setConsent(e.target.checked)} disabled={busy} required/><span>{t.consent}</span></label>
   <div className={styles.actions}>
     <button type="submit" disabled={!consent||!phone.trim()||busy}>{busy?t.saving:t.save}</button>
     {status.stored&&<button type="button" className={styles.delete} disabled={busy}
        onClick={()=>{if(window.confirm(t.removePrompt))act({action:'remove'})}}>{t.remove}</button>}
   </div>
  </form>}
  <p className={styles.hint}>{t.privacy} {t.usePush}</p>
  {notice&&<p className={styles.notice} role="status">{notice}</p>}
  {error&&status&&<p className={styles.error} role="alert">{error}</p>}
 </section>
}
