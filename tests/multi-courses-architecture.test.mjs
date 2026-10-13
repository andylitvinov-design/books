import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
test('concurrent schema is a guarded proposal preserving old course and cycle IDs',()=>{
 const sql=read('docs/billing/proposed-concurrent-course-schema.sql')
 assert.match(sql,/RAISE EXCEPTION 'UNAPPLIED CONCURRENT COURSE PROPOSAL/)
 assert.match(sql,/DROP CONSTRAINT growth_courses_account_id_key/)
 assert.match(sql,/UNIQUE INDEX growth_one_current_cycle_per_course/)
 assert.match(sql,/growth_courses_one_active_primary/)
 assert.doesNotMatch(sql,/DELETE FROM|SET status='paused'|SET status='locked'/i)
 assert.equal(existsSync(new URL('../supabase/migrations/20261013205000_hh_multicourse_subscription_entitlements.sql',import.meta.url)),false)
})
test('application and independent SQL trigger use account-locked owner-derived quota',()=>{
 const course=read('lib/app/growth-course.js'),daily=read('lib/app/growth-daily.js'),access=read('lib/app/course-access.js'),sql=read('docs/billing/proposed-concurrent-course-schema.sql')
 assert.match(course,/await lockCourseOwner\(db, actor\)/);assert.match(course,/await requireCourseCapacity\(db, actor, config\)/)
 assert.match(access,/FOR UPDATE/i);assert.match(access,/account_id=\$1/);assert.match(daily,/course_id=\$2/)
 assert.match(sql,/owner IS DISTINCT FROM auth.uid\(\)/);assert.match(sql,/growth_course_capacity BEFORE INSERT OR UPDATE OF status/)
 assert.match(sql,/paid_through_at>clock_timestamp\(\)/);assert.match(sql,/pg_advisory_xact_lock/)
})
test('dashboard adapter cannot introduce a second billing store or browser entitlement',()=>{
 assert.match(read('lib/inner-growth/course-plans.js'),/subscriptionEntitlement/)
 for(const file of ['lib/app/course-billing.js','lib/app/course-membership.js','app/api/stripe/holistic-course/route.js'])assert.equal(existsSync(new URL('../'+file,import.meta.url)),false,file)
 assert.match(read('components/app/my-courses-dashboard.jsx'),/canStartCheckout/)
})
test('explicit close preserves private history and owner export includes every course',()=>{
 const course=read('lib/app/growth-course.js'),daily=read('lib/app/growth-daily.js'),ui=read('components/app/course-today.jsx'),route=read('app/api/app/[...path]/route.js')
 assert.match(course,/action === 'close'/);assert.match(course,/async exportHistory\(actor\)/)
 assert.match(course,/openSealed\(row.concerns_ciphertext/);assert.match(daily,/courseId:cycle.course_id/)
 assert.match(route,/exported.growthCourses/);assert.match(ui,/data-course-readonly-history/);assert.match(ui,/data.readOnly\|\|!isCurrent/)
})
test('five-tab Profile and quest navigation remains present with plural course labels',()=>{
 const menu=read('components/app/app-workspace.jsx'),daily=read('components/app/course-today.jsx')
 assert.match(menu,/Мои курсы/);assert.match(menu,/My courses/);assert.match(menu,/page === 'portrait'/)
 assert.match(daily,/CourseQuestMap/);assert.match(daily,/CourseSlidePlayer/);assert.match(daily,/'X-HH-Account-ID':accountId/)
})
