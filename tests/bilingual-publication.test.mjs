import test from 'node:test'
import assert from 'node:assert/strict'
import * as policy from '../scripts/video-publish/bilingual-publication.mjs'
const job = (language = 'en') => ({
  masterKey: `home:${language}`, language, scope: 'public', approval: 'approved',
  title: language === 'en' ? 'Holistic House' : 'Холистический дом', description: 'Approved description',
})
const channel = { brandId: '7153286', channelId: 'UCjWq6NHZTQkUr3bC3WbXXcw' }
test('both approved languages resolve to the owner-selected channel and existing masters', () => {
  assert.equal(typeof policy.planPublication, 'function', 'bilingual publication policy is implemented')
  for (const language of ['en', 'ru']) {
    const plan = policy.planPublication(job(language), channel)
    assert.equal(plan.channelId, channel.channelId)
    assert.equal(plan.channelHandle, '@shamanic_academy')
    assert.equal(plan.language, language)
    assert.equal(plan.action, 'schedule')
    assert.ok(plan.driveFileId)
    assert.match(plan.sha256, /^[a-f0-9]{64}$/)
  }
})
test('client, unapproved, unknown and language-mismatched content is rejected', () => {
  for (const extra of [{scope:'private'}, {clientId:'client'}, {followUpId:'followup'}, {approval:'draft'}, {masterKey:'unknown:en'}, {language:'de'}, {language:'ru'}]) {
    assert.throws(() => policy.planPublication({...job(), ...extra}, channel))
  }
  assert.throws(() => policy.planPublication(job(), {...channel, channelId:'wrong'}))
})
test('durable checkpoints prohibit blind repeats and bind master, locale and channel', () => {
  const plan = policy.planPublication(job(), channel)
  for (const state of ['submission-intent','uncertain','failed']) {
    assert.equal(policy.planPublication(job(), channel, {...plan, state}).action, 'reconcile')
  }
  assert.equal(policy.planPublication(job(), channel, {...plan, state:'scheduled', metricoolUuid:'uuid'}).action, 'wait')
  assert.equal(policy.planPublication(job(), channel, {...plan, state:'published', youtubeId:'Y4K4piEwwA8'}).action, 'verify-playback')
  assert.equal(policy.planPublication(job(), channel, {...plan, state:'verified', youtubeId:'Y4K4piEwwA8'}).action, 'reuse')
  for (const changed of [{sha256:'a'.repeat(64)}, {channelId:'wrong'}, {masterKey:'services:en'}, {language:'ru'}, {state:'invented'}]) {
    assert.throws(() => policy.planPublication(job(), channel, {...plan, state:'scheduled', ...changed}))
  }
})
test('Metricool request requires hash-verified existing media, future date and exact safety settings', () => {
  const plan = policy.planPublication(job(), channel)
  const media = {url:'https://files2.heygen.ai/master.mp4?Expires=1', sha256:plan.sha256}
  const request = policy.buildMetricoolRequest(plan, media, '2030-01-01T12:00:00-05:00', Date.parse('2026-10-02T00:00:00Z'))
  assert.equal(request.blogId, '7153286')
  const body = JSON.parse(request.info)
  assert.equal(body.publicationDate.timezone, 'America/Toronto')
  assert.equal(body.publicationDate.dateTime, '2030-01-01T12:00:00')
  assert.deepEqual(body.providers, [{network:'youtube'}])
  assert.equal(body.saveExternalMediaFiles, true)
  assert.equal(body.youtubeData.privacy, 'unlisted')
  assert.equal(body.youtubeData.madeForKids, false)
  assert.equal(body.youtubeData.isAiGeneratedContent, true)
  assert.equal(body.youtubeData.notifySubscribers, false)
  for (const invalid of [{...media,sha256:'wrong'}, {...media,url:'https://evil.example/video.mp4'}, {...media,url:'https://user:pass@files2.heygen.ai/video.mp4'}]) {
    assert.throws(() => policy.buildMetricoolRequest(plan, invalid, request.date, 0))
  }
  assert.throws(() => policy.buildMetricoolRequest(plan, media, '2020-01-01T00:00:00-05:00'))
  assert.throws(() => policy.buildMetricoolRequest({...plan,action:'reuse'}, media, request.date, 0))
  assert.throws(() => policy.buildMetricoolRequest(plan, media, '2030-07-01T12:00:00-05:00', 0))
  assert.throws(() => policy.buildMetricoolRequest({...plan,language:'ru'}, media, request.date, 0))
})
