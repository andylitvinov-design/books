import {notFound} from 'next/navigation'
import BusinessDaybook from '@/components/app/business-daybook'
export const dynamic='force-dynamic'
export const revalidate=0
export const metadata={title:'Business Growth Daybook | Holistic House',robots:{index:false,follow:false},referrer:'no-referrer'}
export default async function BusinessDaybookPage({params}){
 const {locale}=await params
 if(!['en','ru','es'].includes(locale))notFound()
 return <BusinessDaybook locale={locale}/>
}
