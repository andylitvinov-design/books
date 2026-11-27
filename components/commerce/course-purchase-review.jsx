'use client'
import {useCallback,useEffect,useState} from 'react'
import styles from '../manual-billing-review.module.css'

function Purchase({order,canVerify,refresh}){
 const [reference,setReference]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(false)
 const refund=order.status==='paid',reviewable=refund||((order.status==='awaiting_payment'||order.status==='receipt_submitted')&&canVerify)
 async function review(){
  if(!reviewable||!confirmed||busy)return
  setBusy(true);setError(false)
  try{
   const res=await fetch('/admin/api/course-purchases',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId:order.id,action:refund?'refund':'verify',expectedRevision:order.revision,amountMinor:order.totalMinor,currency:'EUR',reference:reference.trim(),source:'paypal_statement',confirmed:true})})
   if(!res.ok)throw Error('REVIEW_FAILED')
   await refresh()
  }catch{setError(true)}finally{setBusy(false)}
 }
 return <article className={styles.order}>
  <div className={styles.identity}><strong>{order.items.map(i=>i.id).join(', ')} · €{(order.totalMinor/100).toFixed(2)}</strong><small>Заказ: {order.id}</small><small>CRM: {order.contactId||'—'} · {order.status}</small>{order.claimedReference&&<small>Номер от клиента (не подтверждение): {order.claimedReference}</small>}</div>
  {reviewable&&<div className={styles.controls}>
   <label>Номер операции из выписки получателя<input value={reference} autoComplete="off" maxLength={120} onChange={e=>setReference(e.target.value)}/></label>
   <label className={styles.check}><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Я независимо проверил(а) получателя, EUR, полную сумму и номер операции в PayPal.</label>
   <button type="button" disabled={!confirmed||reference.trim().length<6||busy} onClick={()=>void review()}>{refund?'Записать выполненный возврат':'Подтвердить поступление'}</button>
   {error&&<p role="alert">Не удалось подтвердить операцию. Статус проверьте заново.</p>}
  </div>}
 </article>
}
export function CoursePurchaseReview(){
 const [data,setData]=useState(null),[error,setError]=useState(false)
 const refresh=useCallback(async()=>{try{const res=await fetch('/admin/api/course-purchases',{credentials:'same-origin',cache:'no-store'});if(!res.ok)throw Error('UNAVAILABLE');setData(await res.json());setError(false)}catch{setData(null);setError(true);throw Error('UNAVAILABLE')}},[])
 useEffect(()=>{void refresh().catch(()=>{})},[refresh])
 return <section className={styles.review}><h2>Платные курсы · PayPal</h2><p>Подтверждайте только фактическое поступление средств по выписке получателя.</p><button type="button" className={styles.refresh} onClick={()=>void refresh().catch(()=>{})}>Обновить заказы</button>
 {error?<p role="status">Проверка оплат курсов пока недоступна.</p>:!data?<p>…</p>:<>{!data.verificationEnabled&&<p className={styles.warning}>Выдача доступа и приём новых платежей пока не разрешены.</p>}{data.orders.length===0&&<p>Заказов нет.</p>}{data.orders.map(order=><Purchase key={order.id+':'+order.revision} order={order} canVerify={data.verificationEnabled} refresh={refresh}/>)}</>}
 </section>
}
