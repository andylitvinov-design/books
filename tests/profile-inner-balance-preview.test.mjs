import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('My Context embeds the client-owned eight-axis balance without provider grant side effects',()=>{
 const context=read('components/app/my-coach-context.jsx')
 const preview=read('components/app/my-inner-balance-preview.jsx')
 assert.match(context, /!contextSessionToken&&<MyInnerBalancePreview/)
 assert.match(preview,/appFetch\('development-goals'/)
 assert.match(preview,/normalizeDevelopmentVectors/)
 assert.match(preview,/INNER_VECTOR_ITEMS/)
 assert.match(preview,/DevelopmentVectorWheel/)
 assert.match(preview,/hh:development-vectors-saved/)
 assert.match(preview,/if\(!accountId\)return null/)
 assert.match(preview,/not automatically shared/)
 assert.doesNotMatch(preview,/coaching-context\/consent|localStorage|sessionStorage/)
})
