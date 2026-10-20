import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import {
  FREE_NARRATION_MAX_ATTEMPTS, FREE_NARRATION_MAX_AUDIO_BYTES,
  FREE_NARRATION_MAX_LEASE_MS, FREE_NARRATION_SCOPES,
  narrationVersionKey, queuedNarrationJob, claimNarrationJob,
  completeNarrationJob, failNarrationJob, revokeNarrationJob, publicNarrationStatus,
} from '../lib/clients/local-narration-queue.mjs'

const key = randomBytes(32)
const text = 'This is fictional test analysis, without real client information.'
function identity(approvedText = text, more = {}) {
  return narrationVersionKey({
    scope: 'guest-session', sourceId: 'test_report_987654321',
    locale: 'en', part: 0, approvedText, key, ...more,
  })
}
function queued() {
  const {queueKey, version} = identity()
  return queuedNarrationJob({ queueKey, version, locale: 'en', part: 0, now: 1_000,
    id: randomUUID() })
}

test('HMAC identifies an exact approved revision without disclosing text', () => {
  assert.deepEqual(identity(), identity())
  assert.notEqual(identity().queueKey, identity(text + ' revised').queueKey)
  assert.notEqual(identity().queueKey, identity(text, {locale:'ru'}).queueKey)
  assert.notEqual(identity().queueKey, identity(text, {scope:'saved-session'}).queueKey)
  assert.notEqual(identity().queueKey, identity(text, {part:1}).queueKey)
  assert.equal(Object.values(identity()).join('').includes('fictional'), false)
  assert.equal(FREE_NARRATION_SCOPES.length, 6)
})

test('browser-supplied text and invalid job identifiers cannot become a queue key', () => {
  assert.throws(() => identity(''), /LOCAL_NARRATION_INVALID/)
  assert.throws(() => identity('a'.repeat(3001)), /LOCAL_NARRATION_INVALID/)
  assert.throws(() => identity('hello\0world'), /LOCAL_NARRATION_INVALID/)
  assert.throws(() => identity(text, {locale:'es'}), /LOCAL_NARRATION_INVALID/)
  assert.throws(() => identity(text, {scope:'admin'}), /LOCAL_NARRATION_INVALID/)
  assert.throws(() => identity(text, {part:8}), /LOCAL_NARRATION_INVALID/)
  assert.throws(() => identity(text, {sourceId:'../../private'}), /LOCAL_NARRATION_INVALID/)
  assert.throws(() => narrationVersionKey({scope:'guest-session',sourceId:'test_report_123456789',
    locale:'en',part:0,approvedText:text,key:randomBytes(8)}), /LOCAL_NARRATION_INVALID/)
})

test('claim is deterministic and waits while a lease remains active', () => {
  const job = queued()
  const first = claimNarrationJob(job,{now:2_000,leaseMs:30_000})
  assert.equal(first.status,'leased')
  assert.equal(first.attempts,1)
  assert.equal(claimNarrationJob(first,{now:2_050,leaseMs:30_000}),null)
  assert.equal(first.status,'leased')
  assert.equal(claimNarrationJob(first,{now:32_001,leaseMs:30_000}).attempts,2)
  assert.throws(() => claimNarrationJob(job,{now:2_000,leaseMs:FREE_NARRATION_MAX_LEASE_MS+1}),
    /LOCAL_NARRATION_INVALID/)
})

test('only the correct current lease may complete a bounded audio object', () => {
  const job = claimNarrationJob(queued(),{now:2_000,leaseMs:30_000})
  const params={now:3_000,mime:'audio/mpeg',bytes:100_000,sha256:'a'.repeat(64),
    assetPath:`narration/${job.id}/${'b'.repeat(64)}.mp3`}
  assert.equal(completeNarrationJob(job,{...params,leaseId:randomUUID()}),null)
  assert.equal(completeNarrationJob(job,{...params,leaseId:job.leaseId,now:33_000}),null)
  assert.throws(()=>completeNarrationJob(job,{...params,leaseId:job.leaseId,
    bytes:FREE_NARRATION_MAX_AUDIO_BYTES+1}),/LOCAL_NARRATION_INVALID/)
  assert.throws(()=>completeNarrationJob(job,{...params,leaseId:job.leaseId,
    assetPath:'../../public/example.mp3'}),/LOCAL_NARRATION_INVALID/)
  assert.throws(()=>completeNarrationJob(job,{...params,leaseId:job.leaseId,
    mime:'audio/wav'}),/LOCAL_NARRATION_INVALID/)
  const done=completeNarrationJob(job,{...params,leaseId:job.leaseId})
  assert.equal(done.status,'ready')
  assert.equal(done.leaseId,null)
  assert.equal(claimNarrationJob(done,{now:4_000,leaseMs:30_000}),null)
  assert.equal(completeNarrationJob(done,{...params,leaseId:job.leaseId}),null)
})

test('transient failure uses bounded retries and exponential cooldown', () => {
  let job=queued()
  for(let i=1;i<=FREE_NARRATION_MAX_ATTEMPTS;i++) {
    const now=job.nextAttemptAt + 1
    const claimed=claimNarrationJob(job,{now,leaseMs:20_000})
    assert.equal(claimed.attempts,i)
    assert.equal(failNarrationJob(claimed,{now:now+100,leaseId:randomUUID()}),null)
    job=failNarrationJob(claimed,{now:now+100,leaseId:claimed.leaseId})
    if(i<FREE_NARRATION_MAX_ATTEMPTS) {
      assert.equal(job.status,'retry_wait')
      assert.equal(claimNarrationJob(job,{now:now+200,leaseMs:20_000}),null)
    }
  }
  assert.equal(job.status,'failed')
  assert.equal(claimNarrationJob(job,{now:999_999_999,leaseMs:20_000}),null)
})

test('revocation erases ready audio reference and blocks new claims', () => {
  const job=claimNarrationJob(queued(),{now:2_000,leaseMs:30_000})
  const revoked=revokeNarrationJob(job)
  assert.equal(revoked.status,'revoked')
  assert.equal(revoked.audio,null)
  assert.equal(claimNarrationJob(revoked,{now:3000,leaseMs:30_000}),null)
  assert.equal(failNarrationJob(revoked,{now:3_000,leaseId:job.leaseId}),null)
})

test('public job projection cannot leak hashes, storage path or lease', () => {
  const job=claimNarrationJob(queued(),{now:2_000,leaseMs:30_000})
  assert.deepEqual(publicNarrationStatus(job),{status:'processing',part:0,locale:'en'})
  assert.deepEqual(Object.keys(publicNarrationStatus(queued())).sort(),['locale','part','status'])
  assert.equal(JSON.stringify(publicNarrationStatus(job)).includes(job.queueKey),false)
  assert.equal(JSON.stringify(publicNarrationStatus(job)).includes(job.leaseId),false)
})

test('queue foundation does not open a public HTTP route, charge money or publish media', () => {
  const job=queued()
  assert.equal(Object.hasOwn(job,'text'),false)
  assert.equal(Object.hasOwn(job,'clientId'),false)
  assert.equal(Object.hasOwn(job,'secret'),false)
})
