import {notFound} from 'next/navigation'
import BusinessDaybook from '@/components/app/business-daybook'
import {reportDaybookWeek} from '@/lib/consultations/report-program.mjs'
export const dynamic='force-dynamic'
export const revalidate=0
export const metadata={title:'Business Growth Daybook | Holistic House',robots:{index:false,follow:false},referrer:'no-referrer'}
export default async function BusinessDaybookPage({params,searchParams}){
 const {locale}=await params
 if(!['en','ru','es'].includes(locale))notFound()
 const query=await searchParams
 return <BusinessDaybook locale={locale} initialWeek={reportDaybookWeek('business',query?.week)}/>
}
