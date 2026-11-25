import {notFound} from 'next/navigation'
import {ClarityDetails} from '@/components/app/clarity-program'
export const metadata={title:'Clarity & Support | Holistic House',description:'Explore the four-session Clarity & Support program. Start with a free first session.'}
export default async function ClarityPage({params}){
 const {locale}=await params
 if(!['en','ru','es'].includes(locale))notFound()
 return <ClarityDetails locale={locale}/>
}
