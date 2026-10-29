import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync(new URL('../scripts/verify-app-r1.mjs', import.meta.url), 'utf8')
const helper = readFileSync(new URL('../scripts/helpers/browser-failure-evidence.mjs', import.meta.url), 'utf8')
const parse = text => ts.createSourceFile('source.mjs', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
const visit = (node, predicate) => {
 const result = []
 const walk = value => { if (predicate(value)) result.push(value); ts.forEachChild(value, walk) }
 walk(node)
 return result
}
const file = parse(source)
const functions = file.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === 'verifyPublicServiceConversionJourneys')
assert.equal(functions.length, 1)
const journey = functions[0]
const catches = visit(journey, node => ts.isCatchClause(node) && node.getText(file).includes("'/failure-public-service-synthetic-only.png'"))
const boundedNode = parse(helper).statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'boundedBestEffort')
assert.ok(boundedNode)
const boundedText = boundedNode.getText(parse(helper)).replace(/^export\s+/, '')
const actualBounded = new Function(`return (${boundedText})`)()
const primary = Object.freeze(Object.defineProperties({}, {
 message: { get() { throw new Error('must not inspect failure text') } },
 stack: { get() { throw new Error('must not inspect failure stack') } },
}))
const filename = 'artifacts/app-r1/failure-public-service-synthetic-only.png'
const origin = 'http://127.0.0.1:3100'
const path = '/en/services/dao-health-profile'
const catchOnly = catches.length === 1
 ? new Function('servicePage', 'origin', 'locale', 'slug', 'output', 'boundedBestEffort', 'primary',
   `return (async()=>{try {throw primary} ${catches[0].getText(file)}})()`)
 : async (...args) => { throw args.at(-1) }
async function exercise({base = origin, locale = 'en', slug = 'dao-health-profile', url = base+'/'+locale+'/services/'+slug, screenshot, urlError, bounded = actualBounded} = {}) {
 const calls = []
 const owned = {
  url() { if (urlError) throw urlError; return url },
  async screenshot(options) { calls.push(options); return screenshot?.(options) },
 }
 await assert.rejects(catchOnly(owned, base, locale, slug, 'artifacts/app-r1', bounded, primary), error => error === primary)
 return calls
}

test('actual conversion function captures its owned page after first assertion fails', async () => {
 const calls = []
 const owned = {
  on() {}, async setViewportSize() {}, async goto() {}, locator() { return {} },
  url() { return origin+path },
  async screenshot(options) { calls.push(options) },
  async close() { throw new Error('failure is still cleaned by original outer browser finally') },
 }
 const browser = { async newContext() { return { async newPage() { return owned } } } }
 const expect = () => ({ async toBeVisible() { throw primary }, async toHaveCount() { throw primary } })
 const invoke = new Function('browser','expect','origin','output','boundedBestEffort',`return (${journey.getText(file)})()`)
 await assert.rejects(invoke(browser,expect,origin,'artifacts/app-r1',actualBounded), error => error === primary)
 assert.deepEqual(calls,[{path:filename,fullPage:false,timeout:5000}])
})
test('all six exact isolated routes capture only the constant viewport artifact', async () => {
 for (const locale of ['en','ru']) for (const slug of ['dao-health-profile','alchemy-of-soul','hypnotherapy-course']) {
  assert.deepEqual(await exercise({locale,slug}),[{path:filename,fullPage:false,timeout:5000}])
 }
 assert.equal((await exercise({base:'http://localhost:3100'})).length,1)
})
test('production, alternate origin, redirects, queries, fragments and nonallowlisted routes never capture', async () => {
 for (const base of ['https://holistichouse.vercel.app','http://example.invalid:3100','https://127.0.0.1:3100','http://127.0.0.1','http://127.0.0.1:3100/']) assert.deepEqual(await exercise({base}),[])
 for (const url of [origin+path+'?x=synthetic',origin+path+'?',origin+path+'#x',origin+path+'#',origin+path+'/',origin+'/en/app',origin+'/en/client/synthetic',origin+'/es/services/dao-health-profile','http://localhost:3100'+path,'http://127.0.0.1:3101'+path,'about:blank','not a URL']) assert.deepEqual(await exercise({url}),[])
 assert.deepEqual(await exercise({locale:'es'}),[])
 assert.deepEqual(await exercise({slug:'free-situation-review'}),[])
})
test('screenshot failure and URL-read failure preserve the original error object', async () => {
 assert.equal((await exercise({screenshot:async()=>{throw new Error('synthetic screenshot failure')}})).length,1)
 assert.deepEqual(await exercise({urlError:new Error('synthetic page unavailable')}),[])
})
test('actual bounded evidence timeout never masks the original assertion failure', async () => {
 let timerDelay
 const bounded = new Function('setTimeout','clearTimeout',`return (${boundedText})`)((callback, delay)=>{timerDelay=delay;queueMicrotask(callback);return 1},()=>{})
 const calls=await exercise({screenshot:()=>new Promise(()=>{}),bounded})
 assert.equal(calls.length,1)
 assert.equal(timerDelay,5000)
})
test('capture is live inside service width-loop failure path without changing assertions or outer cleanup', () => {
 assert.equal(catches.length,1)
 const guarded=catches[0].parent
 assert.ok(ts.isTryStatement(guarded))
 const widthLoops=guarded.tryBlock.statements.filter(ts.isForOfStatement)
 assert.equal(widthLoops.length,1)
 assert.equal(widthLoops[0].initializer.getText(file),'const width')
 assert.equal(widthLoops[0].expression.getText(file),'[320,360,390,1280]')
 assert.match(widthLoops[0].getText(file),/toBeVisible\(\{timeout:30000\}\)/)
 assert.match(source,/assertIsolated\(\)/)
 assert.match(source,/await servicePage\.close\(\)/)
 assert.match(source,/boundedBestEffort\(\(\)=>browser\.close\(\)\)/)
 const capture=catches[0].getText(file)
 assert.doesNotMatch(capture,/error\.(?:message|stack)|console\.|goto\(|fetch\(|request\.|evaluate\(|setViewportSize\(/)
 assert.match(capture,/finally \{ throw error \}/)
})
