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
 const [pending,setPending]=useState<{id:string;redirectUrl:string|null;status:string}|null>(null)
 const [orders,setOrders]=useState<{id:string;status:string;totalMinor:number;items:{id:string;amountMinor:number}[]}[]>([])
 const [identityLoaded,setIdentityLoaded]=useState(false)
 const generation=useRef(0)
 const key=ids.join(',')
 useEffect(()=>{
  generation.current+=1;setPending(null);setConsent(false);setFailed(false);setIdentity(null);setBusy(false);setOrders([]);setIdentityLoaded(false)
  const controller=new AbortController()
  const load=()=>{const version=++generation.current;setIdentityLoaded(false);return fetch('/api/app/course-checkout',{credentials:'same-origin',cache:'no-store',signal:controller.signal})
    .then(async r=>r.ok?r.json():null).then(data=>{
      if(generation.current!==version||controller.signal.aborted)return
      setIdentity(data?.accountId?{accountId:data.accountId,onboardingState:data.onboardingState}:null)
      setOrders(Array.isArray(data?.orders)?data.orders:[]);setIdentityLoaded(true)
    }).catch(()=>{if(generation.current===version&&!controller.signal.aborted){setIdentity(null);setOrders([]);setIdentityLoaded(true)}})}
  void load()
  const hide=()=>{if(document.visibilityState==='hidden'){generation.current++;setIdentity(null);setPending(null);setOrders([]);setBusy(false);setIdentityLoaded(false)}else void load()}
  window.addEventListener('pageshow',load);document.addEventListener('visibilitychange',hide)
  return()=>{generation.current++;controller.abort();window.removeEventListener('pageshow',load);document.removeEventListener('visibilitychange',hide)}
 },[enabled,key])
 const items=ids.map(id=>courseOffer(id,locale)).filter(item=>item!==null)
 if(!items.length&&!orders.length)return null
 const total=items.length?quoteCourseCart(items.map(item=>item.id),locale).totalMinor:0
 const orderText={en:{history:'Your course orders',receipt:'PayPal transaction ID',send:'Submit receipt for review',submitted:'Receipt submitted · awaiting review',paid:'Payment verified',refunded:'Refund recorded',hold:'Payment not verified',existing:'An order already exists. Do not pay again.'},ru:{history:'Ваши заказы курсов',receipt:'Номер операции PayPal',send:'Отправить номер на проверку',submitted:'Номер отправлен · ожидаем проверки',paid:'Оплата проверена',refunded:'Возврат записан',hold:'Оплата не подтверждена',existing:'Заказ уже существует. Не платите повторно.'},es:{history:'Tus pedidos de cursos',receipt:'ID de transacción PayPal',send:'Enviar referencia para revisión',submitted:'Referencia enviada · en revisión',paid:'Pago verificado',refunded:'Reembolso registrado',hold:'Pago sin verificar',existing:'El pedido ya existe. No pagues otra vez.'}}[locale]
 async function checkout(){
  if(!enabled||busy||!consent||pending||!identityLoaded||!items.length)return
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
   if(!r.ok||typeof data.order?.id!=='string')throw Error('ORDER')
   if(data.redirectUrl===null){if(version===generation.current){setPending({id:data.order.id,redirectUrl:null,status:data.order.status});setOrders(current=>[data.order,...current.filter(x=>x.id!==data.order.id)])}return}
   if(typeof data.redirectUrl!=='string')throw Error('REDIRECT')
   const url=new URL(data.redirectUrl)
   if(url.protocol!=='https:'||url.hostname!=='paypal.me'||!/^\/psitrends\/[0-9]+(?:\.[0-9]{2})?EUR$/.test(url.pathname)||url.search||url.hash)throw Error('REDIRECT')
   if(version===generation.current){setPending({id:data.order.id,redirectUrl:url.href,status:data.order.status});setOrders(current=>[data.order,...current.filter(x=>x.id!==data.order.id)])}
  }catch{if(version===generation.current)setFailed(true)}
  finally{if(version===generation.current)setBusy(false)}
 }
 async function submitReceipt(orderId:string,receipt:string){
  if(!identity||!identityLoaded||busy)return
  setBusy(true);setFailed(false);const version=generation.current
  try{const res=await fetch('/api/app/course-checkout',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-HH-Account-ID':identity.accountId},body:JSON.stringify({orderId,reference:receipt})});if(!res.ok)throw Error('RECEIPT');if(version===generation.current){setOrders(current=>current.map(o=>o.id===orderId?{...o,status:'receipt_submitted'}:o));setPending(null)}}catch{if(version===generation.current)setFailed(true)}finally{if(version===generation.current)setBusy(false)}
 }
 return <section className={styles.orderStep} data-course-cart aria-label={t.title}>
  <h2>{t.title}</h2>
  {items.length>0&&<>{mixed&&<p className={styles.hint}>{t.split}</p>}
  <ul className={styles.lines}>{items.map(item=><li key={item.id} className={styles.serviceCard}>
    <div className={styles.serviceDetails}><strong>{item.title}</strong></div>
    <div className={styles.serviceActions}><b>{formatServiceAmount(item.amountMinor,locale)}</b><button type="button" disabled={busy||!!pending} aria-label={t.remove+': '+item.title} onClick={()=>remove(item.id)}><Trash2 size={17}/></button></div>
  </li>)}</ul>
  <div className={styles.total}><span>{t.total}</span><strong>{formatServiceAmount(total,locale)}</strong></div>
  {enabled?<><p className={styles.hint}>{t.note}</p>
   <label><input type="checkbox" checked={consent} disabled={busy||!!pending} onChange={e=>setConsent(e.currentTarget.checked)}/>{t.consent}</label>
   <p><Link href="/terms">{t.terms}</Link> · <Link href="/privacy">{t.privacy}</Link></p>
   {pending?<div role="status">{pending.redirectUrl?t.pending:orderText.existing} <code>{pending.id}</code>{pending.redirectUrl&&<a className={styles.primary} href={pending.redirectUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" onClick={()=>setPending(p=>p?{...p,redirectUrl:null}:null)}><CreditCard size={18}/>{t.pay}</a>}</div>:
    <button type="button" className={styles.primary} disabled={!consent||busy||!identityLoaded} onClick={()=>void checkout()}>{busy?'…':identity?t.pay:t.sign}</button>}
  </>:<p role="status">{t.error}</p>}</>}
  {orders.length>0&&<section aria-label={orderText.history}><h3>{orderText.history}</h3>{orders.map(order=><div key={order.id} className={styles.orderStep}><strong>{formatServiceAmount(order.totalMinor,locale)} · {order.status==='paid'?orderText.paid:order.status==='refunded'?orderText.refunded:order.status==='receipt_submitted'?orderText.submitted:orderText.hold}</strong><p><code>{order.id}</code></p>{order.status==='awaiting_payment'&&<form onSubmit={e=>{e.preventDefault();const value=new FormData(e.currentTarget).get('reference');if(typeof value==='string')void submitReceipt(order.id,value)}}><label>{orderText.receipt}<input name="reference" required minLength={6} maxLength={120} autoComplete="off" disabled={busy}/></label><button type="submit" disabled={busy||!identityLoaded}>{orderText.send}</button></form>}</div>)}</section>}
  {failed&&<p role="alert">{t.error}</p>}
 </section>
}
