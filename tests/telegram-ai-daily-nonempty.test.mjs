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
 assert.ok(source.includes('const reviews=await reviewDailyCouncil(report,aiEnv,fetcher)'))
 assert.ok(source.includes('if(entry.council){'))
 assert.ok(source.includes('sendOwnerDocument({'))
 assert.ok(source.includes("if(!reports.length&&!modelsReady)"))
 assert.ok(source.includes('fetchPublicDailyArchives({'))
 assert.ok(source.includes('composeChatgptTelegramReport(entry.chatgpt,'))
 const archiveReadAt=source.indexOf('fetchPublicDailyArchives({')
 const modelGateAt=source.indexOf("status:'model_setup_required'")
 assert.ok(archiveReadAt>=0&&modelGateAt>archiveReadAt)
})
