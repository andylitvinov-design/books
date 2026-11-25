import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8')
const day = read('components/app/course-today.jsx')
const entry = read('components/app/course-immersive-start.jsx')
const css = read('components/app/course-immersive-start.module.css')
const theme = read('components/app/my-course-theme.css')

test('immersive Today is Anti-Stress only; other programmes, Path and Details remain available', () => {
  assert.match(day, /immersiveStart=view==='today'&&data\.programme\?\.id==='stress'/)
  assert.match(day, /data-course-immersive=\{immersiveStart\?'true':undefined\}/)
  assert.match(day, /\{immersiveStart&&<CourseImmersiveStart/)
  assert.match(day, /\{!immersiveStart&&<header className=\{styles\.questHero\}/)
  assert.match(day, /onViewChange=\{setView\}/)
  assert.match(day, /onBack=\{\(\)=>onExit\?\.\(\)\}/)
  assert.match(day, /data-course-today-trends/)
  assert.match(day, /view==='path'/)
  assert.match(day, /view==='details'/)
})

test('progress and day labels use the authenticated saved roadmap, not mock values', () => {
  assert.match(day, /roadmap=\{data\.roadmap\|\|\[\]\}/)
  assert.match(day, /completed=\{progress\.practiceCount\|\|0\}/)
  assert.match(day, /duration=\{cycle\.durationDays\}/)
  assert.match(entry, /days\.map\(item =>/)
  assert.match(entry, /item\.workbookSkill \|\| item\.title \|\| item\.heading/)
  assert.match(entry, /item\.status === 'completed'/)
  assert.match(entry, /aria-current=\{isCurrent \? 'step' : undefined\}/)
  assert.match(entry, /<progress value=\{safeCompleted\} max=\{safeDuration\}/)
  assert.doesNotMatch(entry, /localStorage|sessionStorage|fetch\(|healthScore|clinicalScore/)
})

test('primary action retains the existing protected lesson-start behavior', () => {
  assert.match(day, /onStart=\{startFocusLesson\}/)
  assert.match(day, /actionDisabled=\{busy\|\|\(paused&&resumeBlocked\)\}/)
  assert.match(day, /if\(!mounted\.current\|\|generation\.current!==focusEpoch/)
  assert.match(day, /if\(paused\)\{void submit\('resume'/)
  assert.match(day, /if\(data\.finalRetest\?\.ready\)\{showFinalRetest\(\)/)
  assert.match(entry, /data-course-today-primary onClick=\{onStart\}/)
  assert.match(day, /'Start my course'/)
})

test('full-bleed natural photo and readable gradient remain limited to Today', () => {
  assert.match(css, /course-focus-mountain-boy\.webp/)
  assert.match(css, /min-height:\s*100svh/)
  assert.match(css, /background-size:\s*cover/)
  assert.match(css, /background-image:\s*linear-gradient/)
  assert.match(css, /\.benefits/)
  assert.match(css, /\.cta/)
  assert.doesNotMatch(css, /saturate\(|backdrop-filter:/)
  assert.match(theme, /\.hh-app:has\(\[data-course-immersive="true"\]\)/)
  assert.match(theme, /\.hh-mobile-app-nav\{display:none!important\}/)
  assert.match(css, /prefers-reduced-motion:reduce/)
  assert.match(entry, /'use client'/)
})
