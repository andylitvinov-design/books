import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('offline primary report lifecycle uses actual evidence-status module and no client records',()=>{
 const script=read('scripts/verify-assessment-primary-browser.mjs')
 const fixture=read('scripts/fixtures/assessment-primary-report.js')
 assert.match(script,/addVirtual\('evidence-status', transpile\('lib\/assessments\/assessment-evidence-status\.js'\)\)/)
 assert.match(script,/'@\/lib\/assessments\/assessment-evidence-status': evidenceStatus/)
 assert.match(script,/window\.acceptance/)
 assert.match(script,/addVirtual\('primary-fixtures', transpile\('scripts\/fixtures\/assessment-primary-report\.js'\)\)/)
 assert.match(script,/load\('primary-fixtures'\)/)
 assert.match(fixture,/synthetic-local-fixture/)
 assert.match(script,/default-src 'none'/)
 assert.match(script,/unexpectedRequests\.push\(url\)/)
 assert.doesNotMatch(script+fixture,/https:\/\/holistichouse\.vercel\.app|service_role|client_email/)
})
