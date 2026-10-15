import assert from 'node:assert/strict'
import test from 'node:test'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { EventEmitter } from 'node:events'
if (!process.execArgv.includes('--conditions=react-server')) {
  test('notification transport server suite', () => {
    const run = spawnSync(process.execPath, ['--conditions=react-server', '--test', fileURLToPath(import.meta.url)], { encoding: 'utf8' })
    assert.equal(run.status, 0, run.stdout + run.stderr)
  })
} else {
  const { createWebPushTransport, isPublicPushAddress, resolvePushAddress } = await import('../lib/notifications/transport.js')
  const config = { deliveryEnabled: true, publicKey: 'synthetic-public', privateKey: 'synthetic-private', subject: 'mailto:test@example.test' }
  const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/synthetic', keys: { p256dh: Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 1)]).toString('base64url'), auth: Buffer.alloc(16, 1).toString('base64url') } }
  function fixture({ addresses = [{ address: '8.8.8.8', family: 4 }], status = 201, hanging = false, clock } = {}) {
    const requests = [], generated = []
    return { requests, generated, transport: createWebPushTransport(config, {
      lookup: async () => addresses, timeoutMs: 10, ...(clock ? { clock } : {}),
      generateRequestDetails(input, payload, options) { generated.push({ input, payload, options }); return { endpoint: input.endpoint, method: 'POST', headers: { TTL: String(options.TTL) }, body: Buffer.from('synthetic-encrypted-fixture') } },
      request(options, onResponse) {
        requests.push(options)
        const request = new EventEmitter()
        request.destroy = () => request.emit('error', new Error('synthetic network interruption'))
        request.end = () => { if (!hanging) process.nextTick(() => onResponse({ statusCode: status, headers: { location: 'http://127.0.0.1/forbidden' }, resume() {}, destroy() {} })) }
        return request
      },
    }) }
  }
  test('SSRF address checks reject private/reserved/transition ranges', () => {
    for (const value of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '192.0.2.1', '198.51.100.1', '203.0.113.1', '::1', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1', '2001:db8::1', '2001:0002::1', '2002:7f00:1::', '3fff::1']) assert.equal(isPublicPushAddress(value), false, value)
    assert.equal(isPublicPushAddress('8.8.8.8'), true)
    assert.equal(isPublicPushAddress('2607:f8b0:4001::1'), true)
  })
  test('mixed public/private DNS answers fail closed', async () => {
    await assert.rejects(() => resolvePushAddress('fcm.googleapis.com', async () => [{ address: '8.8.8.8', family: 4 }, { address: '127.0.0.1', family: 4 }]), /PUSH_ENDPOINT_BLOCKED/)
  })
  test('transport pins validated DNS, keeps TLS hostname checks, and never follows redirects', async () => {
    const value = fixture({ status: 307 })
    const response = await value.transport.send(subscription, { version: 1 }, { ttlSeconds: 300 })
    assert.equal(response.statusCode, 307); assert.equal(value.requests.length, 1)
    const options = value.requests[0]
    assert.equal(options.hostname, 'fcm.googleapis.com'); assert.equal(options.servername, 'fcm.googleapis.com')
    assert.equal(options.rejectUnauthorized, true); assert.equal(options.agent, false); assert.equal(options.port, 443)
    options.lookup('ignored', {}, (_error, address, family) => { assert.equal(address, '8.8.8.8'); assert.equal(family, 4) })
    assert.equal(value.generated[0].options.contentEncoding, 'aes128gcm')
    assert.equal(value.generated[0].options.urgency, 'low')
  })
  test('arbitrary and private DNS destinations cannot start an outbound request', async () => {
    const value = fixture({ addresses: [{ address: '127.0.0.1', family: 4 }] })
    await assert.rejects(() => value.transport.send(subscription, {}, { ttlSeconds: 300 }))
    await assert.rejects(() => value.transport.send({ ...subscription, endpoint: 'https://evil.test/push' }, {}, { ttlSeconds: 300 }))
    assert.equal(value.requests.length, 0)
  })
  test('network timeout is unknown, not safe to resend and not delivered', async () => {
    const value = fixture({ hanging: true })
    assert.equal((await value.transport.send(subscription, {}, { ttlSeconds: 300 })).outcome, 'unknown')
    assert.equal(value.requests.length, 1)
  })
  test('expired browser subscription is revoked without DNS or network', async () => {
    const value = fixture()
    assert.equal((await value.transport.send({ ...subscription, expirationTime: 1 }, {}, { ttlSeconds: 300 })).statusCode, 410)
    assert.equal(value.requests.length, 0)
  })
  test('deadline that expires during preparation cannot initiate a push', async () => {
    const value = fixture({ clock: () => new Date('2026-10-13T14:00:05Z').getTime() })
    assert.equal((await value.transport.send(subscription, {}, { ttlSeconds: 3, notAfter: '2026-10-13T14:00:03Z' })).outcome, 'expired')
    assert.equal(value.requests.length, 0)
  })
  test('disabled transport never resolves DNS or invokes encryption', async () => {
    const transport = createWebPushTransport({ ...config, deliveryEnabled: false }, { lookup() { throw new Error('no lookup allowed') } })
    await assert.rejects(() => transport.send(subscription, {}, { ttlSeconds: 300 }), /PUSH_DELIVERY_DISABLED/)
  })
}
