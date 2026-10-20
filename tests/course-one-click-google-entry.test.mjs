import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const course = source('components/app/my-course.jsx')
const guest = source('components/app/course-guest-landing.jsx')
const workspace = source('components/app/app-workspace.jsx')
const guestCss = source('components/app/course-guest-landing.module.css')

test('signed-in learner starts on a single deliberate CTA, without another consent modal', () => {
  assert.match(course, /function startSelectedCourse\(presetId = null, programId = null\)/)
  assert.match(course, /void act\('start', values\)/)
  assert.match(course, /const values = \{ consent: true/)
  assert.match(course, /action: 'start', consent: true, courseId: requestedCourseId/)
  assert.doesNotMatch(course, /<dialog ref=\{startDialogRef\}/)
  assert.doesNotMatch(course, /<input type="checkbox" checked=\{optIn\}/)
  assert.match(course, /Your course choices, optional notes and practice progress are saved privately/)
})

test('guest sees short Google sign-in card and OAuth returns to selected course', () => {
  assert.match(workspace, /<CourseGuestLanding locale=\{locale\} onStart=\{signin\} busy=\{busy\} stressSignup=\{stressSignup\} compact/)
  assert.match(guest, /if \(compact\) return/)
  assert.match(guest, /data-course-guest-invite/)
  assert.match(guest, /data-course-google-signin/)
  assert.match(guest, /onClick=\{onStart\}/)
  assert.match(guest, /inviteProgress/)
  assert.match(guestCss, /@media\(max-width:660px\)/)
  assert.match(workspace, /appFetch\('auth\/start'/)
  assert.match(workspace, /continueTo: 'course'/)
  assert.match(workspace, /window\.location\.assign\(result\.redirectUrl\)/)
})
