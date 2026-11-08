import {notFound,redirect} from 'next/navigation'
import {cookies} from 'next/headers'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {uiLocaleCookie} from '@/lib/ui-locale'
import {traditionBySlug} from '@/lib/personal-coaching/traditions'
import {coachingAudioQuestions} from '@/lib/academy/coaching-audio-model'
import {PrescriptionAdminHeader} from '@/components/prescription-admin-header'
import AdminCoachingAudio from '@/components/admin-coaching-audio'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const metadata={title:'Coaching Audio · My Materials',robots:{index:false,follow:false,noarchive:true}}
export default async function CoachingAudioFolder({params,searchParams}){
 if(!await requireAdminRequest())redirect('/admin/login')
 const {tradition}=await params
 const course=traditionBySlug(tradition)
 if(!course)notFound()
 const query=await searchParams
 const lang=(await cookies()).get(uiLocaleCookie)?.value
 const language=['ru','en','es'].includes(query?.lang)?query.lang:lang==='ru'?'ru':'en'
 const questions=coachingAudioQuestions(course.slug)
 const question=questions.some(item=>item.id===query?.question)?query.question:questions[0].id
 return <main className="prescription-admin-shell" data-coaching-owner-audio={course.slug}>
  <PrescriptionAdminHeader title={{en:'My Materials / Coaching / '+course.name.en,ru:'Мои материалы / Коучинг / '+course.name.ru}}
   description={{en:'Upload or record, preview, then choose which lesson hears your voice.',ru:'Запишите или загрузите файл, прослушайте его, затем назначьте на слайд курса.'}}/>
  <AdminCoachingAudio course={course.slug} initialQuestion={question} initialLocale={language}/>
 </main>
}
