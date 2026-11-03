import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
test('synthetic app, mutation and auth-provider origins share one loopback cookie hostname',()=>{
 const source=readFileSync(new URL('../.github/workflows/hh-app-browser.yml',import.meta.url),'utf8')
 const names=['HH_APP_SUPABASE_URL','HH_APP_ALLOWED_ORIGINS','HH_TEST_APP_ORIGIN']
 const urls=names.map(name=>new URL(source.match(new RegExp(name+': (http[^\\s]+)'))[1]))
 assert.deepEqual(urls.map(url=>url.hostname),['localhost','localhost','localhost'])
 assert.equal(urls[1].origin,urls[2].origin)
 assert.equal(urls[0].port,'54329');assert.equal(urls[2].port,'3100')
 assert.match(source,/HH_APP_TEST_RUNTIME: isolated/)
})
