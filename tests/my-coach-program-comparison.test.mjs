import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {getCoachProgramComparison,COACH_COMPARISON_LOCALES,COACH_PROGRAM_PREVIEW_PRICE_EUR} from '../lib/coach-program-comparison.mjs'
import {CLARITY_SYLLABUS,clarityDaybookPath} from '../lib/app/clarity-program.mjs'
import {BUSINESS_SYLLABUS} from '../lib/app/business-daybook.mjs'
import {isUnifiedMobileDockAppPath,unifiedMobileDockActive} from '../lib/unified-mobile-dock.mjs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('four approved comparison cards have three free and eight planned sessions, localized in EN/RU/ES',()=>{
 assert.equal(COACH_PROGRAM_PREVIEW_PRICE_EUR,19.9)
 for(const lang of COACH_COMPARISON_LOCALES){
  const {copy,programs}=getCoachProgramComparison(lang)
  assert.deepEqual(programs.map(p=>p.id),['clarity','business','love','health'])
  assert.deepEqual(programs.map(p=>p.count),[3,8,8,8])
  assert.deepEqual(programs.map(p=>p.rows.length),[3,8,8,8])
  assert.deepEqual(programs[0].rows.map(p=>p.title),CLARITY_SYLLABUS[lang].map(row=>row[0]))
  assert.deepEqual(programs[1].rows.map(p=>p.title),BUSINESS_SYLLABUS[lang].map(row=>row[0]))
  assert.equal(programs[0].price,copy.free)
  assert.deepEqual(programs.map(p=>p.available),[true,false,false,false])
  assert.ok(programs.slice(1).every(p=>p.price===programs[1].price&&/19[.,]90/.test(p.price)))
  assert.ok(programs[2].draft&&programs[3].draft)
  assert.ok(programs.every(p=>p.title&&p.description&&p.rows.every(row=>row.title)))
  assert.ok(copy.priceNote&&copy.terms&&copy.draft)
  assert.equal(clarityDaybookPath(lang),'/'+lang+'/app/daybook?program=clarity')
  assert.equal(isUnifiedMobileDockAppPath('/'+lang+'/my-coach/programs'),true)
  assert.equal(unifiedMobileDockActive('/'+lang+'/my-coach/programs'),'coach')
 }
})
test('comparison entry uses real route, native expandable cards and existing auth-protected free program start',()=>{
 const landing=read('components/my-coach-catalog.jsx')
 const page=read('app/[locale]/my-coach/programs/page.jsx')
 const view=read('components/my-coach-program-comparison.jsx')
 assert.ok(landing.includes("'/my-coach/programs'"))
 assert.match(landing,/data-my-coach-program-details/)
 assert.doesNotMatch(landing,/setShowPrograms/)
 assert.match(page,/<CoachProgramComparison locale=\{locale\}/)
 assert.match(view,/<details className=\{styles.card\}/)
 assert.match(view,/open=\{p.id==='clarity'\}/)
 assert.match(view,/<summary className=\{styles.summary\}/)
 assert.match(view,/<ClarityStartLink locale=\{lang\}/)
 assert.match(view,/p.id==='clarity'&&<>/)
 assert.match(view,/nativeHelp.click\(\)/)
 assert.match(view,/copy.priceNote/)
 assert.doesNotMatch(view,/paymentUrl|checkout|onPurchase/)
})
