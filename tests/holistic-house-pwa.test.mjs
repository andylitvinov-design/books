import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
test('private Cabinet advertises a dedicated installable Holistic House PWA',()=>{
 const manifest=JSON.parse(readFileSync('public/holistic-house-app.webmanifest','utf8'))
 const layout=readFileSync('app/[locale]/app/layout.jsx','utf8')
 const sw=readFileSync('public/sw.js','utf8')
 assert.equal(manifest.name,'Holistic House')
 assert.equal(manifest.display,'standalone')
 assert.match(layout,/holistic-house-app\.webmanifest/)
 assert.match(sw,/notificationclick/)
 assert.match(sw,/network-only/)
 assert.doesNotMatch(sw,/localStorage/)
})

test('one unified Holistic House installation, not an accidental OPORA-only launcher',()=>{
  const en=JSON.parse(readFileSync('public/holistic-house-app.webmanifest','utf8'))
  const ru=JSON.parse(readFileSync('public/holistic-house-app-ru.webmanifest','utf8'))
  const legacy=JSON.parse(readFileSync('public/holistic-house.webmanifest','utf8'))
  const page=readFileSync('app/[locale]/app/[[...path]]/page.jsx','utf8')
  for(const manifest of [en,ru,legacy]){
    assert.equal(manifest.name,'Holistic House')
    assert.equal(manifest.id,'/en/app')
    assert.equal(manifest.scope,'/')
    assert.equal(manifest.display,'standalone')
    for(const size of [192,512])
      assert.ok(manifest.icons.some(icon=>icon.type==='image/png'&&
        icon.sizes===size+'x'+size&&icon.src==='/holistic-house-icon/'+size))
    assert.ok(manifest.shortcuts.some(s=>s.url.endsWith('/app/consultations')))
  }
  assert.equal(en.start_url,'/en/app/portrait')
  assert.equal(ru.start_url,'/ru/app/portrait')
  assert.match(page,/query.program === 'stress'/)
  assert.match(page,/holistic-house-app-ru\.webmanifest/)
  assert.match(page,/holistic-house-app\.webmanifest/)
  assert.match(page,/opora-antistress-ru\.webmanifest/)
  assert.match(page,/oporaInstall \?/)
  assert.doesNotMatch(page,/manifest: path\[0\] === 'course'/)
})

test('install landing is public, bilingual and links to real protected messaging settings',()=>{
  const guide=readFileSync('app/[locale]/install/page.jsx','utf8')
  const icon=readFileSync('app/holistic-house-icon/[size]/route.js','utf8')
  assert.match(guide,/Add to Home Screen/)
  assert.match(guide,/На экран «Домой»/)
  assert.match(guide,/app\/consultations/)
  assert.match(guide,/app\/settings#hh-phone-notifications/)
  assert.match(guide,/robots:\{index:false,follow:false\}/)
  assert.match(guide,/holistic-house-icon\/180/)
  assert.match(icon,/new ImageResponse/)
  assert.match(icon,/'180':180,'192':192,'512':512/)
  assert.match(icon,/Cache-Control/)
  // All private Cabinet/API requests still bypass SW caching.
  const sw=readFileSync('public/sw.js','utf8')
  assert.match(sw,/PRIVATE_PREFIXES/)
  assert.match(sw,/\/en\/app/)
  assert.match(sw,/network-only/)
})
