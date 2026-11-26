import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {programContinuation,programFromContinuation,programDaybookPath,programOnboardingPath} from '../lib/app/program-daybook-entry.mjs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
test('all three program destinations survive Google and onboarding in every locale',()=>{
 for(const lang of ['en','ru','es']){
  for(const [program,suffix] of [['clarity','?program=clarity'],['goal','?start=vector'],['business','/business']]){
   assert.equal(programFromContinuation(programContinuation(program)),program)
   assert.equal(programDaybookPath(lang,program),'/'+lang+'/app/daybook'+suffix)
   assert.match(programOnboardingPath(lang,program),new RegExp('(clarityLocale|programLocale)='+lang+'$'))
  }
 }
 assert.equal(programFromContinuation('//attacker.example'),null)
 assert.throws(()=>programDaybookPath('en','__proto__'))
 assert.equal(programDaybookPath('//attacker.example','goal'),'/en/app/daybook?start=vector')
})
test('program capture and signed-out program retries use the fixed continuation',()=>{
 const auth=read('app/api/app/[...path]/route.js'),workspace=read('components/app/app-workspace.jsx')
 assert.equal((auth.match(/'clarity-daybook','goal-daybook','business-daybook'/g)||[]).length,4)
 assert.match(auth,/programDaybookPath\(locale,programFromContinuation\(continueTo\)\)/)
 assert.match(auth,/programOnboardingPath\(locale,programFromContinuation\(continueTo\)\)/)
 assert.match(workspace,/signin\('google',program\)/)
 assert.match(workspace,/programDaybookPath\(searchParams.get\('programLocale'\)\|\|locale,daybookProgram\)/)
 assert.match(read('components/app/business-daybook.jsx'),/program="business"/)
 assert.match(read('components/app/daybook-journal.jsx'),/program="goal"/)
})
