import 'server-only'
import {createGrowthCourseRepository} from './growth-course.js'
import {createEnergyworkCourseRepository} from '../academy/energywork-course-repository.js'
import {readBusinessCoaching} from './business-coaching.js'
import {listMyCoachProtocols} from './personal-coaching.js'
import {energyworkSequence} from '../../data/academy/energywork-ai-schema.js'
import {antiStressStorageEnabled,listAntiStressRuns} from './anti-stress-runs.js'
import {listCoursePurchases} from '../commerce/course-order-store.js'
import {summarizeMyPageCourses,summarizeDiscoveryCoverage,summarizeAntiStressRuns} from './my-page-courses.mjs'
import {createAppRepository} from './repository.js'
import {readDevelopmentGoals} from './development-goals.js'
import {buildExplorerEntries} from '../assessments/test-explorer.js'
import {verifiedHistoryView} from '../assessments/verified-history.js'
import {freeDiscoveryEntries,themeProgress} from './self-discovery-themes.mjs'

async function readDiscoveryCoverage(config,actor){
 const [history,goals]=await Promise.all([
  createAppRepository(config).discoveryAssessmentHistory(actor),
  readDevelopmentGoals(config,actor)
 ])
 const locale=['en','ru','es'].includes(history.locale)?history.locale:'en'
 const catalog=freeDiscoveryEntries(buildExplorerEntries({locale,audience:'account'}))
 const verified=verifiedHistoryView(history.results).eligible
 const counts=themeProgress(catalog,verified,'all')
 const vectors=goals.goals?.vectors
 const axes=['inner','outer'].reduce((n,track)=>n+Object.keys(vectors?.[track]?.ratings||{}).length,0)
 return summarizeDiscoveryCoverage({...counts,axes,attempts:history.results.length})
}

// Existing private repositories remain the authorities. Only card metadata leaves
// the server. Independent failures must never be represented as zero progress.
export async function readMyPageCourses(config,actor){
 const results=await Promise.allSettled([
  createGrowthCourseRepository(config).read(actor),
  createEnergyworkCourseRepository(config).read(actor),
  readBusinessCoaching(config,actor),
  listMyCoachProtocols(config,actor),
  process.env.HH_COURSE_CHECKOUT_SCHEMA_APPROVED==='true'?listCoursePurchases(config,actor):Promise.resolve({orders:[]}),
  readDiscoveryCoverage(config,actor),
  antiStressStorageEnabled()?listAntiStressRuns(config,actor):Promise.resolve(null)
 ])
 const value=i=>results[i].status==='fulfilled'?results[i].value:null
 return {accountId:actor.id,courses:[...summarizeMyPageCourses({
  growth:value(0),reiki:value(1),business:value(2),protocols:value(3),sequence:energyworkSequence()
 }),...(value(5)?[value(5)]:[]),...summarizeAntiStressRuns(value(6)?.runs)],coursePurchases:value(4)?.orders??[],
  partial:results.some(r=>r.status==='rejected')||value(3)?.hasMore===true||Boolean(value(6)?.nextCursor)}
}
