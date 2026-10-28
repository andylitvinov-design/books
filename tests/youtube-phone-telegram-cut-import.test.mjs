import test from 'node:test'
import assert from 'node:assert/strict'
import {validatedOwnerTelegramCut,isOwnerTelegramMp4} from '../lib/youtube/phone-upload-protocol.mjs'

test('verified private Telegram cut is an exact URL and media size',()=>{
  const id='b6e8526e-c251-4dd5-a9ca-2886c430f912'
  const cut='7798ea59-ef42-4dd4-a236-41ba9d697894'
  const selected={id,bytes:12617528,trimStartSeconds:64,
    previewUrl:'/api/admin/telegram-video/drafts/'+id+'/file?cut='+cut}
  const media=validatedOwnerTelegramCut(selected)
  assert.equal(media.startSeconds,64)
  assert.equal(media.url,selected.previewUrl)
  assert.equal(media.filename,'holistic-house-cut-64s.mp4')
  assert.throws(()=>validatedOwnerTelegramCut({...selected,bytes:50000001}))
  assert.throws(()=>validatedOwnerTelegramCut({...selected,trimStartSeconds:0}))
  const bytes=Buffer.alloc(1024)
  bytes.write('ftyp',4)
  assert.equal(isOwnerTelegramMp4(bytes,1024),true)
  assert.equal(isOwnerTelegramMp4(bytes,1025),false)
})
