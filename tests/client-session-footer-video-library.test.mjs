import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {parseSessionYouTubeUrl} from '../lib/clients/youtube-resource.js'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('report footer importer is mounted in both practitioner report editors',()=>{
  const report=read('components/report-video-materials-editor.jsx')
  const session=read('components/admin-session-studio.jsx')
  for(const content of [report,session]){
    assert.match(content,/SessionSaveFooterVideo/)
    assert.match(content,/clientId=\{clientId\}/)
    assert.match(content,/session=\{session\}/)
  }
  const picker=read('components/session-material-picker.jsx')
  assert.match(picker,/hh-materials-changed/)
})

test('importer only reuses general YouTube videos at the bottom of the report',()=>{
  const source=read('components/session-save-footer-video.jsx')
  assert.match(source,/resource\?\.kind==='youtube'/)
  assert.match(source,/resource\?\.placement==='materials'/)
  assert.match(source,/parseSessionYouTubeUrl/)
  assert.match(source,/window\.confirm/)
  assert.match(source,/remove the client name/)
  assert.match(source,/action:'youtube'/)
  assert.match(source,/\/api\/admin\/materials/)
  assert.doesNotMatch(source,/client_delivery_assets|recordingUpload|uploadToSignedUrl/)
  assert.doesNotMatch(source,/action:'publish'|publish-library/)
  assert.doesNotMatch(source,/session\.published\s*=/)
})

test('owner library API is authenticated and deduplicates concurrent retries',()=>{
  const source=read('lib/clients/material-library.js')
  const api=read('app/api/admin/materials/route.js')
  assert.match(api,/ownerMaterialRequest/)
  assert.match(source,/pg_advisory_xact_lock\(hashtextextended/)
  assert.match(source,/where kind='youtube' and status='ready' and url=\$1/)
  assert.match(source,/if\(existing\)return/)
})

test('link cleanup strips client-specific URL tracking and rejects private providers',()=>{
  const example='https://youtu.be/AbCdEfGhIj0?si=private-tracking'
  assert.deepEqual(parseSessionYouTubeUrl(example),{
    id:'AbCdEfGhIj0',url:'https://www.youtube.com/watch?v=AbCdEfGhIj0',
  })
  for(const url of [
    'https://drive.google.com/file/d/abc/view',
    'https://private.example.com/clients/secret.mp4',
    'https://youtube.com.evil.example/watch?v=AbCdEfGhIj0',
  ])assert.equal(parseSessionYouTubeUrl(url),null)
})
