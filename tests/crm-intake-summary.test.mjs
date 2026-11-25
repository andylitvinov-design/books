import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {summarizeLoadedCrmEnquiries,CRM_INTAKE_PERIODS} from '../lib/app/crm-intake-summary.mjs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const now=Date.parse('2026-11-04T16:00:00Z')
const days=n=>new Date(now-n*86400000).toISOString()
const enquiry=(id,age,status='requested',extra={})=>({
  id,createdAt:days(age),status,requestKind:'public',serviceTitle:'Reiki session',...extra,
})
test('1/7/30-day CRM summary never invents unread, delivery or first-response times',()=>{
 assert.deepEqual(CRM_INTAKE_PERIODS,{day:1,week:7,month:30})
 const requests=[
  enquiry('a',.5,'requested',{attribution:{trafficSource:'google'},telegramThreadId:null}),
  enquiry('a',.5,'requested',{attribution:{trafficSource:'google'}}), // same ID
  enquiry('b',4,'contacted',{attribution:{trafficSource:'facebook'},telegramThreadId:'one'}),
  enquiry('c',20,'closed',{attribution:null}),
 ]
 const daily=summarizeLoadedCrmEnquiries({requests},'day',now)
 assert.equal(daily.count,1)
 assert.equal(daily.awaitingFirstAction,1)
 assert.equal(daily.withoutVerifiedMessenger,1)
 assert.deepEqual(daily.bySource,[{name:'google',count:1}])
 const week=summarizeLoadedCrmEnquiries({requests},'week',now)
 assert.equal(week.count,2)
 assert.equal(week.awaitingFirstAction,1)
 assert.equal(week.withoutVerifiedMessenger,1)
 assert.equal(week.firstResponseMinutes,null)
 assert.equal(week.scope,'loaded_rows_only')
 const month=summarizeLoadedCrmEnquiries({requests},'month',now)
 assert.equal(month.count,3)
 assert.deepEqual(month.bySource,[{name:'facebook',count:1},{name:'google',count:1},{name:'unknown',count:1}])
})
test('unconsented or malformed traffic attribution is labelled unknown, never inferred',()=>{
 const requests=[enquiry('a',1,'requested',{attribution:{trafficSource:'https://secret.test?client=abc'}})]
 const x=summarizeLoadedCrmEnquiries({requests},'week',now)
 assert.deepEqual(x.bySource,[{name:'unknown',count:1}])
 assert.throws(()=>summarizeLoadedCrmEnquiries({requests},'all',now))
})
test('business enquiries stay separate and loaded-only summary omits invalid timestamps',()=>{
 const summary=summarizeLoadedCrmEnquiries({
  requests:[enquiry('a',4,'closed'),enquiry('bad',40),{id:'future',createdAt:days(-3)}],
  businessEnquiries:[{id:'b',createdAt:days(2),status:'new',question:'private data'}],
 },'week',now)
 assert.equal(summary.count,2)
 assert.equal(summary.awaitingFirstAction,1)
 assert.equal(summary.withoutVerifiedMessenger,1)
 assert.deepEqual(summary.bySource,[{name:'business-form',count:1},{name:'unknown',count:1}])
 assert.equal(JSON.stringify(summary).includes('private data'),false)
})
test('metrics live inside list only and never displace an opened mobile composer',()=>{
 const view=read('components/app/messages-simple-inbox.jsx')
 const ui=read('components/app/messages-lead-metrics.jsx')
 assert.match(view,/MessagesLeadMetrics locale=\{locale\}/)
 assert.ok(view.indexOf('className={styles.peopleScroll}')>view.indexOf('<MessagesLeadMetrics'))
 assert.match(view,/crmEnabled&&\(embedded\|\|tab==='requests'\)/)
 assert.match(ui,/loaded_rows_only|caveat/)
 assert.match(ui,/if\(!opened\|\|!accountId\)return/)
 assert.match(ui,/fetch\('\/api\/app\/crm\/enquiry-analytics\?period='/)
 assert.doesNotMatch(ui,/setInterval|localStorage|navigator\.sendBeacon|dataLayer\.push|gtag\(/)
})
