import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

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

function verifyRouteGuard(script) {
 const source=ts.createSourceFile('verify-assessment-primary-browser.mjs',script,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS)
 assert.equal(source.parseDiagnostics.length,0)
 const routes=[]
 function visit(node){
  if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='route')routes.push(node)
  ts.forEachChild(node,visit)
 }
 visit(source)
 assert.equal(routes.length,1,'Exactly one offline request gate')
 assert.equal(routes[0].arguments[0].text,'**/*','Guard every browser request')
 const fixtureUrl='file:///synthetic/react-browser-fixture.html',unexpectedRequests=[]
 const callback=runInNewContext('('+routes[0].arguments[1].getText(source)+')',{fixtureUrl,unexpectedRequests})
 for(const url of [fixtureUrl,fixtureUrl+'?extra=1','file:///synthetic/other.html','https://example.invalid/fixture','http://localhost:3000/api/client','https://untrusted.invalid/']){
  const calls=[]
  callback({request:()=>({url:()=>url}),abort:()=>calls.push('abort'),continue:()=>calls.push('continue')})
  assert.deepEqual(calls,[url===fixtureUrl?'continue':'abort'],'Exact fixture-only network policy: '+url)
 }
 assert.equal(unexpectedRequests.length,5,'Every rejected request is fatal evidence, not silently ignored')
}

test('actual browser route callback admits only its one file and rejects all network/other-file requests',()=>{
 verifyRouteGuard(read('scripts/verify-assessment-primary-browser.mjs'))
})

for(const [label,before,after] of [
 ['missing abort',"return route.abort()","return route.continue()"],
 ['silenced request evidence',"unexpectedRequests.push(url)","void url"],
 ['allowing other files',"url!==fixtureUrl","!url.startsWith('file:')"],
])test('negative route control rejects '+label,()=>{
 const script=read('scripts/verify-assessment-primary-browser.mjs')
 assert.equal(script.split(before).length,2,'Unique source mutation')
 assert.throws(()=>verifyRouteGuard(script.replace(before,after)),assert.AssertionError)
})

test('browser still requires genuine keyboard, visibility, source deduplication and fatal error evidence',()=>{
 const script=read('scripts/verify-assessment-primary-browser.mjs')
 for(const required of [
  "primary.length===1",
  "!primary[0].closest('details')",
  "primary[0].getClientRects().length>0",
  "!details.textContent.includes(expected)",
  "section.steps.every(step=>panel.textContent.includes(step))",
  "document.querySelectorAll('a[href=\"'+section.source+'\"]').length===1",
  "await page.keyboard.press('Enter')",
  "keyboardOpen&&initialVisible&&changedVisible",
  "if(!passed)throw Error('Keyboard/source acceptance failed for '+locale)",
  "result.passed=result.passed&&!unexpectedRequests.length&&!consoleErrors.length",
  "process.exitCode = 1",
 ])assert.ok(script.includes(required),'Preserve '+required)
 assert.doesNotMatch(script,/force:\s*true|catch\s*\([^)]*\)\s*\{\s*return\s+true/)
})
