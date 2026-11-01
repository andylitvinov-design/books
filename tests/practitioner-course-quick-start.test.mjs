import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const builder=read('components/app/practitioner-course-builder.jsx')
const styles=read('components/app/practitioner-course-builder.module.css')
const materials=read('components/app/practice-materials.jsx')

test('a course starts with its author-entered title and first editable screen',()=>{
 assert.match(builder,/data-course-quick-start/)
 assert.match(builder,/const title=newTitle\.trim\(\)/)
 assert.match(builder,/if\(!title\)\{setError\(t\.enterTitle\);return\}/)
 assert.match(builder,/course=\{title,description:'',locale:newLocale,slides:\[makeSlide\(\)\]\}/)
 assert.doesNotMatch(builder,/title:t\.new,description:'',locale:/)
 assert.match(builder,/onSubmit=\{event=>void create\(event\)\}/)
 assert.match(builder,/setCreating\(!list\.length\)/)
})

test('editing stays in one workspace and protects pending changes and active slide',()=>{
 assert.match(builder,/applyItem\(item,\{keepSlide:true\}\)/)
 assert.match(builder,/setSlideId\(previous=>keepSlide&&item\.draft\.slides\?\.some/)
 assert.match(builder,/if\(dirty&&!creating&&!window\.confirm\(t\.discard\)\)return/)
 assert.match(builder,/setDraft\(JSON\.parse\(JSON\.stringify\(current\.draft\)\)\)/)
 assert.match(builder,/data-mobile-open=\{listOpen\}/)
 assert.match(styles,/\.courseList\[data-mobile-open="false"\]\{display:none\}/)
 assert.match(styles,/min-height:44px/)
 assert.match(materials,/Create or edit course/)
 assert.match(materials,/<PractitionerCourseBuilder locale=\{locale\} accountId=\{accountId\}/)
})

test('one-screen controls support duplication, ordering, progress and safe preview',()=>{
 assert.match(builder,/function duplicateSlide\(\)/)
 assert.match(builder,/id:crypto\.randomUUID\(\)/)
 assert.match(builder,/function nextSlide\(\)/)
 assert.match(builder,/data-course-slide-preview/)
 assert.match(builder,/preload="none"/)
 assert.doesNotMatch(builder,/autoPlay\s*=/)
 assert.match(builder,/t\.stepName/)
 assert.match(builder,/t\.stepBuild/)
 assert.match(builder,/t\.stepPublish/)
})

test('publishing is explicit and private until validated',()=>{
 assert.match(builder,/const publishIssue=/)
 assert.match(builder,/disabled=\{busy\|\|uploading\|\|recording\|\|!!publishIssue\}/)
 assert.match(builder,/window\.confirm\(t\.confirm\)/)
 assert.match(builder,/reviewed:action==='publish'/)
 assert.match(builder,/action:'save',id:current\.id,expectedRevision:current\.revision/)
 assert.match(builder,/'x-hh-account-id':accountId/)
 for(const key of ['en:{advancedActions:','ru:{advancedActions:','es:{advancedActions:']) assert.ok(builder.includes(key))
})
