import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {practiceTelegramRecentAudio} from '../lib/practitioners/practice-telegram-recent-audio.mjs'

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const practice=source('components/app/practice-materials.jsx')
const recent=source('components/app/practice-telegram-audio.jsx')
const bridge=source('lib/practitioners/practice-telegram-auth-fetch.mjs')
const css=source('components/app/practice-telegram-audio.module.css')
const route=source('app/api/admin/materials/telegram/route.js')
const media=source('app/api/admin/materials/telegram/file/[id]/route.js')
const service=source('lib/practitioners/owner-telegram-audio-service.js')
const one='550e8400-e29b-41d4-a716-446655440000'
const two='550e8400-e29b-41d4-a716-446655440001'
const three='550e8400-e29b-41d4-a716-446655440002'
const row=(id,date,extra={})=>({id,title:'Meditation '+id,received_at:date,folder:'inbox',...extra})

test('last Telegram recordings are newest-first, filtered, capped and deduplicated',()=>{
 const rows=[
  row(one,'2026-10-25T08:00:00Z'),
  row(two,'2026-10-26T09:00:00Z',{title:'Calm meditation'}),
  row(two,'2026-10-26T09:00:00Z',{title:'duplicate'}),
  row(three,'2026-10-26T10:00:00Z',{title:'temporary part',combine_batch_id:one}),
  row(three,'2026-10-26T11:00:00Z',{title:'failed import',status:'failed'}),
  row('../public','2026-10-26T11:00:00Z'),
  row(three,'2026-10-26T12:00:00Z',{title:'Finished merge'}),
 ]
 assert.deepEqual(practiceTelegramRecentAudio(rows).map(item=>item.id),[three,two,one])
 assert.deepEqual(practiceTelegramRecentAudio(rows,'calm').map(item=>item.id),[two])
 assert.equal(practiceTelegramRecentAudio(rows,'meditation',1).length,1)
 assert.deepEqual(practiceTelegramRecentAudio(null),[])
})

test('owner-only Practice > Materials > Audio reuses the existing private backend',()=>{
 assert.match(practice,/import PracticeTelegramAudio from '\.\/practice-telegram-audio'/)
 assert.match(practice,/tab==='audio'&&isOwner\?<section/)
 assert.match(practice,/<PracticeTelegramAudio locale=\{locale\} query=\{query\}\/>/)
 assert.match(recent,/fetchPracticeTelegramAudio\(fetch,controller.signal\)/)
 assert.match(bridge,/const listPath='\/api\/admin\/materials\/telegram'/)
 assert.match(bridge,/credentials:'same-origin',cache:'no-store'/)
 assert.match(bridge,/destination:'materials'/)
 assert.match(route,/ownerMaterialRequest\(request/)
 assert.match(media,/ownerMaterialRequest\(request/)
 assert.match(service,/status='ready' and combine_batch_id is null/)
 assert.doesNotMatch(recent,/getPublicUrl|createSignedUrl|service_role|storage_path/)
 assert.match(recent,/<Link href="\/admin\/materials\/telegram"/)
 assert.doesNotMatch(recent,/<a href="\/admin\/materials\/telegram"/)
})

test('each file has single-gesture Play/Pause and authenticated Range-capable native audio',()=>{
 assert.match(recent,/data-practice-telegram-play=\{file\.id\}/)
 assert.match(recent,/player\.play\(\)/)
 assert.match(recent,/other\.pause\(\)/)
 assert.match(recent,/preload="none" src=\{mediaPath\}/)
 assert.match(recent,/controls=\{isPlaying\}/)
 assert.match(recent,/data-practice-telegram-refresh/)
 assert.match(recent,/data-practice-telegram-dot/)
 assert.match(recent,/href="https:\/\/t.me\/Andydotbot"/)
 assert.match(recent,/visibilitychange/)
 assert.match(recent,/aria-label=\{\(isPlaying\?t\.pause:t\.play\)/)
 assert.match(recent,/const COPY=/)
 for(const language of ['en:','ru:','es:'])assert.ok(recent.includes(language))
 assert.match(css,/@media\(max-width:430px\)/)
 assert.match(css,/@media\(max-width:350px\)/)
 assert.match(css,/\.player\[hidden\]/)
})
