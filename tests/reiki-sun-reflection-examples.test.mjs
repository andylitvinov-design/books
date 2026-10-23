import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const read = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8')
const curriculum = read('data/academy/energywork-ai-curriculum.ts')
const learner = read('components/energywork-ai-learner.tsx')
const styles = read('components/energywork-ai-learner.module.css')

test('Flight to the Sun has four individually browsable, complete anonymous examples', () => {
  const source = curriculum.split('export const sunVoices: EnergyworkTestimonial[] = [')[1]?.split('\n];')[0]
  assert.ok(source, 'Missing sunVoices data')
  const ids = [...source.matchAll(/id: "sun-example-(\d\d)"/g)].map((match) => match[1])
  assert.deepEqual(ids, ['01', '02', '03', '04'])
  assert.equal((source.match(/quote: l\(/g) || []).length, 4)
  assert.equal((source.match(/attribution: l\(/g) || []).length, 4)
  assert.doesNotMatch(source, /sourcePath:/, 'Supplied screenshots have no independently verified public links')
  for (const phrase of ['rode the light', 'like an eclipse', 'glowing sun in my chest', 'many cups of coffee']) {
    assert.ok(source.includes(phrase), 'Original reflection detail lost: ' + phrase)
  }
  for (const phrase of ['словно оседлал', 'во время затмения', 'светящемуся Солнцу', 'много чашек кофе']) {
    assert.ok(source.includes(phrase), 'Missing Russian translation: ' + phrase)
  }
  assert.match(curriculum, /id: "flight-voices"[\s\S]*?testimonials: sunVoices/)
  assert.match(curriculum, /Your own experience may be different/)
})

test('Sun examples hide unsupported video-comments links and use narrower, tap-safe mobile arrows', () => {
  const voices = learner.split('function MeditationVoices(')[1]?.split('\nfunction ')[0] ?? ''
  assert.doesNotMatch(learner, /showVideoComments|voicesComments/)
  assert.match(voices, /currentReview\?\.sourcePath \? \(/)
  assert.match(voices, /href=\{"\/" \+ locale \+ "\/academy\/" \+ currentReview\.sourcePath\}/)
  assert.doesNotMatch(voices, /youtubeId|youtube\.com|jumpToSlide|setIndex|store\(/)
  assert.match(voices, /data-review-prev aria-label=\{t\.voicesPrevious\}/)
  assert.match(voices, /data-review-next aria-label=\{t\.voicesNext\}/)
  assert.match(voices, /<ArrowLeft size=\{16\}/)
  assert.match(voices, /<ArrowRight size=\{16\}/)
  assert.match(voices, /setActive\(\(index\) => \(index \+ 1\) % entries\.length\)/)
  assert.match(styles, /\.voicesCard \{[\s\S]*?padding: 10px 9px 8px;/)
  assert.match(styles, /\.voiceQuote \{[\s\S]*?padding: 3px 0 0 13px;/)
  assert.match(styles, /\.voicesControls button \{[\s\S]*?width: 44px;[\s\S]*?height: 44px;/)
  const mobileReviews = styles.slice(styles.indexOf('/* REIKI FULL TESTIMONIALS V1'))
  assert.match(mobileReviews, /\.voicesControls \{\s*margin: 6px auto 0;/)
  assert.match(mobileReviews, /\.voicesControls button \{[^}]*width: 44px;[^}]*height: 44px;/)
  assert.match(mobileReviews, /\.voicesControls button::before \{[^}]*inset: 7px;/)
})

test('Anonymous examples do not create false source-page links or affect course progress', () => {
  assert.match(curriculum, /sourcePath\?: string/)
  assert.match(learner, /currentReview\?\.sourcePath \? \(/)
  assert.match(learner, /data-review-next/)
  assert.match(learner, /data-review-prev/)
  assert.match(styles, /\.voiceQuote p \{[\s\S]*?overflow-y:auto;[\s\S]*?max-height:175px;/)
  assert.match(curriculum, /id: "flight-04"/)
  assert.match(curriculum, /id: "flight-05"/)
})
