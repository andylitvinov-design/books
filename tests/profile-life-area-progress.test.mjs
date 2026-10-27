import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PORTRAIT_LIFE_AREA_ORDER, portraitLifeAreaProgress } from '../lib/assessments/portrait-sectors.js'

const current = (rawValue = 4) => ({
  mode:'directional', rawValue, min:0, max:10, percent:rawValue * 10,
  measuredAt:'2026-10-25T12:00:00.000Z',
})

test('four life areas are ordered like the selection wizard, not practitioner report types', () => {
  const areas = portraitLifeAreaProgress(null)
  assert.deepEqual(areas.map(area => area.key), ['body', 'relationships', 'work', 'growth'])
  assert.deepEqual(PORTRAIT_LIFE_AREA_ORDER, areas.map(area => area.key))
  assert.ok(areas.every(area => !area.hasResults))
  for (const area of areas) {
    for (const locale of ['en', 'ru', 'es']) {
      assert.ok(area.label[locale] && area.shortLabel[locale], area.key+' '+locale)
    }
  }
})

test('checkmarks require real valid current scored readings in their matching area', () => {
  const withResults = portraitLifeAreaProgress({
    axes: {
      stress:current(6),
      relationships:{ mode:'descriptive', rawValue:3, min:1, max:5, percent:null },
      focus:current(5),
      meaning:current(8),
    },
  })
  assert.deepEqual(withResults.map(a=>a.hasResults), [true,true,true,true])
  assert.equal(withResults.length, 4)
})

test('empty, stale, invalid and unreviewed results never imply a created profile', () => {
  const areas = portraitLifeAreaProgress({
    axes:{
      stress:{...current(4), rawValue:Infinity},
      anxiety:{...current(6),percent:120},
      relationships:{...current(4),mode:'unreviewed'},
      clarity:{...current(4), max:0},
      meaning:{...current(6),rawValue:-2},
    },
    staleAxes:{energy:current(9), mood:current(8)},
  })
  assert.ok(areas.every(area => area.hasResults===false))
  assert.equal(portraitLifeAreaProgress({axes:{stress:current(5)}}).filter(a=>a.hasResults).length, 1)
})

test('Profile and Reports reuse the existing owner-scoped results and creation wizard', async () => {
  const [profile,reports,profileCss,reportsCss] = await Promise.all([
    readFile('components/app/profile-domains.jsx','utf8'),
    readFile('components/app/test-explorer-visual.jsx','utf8'),
    readFile('components/app/profile-domains.css','utf8'),
    readFile('components/app/test-explorer.module.css','utf8'),
  ])
  assert.match(profile,/portraitLifeAreaProgress\(buildPsychPortrait\(results\)\)/)
  assert.match(profile,/!external && <section className="hh-profile-life-areas"/)
  assert.match(profile,/data-profile-life-area=\{area\.key\}/)
  assert.match(profile,/data-has-results=\{area\.hasResults\}/)
  assert.match(profile,/area\.hasResults \? '\/' \+ locale \+ '\/app\/portfolio' : '\/' \+ locale \+ '\/personality-profiles'/)
  assert.match(reports,/data-has-results=\{hasResults\}/)
  assert.match(reports,/data-profile-add-area/)
  assert.match(reports,/setSelectedSector\(sector\.key\)/)
  assert.match(reports,/\/personality-profiles/)
  assert.match(profileCss,/@media\(max-width:620px\)[\s\S]*?hh-profile-life-area/)
  assert.match(reportsCss,/portraitAreaStatusLine/)
  assert.doesNotMatch(profile,/data-has-results=\{true\}/)
})
