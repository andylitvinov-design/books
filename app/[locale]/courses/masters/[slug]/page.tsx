import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {getAppConfig} from '@/lib/app/config'
import {createPractitionerCourseRepository} from '@/lib/practitioners/course-repository'
import {PublicSiteHeader} from '@/components/public-site-header'
import PublicPractitionerCoursePlayer from '@/components/public-practitioner-course-player'
import type {PublicLocale} from '@/lib/public-locales'

export const dynamic='force-dynamic'
export const revalidate=0
type Props={params:Promise<{locale:string;slug:string}>}
async function read(slug:string){
 try{return await createPractitionerCourseRepository(getAppConfig()).publicBySlug(slug)}
 catch{return null}
}
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {locale,slug}=await params
 if(!['en','ru','es'].includes(locale))return {title:'Not found'}
 const item=await read(slug)
 if(!item)return {title:'Course unavailable',robots:{index:false,follow:false}}
 return {title:item.course.title+' | Holistic House',description:item.course.description||'Course from a Holistic House practitioner',
  alternates:{canonical:'/'+item.course.locale+'/courses/masters/'+slug}}
}
export default async function PractitionerCoursePage({params}:Props){
 const {locale,slug}=await params
 if(!['en','ru','es'].includes(locale))notFound()
 const item=await read(slug)
 if(!item)notFound()
 const canonicalLocale=item.course.locale as PublicLocale
 return <><PublicSiteHeader locale={locale as PublicLocale}/>
  <PublicPractitionerCoursePlayer course={item.course} slug={slug} locale={canonicalLocale} practitionerName={item.practitionerName}/></>
}
