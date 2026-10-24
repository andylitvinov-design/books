import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('one public coaching lounge is the visitor entry in all three languages', () => {
  const page = source('app/[locale]/coaching/page.jsx')
  const alias = source('app/[locale]/coaching/lounge/page.tsx')
  const home = source('components/home-featured-workspace.tsx')
  const ideas = source('components/ideas-discovery.tsx')
  assert.match(page, /PublicCoachingDiscovery/)
  assert.match(page, /'\/coaching'/)
  assert.match(alias, /permanentRedirect\('\/'\+locale\+'\/coaching'\)/)
  assert.match(home, /aiCoaching:\s*"\/" \+ locale \+ "\/coaching"/)
  assert.match(ideas, /const coachingHref = "\/" \+ locale \+ "\/coaching"/)
})

test('marketing and account discovery CTAs lead to the lounge rather than the private player', () => {
  const methods = source('components/home-core-methods.tsx')
  const direction = source('components/direction-offers.tsx')
  const academy = source('components/academy-hub.tsx')
  const traditions = source('components/academy-tradition-coaching-landing.tsx')
  const development = source('components/app/development-program.jsx')
  const business = source('components/app/business-coaching.jsx')
  const courses = source('components/app/my-courses-dashboard.jsx')

  assert.match(methods, /primaryPath:\s*"\/coaching"/)
  assert.match(methods, /href=\{"\/" \+ locale \+ method\.primaryPath\}/)
  assert.doesNotMatch(methods, /\/app\/coaching/)
  assert.match(direction, /const courseHref = direction === 'business'[\s\S]*?'\/' \+ locale \+ '\/coaching'/)
  assert.doesNotMatch(direction, /\/app\/coaching/)
  assert.match(development, /data-development-personal-coaching-course/)
  assert.match(development, /href=\{'\/' \+ lang \+ '\/coaching'\}/)
  assert.match(business, /href=\{'\/'\+lang\+'\/coaching'\}/)
  assert.match(courses, /data-personal-coaching-course-link/)
  assert.match(courses, /href=\{'\/' \+ \(locale==='ru'\?'ru':'en'\) \+ '\/coaching'\}/)
  for (const slug of ['egyptian', 'greek']) {
    assert.match(academy, new RegExp('coaching#coaching-tradition-' + slug))
  }
  assert.match(traditions, /"\/"\+locale\+"\/coaching#coaching-tradition-"\+slug/)
  assert.doesNotMatch(traditions, /\/app\/coaching/)
})

test('new model selection is public; explicit model start, resume and OAuth private URLs remain valid', () => {
  const lounge = source('components/public-coaching-discovery.jsx')
  const courses = source('components/app/my-courses-dashboard.jsx')
  const oauth = source('app/api/app/[...path]/route.js')
  const privatePage = source('app/[locale]/app/[[...path]]/page.jsx')
  assert.match(lounge, /id=\{traditionKey \? 'coaching-tradition-'\+traditionKey : undefined\}/)
  assert.match(lounge, /traditionHref=id=>/)
  assert.match(lounge, /privateCoachingLocale\+'\/app\/coaching\/'/)
  assert.match(courses, /href=\{started \|\| finished \?/)
  assert.match(courses, /\/app\/coaching\/'\+item\.id/)
  assert.match(oauth, /continueTo === 'coaching'/)
  assert.match(oauth, /\/app\/coaching/)
  assert.match(privatePage, /\['egyptian','greek'\]/)
})
