import {notFound} from 'next/navigation'
import SelfDiscovery from '@/components/app/self-discovery'
import {discoveryTheme,discoveryView} from '@/lib/app/self-discovery-themes.mjs'
export const dynamic='force-dynamic'
export const revalidate=0
export const metadata={title:'Self Discovery | Holistic House',robots:{index:false,follow:false},referrer:'no-referrer'}
export default async function SelfDiscoveryPage({params,searchParams}){
 const {locale}=await params
 if(!['en','ru','es'].includes(locale))notFound()
 const query=await searchParams
 return <SelfDiscovery locale={locale} initialTheme={discoveryTheme(query?.theme)} initialView={discoveryView(query?.view)}/>
}
