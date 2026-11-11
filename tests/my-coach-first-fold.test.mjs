import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const photoPath = 'public/images/holistic-house/'

test('My Coach mobile first fold keeps both the real session CTA and choice of coaches', () => {
  const jsx = read('components/my-coach-catalog.jsx')
  const css = read('components/my-coach-mira-landing.module.css')
  assert.match(jsx, /data-my-coach-hero-start=\{selected\.id\}/)
  assert.match(jsx, /className=\{heroStyles\.coachRail\}/)
  assert.ok(jsx.indexOf('className={heroStyles.heroStage}') < jsx.indexOf('className={heroStyles.coachRail}'))
  assert.match(css, /height:clamp\(300px,41svh,355px\)/)
  assert.match(css, /min-height:0/)
  assert.match(css, /grid-auto-columns:minmax\(86px,calc\(\(100% - 21px\)\/4\)\)/)
  assert.match(css, /@media\(max-width:540px\) and \(max-height:760px\)/)
  assert.match(css, /@media\(max-width:370px\)/)
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/)
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
})