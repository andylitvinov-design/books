import type {Metadata} from 'next'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import DirectMessageInbox from '@/components/app/direct-message-inbox'
import '../[[...path]]/workspace.css'
export const metadata:Metadata={
  title:'Messages | Holistic House',
  robots:{index:false,follow:false},
  referrer:'no-referrer',
}
export const dynamic='force-dynamic'
export default async function MemberMessages({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params
  if(!['en','ru','es'].includes(locale))notFound()
  return <main className="hh-app" lang={locale}>
    <header className="hh-header">
      <Link href={'/'+locale+'/masters'} className="hh-brand">Holistic House<span>Messages</span></Link>
      <Link href={'/'+(locale==='es'?'en':locale)+'/app/portrait'} prefetch={false}>
        {locale==='ru'?'Мой кабинет':locale==='es'?'Mi cuenta':'My account'}
      </Link>
    </header>
    <DirectMessageInbox locale={locale}/>
  </main>
}
