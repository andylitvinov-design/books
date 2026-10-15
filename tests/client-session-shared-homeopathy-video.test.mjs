import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  GRANULES_GUIDE_ID, GRANULES_GUIDE_OBJECT_KEY, GRANULES_GUIDE_SOURCE_VIDEO_ID,
  GRANULES_GUIDE_DURATION_SECONDS, granulesGuideConfig,
} from '../lib/clients/shared-education-model.js'

const source=path=>readFileSync(new URL('../'+path, import.meta.url),'utf8')
test('unapproved or unconfigured shared guide is never exposed',()=>{
  assert.deepEqual(granulesGuideConfig({}),{ready:false,bytes:0})
  assert.equal(granulesGuideConfig({HH_CLIENT_DELIVERY_ENABLED:'true',HH_CLIENT_GRANULES_GUIDE_APPROVED:'true'}).ready,false)
  assert.equal(granulesGuideConfig({HH_CLIENT_DELIVERY_ENABLED:'false',HH_CLIENT_GRANULES_GUIDE_APPROVED:'true',HH_CLIENT_GRANULES_GUIDE_BYTES:'20000000'}).ready,false)
  assert.equal(granulesGuideConfig({HH_CLIENT_DELIVERY_ENABLED:'true',HH_CLIENT_GRANULES_GUIDE_APPROVED:'true',HH_CLIENT_GRANULES_GUIDE_BYTES:'45000001'}).ready,false)
  assert.equal(granulesGuideConfig({HH_CLIENT_DELIVERY_ENABLED:'true',HH_CLIENT_GRANULES_GUIDE_APPROVED:'true',HH_CLIENT_GRANULES_GUIDE_BYTES:'01'}).ready,false)
  assert.equal(granulesGuideConfig({HH_CLIENT_DELIVERY_ENABLED:'true',HH_CLIENT_GRANULES_GUIDE_APPROVED:'true',HH_CLIENT_GRANULES_GUIDE_BYTES:'not-a-number'}).ready,false)
  assert.deepEqual(granulesGuideConfig({HH_CLIENT_DELIVERY_ENABLED:'true',HH_CLIENT_GRANULES_GUIDE_APPROVED:'true',HH_CLIENT_GRANULES_GUIDE_BYTES:'20000000'}),{ready:true,bytes:20000000})
})
test('original approved RU video is one fixed private master reference',()=>{
  assert.equal(GRANULES_GUIDE_ID,'homeopathy-granules-ru-v2')
  assert.equal(GRANULES_GUIDE_SOURCE_VIDEO_ID,'1e4fb28d920f7fc4739d33e14061c56b')
  assert.equal(GRANULES_GUIDE_DURATION_SECONDS,62.448)
  assert.match(GRANULES_GUIDE_OBJECT_KEY,/^shared\/homeopathy\/[^/]+\.mp4$/)
  assert.doesNotMatch(source('components/client-session-page.jsx'),/files2\.heygen\.ai|drive\.google\.com|youtube\.com\/embed/)
})
test('private routes authorize before allowing the single shared video ID',()=>{
  for(const path of [
    'app/api/client-session-viewer/[selector]/media/[assetId]/route.js',
    'app/api/client/[selector]/sessions/[sessionId]/media/[assetId]/route.js',
    'app/api/app/saved-sessions/[id]/media/[assetId]/route.js',
  ]){
    const content=source(path)
    assert.ok(content.includes('sharedGranulesGuideReady'))
    assert.ok(content.includes('GRANULES_GUIDE_ID'))
    assert.ok(content.includes('streamSharedGranulesGuide'))
    assert.ok(content.includes('privateMediaStream'))
    assert.ok(content.indexOf('authorizeSessionGuest') >= 0 || content.indexOf('authorizeCabinetRequest') >= 0 || content.includes('readSavedSession'))
    assert.ok(content.indexOf('const sharedGuide=') > content.indexOf(path.includes('saved-sessions') ? 'readSavedSession(config' : path.includes('client-session-viewer') ? 'authorizeSessionGuest(config' : 'authorizeCabinetRequest(selector)'))
  }
})
test('all three session readers receive the availability gate',()=>{
  for(const path of [
    'app/[locale]/client/session/[shareSelector]/page.js',
    'app/[locale]/client/[selector]/sessions/[sessionId]/page.js',
    'app/[locale]/app/sessions/[id]/page.jsx',
  ]) assert.match(source(path),/sharedGuideReady=\{sharedGranulesGuideReady\(\)\}/)
  const page=source('components/client-session-page.jsx')
  assert.match(page,/hasHomeopathyRecommendation&&sharedGuideReady/)
  assert.match(page,/GRANULES_GUIDE_ID/)
  assert.match(page,/не подтвержден/)
  assert.match(page,/does not prove/)
})
