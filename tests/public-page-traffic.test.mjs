import test from 'node:test'
import assert from 'node:assert/strict'
import {safePublicPagePath,safePublicSource,sourceFromPublicEntry} from '../lib/analytics/public-page-traffic.mjs'
import {summarizePublicPageTraffic,publicPageDigestLines} from '../lib/analytics/public-page-traffic-report.mjs'
import {existsSync, readFileSync} from 'node:fs'

const period={yesterday:'2026-10-24',weekStart:'2026-10-18'}
test('strictly public marketing paths, no private pages, queries or arbitrary slugs',()=>{
 assert.equal(safePublicPagePath('/en/services/alchemy-of-soul'),'/en/services/alchemy-of-soul')
 assert.equal(safePublicPagePath('/ru/holistic-support'),'/ru/holistic-support')
 assert.equal(safePublicPagePath('/es/explore/business'),'/es/explore/business')
 for(const p of ['/en/app/practice','/admin','/api','/en/tests/test','/en/client',
 '/en/report','/en/services/a?email=hi','/en/services/%20','/en/services//bad','/en/services/a/b/c/d'])
  assert.equal(safePublicPagePath(p),null,p)
 assert.equal(safePublicSource('evil-referrer'),null)
})
test('referral taxonomy never stores untrusted UTM/source names or referral URL',()=>{
 assert.equal(sourceFromPublicEntry('https://holistichouse.vercel.app/en/services/a'),'direct')
 assert.equal(sourceFromPublicEntry('https://holistichouse.vercel.app/en/services/a?utm_source=ig&utm_medium=paid_social'),'instagram-paid')
 assert.equal(sourceFromPublicEntry('https://holistichouse.vercel.app/en?utm_source=google&utm_medium=cpc'),'google-paid')
 assert.equal(sourceFromPublicEntry('https://holistichouse.vercel.app/en','https://www.google.com/search?q=sensitive'),'google-organic')
 assert.equal(sourceFromPublicEntry('https://holistichouse.vercel.app/en','https://any.example/path?private=abc'),'referral')
 assert.equal(sourceFromPublicEntry('https://holistichouse.vercel.app/en?utm_source=someone@example.com'),'unknown')
 assert.equal(sourceFromPublicEntry('https://holistichouse.vercel.app/en?utm_source=google&utm_source=facebook'),'unknown')
})
test('yesterday/weekly page ranking and sources are accurate and exclude invalid/private rows',()=>{
 const rows=[
  {day:'2026-10-24',pagePath:'/en/services/a',source:'google-organic',landings:6,views:10,clicks:3},
  {day:'2026-10-24',pagePath:'/en/services/a',source:'instagram-paid',landings:2,views:4,clicks:2},
  {day:'2026-10-21',pagePath:'/en/services/b',source:'telegram',landings:9,views:12,clicks:6},
  {day:'2026-10-24',pagePath:'/en/app/private',source:'direct',landings:999,clicks:999},
  {day:'2026-10-24',pagePath:'/en/services/a',source:'private-email@test',landings:200,clicks:300},
  {day:'2026-10-25',pagePath:'/en/services/a',source:'google-paid',landings:200,clicks:400}
 ]
 const got=summarizePublicPageTraffic(rows,period)
 assert.deepEqual(got.totals.yesterday,{landings:8,views:14,clicks:5})
 assert.deepEqual(got.totals.week,{landings:17,views:26,clicks:11})
 assert.equal(got.periods.yesterday[0].path,'/en/services/a')
 assert.equal(got.periods.week[0].path,'/en/services/a')
 const message=publicPageDigestLines(rows,period).join('\n')
 assert.match(message,/Google поиск 6 · Instagram реклама 2/)
 assert.match(message,/топ-10 страниц по просмотрам/)
 assert.match(message,/26|14/)
 assert.doesNotMatch(message,/private-email|any\.example|999|400|sensitive|уникальных посетителей: 26/)
})
test('existing GA4/Meta hold and strict opt-in; owner auto-excluded and browser override',()=>{
 const tag=readFileSync(new URL('../lib/public-analytics.ts',import.meta.url),'utf8')
 const collector=readFileSync(new URL('../components/public-page-traffic.tsx',import.meta.url),'utf8')
 const endpoint=readFileSync(new URL('../app/api/analytics/public-page/route.js',import.meta.url),'utf8')
 const service=readFileSync(new URL('../app/api/marketplace/service-event/route.js',import.meta.url),'utf8')
 const migration=readFileSync(new URL('../supabase/migrations/20261025175000_hh_public_page_source_daily.sql',import.meta.url),'utf8')
 assert.match(tag,/PUBLIC_ANALYTICS_AVAILABLE = false/)
 assert.match(collector,/hh_public_stats_consent/)
 assert.match(collector,/credentials: "same-origin"/)
 assert.match(endpoint,/requireSameOrigin\(request,config\)/)
 assert.match(endpoint,/publicStatsExclusion\(request,config\)/)
 assert.match(endpoint,/public_page_source_daily/)
 assert.match(service,/publicStatsExclusion\(request,config\)/)
 assert.match(migration,/force row level security/i)
 assert.match(migration,/revoke all on table.*public_page_source_daily/s)
 assert.match(migration,/hh_app_backend/)
 assert.doesNotMatch(migration,/email|ip_address|user_id|visitor_id|referrer_url/i)
})

