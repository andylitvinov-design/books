import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const file = path => readFileSync(path, 'utf8')

test('OPORA pre-enrolment shows exactly the first seven authored lessons in EN/RU/ES', () => {
  const slide = file('components/app/opora-first-week-invite.jsx')
  const curriculum = file('lib/inner-growth/anti-stress-blueprint.js')
  const scheme = file('lib/inner-growth/anti-stress-day-scheme.js')
  assert.match(slide, /oporaPracticalSkillCards\(lang\)/)
  assert.match(slide, /firstWeek\.map\(\(lesson\) =>/)
  assert.match(slide, /data-opora-preview-day=\{lesson\.day\}/)
  assert.match(curriculum, /antiStressPublicPlanV7\(lang\)/)
  assert.match(scheme, /export function antiStressPublicPlanV7/)
  for (const locale of ['ru', 'en', 'es']) {
    assert.match(slide, new RegExp('^  ' + locale + ': \\{', 'm'))
  }
  assert.match(slide, /No automatic enrolment/)
  assert.match(slide, /Никакой автоматической записи/)
  assert.match(slide, /Sin inscripción automática/)
})

test('guest and signed-in fast entry reuse one programme slide before their actions', () => {
  const guest = file('components/app/course-guest-landing.jsx')
  const course = file('components/app/my-course.jsx')
  const intro = file('components/app/opora-first-week-invite.jsx')
  assert.match(guest, /if \(compact && stressSignup\) return/)
  assert.match(guest, /<OporaFirstWeekInvite locale=\{locale\} signedOut onAccept=\{onStart\}/)
  assert.match(course, /if \(stage === 0 && fastAntistressEntry\) return/)
  assert.match(course, /<OporaFirstWeekInvite locale=\{locale\} busy=\{busy\}/)
  assert.match(course, /onAccept=\{\(\) => void confirmFastStart\(\)\}/)
  assert.match(course, /await act\('start',\{consent:true,programId:intent\.programId\}\)/)
  assert.match(intro, /onClick=\{onAccept\} data-opora-week-one-accept/)
  assert.match(intro, /data-opora-fast-consent=\{signedOut \? undefined : ''\}/)
  assert.match(intro, /data-course-google-signin=\{signedOut \? '' : undefined\}/)
  assert.match(intro, /disabled=\{busy \|\| disabled\}/)
})

test('deep link does not auto-launch OAuth or write course without affirmative click', () => {
  const workspace = file('components/app/app-workspace.jsx')
  assert.doesNotMatch(workspace, /quickAuthAttempted|void signin\(\)/)
  assert.match(workspace, /<CourseGuestLanding locale=\{locale\} onStart=\{signin\}/)
  const intro = file('components/app/opora-first-week-invite.jsx')
  assert.doesNotMatch(intro, /useEffect|appFetch|localStorage|sessionStorage/)
  assert.match(intro, /onAccept=|onClick=\{onAccept\}/)
})

test('mobile seven-day slide keeps compact 2-column layout and short-height fallback', () => {
  const css = file('components/app/opora-first-week-invite.module.css')
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.match(css, /@media\(max-width:350px\)/)
  assert.match(css, /@media\(max-height:670px\) and \(max-width:470px\)/)
  assert.match(css, /\.accept:focus-visible/)
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/)
})
