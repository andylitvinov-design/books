import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8')
const course = read('data/academy/energywork-ai-curriculum.ts')
const learner = read('components/energywork-ai-learner.tsx')
const css = read('components/energywork-ai-learner.module.css')
const tantraOriginal = JSON.parse(read('data/academy/tantra-reiki-full.generated.json'))
const tantraTranslated = JSON.parse(read('data/academy/tantra-reiki-ru-en.generated.json'))

test('Tantra Reiki preserves four complete archived learner reviews, rather than sentence excerpts', () => {
  const original = tantraOriginal.blocks.en
  const byMarker = name => {
    const index = original.findIndex(entry => entry.text === name)
    assert.ok(index >= 0, name + ' source marker')
    return original[index + 1].text
  }
  const margaret = byMarker('TESTIMONIAL: Margaret')
  const litten = byMarker('TESTIMONIAL: Litten')
  const olga = original.find(entry => entry.text?.startsWith('TESTIMONIAL: OLGA ')).text.replace('TESTIMONIAL: OLGA ', '')
  const anonymous = tantraTranslated.blocks.find(entry => entry.text?.startsWith('I feel relaxed :) rested :)'))
  assert.ok(margaret.length > 500)
  assert.ok(litten.length > 600)
  assert.ok(olga.length > 350)
  assert.ok(anonymous.text.length > 100)
  for (const paragraph of [margaret, litten, olga, anonymous.text]) {
    assert.ok(course.includes(paragraph), 'Unabridged source must appear in course quote')
  }
  assert.ok(course.includes('Will still practice with attuned partner'), 'Retains final part of Litten review')
  assert.ok(course.includes('Thank you, Andrey! As beautiful as always :)'), 'Retains anonymous sign-off')
  for (const id of ['margaret', 'olga', 'litten', 'tantra-level-1']) {
    assert.ok(course.includes('id: "' + id + '"'), 'Preserve testimonial ' + id)
  }
  assert.match(course, /const yggdrasilVoices: EnergyworkTestimonial\[\] = yggdrasilTextTestimonials\.map/)
  assert.doesNotMatch(course, /\\\\n\\\\n/, 'Do not render escaped newlines literally')
  assert.match(course, /sourcePath: "reiki\/tantra-reiki"/)
})

test('Review area presents complete scrollable text over the sunrise photograph', () => {
  assert.match(learner, /data-reiki-reviews="v4" data-reiki-full-reviews="v1"/)
  assert.match(learner, /data-reiki-current-kind=\{slide\.kind\}/)
  assert.match(learner, /data-review-fulltext role="region" tabIndex=\{0\} aria-label=\{t\.voicesFullText\}/)
  assert.match(learner, /voicesFullText: "Full learner review"/)
  assert.match(learner, /voicesFullText: "Полный текст отзыва"/)
  assert.match(css, /REIKI FULL TESTIMONIALS V1/)
  const scoped = css.slice(css.indexOf('REIKI FULL TESTIMONIALS V1'))
  assert.match(scoped, /\[data-energywork-slide-kind="voices"\] \.art \{\s*position: absolute;/)
  assert.match(scoped, /\.voicesCard \{\s*display: flex;/)
  assert.match(scoped, /\.voiceQuote p \{\s*flex: 1 1 auto;[\s\S]*?max-height: none;/)
  assert.match(scoped, /overflow-y: auto;/)
  assert.match(scoped, /white-space: pre-line;/)
  assert.match(scoped, /@media \(max-width: 760px\)/)
  assert.match(scoped, /\.journeyLabel \{\s*position: absolute;/)
  assert.match(scoped, /@media print/)
})

test('Source links and carousel controls stay independent of course navigation', () => {
  assert.match(learner, /data-meditation-review-carousel data-review-count=\{entries.length\}/)
  assert.match(learner, /data-review-prev/)
  assert.match(learner, /data-review-next/)
  assert.match(learner, /className=\{styles\.voicesReferences\}/)
  assert.match(learner, /className=\{styles\.voicesLink\}/)
  assert.match(learner, /t\.voicesSource/)
  assert.match(learner, /className=\{styles\.progressFooter\}/)
  assert.match(learner, /data-energywork-next/)
  assert.match(learner, /data-reiki-person=\{portraitArt \|\| voicesArt \? "true" : undefined\}/)
})
