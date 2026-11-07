import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {canStartFirstGuestVideo} from '../lib/video-credits/guest-first-policy.mjs'

const source=readFileSync(new URL('../components/mandala-free-video-studio.tsx',import.meta.url),'utf8')
const creditClient=readFileSync(new URL('../lib/video-credits/client.mjs',import.meta.url),'utf8')
const css=readFileSync(new URL('../components/mandala-video-mobile.module.css',import.meta.url),'utf8')
const ready={chargeRequired:true,ready:true,blocked:false,priceCredits:10}
test('guest gets only one local first-video export, with no credit hold',()=>{
  assert.equal(canStartFirstGuestVideo({viewer:'guest',catalog:ready}),true)
  assert.equal(canStartFirstGuestVideo({viewer:'guest',catalog:ready,guestUsed:true}),false)
  assert.equal(canStartFirstGuestVideo({viewer:'guest',catalog:ready,hasPendingResult:true}),false)
  assert.equal(canStartFirstGuestVideo({viewer:'guest',catalog:ready,hasCreditHold:true}),false)
  for(const viewer of ['checking','unavailable',undefined])
    assert.equal(canStartFirstGuestVideo({viewer,catalog:ready}),false)
  assert.equal(canStartFirstGuestVideo({viewer:'guest',catalog:null}),false)
  assert.equal(canStartFirstGuestVideo({viewer:'signed_in',catalog:ready}),true)
  assert.equal(canStartFirstGuestVideo({viewer:'signed_in',catalog:{...ready,ready:false}}),false)
  assert.equal(canStartFirstGuestVideo({viewer:'signed_in',catalog:{...ready,blocked:true}}),false)
  assert.equal(canStartFirstGuestVideo({viewer:'signed_in',catalog:{...ready,chargeRequired:false,ready:false}}),true)
})
test('401 guest detection never confuses outages with missing sign-in',()=>{
  assert.match(creditClient,/response\.status===401/)
  assert.match(creditClient,/data\?\.error==='SIGN_IN_REQUIRED'/)
  assert.match(creditClient,/throw Error\('VIDEO_CREDITS_UNAVAILABLE'\)/)
})
test('real recorder skips XP hold only for guests and consumes the first successful output',()=>{
  assert.match(source,/const guestFirstVideo=videoViewer==="guest"/)
  assert.match(source,/if\(creditCatalog\.chargeRequired&&!guestFirstVideo\)/)
  assert.match(source,/videoCreditRequest\("hold"/)
  assert.match(source,/videoCreditRequest\("complete"/)
  assert.match(source,/videoCreditRequest\("release"/)
  assert.equal((source.match(/if\(guestFirstVideo\)\{setGuestVideoUsed\(true\);setCreditConfirmed\(true\);\}/g)||[]).length,2)
  assert.match(source,/setActiveWorkspace\(current=>current==="editor"\?"effects":current\)/)
  assert.match(source,/const continueFromMontage=\(\)=>\{/)
  assert.match(source,/data-video-quick-generate data-video-continue-hypno/)
  assert.match(source,/onClick=\{continueFromMontage\}/)
  assert.match(source,/onCreate=\{startFromHero\}/)
  assert.doesNotMatch(source,/Sign in to create videos\./)
})
test('finished preview, share, delivery and downloads stay behind verified login',()=>{
  assert.match(source,/videoViewer!=="signed_in" \? <div className=\{videoStyles\.guestVideoUnlock\}/)
  assert.match(source,/data-video-guest-sign-in/)
  assert.match(source,/data-video-viewer-check/)
  assert.match(source,/target="_blank" rel="noopener noreferrer" prefetch=\{false\}/)
  assert.match(source,/videoViewer!=="signed_in"\)return;/)
  assert.match(source,/data-mandala-video-preview/)
  assert.match(source,/data-mandala-video-download/)
  assert.match(source,/<MandalaVideoDelivery/)
  assert.match(css,/\.guestVideoUnlock\{/)
  for(const phrase of ['Первое видео создано бесплатно','Your first video was created for free','Tu primer vídeo se creó gratis'])
    assert.ok(source.includes(phrase),phrase)
})
test('modified studio remains syntactically valid TSX',async()=>{
  const ts=await import('typescript')
  const diagnostic=ts.transpileModule(source,{
    fileName:'mandala-free-video-studio.tsx',
    reportDiagnostics:true,
    compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}
  }).diagnostics||[]
  assert.deepEqual(diagnostic.filter(d=>d.category===ts.DiagnosticCategory.Error),[])
})
