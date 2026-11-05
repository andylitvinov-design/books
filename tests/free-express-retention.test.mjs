import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  purgeExpiredFreeExpressObjects,
  FREE_EXPRESS_RETENTION_BATCH,
  FREE_EXPRESS_RETENTION_PAGE,
} from '../lib/practitioners/free-express-retention.mjs'

const NOW = Date.parse('2026-10-26T12:00:00Z')
const OLD = '2026-08-01', RECENT = '2026-10-15'
const ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

// Mimic immediate-child Supabase Storage.list pages and actual deletions.
// No secrets, network, private rows or real production file paths are used.
function fakeBucket(items, { failList = false, failRemove = false } = {}) {
  const keys = new Set(items), calls = [], removals = []
  return {
    keys, calls, removals,
    async list(prefix, options) {
      calls.push({ prefix, ...options })
      if (failList) return { error: Error('synthetic listing failure'), data: null }
      const names = [...new Set([...keys]
        .filter(key => key.startsWith(prefix + '/'))
        .map(key => key.slice(prefix.length + 1).split('/')[0]))].sort()
      return {
        data: names.slice(options.offset, options.offset + options.limit).map(name => ({ name })),
        error: null,
      }
    },
    async remove(paths) {
      removals.push(...paths)
      if (failRemove) return { error: Error('synthetic delete failure') }
      for (const path of paths) keys.delete(path)
      return { error: null }
    },
  }
}

test('private 31-day retention removes only controlled images, never recent or unrelated files', async () => {
  const keys = [
    'free-express/' + OLD + '/' + ID + '/portrait.jpg',
    'free-express/' + OLD + '/' + ID + '/drawing.jpg',
    'free-express/' + OLD + '/' + ID + '/notes.pdf',
    'free-express/' + RECENT + '/' + ID + '/portrait.jpg',
    'free-express/not-a-date/' + ID + '/drawing.jpg',
    'other/' + OLD + '/' + ID + '/portrait.jpg',
  ]
  const bucket = fakeBucket(keys)
  assert.equal(await purgeExpiredFreeExpressObjects(bucket, NOW), 2)
  assert.deepEqual(bucket.removals.sort(), [
    'free-express/' + OLD + '/' + ID + '/drawing.jpg',
    'free-express/' + OLD + '/' + ID + '/portrait.jpg',
  ])
  for (const remaining of keys.slice(2)) assert.ok(bucket.keys.has(remaining), remaining)
  assert.ok(bucket.calls.every(call => call.sortBy?.column === 'name' && call.sortBy?.order === 'asc'))
})

test('pagination scans beyond first 40 date and enquiry folders', async () => {
  const prefix = 'free-express/' + OLD
  const entries = []
  for (let i = 0; i < FREE_EXPRESS_RETENTION_PAGE; i++)
    entries.push('free-express/0000-invalid-' + String(i).padStart(2, '0') + '/junk.txt')
  for (let i = 0; i < FREE_EXPRESS_RETENTION_PAGE; i++)
    entries.push(prefix + '/000-invalid-' + String(i).padStart(2, '0') + '/note.txt')
  entries.push(prefix + '/' + ID + '/portrait.jpg')
  const bucket = fakeBucket(entries)
  assert.equal(await purgeExpiredFreeExpressObjects(bucket, NOW), 1)
  assert.ok(bucket.calls.some(call => call.prefix === 'free-express' && call.offset === FREE_EXPRESS_RETENTION_PAGE))
  assert.ok(bucket.calls.some(call => call.prefix === prefix && call.offset === FREE_EXPRESS_RETENTION_PAGE))
  assert.equal(bucket.keys.has(prefix + '/' + ID + '/portrait.jpg'), false)
})

test('deletion is limited to 20 objects per cron and unfinished objects remain for next run', async () => {
  const items = []
  for (let i = 1; i <= 25; i++) {
    const id = i.toString(16).padStart(8, '0') + '-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    items.push('free-express/' + OLD + '/' + id + '/portrait.jpg')
    items.push('free-express/' + OLD + '/' + id + '/drawing.jpg')
  }
  const bucket = fakeBucket(items)
  assert.equal(await purgeExpiredFreeExpressObjects(bucket, NOW), FREE_EXPRESS_RETENTION_BATCH)
  assert.equal(bucket.keys.size, 30)
  assert.equal(await purgeExpiredFreeExpressObjects(bucket, NOW), FREE_EXPRESS_RETENTION_BATCH)
  assert.equal(bucket.keys.size, 10)
  assert.equal(await purgeExpiredFreeExpressObjects(bucket, NOW), 10)
  assert.equal(bucket.keys.size, 0)
})

