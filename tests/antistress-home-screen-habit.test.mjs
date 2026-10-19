import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('OPORA has a dedicated installable manifest per public language', () => {
  for (const locale of ['en', 'ru', 'es']) {
    const manifest = JSON.parse(readFileSync('public/opora-antistress-' + locale + '.webmanifest', 'utf8'))
    assert.equal(manifest.id, '/opora-antistress')
    assert.equal(manifest.display, 'standalone')
    assert.equal(manifest.start_url, '/' + (locale === 'ru' ? 'ru' : 'en') + '/app/course?program=stress')
    assert.equal(manifest.icons.length, 2)
    assert.ok(manifest.icons.every(icon => icon.type === 'image/png'))
  }
})

test('course install manifest is selected on public and client course routes', () => {
  const publicPage = readFileSync('app/[locale]/courses/antistress/page.tsx', 'utf8')
  const clientPage = readFileSync('app/[locale]/app/[[...path]]/page.jsx', 'utf8')
  assert.match(publicPage, /manifest:.*opora-antistress-/)
  assert.match(clientPage, /path\[0\] === 'course'/)
  assert.equal((clientPage.match(/manifest:/g) || []).length, 1)
})

test('voluntary YouTube guide is visible without pretending that web apps can intercept other apps', () => {
  const component = readFileSync('components/pwa/course-home-screen-habit.jsx', 'utf8')
  const landing = readFileSync('components/public-antistress-landing.tsx', 'utf8')
  const myCourse = readFileSync('components/app/my-course.jsx', 'utf8')
  assert.match(component, /beforeinstallprompt/)
  assert.match(component, /Show Alert/)
  assert.match(component, /setYoutubeHelp/)
  assert.match(component, /Holistic House cannot see when you open YouTube/)
  assert.match(component, /Давай сначала пройдём короткий урок/)
  assert.match(landing, /<CourseHomeScreenHabit locale=\{locale\}/)
  assert.match(myCourse, /<CourseHomeScreenHabit locale=\{locale\}/)
})
