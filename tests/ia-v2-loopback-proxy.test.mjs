import assert from 'node:assert/strict'
import test from 'node:test'
import { loopbackHeaders, loopbackLocation } from '../scripts/ia-v2-loopback-proxy.mjs'

test('test edge translates only the exact browser Origin and strips untrusted forwarded headers', () => {
  const headers = loopbackHeaders({ host: '127.0.0.1:3444', origin: 'https://127.0.0.1:3444', forwarded: 'host=foreign.invalid', 'x-forwarded-host': 'foreign.invalid', 'x-forwarded-proto': 'http', 'sec-fetch-site': 'cross-site' })
  assert.equal(headers.origin, 'https://localhost:3203')
  assert.equal(headers.host, 'localhost:3203')
  assert.equal(headers['x-forwarded-host'], headers.host)
  assert.equal(headers['x-forwarded-proto'], 'https')
  assert.equal(headers['sec-fetch-site'], 'cross-site')
  assert.equal(headers.forwarded, undefined)
})
test('foreign, null and missing origins are never turned into trusted browser requests', () => {
  for (const origin of ['null', 'https://foreign.invalid', 'http://127.0.0.1:3444', 'https://127.0.0.1:3444.foreign.invalid', 'https://127.0.0.1:3444/']) {
    assert.equal(loopbackHeaders({ host: '127.0.0.1:3444', origin }).origin, origin)
  }
  assert.equal(Object.hasOwn(loopbackHeaders({ host: '127.0.0.1:3444' }), 'origin'), false)
  assert.throws(() => loopbackHeaders({ host: 'foreign.invalid', origin: 'https://127.0.0.1:3444' }))
  assert.throws(() => loopbackHeaders({ host: '127.0.0.1:3444', origin: 'https://localhost:3203' }))
})
test('test redirect translation is bounded to exact loopback origins and preserves path/query/fragment', () => {
  for (const scheme of ['http', 'https']) assert.equal(loopbackLocation(`${scheme}://localhost:3203/en/client/synthetic?mode=read#part`), 'https://127.0.0.1:3444/en/client/synthetic?mode=read#part')
  assert.equal(loopbackLocation('/en/client/synthetic'), '/en/client/synthetic')
  assert.equal(loopbackLocation('https://127.0.0.1:3444/en/client'), 'https://127.0.0.1:3444/en/client')
  for (const url of ['//foreign.invalid', '/\\foreign.invalid', 'https://localhost:3203.foreign.invalid', 'https://user:pass@localhost:3203/', 'http://foreign.invalid', 'javascript:alert(1)']) assert.throws(() => loopbackLocation(url))
})
