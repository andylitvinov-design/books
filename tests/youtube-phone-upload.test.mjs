import test from 'node:test'
import assert from 'node:assert/strict'
import {CHUNK_BYTES, isVideoFile, titleFromFilename, uploadMetadata, nextByteOffset, verifiedSessionUrl, videoWatchUrl} from '../lib/youtube/phone-upload-protocol.mjs'

test('video selection validates MIME/extension, size and empty files', () => {
  assert.equal(isVideoFile({name:'session.mov',size:12000,type:'video/quicktime'}), true)
  assert.equal(isVideoFile({name:'clip.mp4',size:42,type:''}), true)
  assert.equal(isVideoFile({name:'secret.pdf',size:42,type:'application/pdf'}), false)
  assert.equal(isVideoFile({name:'clip.mp4',size:0,type:'video/mp4'}), false)
  assert.equal(CHUNK_BYTES % (256 * 1024), 0)
})
test('metadata defaults to unlisted and respects synthetic disclosure', () => {
  const data = uploadMetadata({title:'  Meditation video ',synthetic:true})
  assert.equal(data.snippet.title, 'Meditation video')
  assert.equal(data.snippet.categoryId, '27')
  assert.equal(data.status.privacyStatus, 'unlisted')
  assert.equal(data.snippet.defaultLanguage, 'ru')
  assert.equal(uploadMetadata({title:'Education',language:'en'}).snippet.defaultLanguage,'en')
  assert.throws(() => uploadMetadata({title:'Education',visibility:'public'}), /invalid_visibility/)
  assert.throws(() => uploadMetadata({title:'Education',visibility:'private'}), /invalid_visibility/)
  assert.throws(() => uploadMetadata({title:'Education',language:'fr'}), /invalid_language/)
  assert.equal(data.status.containsSyntheticMedia, true)
  assert.equal(data.status.selfDeclaredMadeForKids, false)
  assert.throws(() => uploadMetadata({title:'  '}), /invalid_title/)
  assert.throws(() => uploadMetadata({title:'x',visibility:'unknown'}), /invalid_visibility/)
})
test('resumable range handling never skips bytes', () => {
  assert.equal(nextByteOffset(null, 10000), 0)
  assert.equal(nextByteOffset('bytes=0-8191', 10000), 8192)
  assert.throws(() => nextByteOffset('bytes=123-400', 10000), /invalid_range/)
  assert.throws(() => nextByteOffset('bytes=0-10000', 10000), /invalid_range/)
})
test('session URI allows only the official resumable upload endpoint', () => {
  const ok = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&upload_id=xyz'
  assert.equal(verifiedSessionUrl(ok), ok)
  assert.throws(() => verifiedSessionUrl('https://evil.example/upload?upload_id=xyz'), /invalid_session/)
  assert.throws(() => verifiedSessionUrl('http://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&upload_id=xyz'), /invalid_session/)
  assert.throws(() => verifiedSessionUrl('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable'), /invalid_session/)
})
test('safe video link, human title', () => {
  assert.equal(titleFromFilename('clip_anti-stress.mov'), 'clip anti stress')
  assert.equal(videoWatchUrl('Y4K4piEwwA8'), 'https://www.youtube.com/watch?v=Y4K4piEwwA8')
  assert.throws(() => videoWatchUrl('javascript:alert(1)'), /invalid_video_id/)
})
