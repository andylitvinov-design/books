import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {COPY} from '../components/app/copy.js'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const source=read('scripts/verify-app-r1.mjs')
test('core follows visible Reports navigation and opens both real scale disclosures in EN/RU',async()=>{
 const start=source.indexOf('async function openInsightsProfileTools(')
 const fragment=source.slice(start,source.indexOf('\n}',start)+2)
 const workspace=read('components/app/app-workspace.jsx')
 assert.match(workspace.slice(workspace.indexOf('function Portrait(')),/<h1>\{c\.portrait\}<\/h1>/)
 assert.match(workspace,/data-insights-detailed-scales>[\s\S]*?<Portrait data=\{data\} locale=\{locale\}/)
 for(const locale of ['en','ru']){
  const events=[]
  const locator=path=>({path,first(){return this},locator:s=>locator(path+'/'+s),getByRole:(role,options)=>locator(path+'/'+role+':'+options.name),click:async()=>events.push(['click',path])})
  const expect=target=>({toHaveText:async text=>events.push(['text',target.path,text]),toHaveAttribute:async(key,value)=>events.push(['attribute',target.path,key,value]),toHaveURL:async url=>events.push(['url',url]),toBeVisible:async()=>events.push(['visible',target.path]),not:{toHaveAttribute:async(key,value)=>events.push(['notattribute',target.path,key,value])}})
  const helper=new Function('expect','origin','exercisePortraitRays',fragment+';return openInsightsProfileTools')(expect,'http://127.0.0.1:3100',async()=>{})
  await helper(locator('page'),locale)
  const link='page/nav a[href="/'+locale+'/app/portfolio"]:visible'
  assert.deepEqual(events.slice(0,4),[['text',link,locale==='ru'?'Отчёты':'Reports'],['attribute',link,'href','/'+locale+'/app/portfolio'],['click',link],['url','http://127.0.0.1:3100/'+locale+'/app/portfolio']])
  assert.ok(events.some(e=>e[0]==='click'&&e[1].endsWith('[data-insights-detailed-scales]/:scope > summary')))
  assert.ok(events.some(e=>e[0]==='click'&&e[1].endsWith('[data-profile-deep-dive] > summary')))
  assert.ok(events.some(e=>e[0]==='visible'&&e[1]==='page/[data-insights-detailed-scales]/heading:'+COPY[locale].portrait), 'The exact nested profile heading must match the actual Portrait renderer')
  assert.ok(events.some(e=>e[0]==='visible'&&e[1].endsWith('heading:'+(locale==='ru'?'Шкалы профессиональных тестов':'Professional test scales'))))
 }
})
test('compact type icons remain decorative while exact visible labels and source evidence are asserted',()=>{
 assert.match(read('components/app/simple-test-picker.module.css'),/\.testKindBadge svg\{display:none\}/)
 for(const text of ["category.locator('svg')).toHaveAttribute('aria-hidden','true')","category.locator('svg')).toBeHidden()","category.locator('span')).toHaveText(`Type: ${kindLabel}`)","category).toHaveAttribute('aria-label',`Type: ${kindLabel}. ${evidenceLabel}`)"])assert.ok(source.includes(text),text)
})
test('relocated journey preserves full PDF, exact scoring, consent, cross-user denial and resume checks',()=>{
 for(const text of ["pdfBytes.subarray(0,8).toString(),'%PDF-1.4'","first.dimensions.length,5","beforeConsent.status,403","beforeConsent.data.error,'CONSENT_REQUIRED'","api('results/'+first.id,null,other)).status,404","'Question 2 / 8'","'Selected tests still to complete'","name:/Retake completed tests/","'.hh-metric')).toHaveCount(5)"])assert.ok(source.includes(text),text)
 assert.doesNotMatch(source,/data-profile-head|data-personal-portrait-summary/)
 assert.match(source,/verifyProfileServiceOffers\(clientPage,'en','legacy'\)/)
})
