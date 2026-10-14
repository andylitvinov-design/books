import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const player = read('components/app/course-slide-player.jsx')
const playerCss = read('components/app/course-slide-player.module.css')
const today = read('components/app/course-today.jsx')
const todayCss = read('components/app/course-today.module.css')
const journey = read('components/app/course-quest.jsx')
const journeyCss = read('components/app/course-quest.module.css')
const focus = read('components/app/course-focus-entry.jsx')
const selector = read('components/app/course-entry-selector.jsx')
const onboarding = read('components/app/my-course.jsx')
const focusCss = read('components/app/course-focus-entry.module.css')
const photo = '/images/holistic-house/course-focus-mountain-boy.webp'

test('all course surfaces reuse the approved standalone scenic art asset', () => {
  const asset = statSync(new URL('../public' + photo, import.meta.url))
  assert.ok(asset.size > 20_000)
  for (const source of [focus, player, today, journey, selector, onboarding]) {
    assert.ok(source.includes(photo), 'Course surface must use the same scenic artwork')
  }
  assert.match(player, /data-scene-kind=\{kind\}/)
  assert.match(player, /<SceneIcon size=\{23\}/)
  assert.match(playerCss, /\.overlay \.scenicImage\{/)
  assert.match(playerCss, /object-fit:cover/)
  assert.match(todayCss, /\.todayVisual \.heroPerson\{/)
  assert.match(journeyCss, /\.mapShell \.journeyScene\{/)
  assert.match(focusCss, /100dvh/)
})

test('each semantic learning unit has the same scene presentation but retains unique readable content', () => {
  for (const kind of ['pace','baseline','recall','idea','understand','phrase','guided','ritual','transfer','symbol','reflection','moment','feedback']) {
    assert.match(player, new RegExp("slide\\.kind === '" + kind + "'"))
    assert.match(player, new RegExp('' + kind + ':'))
  }
  assert.match(player, /<IllustratedMoment kind=\{slide\.kind\}\/>/)
  assert.doesNotMatch(player, /<div className=\{styles\.bigIcon\}>/)
  assert.match(player, /data-slide-kind=\{promoOpen/)
  assert.match(player, /data-art="celebration"/)
  assert.match(playerCss, /\.content\[data-slide-kind=guided\]/)
  assert.match(playerCss, /\.content\[data-slide-kind=feedback\]/)
  assert.match(playerCss, /@media\(max-height:680px\)/)
})

test('no course visuals change the real persisted 14-day progress and safe one-action flow', () => {
  assert.match(player, /onSession\(\{/)
  assert.match(player, /if \(response\) \{ sessionOp\.current = null; setEarned\(true\); setIndex\(slides\.length\) \}/)
  assert.match(player, /data-slide-scroller/)
  assert.match(player, /role="dialog" aria-modal="true"/)
  assert.match(playerCss, /safe-area-inset-bottom/)
  assert.match(playerCss, /prefers-reduced-motion:reduce/)
  assert.match(playerCss, /\.overlay \.primary\{/)
  assert.match(player, /aria-pressed=\{value === i\}/)
  assert.match(player, /onPreferences\(next\)/)
  assert.doesNotMatch(player, /localStorage|sessionStorage|dangerouslySetInnerHTML/)
})
