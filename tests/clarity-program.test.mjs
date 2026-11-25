import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {clarityDaybookPath,clarityOnboardingPath,savedClarityReflection,CLARITY_SYLLABUS,CLARITY_FREE_REFLECTION_TAG} from '../lib/app/clarity-program.mjs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('fixed route keeps locale and never accepts an arbitrary OAuth return',()=>{
 for(const locale of ['en','ru','es']){
  assert.equal(clarityDaybookPath(locale),'/'+locale+'/app/daybook?program=clarity')
  assert.match(clarityOnboardingPath(locale),new RegExp('clarityLocale='+locale+'$'))
  assert.equal(CLARITY_SYLLABUS[locale].length,4)
 }
 assert.equal(clarityDaybookPath('//attacker.example'),'/en/app/daybook?program=clarity')
 assert.equal(clarityOnboardingPath('es'),'/en/app/portrait?afterSignIn=clarity&clarityLocale=es')
})
test('free progress is only a saved journal reflection; it does not grant paid access',()=>{
 const entry={kind:'note',goalId:null,revision:1,text:'reflection',tags:[CLARITY_FREE_REFLECTION_TAG]}
 assert.equal(savedClarityReflection([]),null)
 assert.equal(savedClarityReflection([{...entry,revision:0}]),null)
 assert.equal(savedClarityReflection([{...entry,text:' '}]),null)
 assert.equal(savedClarityReflection([entry]),entry)
 const source=read('components/app/clarity-program.jsx')
 assert.match(source,/week===1\?/)
 assert.match(source,/Payment for this session is not configured yet/)
 assert.match(source,/createJournalSaver/)
 assert.doesNotMatch(source,/localStorage|sessionStorage/)
})
test('explicit Google continuation survives onboarding and never changes goal daybook default',()=>{
 const auth=read('app/api/app/[...path]/route.js')
 const work=read('components/app/app-workspace.jsx')
 const view=read('components/app/daybook-journal.jsx')
 assert.match(auth,/continueTo === 'clarity-daybook'/)
 assert.match(auth,/clarityOnboardingPath\(locale\)/)
 assert.match(work,/afterSignIn'\)==='clarity'/)
 assert.match(work,/data-clarity-details/)
 assert.match(view,/if\(clarityMode\)return/)
 assert.match(view,/data-daybook-view=\{tab\}/)
})


test('Hero and guidance CTA share the same authenticated or Google entry',()=>{
 const source=read('components/app/clarity-program.jsx')
 assert.equal((source.match(/continueTo:programContinuation\(program\)/g)||[]).length,1)
 assert.equal((source.match(/=useProgramStart\(locale,'clarity'\)/g)||[]).length,2)
 assert.match(source,/boot\.account\.onboardingState==='active'\?programDaybookPath\(lang,program\):programOnboardingPath\(lang,program\)/)
 assert.match(source,/data-clarity-start data-clarity-personal/)
 assert.match(source,/href=\{clarityDaybookPath\(lang\)\}/)
 assert.match(source,/event\.preventDefault\(\)[\s\S]*?if\(!busy\)void begin\(\)/)
})
