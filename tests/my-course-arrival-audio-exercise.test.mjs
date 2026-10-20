import { OPORA_SKILL_SLIDE_MODEL } from '../lib/inner-growth/anti-stress-skills-v5.js'
import { buildCourseSlides } from '../lib/inner-growth/course-slide-sequence.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const player = read('components/app/course-slide-player.jsx')
const audio = read('components/app/course-practice-voice.jsx')
const css = read('components/app/course-slide-player.module.css')

function buildSlidesForTest(lesson) {
  const match = player.match(/function buildSlides\(lesson\) \{[\s\S]*?\n\}/)
  assert.ok(match, 'Actual pure slide builder exists')
  return runInNewContext('(' + match[0] + ')', { OPORA_SKILL_SLIDE_MODEL, buildCourseSlides })(lesson)
}

const dayOne = {
  sections: [
    {kind:'learn',text:'Observe energy rhythm without searching for a cause'},
    {kind:'arrive',title:'Arrive gently',text:'Notice a colour'},
    {kind:'meditation',title:'Notice today',text:'A brief meditation'},
    {kind:'finish',title:'Close',text:'Finish naturally'},
  ],
  workbook:{workingPosition:'Allow one small pause',microPractice:'Notice a change'},
  practiceV4:{withoutImagery:'Plain words'},
}

test('learn + arrive merge to one exercise while preserving meaningful lesson slides', () => {
  const slides = buildSlidesForTest(dayOne)
  assert.equal(slides.length,14, 'Day-one equivalent now has 14 rather than 15 steps')
  assert.equal(slides.filter(item => item.kind === 'understand').length,0)
  assert.equal(slides.filter(item => item.kind === 'guided').length,3)
  assert.deepEqual(Array.from(slides.filter(item => item.kind === 'guided').map(item => item.section.kind)),['arrive','meditation','finish'])
  assert.ok(slides.findIndex(item => item.kind === 'idea') < slides.findIndex(item => item.section?.kind === 'arrive'))
  assert.ok(slides.findIndex(item => item.section?.kind === 'meditation') < slides.findIndex(item => item.kind === 'moment'))
  assert.match(player, /data-course-arrival-exercise/)
  assert.match(player, /lesson\.sections\.find\(part => part\.kind === 'learn'\)\.text/)
  assert.match(player, /words\.arrivalAudioLead \+ ': ' \+ focusLabel/)
})

test('fallback learn slide remains when legacy lessons contain no arrival section', () => {
  const lesson = {...dayOne,sections:dayOne.sections.filter(item => item.kind !== 'arrive')}
  const slides = buildSlidesForTest(lesson)
  assert.equal(slides.filter(item => item.kind === 'understand').length,1)
  assert.equal(slides.filter(item => item.kind === 'guided').length,2)
})

test('spoken guide is voluntary and stops on hidden tab, screen change or discomfort', () => {
  assert.match(player,/import CoursePracticeVoice/)
  assert.match(player,/data-course-practice-pre/)
  assert.match(player,/data-course-practice-post/)
  assert.match(player,/key=\{slide\.key \+ ':' \+ neutralMode\}/)
  assert.match(audio,/speechSynthesis\.cancel\(\)/)
  assert.match(audio,/document\.addEventListener\('visibilitychange'/)
  assert.match(audio,/utterance\.lang = ru \? 'ru-RU' : 'en-US'/)
  assert.match(audio,/status === 'playing' \? pause : play/)
  assert.doesNotMatch(audio,/<audio[^>]*autoplay|<video[^>]*autoplay/)
  assert.match(player,/words\.fullInstructions/)
  assert.match(css,/\.arrivalExercise\{/)
  assert.match(css,/@media\(max-width:540px\)/)
  assert.doesNotMatch(player,/data-course-global-discomfort|discomfortShortcut|discomfortAction/)
  assert.match(player,/data-course-discomfort-support/)
})
