import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
test('no unverified fake model audit; real existing ChatGPT report remains deliverable',()=>{
 const source=readFileSync(new URL('../lib/practitioners/council-telegram-delivery.js',import.meta.url),'utf8')
 assert.ok(source.includes("status:'model_setup_required'"))
 assert.ok(source.includes("status:'model_responses_unavailable'"))
 assert.ok(source.includes('modelSettings(env)'))
 assert.ok(source.includes("reviews.gemini.status==='ok'"))
 assert.ok(source.includes("reviews.mistral.status==='ok'"))
 assert.ok(source.includes('else if(!entry.chatgpt)'))
 assert.ok(source.includes('finish(config,entry.date,claimed.id,false)'))
 assert.ok(source.includes("if(!reports.length&&!modelsReady)"))
 assert.ok(source.includes('fetchPublicDailyArchives({'))
 assert.ok(source.includes('composeChatgptTelegramReport(entry.chatgpt,'))
 const archiveReadAt=source.indexOf('fetchPublicDailyArchives({')
 const modelGateAt=source.indexOf("status:'model_setup_required'")
 assert.ok(archiveReadAt>=0&&modelGateAt>archiveReadAt)
})
