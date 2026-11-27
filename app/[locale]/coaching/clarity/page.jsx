import {notFound} from 'next/navigation'
import {ClarityDetails} from '@/components/app/clarity-program'
export const metadata={title:'Express Support | Holistic House',description:'Explore the three-step Express Support program and its free three-day self-guided Daybook.'}
export default async function ClarityPage({params}){
 const {locale}=await params
 if(!['en','ru','es'].includes(locale))notFound()
 return <ClarityDetails locale={locale}/>
}
