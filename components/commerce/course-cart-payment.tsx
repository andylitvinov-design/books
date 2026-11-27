'use client'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {CreditCard,Trash2} from 'lucide-react'
import {formatServiceAmount,type ServiceLocale} from '@/lib/commerce/catalog'
import {courseOffer,quoteCourseCart} from '@/lib/commerce/course-cart.mjs'
import styles from './personal-cart.module.css'

const COPY={
 en:{title:'Courses',total:'Course total',pay:'Continue to PayPal',sign:'Sign in with Google',consent:'I am 18 or older and accept the terms, privacy notice and account/order processing required for this purchase.',terms:'Terms',privacy:'Privacy',note:'PayPal.Me requires a PayPal account. Choose Goods & Services, never Friends & Family. Payment is verified manually before access is granted.',pending:'Order registered; payment not yet verified. Do not pay again if you already sent the funds.',error:'Checkout is not available. Your cart is saved; no payment is confirmed.',split:'Courses are paid separately from consultations or videos.',remove:'Remove'},
 ru:{title:'Курсы',total:'Итого за курсы',pay:'Перейти в PayPal',sign:'Войти через Google',consent:'Мне исполнилось 18 лет. Принимаю условия, политику конфиденциальности и обработку данных для аккаунта и заказа.',terms:'Условия',privacy:'Конфиденциальность',note:'Для PayPal.Me нужен аккаунт PayPal. Выберите «Товары и услуги», не «Друзьям и семье». Доступ только после проверки поступления.',pending:'Заказ зарегистрирован; оплата ещё не проверена. Если деньги отправлены, не платите повторно.',error:'Оформление недоступно. Корзина сохранена, оплата не подтверждена.',split:'Курсы оплачиваются отдельно от консультаций и видео.',remove:'Убрать'},
 es:{title:'Cursos',total:'Total de cursos',pay:'Continuar a PayPal',sign:'Iniciar sesión con Google',consent:'Tengo 18 años o más y acepto las condiciones, privacidad y tratamiento necesario para la cuenta y el pedido.',terms:'Condiciones',privacy:'Privacidad',note:'PayPal.Me requiere una cuenta PayPal. Elige Productos y servicios, nunca Amigos y familiares. Acceso después de verificar el pago.',pending:'Pedido registrado; pago aún no verificado. No vuelvas a pagar si ya enviaste los fondos.',error:'Compra no disponible. El carrito se conserva; no se confirma ningún pago.',split:'Los cursos se pagan aparte de consultas y vídeos.',remove:'Quitar'}
} as const

export function CourseCartPayment({locale,ids,remove,enabled,mixed}:{locale:ServiceLocale;ids:string[];remove:(id:string)=>void;enabled:boolean;mixed:boolean}){
 const t=COPY[locale]
 const [identity,setIdentity]=useState<{accountId:string;onboardingState:string}|null>(null)
 const [consent,setConsent]=useState(false)
 const [busy,setBusy]=useState(false)
 const [failed,setFailed]=useState(false)
 const [pending,setPending]=useState<{id:string;redirectUrl:string}|null>(null)
 const generation=useRef(0)
 const key=ids.join(',')
 useEffect(()=>{
  generation.current+=1;setPending(null);setConsent(false);setFailed(false);setIdentity(null);setBusy(false)
  if(!enabled||!key)return
  const controller=new AbortController()
  const version=generation.current
  const load=()=>fetch('/api/app/course-checkout',{credentials:'same-origin',cache:'no-store',signal:controller.signal})
    .then(async r=>r.ok?r.json():null).then(data=>{
      if(generation.current!==version||controller.signal.aborted)return
      setIdentity(data?.accountId?{accountId:data.accountId,onboardingState:data.onboardingState}:null)
    }).catch(()=>{})
  void load()
  const hide=()=>{if(document.visibilityState==='hidden'){setIdentity(null);setPending(null)}else void load()}
  window.addEventListener('pageshow',load);document.addEventListener('visibilitychange',hide)
  return()=>{generation.current++;controller.abort();window.removeEventListener('pageshow',load);document.removeEventListener('visibilitychange',hide)}
 },[enabled,key])
 if(!ids.length)return null
 const items=ids.map(id=>courseOffer(id,locale)).filter(item=>item!==null)
 if(!items.length)return null
 const total=quoteCourseCart(items.map(item=>item.id),locale).totalMinor
 async function checkout(){
  if(!enabled||busy||!consent||pending)return
  setBusy(true);setFailed(false)
  const version=generation.current
  try{
   if(!identity){
    const r=await fetch('/api/app/auth/start',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({locale,continueTo:'enquiry',returnPath:'/'+locale+'/cart'})})
    const data=await r.json()
    if(!r.ok||typeof data.redirectUrl!=='string'||new URL(data.redirectUrl).protocol!=='https:')throw Error('AUTH')
    if(version===generation.current)window.location.assign(data.redirectUrl)
    return
   }
   const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'
   const r=await fetch('/api/app/course-checkout',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-HH-Account-ID':identity.accountId},
     body:JSON.stringify({items:ids,locale,confirmed:true,timezone})})
   const data=await r.json()
   if(!r.ok||typeof data.order?.id!=='string'||typeof data.redirectUrl!=='string')throw Error('ORDER')
   const url=new URL(data.redirectUrl)
   if(url.protocol!=='https:'||url.hostname!=='paypal.me'||!/^\/psitrends\/[0-9]+(?:\.[0-9]{2})?EUR$/.test(url.pathname)||url.search||url.hash)throw Error('REDIRECT')
   if(version===generation.current)setPending({id:data.order.id,redirectUrl:url.href})
  }catch{if(version===generation.current)setFailed(true)}
  finally{if(version===generation.current)setBusy(false)}
 }
 return <section className={styles.orderStep} data-course-cart aria-label={t.title}>
  <h2>{t.title}</h2>
  {mixed&&<p className={styles.hint}>{t.split}</p>}
  <ul className={styles.lines}>{items.map(item=><li key={item.id} className={styles.serviceCard}>
    <div className={styles.serviceDetails}><strong>{item.title}</strong></div>
    <div className={styles.serviceActions}><b>{formatServiceAmount(item.amountMinor,locale)}</b><button type="button" disabled={busy||!!pending} aria-label={t.remove+': '+item.title} onClick={()=>remove(item.id)}><Trash2 size={17}/></button></div>
  </li>)}</ul>
  <div className={styles.total}><span>{t.total}</span><strong>{formatServiceAmount(total,locale)}</strong></div>
  {enabled?<><p className={styles.hint}>{t.note}</p>
   <label><input type="checkbox" checked={consent} disabled={busy||!!pending} onChange={e=>setConsent(e.currentTarget.checked)}/>{t.consent}</label>
   <p><Link href="/terms">{t.terms}</Link> · <Link href="/privacy">{t.privacy}</Link></p>
   {pending?<p role="status">{t.pending} <code>{pending.id}</code><br/><a className={styles.primary} href={pending.redirectUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><CreditCard size={18}/>{t.pay}</a></p>:
    <button type="button" className={styles.primary} disabled={!consent||busy} onClick={()=>void checkout()}>{busy?'…':identity?t.pay:t.sign}</button>}
  </>:<p role="status">{t.error}</p>}
  {failed&&<p role="alert">{t.error}</p>}
 </section>
}
