import type {Metadata} from 'next'
import Link from 'next/link'
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
  // All member Messages entry points share one protected Orders / Clients hub.
  // Legacy ?order=, ?section=clients, ?tab=chats and ?to= routes stay functional.
  void query
  return <main className="hh-app hh-messages-page" lang={locale}>
    <header className="hh-header">
      <Link href={'/'+locale+'/masters'} className="hh-brand">Holistic House<span>Messages</span></Link>
      <Link href={'/'+(locale==='es'?'en':locale)+'/app/portrait'} prefetch={false}>
        {locale==='ru'?'Мой кабинет':locale==='es'?'Mi cuenta':'My account'}
      </Link>
    </header>
    <MessagesOrdersClients locale={locale}>
      <MessagesHub locale={locale} embedded/>
    </MessagesOrdersClients>

    <MessagesBottomNavigation locale={locale}/>
  </main>
}
