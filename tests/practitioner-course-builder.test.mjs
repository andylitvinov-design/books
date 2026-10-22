import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {randomUUID} from 'node:crypto'
import {COURSE_MEDIA_TYPES,normalizeCourseDraft,assertPublishableCourse,makeCourseSlug} from '../lib/practitioners/course-contracts.js'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const slide=(kind='text')=>({id:randomUUID(),kind,title:'Introduction',body:'Welcome'})
const draft=()=>({title:'Тантра Reiki — first steps',description:'One introduction',locale:'ru',slides:[slide()]})
test('course builder normalizes localized slide drafts and preserves order',()=>{
 const input=draft(),a=slide('image'),b=slide('audio'),c=slide('video'),d=slide('embed')
 a.assetId=randomUUID();b.assetId=randomUUID();c.assetId=randomUUID();d.videoUrl='https://youtu.be/dQw4w9WgXcQ?si=test'
 input.slides.push(a,b,c,d)
 const normalized=normalizeCourseDraft(input)
 assert.equal(normalized.slides.length,5)
 assert.deepEqual(normalized.slides.map(s=>s.id),input.slides.map(s=>s.id))
 assert.equal(normalized.slides[4].videoUrl,'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
 assert.equal(normalized.locale,'ru')
 assert.match(makeCourseSlug(input.title),/^[a-z0-9][a-z0-9-]{2,119}$/)
 assert.equal(normalized.slides[1].assetId,a.assetId)
 assert.ok(assertPublishableCourse(normalized))
})
test('rejects unsafe video links, duplicate IDs and unsupported slide types',()=>{
 const input=draft()
 input.slides[0]={...input.slides[0],kind:'embed',videoUrl:'https://evil.example/video'}
 assert.throws(()=>normalizeCourseDraft(input),{code:'INVALID_VIDEO_LINK'})
 const dup=draft();dup.slides.push({...dup.slides[0]})
 assert.throws(()=>normalizeCourseDraft(dup),{code:'DUPLICATE_SLIDE'})
 const no=draft();no.slides[0].kind='html'
 assert.throws(()=>normalizeCourseDraft(no))
})
test('empty and unverified attachments are never publishable',()=>{
 const d=draft()
 d.slides=[]
 assert.throws(()=>assertPublishableCourse(normalizeCourseDraft(d)),{code:'COURSE_SLIDES_REQUIRED'})
 d.slides=[{...slide('audio')}]
 assert.throws(()=>assertPublishableCourse(normalizeCourseDraft(d)),{code:'COURSE_MEDIA_REQUIRED'})
 d.slides=[{...slide('embed')}]
 assert.throws(()=>assertPublishableCourse(normalizeCourseDraft(d)),{code:'COURSE_VIDEO_LINK_REQUIRED'})
})
test('media budgets and allowlists have defined safe kinds',()=>{
 assert.equal(COURSE_MEDIA_TYPES['video/mp4'].max,25000000)
 assert.equal(COURSE_MEDIA_TYPES['audio/mpeg'].max,20000000)
 assert.equal(COURSE_MEDIA_TYPES['image/jpeg'].max,4000000)
 assert.equal(COURSE_MEDIA_TYPES['text/html'],undefined)
})
test('course RLS: dedicated private bucket and backend-only writes',()=>{
 const sql=read('supabase/migrations/20261021162000_hh_practitioner_course_builder.sql')
 assert.match(sql,/alter table app\.practitioner_courses enable row level security/i)
 assert.match(sql,/alter table app\.practitioner_course_assets enable row level security/i)
 assert.match(sql,/revoke all on app\.practitioner_courses,app\.practitioner_course_assets from public,anon,authenticated/i)
 assert.match(sql,/grant select,insert,update on app\.practitioner_courses,app\.practitioner_course_assets to hh_app_backend/i)
 assert.match(sql,/hh-practitioner-course-media','hh-practitioner-course-media',false/)
 assert.match(sql,/status='published' and published<>'\{\}'::jsonb/)
})
test('public course read uses published snapshot rather than pending draft',()=>{
 const repo=read('lib/practitioners/course-repository.js')
 assert.match(repo,/c\.status='published' and c\.published<>'\{\}'::jsonb/)
 assert.match(repo,/p\.status='approved' and p\.active/)
 assert.match(repo,/if\(reviewed!==true\)fail\('PUBLICATION_CONFIRMATION_REQUIRED'\)/)
 assert.match(repo,/where course_id=\$1 and practitioner_id=\$2 and status='ready'/)
 assert.match(repo,/expected_bytes/)
 assert.doesNotMatch(read('app/api/practitioner-course-media/[id]/route.js'),/\/storage\/v1\/object\/public\//)
})
test('existing materials and Academy catalog use new builder without replacing Reiki',()=>{
 const material=read('components/app/practice-materials.jsx')
 assert.match(material,/<PractitionerCourseBuilder locale=\{locale\} accountId=\{accountId\} searchQuery=\{query\} isOwner=\{isOwner\} onOpenYoutube=\{isOwner\?onOpenYoutube:null\}\/>/)
 assert.match(material,/data-open-reiki-course-audio/)
 assert.match(material,/data-practice-materials-courses-tab/)
 const academy=read('app/[locale]/academy/[[...slug]]/page.tsx')
 assert.match(academy,/<PublicPractitionerCourses locale=\{locale\}/)
 assert.match(read('components/public-practitioner-course-search.jsx'),/type="search"/)
 const player=read('components/public-practitioner-course-player.jsx')
 assert.match(player,/<audio className=\{styles\.audio\} controls preload="none"/)
 assert.match(player,/<video className=\{styles\.video\} controls playsInline preload="none"/)
 assert.doesNotMatch(player,/autoPlay/)
})


test('cabinet account switch, owner Reiki shortcut and signed-media origin are pinned',()=>{
 const route=read('app/api/app/practice/courses/route.js')
 assert.match(route,/request.headers.get\('x-hh-account-id'\)/)
 assert.match(route,/expectedAccount!==actor.id/)
 const builder=read('components/app/practitioner-course-builder.jsx')
 assert.match(builder,/const api=body=>request\(body,accountId\)/)
 assert.match(builder,/'x-hh-account-id':accountId/)
 const parent=read('components/app/practice-workspace.jsx')
 assert.match(parent,/onOpenReikiCourse=\{\(lesson,mode\)=>openOwner\('reikiCourse',undefined,lesson,mode\)\}/)
 assert.match(parent,/accountId=\{accountId\}/)
 const middleware=read('middleware.ts')
 assert.match(middleware,/practitionerCourseMediaOrigin/)
 assert.match(middleware,/practitionerCourseReader/)
})
test('published media is restricted to approved active practitioner and is seekable',()=>{
 const repo=read('lib/practitioners/course-repository.js')
 assert.match(repo,/join app\.practitioners p on p\.id=c\.practitioner_id/)
 assert.match(repo,/p\.status='approved' and p\.active and p\.public_profile<>'\{\}'::jsonb/)
 assert.match(repo,/asset\.published===true\?3600:120/)
 assert.match(repo,/master\.pending>=4/)
 assert.match(repo,/Number\(master\.total\)\+bytes>250000000/)
 assert.match(repo,/Number\(totals\.total\)\+bytes>120000000/)
 const picker=read('components/app/practitioner-course-builder.jsx')
 assert.match(picker,/image\/heic,image\/heif/)
})
