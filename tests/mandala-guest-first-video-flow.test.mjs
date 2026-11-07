import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const studio=readFileSync(new URL('../components/mandala-free-video-studio.tsx',import.meta.url),'utf8')
const credits=readFileSync(new URL('../lib/video-credits/client.mjs',import.meta.url),'utf8')

test('first guest video does not need an account-bound XP hold, but signed-in videos do',()=>{
  assert.match(credits,/action==='status'&&response\.status===401/)
  assert.match(credits,/body\?\.error==='SIGN_IN_REQUIRED'/)
  assert.match(studio,/creditSession==="guest"&&!guestFirstVideoUsed/)
  assert.match(studio,/const guestLocalRender=creditCatalog\.chargeRequired&&creditSession==="guest"&&!guestFirstVideoUsed/)
  assert.match(studio,/if\(creditCatalog\.chargeRequired&&!guestLocalRender\)\{[\s\S]*?videoCreditRequest\("hold"/)
  assert.match(studio,/if\(guestLocalRender\)\{setCreditConfirmed\(true\)/)
  assert.match(studio,/if\(result&&result\.mode!=="catalog"&&guestRenderRef\.current\)/)
  assert.match(studio,/setGuestFirstVideoUsed\(true\)/)
  assert.match(studio,/error\.message==="SIGN_IN_REQUIRED"\?"guest":"unavailable"/)
  assert.doesNotMatch(studio,/Sign in to create videos\./)
})

test('Style CTA continues to Add text, then Audio; only the final step exports',()=>{
  const handler=studio.slice(studio.indexOf('const continueMontageOrGenerate='),
    studio.indexOf('// First mobile step is only',studio.indexOf('const continueMontageOrGenerate=')))
  assert.match(handler,/montagePanel==="effects"\|\|montagePanel==="text"/)
  assert.match(handler,/setMontagePanel\(montagePanel==="effects"\?"text":"audio"\)/)
  assert.match(handler,/createQuickVideo\(\)/)
  const start=studio.indexOf('data-video-quick-generate')
  const btn=studio.slice(start,studio.indexOf('</button>',start))
  assert.match(btn,/onClick=\{continueMontageOrGenerate\}/)
  assert.match(btn,/data-video-montage-next/)
  for(const text of ['Next · Add text','Next · Audio','Далее · Аудио','Siguiente · Añadir texto'])
    assert.ok(btn.includes(text),text)
})

test('anonymous finished Blob is inaccessible for playback, download and share until signed in',()=>{
  assert.match(studio,/data-video-guest-result-gate/)
  assert.match(studio,/data-video-guest-signin/)
  assert.match(studio,/target="_blank" rel="noopener noreferrer"/)
  assert.match(studio,/data-video-guest-check-session/)
  assert.match(studio,/document\.addEventListener\("visibilitychange",onVisible\)/)
  assert.match(studio,/window\.addEventListener\("focus",onFocus\)/)
  assert.match(studio,/result&&\(!creditCatalog\?\.chargeRequired\|\|creditSession==="signed_in"\|\|result\.mode==="catalog"\)/)
  assert.match(studio,/creditCatalog\?\.chargeRequired&&creditSession!=="signed_in"\)\)return;/)
  assert.match(studio,/data-mandala-video-download/)
  assert.match(studio,/data-video-save-direct/)
})
