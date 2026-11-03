import {unstable_noStore as noStore} from 'next/cache'
import {getAppConfig} from '@/lib/app/config'
import {createPractitionerCourseRepository} from '@/lib/practitioners/course-repository'
import PractitionerCourseSearch from './public-practitioner-course-search'

export default async function PublicPractitionerCourses({locale='en'}){
 noStore()
 let items=[]
 try{items=await createPractitionerCourseRepository(getAppConfig()).catalog()}
 catch{return null}
 return <PractitionerCourseSearch items={items} locale={locale}/>
}
