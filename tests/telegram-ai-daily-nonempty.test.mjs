import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
test('missing free credentials leave daily report unclaimed for later retries',()=>{
 const source=readFileSync(new URL('../lib/practitioners/council-telegram-delivery.js',import.meta.url),'utf8')
 assert.ok(source.includes("status:'model_setup_required'"))
 assert.ok(source.includes("status:'model_responses_unavailable'"))
 assert.ok(source.includes('modelSettings(env)'))
 assert.ok(source.includes("reviews.gemini.status!=='ok'"))
 assert.ok(source.includes("reviews.mistral.status!=='ok'"))
 assert.ok(source.includes('finish(config,report.date,claimed.id,false)'))
 const credentialsCheckedAt=source.indexOf("status:'model_setup_required'")
 const archiveReadAt=source.indexOf('fetchPublicCouncilReports({')
 assert.ok(credentialsCheckedAt>=0&&archiveReadAt>credentialsCheckedAt)
})
