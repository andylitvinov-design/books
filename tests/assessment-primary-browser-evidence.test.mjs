import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('offline primary report lifecycle uses actual evidence-status module and no client records',()=>{
 const script=read('scripts/verify-assessment-primary-browser.mjs')
 assert.match(script,/addVirtual\('evidence-status', transpile\('lib\/assessments\/assessment-evidence-status\.js'\)\)/)
 assert.match(script,/'@\/lib\/assessments\/assessment-evidence-status': evidenceStatus/)
 assert.match(script,/window\.acceptance/)
 assert.match(script,/synthetic-local-fixture/)
 assert.match(script,/default-src 'none'/)
 assert.match(script,/unexpectedRequests\.push\(url\)/)
 assert.doesNotMatch(script,/https:\/\/holistichouse\.vercel\.app|service_role|client_email/)
})
