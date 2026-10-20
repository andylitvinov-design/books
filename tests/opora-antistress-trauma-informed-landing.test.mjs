import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = filename => readFileSync(new URL('../' + filename, import.meta.url), 'utf8')

test('Anti-Stress public course presents seven two-lesson skills in Russian, English and Spanish', () => {
  const landing = source('components/public-growth-courses.tsx')
  const style = source('components/public-growth-courses.module.css')
  assert.match(landing, /data-opora-stress-seven-skills/)
  assert.match(landing, /14 занятий/)
  assert.match(landing, /14 lessons/)
  assert.match(landing, /14 lecciones/)
  assert.match(landing, /t\.stressSkills\.skills\.map/)
  assert.match(landing, /index \+ 8/)
  assert.equal((landing.match(/stressSkills:/g)||[]).length, 3)
  assert.match(landing, /\?program=stress/)
  assert.match(landing, /not shock-trauma or PTSD treatment/)
  assert.match(landing, /не терапия шоковой травмы или ПТСР/i)
  assert.match(style, /\.stressSkillsList/)
  assert.match(style, /\.stressSkillsFoot/)
  assert.match(style, /@media\(max-width:700px\)/)
})

test('Trauma-informed OPORA methodological MySpace reference excludes autonomous trauma processing', () => {
  const doc = source('docs/myspace/HOLISTIC_HOUSE_OPORA_TRAUMA_INFORMED_SHOCK_TRAUMA_ALGORITHM_2026-10-14.md')
  assert.match(doc, /CPT/)
  assert.match(doc, /EMDR/)
  assert.match(doc, /Psychological First Aid/)
  assert.match(doc, /Gate 0/)
  assert.match(doc, /НЕ публиковать/)
  assert.match(doc, /ПТСР/)
  assert.match(doc, /NICE/)
  assert.match(doc, /Somatic Experiencing/)
})
