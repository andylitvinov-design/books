import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyOporaBlockedEndpoint as classify, createOporaGuestPreviewGuard } from '../scripts/helpers/opora-public-entry-verifier.mjs'
const origin = 'http://127.0.0.1:3100'
const candidates = [['/api/analytics/public-page', 'public_page_stat'], ['/__nextjs_original-stack-frames', 'development_stack_frames']]
test('closed endpoint aliases discard query and fragment, never bodies or headers', () => {
 for (const [path, alias] of candidates) {
  for (const suffix of ['', '?token=SECRET&redirect=https://private.invalid/patient#SECRET']) assert.equal(classify(origin + path + suffix, origin), alias)
  for (const altered of [path + '/extra', path + '/', '/prefix' + path, path.toUpperCase(), path.replace('/', '/%2f')]) assert.equal(classify(origin + altered, origin), 'unclassified')
  assert.equal(classify('https://foreign.invalid' + path, origin), 'unclassified')
  assert.equal(classify('http://name:SECRET@127.0.0.1:3100' + path, origin), 'unclassified')
 }
 for (const value of [null, undefined, 1, {}, [], Symbol('secret'), {toString(){throw Error('must not coerce')}}, 'not-url', '/api/analytics/public-page', 'x'.repeat(8193), origin + '/private/SECRET', origin + '/?path=/api/analytics/public-page']) assert.equal(classify(value, origin), 'unclassified')
 assert.equal(classify(origin + candidates[0][0], {}), 'unclassified')
})
test('all candidate POSTs still abort and fail fatally; reads still fall through', async () => {
 for (const [path, endpoint] of [...candidates, ['/private/SECRET', 'unclassified']]) {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'GET', 'HEAD']) {
   const guard = createOporaGuestPreviewGuard(origin), calls = []
   await guard.route({request:()=>({url:()=>origin+path+'?SECRET=never-log',method:()=>method,
    postData(){throw Error('body read')},headers(){throw Error('header read')}}),
    fallback:async()=>calls.push('fallback'),abort:async reason=>calls.push(reason)})
   await guard.drain()
   if (['GET','HEAD'].includes(method)) {assert.deepEqual(calls,['fallback']);guard.assertUntouched()}
   else {assert.deepEqual(calls,['blockedbyclient']);assert.deepEqual(guard.blocked,[{sameOrigin:true,method,endpoint}]);assert.throws(()=>guard.assertUntouched(), /anonymous programme preview/);assert.doesNotMatch(JSON.stringify(guard.blocked),/SECRET|private|token/)}
  }
 }
})
test('malformed URL still fails the fence handler rather than falling through', async () => {
 const guard=createOporaGuestPreviewGuard(origin)
 await guard.route({request:()=>({url:()=> 'not-url',method:()=> 'POST'}),fallback(){throw Error('unexpected')},abort(){throw Error('unexpected')}})
 await guard.drain()
 assert.throws(()=>guard.assertUntouched(), /handlers must finish without errors/)
})
