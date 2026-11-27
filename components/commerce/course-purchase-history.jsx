'use client'
import Link from 'next/link'
import {ArrowRight} from 'lucide-react'
import {formatServiceAmount} from '@/lib/commerce/catalog'
import {courseOffer} from '@/lib/commerce/course-cart.mjs'
const COPY={
 en:{title:'Course orders',awaiting_payment:'Awaiting payment',receipt_submitted:'Receipt under review',paid:'Payment verified',refunded:'Refund recorded',cancelled:'Cancelled',payment_review:'Payment needs review',open:'Order details',order:'Order'},
 ru:{title:'Заказы курсов',awaiting_payment:'Ожидает оплаты',receipt_submitted:'Платёж на проверке',paid:'Оплата подтверждена',refunded:'Возврат записан',cancelled:'Отменён',payment_review:'Требуется проверка',open:'Детали заказа',order:'Заказ'},
 es:{title:'Pedidos de cursos',awaiting_payment:'Pendiente de pago',receipt_submitted:'Recibo en revisión',paid:'Pago verificado',refunded:'Reembolso registrado',cancelled:'Cancelado',payment_review:'Pago en revisión',open:'Detalles del pedido',order:'Pedido'}
}
export function CoursePurchaseHistory({locale='en',orders=[]}){
 const lang=Object.hasOwn(COPY,locale)?locale:'en',t=COPY[lang]
 if(!Array.isArray(orders)||!orders.length)return null
 return <section data-my-page-course-purchases aria-label={t.title}><h3>{t.title}</h3>
  {orders.filter(o=>o&&typeof o.id==='string'&&o.currency==='EUR'&&Number.isSafeInteger(o.totalMinor)&&o.totalMinor>0&&Object.hasOwn(t,o.status)&&Array.isArray(o.items)).map(o=><details key={o.id}>
   <summary><strong>{o.items.map(i=>courseOffer(i.id,lang)?.title||i.id).join(' · ')}</strong> · {formatServiceAmount(o.totalMinor,lang)} · {t[o.status]}</summary>
   <p>{t.order}: <code>{o.id}</code></p>
   <Link href={'/'+lang+'/cart'} prefetch={false}>{t.open}<ArrowRight size={16} aria-hidden="true"/></Link>
  </details>)}
 </section>
}
