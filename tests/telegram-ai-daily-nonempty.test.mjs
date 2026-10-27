import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
test('verified daily public HTML report survives Gemini and Mistral outages without fabricated reviews',()=>{
 const source=readFileSync(new URL('../lib/practitioners/council-telegram-delivery.js',import.meta.url),'utf8')
 assert.ok(source.includes("status:'model_setup_required'"))
 assert.ok(!source.includes("status:'model_responses_unavailable'"))
 assert.ok(source.includes(".filter(entry=>entry.chatgpt||entry.council)"))
 assert.ok(source.includes('councilReview=composeDailyCouncilTelegram(report,reviews)'))
 assert.ok(source.includes('modelSettings(aiEnv)'))
 assert.ok(source.includes('await reviewDailyCouncil(report,aiEnv,fetcher)'))
 assert.ok(source.includes('if(entry.council){'))
 assert.ok(source.includes('sendOwnerDocument({'))
 assert.ok(source.includes("if(!reports.length&&!modelsReady)"))
 assert.ok(source.includes('fetchPublicDailyArchives({'))
 assert.ok(source.includes('composeChatgptTelegramReport(entry.chatgpt,'))
 const archiveReadAt=source.indexOf('fetchPublicDailyArchives({')
 const modelGateAt=source.indexOf("status:'model_setup_required'")
 assert.ok(archiveReadAt>=0&&modelGateAt>archiveReadAt)
})

test('missed Toronto days recover at most two sends, without fresh AI calls for old reports',()=>{
 const code=readFileSync(new URL('../lib/practitioners/council-telegram-delivery.js',import.meta.url),'utf8')
 assert.ok(code.includes('if(acceptedCount>=2)break'))
 assert.ok(code.includes('acceptedDates.push(entry.date)'))
 assert.ok(code.includes('entry.date===dates.today'))
 assert.ok(code.includes("reason:'HISTORICAL_BACKFILL_NO_INFERENCE'"))
 assert.ok(code.includes("status:'partially_accepted'"))
 assert.ok(code.includes('saveModelReport(config,entry.date,claimed.id,composed)'))
 assert.ok(code.includes('if(!claimed){previouslySent++;continue}'))
 const route=readFileSync(new URL('../app/api/internal/council-archive-telegram/route.js',import.meta.url),'utf8')
 assert.match(route,/export const maxDuration=120/)
 const schedule=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'))
 assert.deepEqual(schedule.crons.filter(x=>x.path.includes('council-archive-telegram')),
   [{path:'/api/internal/council-archive-telegram',schedule:'0 16,17 * * *'}])
})
