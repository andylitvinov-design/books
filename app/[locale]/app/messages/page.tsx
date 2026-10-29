import type {Metadata} from 'next'
import Link from 'next/link'
import {MessageCircle,ShoppingBag} from 'lucide-react'
import {notFound} from 'next/navigation'
import MessagesHub from '@/components/app/messages-hub'
import MessagesOrdersClients from '@/components/app/messages-orders-clients'
import MessagesBottomNavigation from '@/components/app/messages-bottom-navigation'
import '../[[...path]]/workspace.css'
import './messages-page.css'
export const metadata:Metadata={
  title:'Messages | Holistic House',
  robots:{index:false,follow:false},
  referrer:'no-referrer',
}
export const dynamic='force-dynamic'
type MessagesQuery={section?:string|string[];order?:string|string[];tab?:string|string[]}
export default async function MemberMessages({params,searchParams}:{
  params:Promise<{locale:string}>;searchParams:Promise<MessagesQuery>
}){
  const {locale}=await params
  if(!['en','ru','es'].includes(locale))notFound()
  const query=await searchParams
  // The approved one-screen Messenger is the DEFAULT for every member.
  // Older links to a specific order retain their own protected detail.
  const orderId=typeof query?.order==='string'?query.order:''
  const showOrders=query?.section==='orders'||
    (query?.section!=='clients'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId))
  return <main className="hh-app hh-messages-page" lang={locale}>
    <header className="hh-header">
      <Link href={'/'+locale+'/masters'} className="hh-brand">Holistic House<span>Messages</span></Link>
      <Link href={'/'+(locale==='es'?'en':locale)+'/app/portrait'} prefetch={false}>
        {locale==='ru'?'Мой кабинет':locale==='es'?'Mi cuenta':'My account'}
      </Link>
    </header>
    <nav className="hh-messages-context-nav" aria-label={locale==='ru'?'Дополнительные разделы':locale==='es'?'Secciones adicionales':'Additional sections'}>
      <Link prefetch={false} href={'/'+locale+'/app/messages?'+(showOrders?'tab=chats':'section=orders')}
        className="hh-messages-context-link">
        {showOrders?<MessageCircle size={17} aria-hidden="true"/>:<ShoppingBag size={17} aria-hidden="true"/>}
        <span>{showOrders?(locale==='ru'?'К переписке':locale==='es'?'Conversaciones':'Conversations'):
          (locale==='ru'?'Мои заказы':locale==='es'?'Mis pedidos':'My orders')}</span>
      </Link>
    </nav>
    {showOrders?<MessagesOrdersClients locale={locale}><MessagesHub locale={locale}/></MessagesOrdersClients>:
      <MessagesHub locale={locale}/>}

    <MessagesBottomNavigation locale={locale}/>
  </main>
}
