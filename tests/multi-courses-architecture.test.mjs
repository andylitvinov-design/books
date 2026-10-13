import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('multi-course DB migration replaces account singleton while preserving unique active cycle per course',()=>{
  const sql=read('supabase/migrations/20261013205000_hh_multicourse_subscription_entitlements.sql')
  assert.match(sql,/drop constraint if exists growth_courses_account_id_key/)
  assert.match(sql,/drop index if exists app_private\.growth_one_current_cycle/)
  assert.match(sql,/unique index if not exists growth_one_current_cycle_per_course/)
  assert.match(sql,/growth_courses_one_active_primary/)
  assert.match(sql,/growth_courses_active_owner/)
  assert.match(sql,/status in \('active','paused','completed','archived','locked'\)/)
})

test('all mutations select owner-scoped course and enforce server-side paid capacity',()=>{
  const course=read('lib/app/growth-course.js')
  const daily=read('lib/app/growth-daily.js')
  const cap=read('lib/app/course-membership.js')
  assert.match(course,/await lockCourseAccount\(db, actor\)/)
  assert.match(course,/await enforceCourseCapacity\(db, actor\)/)
  assert.match(course,/selection \? rows\.find\(item => item\.id === selection\)/)
  assert.match(daily,/course_id=\$2/)
  assert.match(daily,/assertCourseSlotAllowed\(db,actor,course\.id\)/)
  assert.match(cap,/COURSE_PLAN_LIMIT/)
})

test('private course read and export remain owner-scoped and encrypted',()=>{
  const daily=read('lib/app/growth-daily.js')
  const course=read('lib/app/growth-course.js')
  assert.match(daily,/openSealed\(target\.problem_label_ciphertext/)
  assert.match(daily,/seal\(reflection,context\(actor,id,'course\.session_note'\)/)
  assert.match(course,/openSealed\(row\.concerns_ciphertext/)
  assert.match(daily,/courseId:cycle\.course_id/)
})

test('billing cannot be activated by a browser-chosen tier or a success redirect',()=>{
  const billing=read('lib/app/course-billing.js')
  const webhook=read('app/api/stripe/holistic-course/route.js')
  const sql=read('supabase/migrations/20261013205000_hh_multicourse_subscription_entitlements.sql')
  assert.match(billing,/verifyStripeSignature/)
  assert.match(billing,/apply_course_billing_event/)
  assert.match(billing,/hh_account_id/)
  assert.match(webhook,/request\.headers\.get\('stripe-signature'\)/)
  assert.match(sql,/security definer set search_path = ''/)
  assert.match(sql,/revoke all on function app_private\.apply_course_billing_event/)
})

test('cabinet and daily cards have EN and RU copy and direct per-course selection',()=>{
  const daily=read('components/app/course-today.jsx')
  const grid=read('components/app/my-courses-dashboard.jsx')
  const menu=read('components/app/app-workspace.jsx')
  assert.match(daily,/courseId\?\s*'&courseId='/)
  assert.match(grid,/data-my-courses-dashboard/)
  assert.match(grid,/data-course-item/)
  assert.match(grid,/МОИ КУРСЫ/)
  assert.match(grid,/MY COURSES/)
  assert.match(menu,/Мои курсы/)
  assert.match(menu,/My courses/)
})
