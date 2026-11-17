import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const photoPath = 'public/images/holistic-house/'

test('My Coach first fold uses one compact search, five categories and four theme chips', () => {
  const jsx = read('components/my-coach-catalog.jsx')
  const css = read('components/my-coach-catalog.module.css')
  assert.match(jsx, /data-my-coach-kind-switch/)
  for (const mode of ['all', 'ai', 'human', 'express', 'tao']) {
    assert.ok(jsx.includes('data-my-coach-mode="' + mode + '"'), mode)
  }
  for (const topic of ["resilience", "relationships", "career", "habits"]) {
    assert.ok(jsx.includes("id: '" + topic + "'"), topic)
  }
  assert.match(css, /\.coachKindSwitch\{display:grid;grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/)
  assert.match(jsx, /data-my-coach-card=\{persona\.id\}/)
  assert.doesNotMatch(jsx, /className=\{heroStyles\.heroStage\}|className=\{heroStyles\.benefitTiles\}/)
  assert.doesNotMatch(jsx, /<video[^>]+autoPlay|<audio[^>]+autoPlay/i)
})

test('the user-approved photo assets are WebP, nontrivial quality and local to the site', () => {
  const css = read('components/my-coach-mira-landing.module.css')
  for (const name of ['mira','alex','sofia','max']) {
    const path = photoPath + 'my-coach-' + name + '-rail.webp'
    const bytes = readFileSync(new URL('../' + path, import.meta.url))
    assert.ok(statSync(new URL('../' + path, import.meta.url)).size >= 8000, name + ' thumb is not a tiny sprite')
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF')
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP')
    assert.ok(css.includes('my-coach-' + name + '-rail.webp'), name + ' thumbnail is used')
  }
  const hero = readFileSync(new URL('../' + photoPath + 'my-coach-mira-hires.webp', import.meta.url))
  assert.ok(hero.length > 45000, 'portrait is a real hi-resolution image rather than 3KB sprite')
  assert.equal(hero.toString('ascii', 8, 12), 'WEBP')
  assert.match(css, /heroPortrait\[data-persona=mira\]/)
  assert.match(css, /background-image:url\('\/images\/holistic-house\/my-coach-mira-hires\.webp'\)/)
  const ctaCss = read('components/my-coach-express-start.module.css')
  assert.match(ctaCss, /my-coach-mira-rail\.webp/)
  assert.doesNotMatch(ctaCss, /my-coach-portraits\.avif/)
})

test('owner-approved visual mock uses the original fictional portraits instead of unrelated motion art',()=>{
  const css=read('components/my-coach-mira-landing.module.css')
  const button=read('components/my-coach-express-start.module.css')
  for(const id of ['mira','alex','sofia','max']){
    assert.match(css,new RegExp('heroPortrait\\[data-persona='+id+'\\][\\s\\S]*?background-image:url\\('))
    assert.match(css,new RegExp('railPortrait\\[data-persona='+id+'\\][\\s\\S]*?background-image:url\\('))
  }
  assert.match(css,/my-coach-mira-hires\.webp/)
  assert.match(css,/background-size:cover!important/)
  assert.match(css,/mask-image:linear-gradient/)
  assert.match(css,/brandControls :global\(\[data-hh-credit-profile\]\)\{display:none!important\}/)
  assert.match(button,/embeddedWrap \.portrait\{display:none\}/)
  assert.match(button,/embeddedWrap \.talkButton/)
  assert.match(css,/heroStage\{height:clamp\(292px,42svh,305px\)\}/)
  assert.match(css,/railPortrait\{height:clamp\(77px,11svh,90px\)\}/)
})

test('compact coach cards keep real portraits and a guarded Mira session entry', () => {
  const jsx = read('components/my-coach-catalog.jsx')
  const css = read('components/my-coach-catalog.module.css')
  assert.match(jsx, /<MyCoachMotionMedia personaId=\{persona\.id\} phase="idle" context="card"/)
  assert.match(jsx, /persona\.id === 'mira'[\s\S]*?<MyCoachExpressStart locale=\{lang\} embedded/)
  assert.match(jsx, /href=\{coachSessionHref\(lang, persona\.id, normalizeCoachSettings\(persona\.id\)\)\}/)
  assert.match(css, /\.cardMiraStart\{/)
  assert.match(css, /@media\(max-width:540px\)/)
})
