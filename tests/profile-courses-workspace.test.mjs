import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { isUnifiedMobileDockAppPath,isUnifiedMobileDockPath,unifiedMobileDockActive } from '../lib/unified-mobile-dock.mjs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('singular My Space course routes keep the seven-icon fixed dock on EN/RU/ES',()=>{
 for(const locale of ['en','ru','es']) for(const route of ['/app/course','/app/course/']){
   const path='/'+locale+route
   assert.equal(isUnifiedMobileDockAppPath(path),true,path)
   assert.equal(isUnifiedMobileDockPath(path),true,path)
   assert.equal(unifiedMobileDockActive(path),'profile',path)
 }
 assert.equal(isUnifiedMobileDockAppPath('/en/app/courseware'),false)
})
test('guest course error and signed-in course retain My Space top tabs and two course choices',()=>{
 const src=read('components/app/app-workspace.jsx')
 assert.ok(src.includes("if (state !== 'ready' && page === 'course')"))
 assert.ok(src.includes('<ProfileHubTabs locale={locale} active="courses" />'))
 assert.ok(src.includes('<ProfileCoursesSwitch locale={locale} mode={courseChoiceMode} />'))
 assert.ok(src.includes('<ProfileCoursesGuest locale={locale} mode={courseChoiceMode} busy={busy}'))
 assert.ok(src.includes('<MyCourse data={data} locale={locale} />'))
 assert.ok(!src.includes("if (state !== 'ready' && page === 'course' && state !== 'unavailable')"))
})
test('guest exploration is real public content and private saved courses require OAuth',()=>{
 const src=read('components/app/profile-courses-switch.jsx')
 assert.ok(src.includes('data-course-switch="discover"'))
 assert.ok(src.includes('data-course-switch="saved"'))
 assert.ok(src.includes('data-profile-courses-google'))
 assert.ok(src.includes('telegramAvailable &&'))
 assert.ok(src.includes('/courses/antistress'))
 assert.ok(src.includes('/academy/principles-of-energywork/learn'))
 assert.ok(!src.includes('localStorage')&&!src.includes('fetch('))
 const css=read('components/app/profile-courses-switch.module.css')
 assert.ok(css.includes('min-height:50px')&&css.includes('min-height:52px'))
})
test('signed-in discover opens existing selection without auto-resuming; saved course history remains',()=>{
 const src=read('components/app/my-course.jsx')
 const dashboard=read('components/app/my-courses-dashboard.jsx')
 assert.ok(src.includes("const coursesIndexEntry = searchParams.get('view') === 'courses'"))
 assert.ok(src.includes("const coursesDiscoverEntry = searchParams.get('view') === 'discover'"))
 assert.ok(src.includes("setView(coursesIndexEntry ? 'list' : coursesDiscoverEntry ? 'new'"))
 assert.ok(src.includes('openPrimaryToday: !coursesIndexEntry && !coursesDiscoverEntry'))
 assert.ok(src.includes('<MyCoursesDashboard'))
 assert.ok(src.includes('disabled={busy || atLimit}'))
 assert.ok(src.includes('consent: true'))
 assert.ok(dashboard.includes("['completed','archived','closed']"))
})
