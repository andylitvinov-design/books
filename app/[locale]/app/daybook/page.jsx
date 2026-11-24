import {notFound} from 'next/navigation'
import DaybookJournal from '@/components/app/daybook-journal'
import '@/app/holistic-light-tokens.css'
import {daybookRouteOptions} from '@/lib/app/daybook-route-intent.mjs'
export const dynamic='force-dynamic'
export const revalidate=0
export const metadata={title:'Coaching Daybook | Holistic House',robots:{index:false,follow:false},referrer:'no-referrer'}
export default async function DaybookPage({params,searchParams}){
 const {locale}=await params
 if(!['en','ru','es'].includes(locale))notFound()
 const query=await searchParams
 return <DaybookJournal locale={locale} {...daybookRouteOptions(query)}/>
}
