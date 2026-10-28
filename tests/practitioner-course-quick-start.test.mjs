import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const builder=read('components/app/practitioner-course-builder.jsx')
const styles=read('components/app/practitioner-course-builder.module.css')
const materials=read('components/app/practice-materials.jsx')

test('a course starts with its author-entered title and first editable screen',()=>{
 assert.match(builder,/data-course-quick-start/)
 assert.match(builder,/const title=newTitle\.trim\(\)/)
 assert.match(builder,/if\(!title\)\{setError\(t\.enterTitle\);return\}/)
 const makeSlide=builder.match(/^const makeSlide=([^\n]+)$/m)?.[1]
 const isMeditation=builder.match(/const isMeditation=([^\n]+)/)?.[1]
 const course=builder.match(/const course=([^\n]+)\n\s+const \{item\}=await api\(\{action:'create',course\}\)/)?.[1]
 assert.ok(makeSlide&&isMeditation&&course,'Execute the actual create payload and slide factory')
 const id='11111111-1111-4111-8111-111111111111'
 for(const [meditationType,contentType,kind] of [['','course','text'],['unknown','course','text'],
  ['audio','audio_meditation','audio'],['video','video_meditation','video']]){
  const actual=vm.runInNewContext('const title=newTitle.trim();const makeSlide='+makeSlide+
   ';const isMeditation='+isMeditation+';('+course+')',{
    newTitle:'  Synthetic author title  ',newLocale:'ru',meditationType,crypto:{randomUUID:()=>id},
   },{timeout:1000})
  assert.deepEqual(JSON.parse(JSON.stringify(actual)),{title:'Synthetic author title',description:'',locale:'ru',
   contentType,slides:[{id,kind,title:'',body:''}]})
 }
 assert.doesNotMatch(builder,/title:t\.new,description:'',locale:/)
 assert.match(builder,/onSubmit=\{event=>void create\(event\)\}/)
 const initialCreate=builder.match(/setCreating\((Boolean\(startCreate\)[^\n]+)\)/)?.[1]
 assert.ok(initialCreate,'Actual initial create-mode decision is required')
 for(const [startCreate,list,expected] of [[false,[],true],[false,[{id:'synthetic'}],false],
  [true,[],true],[true,[{id:'synthetic'}],true]])
  assert.equal(vm.runInNewContext(initialCreate,{startCreate,list},{timeout:1000}),expected)
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
