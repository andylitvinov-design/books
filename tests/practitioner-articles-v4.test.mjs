import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {validateArticleDraft} from '../lib/practitioners/article-contracts.js'
import {validateServiceDraft} from '../lib/practitioners/contracts.js'
import {serviceMatchesGoal} from '../lib/practitioners/discovery-intent.js'

const article={
 locale:'ru',title:'Внутренняя опора: практическое исследование',
 excerpt:'Введение в личное самоисследование и вопросы внутренней опоры.',
 body:'## Введение\n\n'+('Наблюдение за своим состоянием и мягкая работа с личными вопросами. ').repeat(6),
 coverPath:'/images/holistic-house/andy-about.png',
 sourceUrls:['https://example.org/research'],
 linkedServiceIds:[],
}
test('articles: allowed locales and minimum educational content',()=>{
 assert.equal(validateArticleDraft(article,{complete:true}).locale,'ru')
 assert.equal(validateArticleDraft({...article,locale:'es'},{complete:true}).locale,'es')
 assert.throws(()=>validateArticleDraft({...article,locale:'fr'}),x=>x.code==='INVALID_LOCALE')
 assert.throws(()=>validateArticleDraft({...article,body:'short'},{complete:true}),x=>x.code==='INCOMPLETE_ARTICLE')
})
test('articles: reject non-HTTPS, external image, malformed and overshared links',()=>{
 assert.throws(()=>validateArticleDraft({...article,sourceUrls:['javascript:alert(1)']}),x=>x.code==='INVALID_URL')
 assert.throws(()=>validateArticleDraft({...article,coverPath:'https://tracker.site/img.png'}),x=>x.code==='INVALID_IMAGE')
 assert.throws(()=>validateArticleDraft({...article,linkedServiceIds:['another-user-service-id']}))
 assert.throws(()=>validateArticleDraft({...article,linkedServiceIds:Array(3).fill('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')}),x=>x.code==='INVALID_LIST')
})
const service={
 copy:{
  en:{title:'Confidence coaching',shortDescription:'Explore personal confidence'},
  ru:{title:'Поддержка уверенности',shortDescription:'Исследование опоры'},
 },
 areaKey:'personal_development',offeringType:'session',deliveryFormat:'online',
 locationLabel:'',languages:['en','ru'],pricingMode:'fixed',confirmedPrice:50,currency:'EUR',durationMinutes:30,
 goals:['confidence','clarity'],methods:['Guided imagery'],benefits:['A clearer sense of next steps'],faq:['What will happen during the session?'],
 displayLocales:['en','ru'],whatsapp:'+14165550123',telegram:'@example_user',
}
test('services: goals, benefits and contact fields are normalized',()=>{
 const r=validateServiceDraft(service,{complete:true})
 assert.deepEqual(r.goals,['confidence','clarity'])
 assert.equal(r.currency,'EUR')
 assert.equal(r.whatsapp,'+14165550123')
 assert.equal(r.telegram,'@example_user')
 assert.deepEqual(r.displayLocales,['en','ru'])
})
test('services: ES needs source copy and contacts are validated',()=>{
 assert.throws(()=>validateServiceDraft({...service,displayLocales:['en','ru','es']}),x=>x.code==='INCOMPLETE_TRANSLATION')
 assert.throws(()=>validateServiceDraft({...service,telegram:'https://t.me/not_allowed'}),x=>x.code==='INVALID_CONTACT')
 assert.throws(()=>validateServiceDraft({...service,whatsapp:'000000'}),x=>x.code==='INVALID_CONTACT')
})
test('article visibility and auth are wired through existing isolated backend',async()=>{
 const [repo,api,admin,publicPage,edit,sitemap,sql]=await Promise.all([
  readFile(new URL('../lib/practitioners/article-repository.js',import.meta.url),'utf8'),
  readFile(new URL('../app/api/app/[...path]/route.js',import.meta.url),'utf8'),
  readFile(new URL('../app/admin/practitioners/articles/data/route.js',import.meta.url),'utf8'),
  readFile(new URL('../app/[locale]/articles/[slug]/page.tsx',import.meta.url),'utf8'),
  readFile(new URL('../components/app/practitioner-articles.jsx',import.meta.url),'utf8'),
  readFile(new URL('../app/sitemap.ts',import.meta.url),'utf8'),
  readFile(new URL('../supabase/migrations/20261016231500_hh_practitioner_articles_and_discovery.sql',import.meta.url),'utf8'),
 ])
 assert.match(repo,/trusted_auth_user_id=\$1/)
 assert.match(repo,/revision=revision\+1/)
 assert.match(repo,/published=\$2/)
 assert.match(repo,/p\.status in\('approved','submitted','changes_requested'\)/)
 assert.match(api,/articleRepo\.library\(actor\)/)
 assert.match(api,/articleRepo\.submit\(actor/)
 assert.match(admin,/requireAdminRequest/)
 assert.match(admin,/requireSameOrigin/)
 assert.doesNotMatch(publicPage,/dangerouslySetInnerHTML/)
 assert.match(edit,/Submit for review/)
 assert.match(sitemap,/publicList\(locale\)/)
 assert.match(sql,/enable row level security/)
 assert.match(sql,/revoke all on app\.practitioner_articles/)
})

test('legacy published offerings remain discoverable by broad goal only if untagged',()=>{
 const old={areaKey:'personal_development',goals:[]};
 assert.equal(serviceMatchesGoal(old,'confidence'),true)
 assert.equal(serviceMatchesGoal(old,'relationships'),false)
 assert.equal(serviceMatchesGoal({...old,goals:['clarity']},'confidence'),false)
 assert.equal(serviceMatchesGoal({...old,goals:['clarity']},'clarity'),true)
})
