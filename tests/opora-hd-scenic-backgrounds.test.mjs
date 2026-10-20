import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,statSync} from 'node:fs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const photo=key=>new URL('../public/images/holistic-house/'+key,import.meta.url)

test('every OPORA scenic lesson and outro background uses a locally hosted full-quality photo',()=>{
  const css=read('components/app/opora-experience-player.module.css')
  const scenePaths=[...css.matchAll(/--scene-photo:url\('([^']+)'\)/g)].map(m=>m[1])
  assert.ok(scenePaths.length>=15,'Expected photography through lessons and all outro screens')
  for(const source of new Set(scenePaths)){
    assert.match(source,/^\/images\/holistic-house\/[-a-z0-9]+\.webp$/)
    assert.ok(statSync(new URL('../public'+source,import.meta.url)).size>=35_000,
      'Fullscreen background is too small for a phone: '+source)
  }
  assert.doesNotMatch(css,/course-start-heron\.webp|reiki-practitioner-sunrise\.webp/)
  assert.doesNotMatch(css,/filter:blur\(/,'Do not intentionally defocus learner backgrounds')
  assert.match(css,/background:var\(--scene-photo\) center\/cover no-repeat/)
})

test('legacy OPORA players use crisp large-format main backdrops, not tiny thumbnails',()=>{
  const compact=read('components/app/opora-v6-slide-player.jsx')
  const legacy=read('components/app/course-slide-player.jsx')
  const legacyCss=read('components/app/course-slide-player.module.css')
  for(const source of [compact,legacy]){
    assert.match(source,/src="\/images\/holistic-house\/report-lighthouse-coast\.webp"/)
    assert.match(source,/width=\{1600\} height=\{2394\}/)
    assert.doesNotMatch(source,/course-start-heron\.webp|reiki-practitioner-sunrise\.webp/)
  }
  assert.match(legacyCss,/background:url\('\/images\/holistic-house\/report-lighthouse-coast\.webp'\)/)
  assert.ok(statSync(photo('report-lighthouse-coast.webp')).size>=100_000)
  assert.ok(statSync(photo('hero-olive-incense.webp')).size>=100_000)
  assert.ok(statSync(photo('reiki-approved-sunrise-v3.webp')).size>=35_000)
})
