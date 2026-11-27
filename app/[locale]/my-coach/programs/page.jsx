import {notFound} from 'next/navigation'
import CoachProgramComparison from '@/components/my-coach-program-comparison'
import {COACH_COMPARISON_LOCALES,getCoachProgramComparison} from '@/lib/coach-program-comparison.mjs'
import {metadataBaseFor} from '@/data/site-metadata'

export function generateStaticParams(){return COACH_COMPARISON_LOCALES.map(locale=>({locale}))}
export async function generateMetadata({params}){
 const {locale}=await params
 if(!COACH_COMPARISON_LOCALES.includes(locale))return {title:'Not found',robots:{index:false}}
 const {copy}=getCoachProgramComparison(locale)
 return {metadataBase:metadataBaseFor(),title:copy.title+' | Holistic House',description:copy.subtitle,alternates:{
  canonical:'/'+locale+'/my-coach/programs',
  languages:Object.fromEntries(COACH_COMPARISON_LOCALES.map(lang=>[lang,'/'+lang+'/my-coach/programs']))
 }}
}
export default async function CoachProgramsPage({params}){
 const {locale}=await params
 if(!COACH_COMPARISON_LOCALES.includes(locale))notFound()
 return <CoachProgramComparison locale={locale}/>
}
