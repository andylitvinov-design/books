import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { COURSE_MEMBERSHIP, COURSE_PUBLIC_PLANS, shouldShowFreeCourseFinalOffer } from '../lib/inner-growth/course-membership.js'
import { withFinalFreeOffer, verifyCourseSlideVisitOrder } from '../lib/inner-growth/course-slide-sequence.js'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('only €20/month Advanced is paid; €10 is the introductory first-month discount',()=>{
  assert.deepEqual(COURSE_PUBLIC_PLANS.map(plan=>[plan.id,plan.price]),[['free',0],['advanced',20]])
  assert.equal(COURSE_MEMBERSHIP.regularMonthlyEUR,20)
  assert.equal(COURSE_MEMBERSHIP.introFirstMonthEUR,10)
  assert.equal(COURSE_MEMBERSHIP.introDiscountPercent,50)
  assert.equal(COURSE_MEMBERSHIP.regularMonthlyEUR*(1-COURSE_MEMBERSHIP.introDiscountPercent/100),10)
  const modal=read('components/app/course-entry-selector.jsx')
  assert.match(modal,/data-first-month-offer/)
  assert.doesNotMatch(modal,/id: 'start'|id: 'premium'/)
})

test('one final Free ad is included only in the unsaved last day of the 14-day course',()=>{
  const slides=[{key:'welcome',kind:'welcome'},{key:'feedback',kind:'feedback'}]
  const opts={day:14,durationDays:14,show:true,checking:false,alreadyDone:false}
  assert.equal(shouldShowFreeCourseFinalOffer(opts),true)
  assert.deepEqual(withFinalFreeOffer(slides,opts).map(slide=>slide.key),
    ['welcome','feedback','free-course-offer'])
  for(const override of [{day:1},{day:13},{show:false},{checking:true},{alreadyDone:true},{durationDays:28}]){
    assert.deepEqual(withFinalFreeOffer(slides,{...opts,...override}),slides)
  }
  assert.deepEqual(slides.map(slide=>slide.key),['welcome','feedback'])
})

test('server checks every authored slide is acknowledged in the correct order',()=>{
  const slides=[{key:'welcome'},{key:'guided-0'},{key:'reflection'},{key:'feedback'}]
  assert.equal(verifyCourseSlideVisitOrder(slides,slides.map(x=>x.key)),true)
  assert.equal(verifyCourseSlideVisitOrder(slides,['welcome','guided-0','feedback']),false)
  assert.equal(verifyCourseSlideVisitOrder(slides,['welcome','guided-0','feedback','reflection']),false)
  assert.equal(verifyCourseSlideVisitOrder(slides,['welcome','guided-0','reflection','feedback','extra']),false)
  assert.equal(verifyCourseSlideVisitOrder(slides,undefined),false)
})

test('no legacy completion bypass and a congratulation is shown only after save',()=>{
  const today=read('components/app/course-today.jsx')
  const player=read('components/app/course-slide-player.jsx')
  const daily=read('lib/app/growth-daily.js')
  const legacy=read('lib/app/growth-course.js')
  assert.doesNotMatch(today,/submit\('session',\{/)
  assert.match(today,/data-open-complete-slide-lesson/)
  assert.match(player,/visitedSlideKeys\.current\.add/)
  assert.match(player,/visitedSlideKeys:baseSlides\.map/)
  assert.match(player,/setEarned\(true\); setIndex\(slides\.length\)/)
  assert.match(player,/courseFinished/)
  assert.match(daily,/COURSE_SLIDES_INCOMPLETE/)
  assert.match(daily,/verifyCourseSlideVisitOrder\(requiredSlides,input\.visitedSlideKeys\)/)
  assert.match(legacy,/if \(action === 'complete-day'\) reject\('COURSE_SLIDES_REQUIRED',409\)/)
})
