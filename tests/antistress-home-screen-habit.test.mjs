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
    assert.ok(manifest.icons.every(icon => icon.src.startsWith('/opora-course-icon/')))
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

test('a verified first lesson offers device setup, while skipping leaves progress untouched', () => {
  const player = readFileSync('components/app/opora-experience-player.jsx', 'utf8')
  const today = readFileSync('components/app/course-today.jsx', 'utf8')
  const older = readFileSync('components/app/opora-v6-slide-player.jsx', 'utf8')
  const habit = readFileSync('components/pwa/course-home-screen-habit.jsx', 'utf8')

  assert.match(player, /cycle\.day===1\?\['weekOne','weekTwo','nextStep','habit'\]/)
  assert.match(player, /data-opora-first-lesson-habit-invitation/)
  assert.match(player, /data-opora-first-lesson-habit-setup/)
  assert.match(player, /habitSetup\?t\.next:t\.habitConfigure/)
  assert.match(player, /habitSetup\?t\.back:t\.habitLater/)
  assert.match(today, /habitSetupContent=\{<CourseHomeScreenHabit locale=\{locale\} embedded \/>\}/)
  assert.match(older, /cycle\.day===1&&<section className=\{styles\.habitOffer\}/)
  assert.match(older, /afterSave\?<\>/)
  assert.match(habit, /embedded = false/)
  assert.doesNotMatch(habit, /navigator\.getInstalledRelatedApps|queryPermission\('notifications'\)/)
})
