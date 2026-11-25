import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {ownerAudioIdValid,ownerAudioMediaPath,ownerAudioByteRange}
  from '../lib/practitioners/owner-telegram-audio-playback.mjs'

const id='550e8400-e29b-41d4-a716-446655440000'

test('private player accepts only a UUID and an exact allowlisted object key',()=>{
  assert.equal(ownerAudioIdValid(id),true)
  assert.equal(ownerAudioIdValid('../public'),false)
  assert.equal(ownerAudioIdValid(id.toUpperCase()),false)
  assert.equal(ownerAudioMediaPath(id,'audio/ogg'),'telegram-inbox/'+id+'.ogg')
  assert.equal(ownerAudioMediaPath(id,'audio/mpeg'),'telegram-inbox/'+id+'.mp3')
  assert.equal(ownerAudioMediaPath(id,'text/html'),null)
  assert.equal(ownerAudioMediaPath('../secret','audio/ogg'),null)
})

test('iPhone-style single ranges, suffixes and HEAD metadata are correct',()=>{
  assert.deepEqual(ownerAudioByteRange(null,4438),{status:200,start:0,end:4437})
  assert.deepEqual(ownerAudioByteRange('bytes=0-1',4438),{status:206,start:0,end:1})
  assert.deepEqual(ownerAudioByteRange('bytes=50-',4438),{status:206,start:50,end:4437})
  assert.deepEqual(ownerAudioByteRange('bytes=-256',4438),{status:206,start:4182,end:4437})
  assert.deepEqual(ownerAudioByteRange('bytes=1-99999',4438),{status:206,start:1,end:4437})
  for(const input of ['bytes=4438-','bytes=10-9','bytes=-0','bytes=0-1,10-20','bytes=','items=0-2','bytes=-9007199254740999'])
    assert.equal(ownerAudioByteRange(input,4438),null,input)
  assert.equal(ownerAudioByteRange(null,0),null)
  assert.equal(ownerAudioByteRange(null,20_000_001),null)
})

test('media can never be served without fresh owner auth and no-store headers',()=>{
  const route=readFileSync(new URL('../app/api/admin/materials/telegram/file/[id]/route.js',import.meta.url),'utf8')
  const service=readFileSync(new URL('../lib/practitioners/owner-telegram-audio-service.js',import.meta.url),'utf8')
  const ui=readFileSync(new URL('../components/admin-telegram-audio.jsx',import.meta.url),'utf8')
  assert.match(route,/ownerMaterialRequest\(request/)
  assert.match(route,/serve as GET,serve as HEAD/)
  assert.match(service,/where id=\$1 and practitioner_id=\$2 and status='ready'/)
  assert.match(service,/storage_path/)
  assert.match(service,/ownerAudioMediaPath\(row.id,row.mime\)/)
  assert.match(service,/checkedAudioStorage\(config\)/)
  assert.match(service,/\.download\(expectedPath\)/)
  assert.match(service,/private, no-store/)
  assert.match(service,/same-origin/)
  assert.match(service,/Content-Range/)
  assert.doesNotMatch(service,/getPublicUrl\(/)
  assert.match(ui,/<audio controls preload="none"/)
  assert.doesNotMatch(ui,/createSignedUrl/)
})
