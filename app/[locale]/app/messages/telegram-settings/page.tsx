import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import TelegramBusinessSetup from '@/components/app/telegram-business-setup'
import type {PublicLocale} from '@/lib/public-locales'

export const metadata:Metadata={
  title:'Telegram Business · Holistic House CRM',
  robots:{index:false,follow:false},
  referrer:'no-referrer',
}
export const dynamic='force-dynamic'

export default async function TelegramBusinessSetupPage({
  params,
}:{params:Promise<{locale:string}>}){
  const {locale}=await params
  if(!['ru','en','es'].includes(locale))notFound()
  // A standalone route avoids the main Messages view's embedded client-list
  // shortcut. Only the existing owner-verified CRM APIs may read/repair
  // Telegram provider state; the page itself exposes no customer data.
  return <TelegramBusinessSetup locale={locale as PublicLocale}/>
}
