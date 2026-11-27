import 'server-only'
import {createGrowthCourseRepository} from './growth-course.js'
import {createEnergyworkCourseRepository} from '../academy/energywork-course-repository.js'
import {readBusinessCoaching} from './business-coaching.js'
import {listMyCoachProtocols} from './personal-coaching.js'
import {energyworkSequence} from '../../data/academy/energywork-ai-schema.js'
import {summarizeMyPageCourses} from './my-page-courses.mjs'
import {listCoursePurchases} from '../commerce/course-order-store.js'

// Existing private repositories remain the authorities. Only card metadata leaves
// the server. Independent failures must never be represented as zero progress.
export async function readMyPageCourses(config,actor){
 const results=await Promise.allSettled([
  createGrowthCourseRepository(config).read(actor),
  createEnergyworkCourseRepository(config).read(actor),
  readBusinessCoaching(config,actor),
  listMyCoachProtocols(config,actor),
  process.env.HH_COURSE_CHECKOUT_SCHEMA_APPROVED==='true'?listCoursePurchases(config,actor):Promise.resolve({orders:[]})
 ])
 const value=i=>results[i].status==='fulfilled'?results[i].value:null
 return {accountId:actor.id,courses:summarizeMyPageCourses({
  growth:value(0),reiki:value(1),business:value(2),protocols:value(3),sequence:energyworkSequence()
 }),coursePurchases:value(4)?.orders??[],partial:results.some(r=>r.status==='rejected')||value(3)?.hasMore===true}
}
