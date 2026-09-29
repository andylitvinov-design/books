import assert from 'node:assert/strict'
import test from 'node:test'

import { isAllowedHeyGenUrl, normalizeHandle, normalizeJob, safeFileName } from '../scripts/video-publish/youtube-private-core.mjs'

test('accepts signed HeyGen URLs and rejects other hosts', () => {
  assert.equal(isAllowedHeyGenUrl('https://files2.heygen.ai/path/video.mp4?Signature=x'), true)
  assert.equal(isAllowedHeyGenUrl('https://resource2.heygen.ai/video/x.mp4'), true)
  assert.equal(isAllowedHeyGenUrl('http://files2.heygen.ai/video.mp4'), false)
  assert.equal(isAllowedHeyGenUrl('https://example.com/video.mp4'), false)
})

test('normalizes the expected channel handle', () => {
  assert.equal(normalizeHandle('@AATAPro'), 'aatapro')
  assert.equal(normalizeHandle('aatapro'), 'aatapro')
})

test('job is fail-closed to English private uploads', () => {
  const job = normalizeJob({
    version: 1,
    target: 'youtube-en-private',
    sourceUrl: 'https://files2.heygen.ai/video.mp4?Signature=x',
    title: 'About Holistic House',
    description: 'Test',
  })
  assert.equal(job.privacyStatus, 'private')
  assert.equal(job.language, 'en')
  assert.equal(job.containsSyntheticMedia, true)
  assert.equal(job.madeForKids, false)

  assert.throws(() => normalizeJob({ ...job, privacyStatus: 'public' }), /Only private/)
  assert.throws(() => normalizeJob({ ...job, language: 'ru' }), /restricted to English/)
  assert.throws(() => normalizeJob({ ...job, sourceUrl: 'https://example.com/video.mp4' }), /HeyGen/)
})

test('safe file names strip unsafe characters', () => {
  assert.equal(safeFileName('Hello / world?.mp4'), 'Hello-world-.mp4')
})
