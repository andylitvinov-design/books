import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read = path => readFileSync(new URL('../'+path, import.meta.url),'utf8')
const source = read('components/app/profile-goal-console.jsx')
const css = read('components/app/profile-goal-console.module.css')
test('goal program landing and selected goal are mutually exclusive after loading',()=>{
  assert.ok(source.includes('const showLanding = ready && !selected'))
  assert.ok(source.includes('{showLanding && <header'))
  assert.ok(source.includes('{selected && !view.loading && !view.error && <>'))
  assert.ok(source.includes('data-goal-program-active'))
  assert.ok(source.includes('data-goal-program-landing'))
  assert.ok(source.includes('const startHref = root + \'/daybook?start=vector\''))
  assert.ok(source.includes('href="#goal-program-stages"'))
  for(const label of ['Start Program','Начать программу','Iniciar programa','Program Details','О программе','Ver programa']) assert.ok(source.includes(label))
})
test('selected goal retains verified progress, exact resume and in-page accordion',()=>{
  assert.ok(source.includes('guideGoalProgress(courseView.entries, goalId)'))
  assert.ok(source.includes('profileDaybookHref(root, goalId, next.week, next.step)'))
  assert.ok(source.includes('data-goal-current-lesson={next.week}'))
  assert.ok(source.includes('next?.week === index + 1'))
  assert.ok(source.includes('href={profileDaybookHref(root, goalId, index + 1)}'))
  assert.ok(source.includes('hidden={!expanded}'))
  assert.ok(source.includes("overall === null ? '—'"))
  assert.ok(css.includes('GOAL_PROGRAM_TWO_STATES_20261124'))
  assert.ok(css.includes('font:400 14px/1.35 system-ui'))
  assert.ok(css.includes('@media(max-width:374px)'))
})
