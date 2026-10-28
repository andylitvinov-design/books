import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {COPY} from '../components/app/copy.js'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const source=read('scripts/verify-app-r1.mjs')
test('core follows My Profile measured-history navigation and opens both real scale disclosures in EN/RU',async()=>{
 const start=source.indexOf('async function openInsightsProfileTools(')
 const fragment=source.slice(start,source.indexOf('\n}',start)+2)
 const workspace=read('components/app/app-workspace.jsx')
 assert.match(workspace.slice(workspace.indexOf('function Portrait(')),/<h1>\{c\.portrait\}<\/h1>/)
 assert.match(workspace,/data-insights-detailed-scales>[\s\S]*?<Portrait data=\{data\} locale=\{locale\}/)
 for(const locale of ['en','ru']) for(const alreadyInPortfolio of [false,true]){
  const events=[]
  const origin='http://127.0.0.1:3100'
  let currentUrl=origin+'/'+locale+'/app/'+(alreadyInPortfolio?'portfolio?tab=dynamics':'tests')
  const locator=path=>({path,first(){return this},locator:s=>locator(path+'/'+s),getByRole:(role,options)=>locator(path+'/'+role+':'+options.name),url:()=>currentUrl,click:async()=>{events.push(['click',path]);if(path.includes('nav a['))currentUrl=origin+'/'+locale+'/app/portrait';else if(path.includes('?tab=dynamics'))currentUrl=origin+'/'+locale+'/app/portfolio?tab=dynamics';else if(path.endsWith('#hh-results-tab-values'))currentUrl=origin+'/'+locale+'/app/portfolio'}})
  const expect=target=>({toHaveText:async text=>events.push(['text',target.path,text]),toHaveAttribute:async(key,value)=>events.push(['attribute',target.path,key,value]),toHaveURL:async url=>{assert.equal(currentUrl,url);events.push(['url',url])},toBeVisible:async()=>events.push(['visible',target.path]),not:{toHaveAttribute:async(key,value)=>events.push(['notattribute',target.path,key,value])}})
  const helper=new Function('expect','origin','exercisePortraitRays',fragment+';return openInsightsProfileTools')(expect,origin,async(target,receivedExpect,receivedLocale)=>{assert.equal(receivedExpect,expect);assert.equal(receivedLocale,locale);events.push(['rays',target.path,receivedLocale])})
  await helper(locator('page'),locale)
  const profileLink='page/nav a[href="/'+locale+'/app/portrait"]:visible'
  const history='page/.hh-profile-domains[data-profile-mode="account"] a[href="/'+locale+'/app/portfolio?tab=dynamics"]'
  const values='page/#hh-results-tab-values'
  const expectedNavigation=alreadyInPortfolio?[]:[
   ['text',profileLink,locale==='ru'?'Мой профиль':'My Profile'],
   ['attribute',profileLink,'href','/'+locale+'/app/portrait'],
   ['click',profileLink],['url',origin+'/'+locale+'/app/portrait'],
   ['attribute','page/.hh-profile-domains[data-profile-mode="account"] details.hh-domain-more','open',''],
   ['visible',history],['click',history],
  ]
  expectedNavigation.push(['visible',values],['click',values],['url',origin+'/'+locale+'/app/portfolio'])
  assert.deepEqual(events.slice(0,expectedNavigation.length),expectedNavigation)
  assert.ok(!events.some(e=>String(e[1]).includes('nav a[href="/'+locale+'/app/portfolio"]')), 'Do not revive the removed Reports bottom tab')
  assert.ok(events.some(e=>e[0]==='rays'&&e[1]==='page/[data-testid="insights-psychological-portrait"]'&&e[2]===locale), 'Actual portrait-ray exercise must remain in the journey')
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
