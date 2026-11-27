import {notFound} from 'next/navigation'
import SelfDiscovery from '@/components/app/self-discovery'
export const dynamic='force-dynamic'
export const revalidate=0
export const metadata={title:'Self Discovery | Holistic House',robots:{index:false,follow:false},referrer:'no-referrer'}
export default async function SelfDiscoveryPage({params}){
 const {locale}=await params
 if(!['en','ru','es'].includes(locale))notFound()
 return <SelfDiscovery locale={locale}/>
}