test('unreadable listings, deletion failures and scan cap are explicit, not a silent success', async () => {
  await assert.rejects(
    purgeExpiredFreeExpressObjects(fakeBucket([], { failList: true }), NOW),
    /FREE_EXPRESS_RETENTION_LIST_FAILED/,
  )
  await assert.rejects(
    purgeExpiredFreeExpressObjects(fakeBucket([
      'free-express/' + OLD + '/' + ID + '/drawing.jpg',
    ], { failRemove: true }), NOW),
    /FREE_EXPRESS_RETENTION_DELETE_FAILED/,
  )
  const backlog = []
  for (let i = 0; i < 70; i++) {
    const date = new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10)
    backlog.push('free-express/' + date + '/junk.txt')
  }
  await assert.rejects(
    purgeExpiredFreeExpressObjects(fakeBucket(backlog), NOW),
    /FREE_EXPRESS_RETENTION_SCAN_LIMIT/,
  )
})

test('actual housekeeping keeps private bucket, flag-independent cleanup and safe aggregate logging', () => {
  const media = source('lib/practitioners/free-express-media.js')
  const cron = source('app/api/internal/housekeeping/route.js')
  const helper = source('lib/practitioners/free-express-retention.mjs')
  assert.match(media, /data\.public !== false/)
  assert.match(media, /purgeExpiredFreeExpressObjects\(bucket, now\)/)
  assert.match(media, /HH_FREE_EXPRESS_MEDIA_RETENTION_RETRY/)
  assert.match(cron, /purgeExpiredFreeExpressMedia\(config\)/)
  assert.doesNotMatch(cron, /HH_FREE_EXPRESS_V2_ENABLED/)
  assert.doesNotMatch(helper, /getAppConfig|from app\.|select \*|fetch\(|console\.log\(/)
})


test('deleting the first folder cannot shift later folder pages and skip the 41st enquiry', async () => {
  const prefix = 'free-express/' + OLD
  const entries = []
  for (let i = 0; i <= FREE_EXPRESS_RETENTION_PAGE; i++) {
    const id = i.toString(16).padStart(8, '0') + '-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    entries.push(prefix + '/' + id + '/' + (
      i === 0 ? 'portrait.jpg' : i === FREE_EXPRESS_RETENTION_PAGE ? 'drawing.jpg' : 'notes.pdf'
    ))
  }
  const bucket = fakeBucket(entries)
  assert.equal(await purgeExpiredFreeExpressObjects(bucket, NOW), 2)
  assert.ok(bucket.calls.some(call => call.prefix === prefix && call.offset === FREE_EXPRESS_RETENTION_PAGE),
    'the final 41st folder must be visited before any deletion changes the list')
  assert.equal(bucket.removals.length, 2)
  assert.equal(bucket.keys.size, entries.length - 2)
  assert.ok(bucket.keys.has(entries[1]))
})

test('controlled photos are discovered after 40 unexpected file names without deleting those files', async () => {
  const prefix = 'free-express/' + OLD + '/' + ID
  const files = Array.from({ length: FREE_EXPRESS_RETENTION_PAGE },
    (_, i) => prefix + '/00-other-' + String(i).padStart(2, '0') + '.bin')
  const bucket = fakeBucket([...files, prefix + '/portrait.jpg', prefix + '/drawing.jpg'])
  assert.equal(await purgeExpiredFreeExpressObjects(bucket, NOW), 2)
  assert.ok(bucket.calls.some(call => call.prefix === prefix && call.offset === FREE_EXPRESS_RETENTION_PAGE))
  assert.ok(files.every(path => bucket.keys.has(path)))
  assert.deepEqual(bucket.removals.sort(), [prefix + '/drawing.jpg', prefix + '/portrait.jpg'])
})

test('a traversal error never permits partial deletion, even when earlier candidates were found', async () => {
  const items = []
  for (let i = 0; i < 70; i++) {
    const day = new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10)
    items.push('free-express/' + day + '/' + (i === 0 ? ID + '/portrait.jpg' : 'some-other-file.bin'))
  }
  const bucket = fakeBucket(items)
  await assert.rejects(purgeExpiredFreeExpressObjects(bucket, NOW), /FREE_EXPRESS_RETENTION_SCAN_LIMIT/)
  assert.equal(bucket.removals.length, 0, 'no partial delete before a complete bounded scan')
  assert.equal(bucket.keys.size, items.length)
})
