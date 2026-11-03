import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildExplorerEntries } from '../lib/assessments/test-explorer.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import {
  COURSE_PRESETS, coursePresetTags, courseVisibleFocusTags, coursePresetForTags,
  getCoursePreset, matchesFixedPresetTests, coursePresetTests, coursePresetSuggestedScales,
} from '../lib/inner-growth/course-presets.js'

const source = path => readFileSync(new URL('../' + path, import.meta.url),'utf8')

test('three fast-entry programmes each require five fixed, real, rights-cleared, bilingual tests', () => {
  assert.deepEqual(COURSE_PRESETS.map(p => p.id), ['calm_balance','business_focus','confidence'])
  const catalog=new Map(MONITORING_CATALOG.map(item=>[item.key,item]))
  for (const locale of ['en','ru']) {
    const eligible=new Map(buildExplorerEntries({locale,audience:'account'}).map(item=>[item.key,item]))
    for (const pack of COURSE_PRESETS) {
      assert.ok(pack.title[locale] && pack.description[locale] && pack.axes[locale].length===3)
      assert.equal(pack.testKeys.length,5)
      assert.equal(new Set(pack.testKeys).size,5)
      assert.ok(pack.focusTags.length>=1)
      const listed=coursePresetTests(pack.id,locale)
      assert.equal(listed.length,5)
      for(const [index,key] of pack.testKeys.entries()) {
        const fromCatalog=catalog.get(key), fromExplorer=eligible.get(key)
        assert.ok(fromCatalog,`${pack.id} has a missing catalog key ${key}`)
        assert.equal(fromCatalog.rightsStatus,'cleared',key)
        assert.equal(fromCatalog.startable,true,key)
        assert.equal(fromCatalog.instrumentLocale,'dynamic',key)
        assert.ok(fromExplorer?.selectable,`${pack.id}: ${key} must be startable and correctly keyed`)
        assert.ok(fromExplorer?.definition,`${pack.id}: ${key} must have an actual questionnaire`)
        assert.ok(listed[index].title && listed[index].version)
      }
    }
  }
})

test('preset persists as signed-off server metadata without changing visible topic tags',()=>{
  for(const pack of COURSE_PRESETS){
    const tags=coursePresetTags(pack.id)
    assert.equal(coursePresetForTags(tags)?.id,pack.id)
    assert.deepEqual(courseVisibleFocusTags(tags),pack.focusTags)
    assert.equal(getCoursePreset(pack.id)?.id,pack.id)
    assert.equal(matchesFixedPresetTests(pack,pack.testKeys),true)
    assert.equal(matchesFixedPresetTests(pack,[...pack.testKeys].reverse()),false)
    assert.equal(matchesFixedPresetTests(pack,pack.testKeys.slice(1)),false)
    assert.equal(matchesFixedPresetTests(pack,[...pack.testKeys,'extra']),false)
    assert.equal(coursePresetForTags([tags.at(-1),tags.at(-1)]),null)
  }
  assert.equal(coursePresetTags('malformed'),null)
  assert.deepEqual(courseVisibleFocusTags(['stress','hh-preset:calm_balance']),['stress'])
  assert.equal(getCoursePreset('__proto__'),null)
})

test('preset focus prioritizes the requested goal using only actual eligible measured scales',()=>{
  const mock={eligible:[
    {id:'a',goal:'energy_agency',eligible:true},
    {id:'b',goal:'inner_support',eligible:true},
    {id:'c',goal:'calm_regulation',eligible:true},
    {id:'d',goal:'connection_boundaries',eligible:true},
    {id:'e',goal:'attention_clarity',eligible:false},
  ]}
  assert.deepEqual(coursePresetSuggestedScales(mock,'calm_balance',3).map(x=>x.id),['c','a','b'])
  assert.deepEqual(coursePresetSuggestedScales(mock,'confidence',3).map(x=>x.id),['b','d','a'])
  assert.deepEqual(coursePresetSuggestedScales(mock,'business_focus',3).map(x=>x.id),['a','c','b'])
  assert.deepEqual(coursePresetSuggestedScales({eligible:[]},'confidence'),[])
})

test('all presets keep deliberate-start consent, owner-scoped battery, real-result and 14-day gates',()=>{
  const service=source('lib/app/growth-course.js')
  const r3=source('components/app/course-r3-steps.jsx')
  const ui=source('components/app/my-course.jsx')
  const catalogUi=source('components/app/course-preset-catalog.jsx')
  const css=source('components/app/course-preset-catalog.module.css')
  const dash=source('components/app/my-courses-dashboard.jsx')
  assert.match(service,/getCoursePreset\(body\.presetId\)/)
  assert.match(service,/COURSE_PRESET_TESTS_FIXED/)
  assert.match(service,/matchesFixedPresetTests\(preset,keys\)/)
  assert.match(service,/matchesFixedPresetTests\(preset,row\.test_keys\)/)
  assert.match(service,/select definition_ids from app_private\.assessment_plans where account_id=\$1/)
  assert.match(service,/COURSE_TESTS_REMAIN/)
  assert.match(service,/COURSE_SCALES_UNAVAILABLE/)
  assert.match(service,/await createNewCycle\(/)
  assert.match(r3,/coursePresetSuggestedScales/)
  assert.match(r3,/preset\.testKeys\.map/)
  assert.match(r3,/onCourseCommand\('confirm-tests',\{testKeys:chosenTests\}\)/)
  assert.match(r3,/disabled=\{busy\|\|localBusy\|\|Boolean\(preset\)/)
  assert.match(r3,/\?mode=guided&course=1/)
  assert.match(ui,/<CoursePresetCatalog locale=\{locale\}/)
  assert.match(ui,/onPersonal=\{\(\)\s*=>\s*startSelectedCourse\(null\)\}/)
  assert.match(ui,/const values = \{ consent: true,/)
  assert.match(ui,/void act\('start', values\)/)
  assert.match(catalogUi,/data-course-presets/)
  assert.match(catalogUi,/data-course-personal-card/)
  assert.match(catalogUi,/coursePresetTests\(preset\.id,language\)/)
  assert.match(dash,/getCoursePreset\(course\.presetId\)/)
  assert.match(css,/@media\(max-width:530px\)/)
  for(const item of [service,r3,ui,catalogUi])assert.doesNotMatch(item,/localStorage|sessionStorage|dangerouslySetInnerHTML/)
})
