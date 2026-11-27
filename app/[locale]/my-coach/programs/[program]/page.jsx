import {notFound} from 'next/navigation'
import {metadataBaseFor} from '@/data/site-metadata'
import {COACH_LAUNCH_IDS,COACH_COMPARISON_LOCALES} from '@/lib/coach-program-comparison.mjs'
import {getCoachCourseLaunch,normalizeLaunchCoach,coachCourseLaunchHref} from '@/lib/coach-course-launch.mjs'
import MyCoachCourseLaunch from '@/components/my-coach-course-launch'

export function generateStaticParams(){return COACH_COMPARISON_LOCALES.flatMap(locale=>COACH_LAUNCH_IDS.map(program=>({locale,program})))}
export async function generateMetadata({params}){
 const {locale,program}=await params
 const launch=getCoachCourseLaunch(locale,program)
 if(!launch)return {title:'Not found',robots:{index:false}}
 return {metadataBase:metadataBaseFor(),title:launch.course.title+' | Holistic House',description:launch.intro,
  alternates:{canonical:coachCourseLaunchHref(locale,program),languages:Object.fromEntries(COACH_COMPARISON_LOCALES.map(lang=>[lang,coachCourseLaunchHref(lang,program)]))}}
}
export default async function CoachCourseLaunchPage({params,searchParams}){
 const {locale,program}=await params
 const launch=getCoachCourseLaunch(locale,program)
 if(!launch)notFound()
 const query=await searchParams
 return <MyCoachCourseLaunch key={locale+':'+program+':'+normalizeLaunchCoach(query?.coach)} launch={launch} initialCoach={normalizeLaunchCoach(query?.coach)}/>
}
