import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { getTestScaleGuide } from '../lib/assessments/scale-guides.js'
import { courseMeasuredProfile } from '../lib/inner-growth/course-strategy.js'
import {
  COURSE_FOCUS_APHORISMS, courseFocusScaleOptions, courseFocusAphorism,
} from '../lib/inner-growth/course-focus-dialogue.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('the real cleared and completed assessment scale is eligible, not an inferred course label', () => {
  const now = Date.parse('2026-10-14T18:00:00Z')
  const guide = getTestScaleGuide('hh-current-state', 'ru')
  assert.ok(guide?.scales?.length, 'an existing executable and rights-cleared test is required')
  const scale = guide.scales.find(item => item.canChooseSkill &&
    ['reported_resource','reported_difficulty'].includes(item.type))
  assert.ok(scale, 'at least one legitimate skill-focused scale must exist')
  const result = {
    id:'saved-assessment-1', definitionKey:'hh-current-state',
    definitionVersion:guide.version,
    measurementAt:'2026-10-13T18:00:00Z',
    dimensions:[{key:scale.key,value:scale.min,min:scale.min,max:scale.max,direction:scale.direction}],
  }
  const profile = courseMeasuredProfile({results:[result],testKeys:['hh-current-state'],locale:'ru',now})
  const options = courseFocusScaleOptions(profile,[],12)
  assert.equal(options.length,1)
  assert.equal(options[0].id,'hh-current-state::'+scale.key)
  assert.equal(options[0].label,scale.label)
  assert.equal(options[0].testTitle,guide.title)
  assert.ok(COURSE_FOCUS_APHORISMS[options[0].axis]?.ru)
  // A stale test does not become a daily choice merely because it exists.
  const old = courseMeasuredProfile({results:[{...result,measurementAt:'2025-01-01T00:00:00Z'}],
    testKeys:['hh-current-state'],locale:'ru',now})
  assert.deepEqual(courseFocusScaleOptions(old),[])
})

test('user chooses explicitly from measured scales; sorting favours prior course selections, not severity', () => {
  const profile = {eligible:[
    {id:'test-a::resource',axis:'resource',label:'Ресурс',testTitle:'Test A',
      measuredAt:'2026-10-14T12:00:00Z',eligible:true},
    {id:'test-b::stress',axis:'stress',label:'Стресс',testTitle:'Test B',
      measuredAt:'2026-10-12T12:00:00Z',eligible:true},
    {id:'test-c::untested',axis:'meaning',label:'Not completed',testTitle:'Test C',
      measuredAt:'2026-10-14T12:00:00Z',eligible:false},
    {id:'test-d::unknown',axis:'unmapped',label:'Unsupported',testTitle:'Test D',
      measuredAt:'2026-10-14T12:00:00Z',eligible:true},
  ]}
  const options=courseFocusScaleOptions(profile,['test-b::stress'])
  assert.deepEqual(options.map(item=>item.id),['test-b::stress','test-a::resource'])
  assert.ok(options.every(item=>!Object.hasOwn(item,'score')))
  assert.deepEqual(courseFocusScaleOptions({eligible:[]}),[])
})

test('each supported topic has bilingual, unattributed educational text and reply states are not scores', () => {
  for (const [axis,copy] of Object.entries(COURSE_FOCUS_APHORISMS)) {
    assert.ok(copy.en?.length>25,axis+' EN')
    assert.ok(copy.ru?.length>25,axis+' RU')
    assert.equal(courseFocusAphorism({axis},'ru'),copy.ru)
    assert.equal(courseFocusAphorism({axis},'en'),copy.en)
  }
  assert.notEqual(courseFocusAphorism({axis:'anxiety'},'ru'),
    courseFocusAphorism({axis:'resource'},'ru'))
  assert.equal(courseFocusAphorism(null,'ru','General reflection'),'General reflection')
  const player=read('components/app/course-slide-player.jsx')
  for(const text of ["agree: 'Согласен'","unsure: 'Не знаю'","disagree: 'Не согласен'",
    'data-course-measured-scale-choice','data-course-personalized-aphorism',
    'data-course-aphorism-reaction','aria-live="polite"'])assert.ok(player.includes(text),text)
  assert.match(player,/if \(selectedScaleId!==scale.id\) setAphorismReaction\('skip'\)/)
  assert.doesNotMatch(player,/slide.kind === 'checkin'/)
})

test('the opening of existing 14-day lessons has only one entry rating, then choice and dialogue', () => {
  const source=read('components/app/course-slide-player.jsx')
  const match=source.match(/function buildSlides\(lesson\) \{[\s\S]*?\n\}/)
  assert.ok(match)
  const buildSlides=runInNewContext('('+match[0]+')')
  const keys=Array.from(buildSlides({sections:[],practiceV3:{recall:'legacy copy'}}),item=>item.key)
  assert.deepEqual(keys.slice(0,4),['welcome','baseline','recall','idea'])
  assert.equal(keys.filter(kind=>kind==='checkin').length,0)
  assert.match(source,/selectedScaleId:selectedScale\?\.id \|\| null,aphorismReaction/)
  const server=read('lib/app/growth-daily.js')
  assert.match(server,/from app.assessment_results where account_id=\$1/)
  assert.match(server,/const eligible=await dailyMeasuredFocusOptions\(db,actor,course,locale\)/)
  assert.match(server,/INVALID_COURSE_FOCUS_SELECTION/)
  assert.match(server,/aphorismReaction:optionalChoice\(input.aphorismReaction,aphorismReactions\)/)
})
