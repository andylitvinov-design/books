import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('each coaching course has its own localized public Academy detail page',()=>{
  const page=read('app/[locale]/academy/[[...slug]]/page.tsx')
  const landing=read('components/academy-tradition-coaching-landing.tsx')
  const hub=read('components/academy-hub.tsx')
  const css=read('components/academy-tradition-coaching-landing.module.css')
  for(const slug of ['egyptian','greek']){
    assert.ok(page.includes('if (key === "coaching/'+slug+'") return <AcademyTraditionCoachingLanding'),slug)
    assert.ok(!hub.includes('href: "/" + locale + "/academy/coaching/'+slug+'"'),slug+' stays only in Coaching catalog')
    assert.ok(landing.includes('"/"+locale+"/coaching#coaching-tradition-"+slug'),slug+' Start through public coaching lounge')
    assert.ok(landing.includes(slug+': {'),slug+' original eight-level course')
    assert.ok(landing.includes('slug:TraditionSlug'),slug+' typed route')
  }
  assert.ok(page.includes('traditionBySlug("egyptian")?.name[locale]'))
  assert.ok(page.includes('traditionBySlug("greek")?.name[locale]'))
  assert.ok(page.includes('ancientCourse.description[locale]'))
  assert.ok(landing.includes('steps[slug][locale].map('))
  for(const language of ['en','ru','es'])assert.match(landing,new RegExp('\\b'+language+':\\s*\\{'))
  assert.ok(landing.includes('const courseHref=(locale:PublicLocale,slug:TraditionSlug)'), 'Public session link carries the original EN/RU/ES locale')
  assert.ok(landing.includes('courseHref(locale,slug)'), 'prominent start link')
  assert.ok(landing.includes('<PublicSiteHeader'), 'same site navigation')
  assert.ok(css.includes('@media(max-width:420px)'), 'mobile layout')
  assert.ok(css.includes(':focus-visible'), 'keyboard focus')
  assert.doesNotMatch(landing,/localStorage|sessionStorage|dangerouslySetInnerHTML|autoPlay/)
})

test('ancient coaching progress API stays private without duplicate My Courses promotions',()=>{
 const repo=read('lib/app/personal-coaching.js')
 const api=read('app/api/app/[...path]/route.js')
 const courses=read('components/app/my-courses-dashboard.jsx')
 const lounge=read('components/public-coaching-discovery.jsx')
 assert.match(repo,/export async function readTraditionCoachingSummaries/)
 assert.match(repo,/await assertAccount\(db,actor\)/)
 assert.match(api,/joined === 'tradition-coaching-summary'/)
 assert.doesNotMatch(courses,/data-ancient-coaching-courses|data-tradition-course-card|traditionProgress/)
 assert.match(courses,/data-personal-coaching-course-link/)
 assert.match(lounge,/data-coaching-tradition=\{traditionKey\}/)
})

test('existing GROW, historic business course and client privacy boundaries stay intact',()=>{
  const api=read('app/api/app/[...path]/route.js')
  const coach=read('lib/app/personal-coaching.js')
  const template=read('lib/personal-coaching/traditions.js')
  const business=read('lib/app/business-coaching.js')
  assert.match(api,/joined === 'personal-coaching'/)
  assert.match(api,/joined === 'tradition-coaching'/)
  assert.match(business,/app_private\.business_coaching_programs/)
  assert.match(coach,/course\.traditionTracks\[template\]/)
  assert.match(coach,/seal\(course,sealContext\(actor\),config\)/)
  assert.match(coach,/PERSONAL_COACH_REVISION_CONFLICT/)
  assert.match(coach,/MAX_TRADITION_HISTORY=2/)
  assert.match(template,/hh-egyptian-goal-planning-v1/)
  assert.match(template,/hh-greek-goal-planning-v1/)
  assert.doesNotMatch(coach,/autoSend|sendWhatsapp|sendTelegram|sendEmail|publishLesson/)
})
