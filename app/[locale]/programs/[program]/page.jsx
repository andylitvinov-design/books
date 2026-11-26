import {notFound} from 'next/navigation'
import ProgramOverview from '@/components/public-program-overview'
import {getProgramOverview,PUBLIC_PROGRAMS,PROGRAM_LOCALES} from '@/lib/public-coaching-programs.mjs'

export function generateStaticParams(){
 return PROGRAM_LOCALES.flatMap(locale=>PUBLIC_PROGRAMS.map(program=>({locale,program})))
}
export async function generateMetadata({params}){
 const {locale,program}=await params
 const p=getProgramOverview(locale,program)
 return p?{title:p.title+' | Holistic House',description:p.subtitle,alternates:{canonical:'/'+locale+'/programs/'+program,languages:Object.fromEntries(PROGRAM_LOCALES.map(lang=>[lang,'/'+lang+'/programs/'+program]))}}:{title:'Not found',robots:{index:false,follow:false}}
}
export default async function PublicProgramPage({params}){
 const {locale,program}=await params
 const p=getProgramOverview(locale,program)
 if(!p)notFound()
 return <ProgramOverview program={p}/>
}