test('top pages are ranked by views, not by clicks, for two completed Toronto periods',()=>{
 const rows=[]
 for(let i=0;i<12;i++){
   const p='/en/services/page-'+String(i).padStart(2,'0')
   rows.push({day:period.yesterday,pagePath:p,source:'google-organic',
     landings:i+1,views:(12-i)*10,clicks:i*100})
   rows.push({day:period.weekStart,pagePath:p,source:'telegram',
     landings:1,views:1,clicks:0})
 }
 const stats=summarizePublicPageTraffic(rows,period)
 assert.equal(stats.periods.yesterday[0].path,'/en/services/page-00')
 assert.equal(stats.periods.week[0].path,'/en/services/page-00')
 const message=publicPageDigestLines(rows,period).join('\n')
 assert.match(message,/Вчера · топ-10 страниц по просмотрам/)
 assert.match(message,/За 7 дней · топ-10 страниц по просмотрам/)
 assert.ok(message.indexOf('page-00')<message.indexOf('page-01'))
 assert.doesNotMatch(message,/page-10|page-11/)
 assert.match(message,/Источники входов вчера: Google поиск/)
 assert.match(message,/Источники входов за 7 дней: Google поиск/)
 assert.ok(message.length<2600,message.length)
})
test('do not call lack of consent zero visits and never include private pages',()=>{
 const message=publicPageDigestLines([],period).join('\n')
 assert.match(message,/нет измеренных данных/)
 assert.match(message,/пока нет данных по добровольным посещениям/)
 assert.doesNotMatch(message,/посещений: 0/)
 const tracker=readFileSync(new URL('../components/public-page-traffic.tsx',import.meta.url),'utf8')
 const choice=readFileSync(new URL('../components/analytics-consent.tsx',import.meta.url),'utf8')
 const privacy=readFileSync(new URL('../app/privacy/page.tsx',import.meta.url),'utf8')
 const layout=readFileSync(new URL('../app/layout.tsx',import.meta.url),'utf8')
 assert.equal(existsSync(new URL('../components/first-party-stats-notice.tsx',import.meta.url)),false)
 assert.match(choice,/setFirstPartyConsent\(allow\)/)
 assert.match(choice,/allow \? "v1" : "denied"/)
 assert.match(privacy,/<FirstPartyStatsPreferences \/>/)
 assert.match(choice,/export function FirstPartyStatsPreferences\(\)/)
 assert.match(tracker,/holistic-house:public-stats-consent/)
 assert.match(tracker,/data-first-party-consent/)
 assert.doesNotMatch(layout,/FirstPartyStatsNotice|first-party-stats-notice|data-first-party-consent/)
 assert.doesNotMatch(tracker,/analytics\.google|gtag|facebook\.com\/tr/)
 assert.doesNotMatch(choice,/<aside\\b/)
})
