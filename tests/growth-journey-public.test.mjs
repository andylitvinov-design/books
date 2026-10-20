import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL('../'+path, import.meta.url),'utf8')
const guideSource = read('data/growth-guides.ts')
const marker = 'export const GROWTH_GUIDES: Record<string, Record<GrowthGuideLocale, GrowthGuide>> = '
const start = guideSource.indexOf(marker)
const end = guideSource.indexOf('\n\nexport function growthGuideFor',start)
assert.ok(start > 0 && end > start)
const guides = JSON.parse(guideSource.slice(start+marker.length,end))
const locales=['en','ru','es']
const topics=['stress','relationships','business','energy','effectiveness']

test('five public education topics have complete EN/RU/ES evergreen guides, steps and FAQs',()=>{
  assert.deepEqual(Object.keys(guides).sort(),topics.slice().sort())
  for(const topic of topics) {
    assert.deepEqual(Object.keys(guides[topic]).sort(),locales.slice().sort(),topic)
    for(const locale of locales) {
      const guide=guides[topic][locale]
      assert.ok(guide.title.length>25,topic+' '+locale+' title')
      assert.ok(guide.lead.length>80,topic+' '+locale+' intro')
      assert.equal(guide.steps.length,3,topic+' '+locale)
      assert.equal(guide.faq.length,2,topic+' '+locale)
      for(const [heading,body] of [...guide.steps,...guide.faq]) {
        assert.ok(heading.length>8 && body.length>35,topic+' '+locale)
      }
    }
  }
})

test('all public guide routes reuse current live test-selector and SEO data',()=>{
  const route=read('app/[locale]/explore/[theme]/page.tsx')
  const sitemap=read('app/sitemap.ts')
  const library=read('components/library-hub.tsx')
  const guide=read('components/topic-growth-guide.tsx')
  assert.match(route,/TopicJourneySelector/)
  assert.match(route,/TopicGrowthGuide theme=\{theme\}/)
  assert.match(route,/const guide = growthGuideFor\(theme,language\)/)
  assert.match(sitemap,/TOPIC_JOURNEYS\.map\(journey =>/)
  assert.match(sitemap,/\['en','ru','es'\] as const/)
  assert.match(library,/growthFeed/)
  assert.match(library,/growthGuideFor\(theme,locale\)/)
  assert.match(guide,/id="hh-topic-growth-guide"/)
  assert.match(guide,/href="#hh-topic-selection-heading"/)
  assert.match(guide,/courses\/antistress/)
})

test('the share control offers only public guide links without client results',()=>{
  const selector=read('components/topic-journey-selector.tsx')
  const intro=selector.split('async function shareJourney()')[1]?.split('const toggle = ')[0]
  assert.ok(intro,'share handler')
  assert.match(intro,/new URL\('\/' \+ language \+ '\/explore\/' \+ journey\.id/)
  const executableCode = intro.replace(/\/\/[^\n]*/g,'')
  assert.doesNotMatch(executableCode,/resultId|scores|accountId|testAnswers|searchParams|selected\.join/)
  assert.match(selector,/data-topic-safe-sharing/)
  assert.match(selector,/navigator\.share/)
  assert.match(selector,/navigator\.clipboard/)
  assert.match(selector,/shareStatus === 'manual'/)
})

test('private next steps remain voluntary and point to existing first-party flows',()=>{
  const recommendations=read('components/app/portrait-recommendations.jsx')
  const program=read('components/app/development-program.jsx')
  assert.match(recommendations,/data-personal-next-steps/)
  assert.match(recommendations,/\/app\/portfolio#hh-development-program/)
  assert.match(recommendations,/\/app\/course\?program=stress/)
  assert.match(recommendations,/\/services\/free-situation-review/)
  assert.match(program,/id="hh-development-program"/)
  assert.match(program,/setActivePanel\('goals'\)/)
  assert.match(program,/appFetch\('development-goals'/)
})
