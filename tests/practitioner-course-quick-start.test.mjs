import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {mountPractice,fictionalCourse} from './helpers/practice-quick-start-fixture.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const builder=read('components/app/practitioner-course-builder.jsx')
const styles=read('components/app/practitioner-course-builder.module.css')
const materials=read('components/app/practice-materials.jsx')

test('a course starts with its author-entered title and first editable screen',()=>{
 assert.match(builder,/data-course-quick-start/)
 assert.match(builder,/const title=newTitle\.trim\(\)/)
 assert.match(builder,/if\(!title\)\{setError\(t\.enterTitle\);return\}/)
 // Actual submit-handler cases below prove normal and meditation slide construction,
 // rather than freezing the obsolete single-branch object-literal spelling.
 assert.doesNotMatch(builder,/title:t\.new,description:'',locale:/)
 assert.match(builder,/onSubmit=\{event=>void create\(event\)\}/)
 // #1662 preserves empty-list quick start and adds the explicit Pro entry.
 assert.match(builder,/startCreate=false/)
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

for(const count of [0,1])for(const startCreate of [false,true])test(`course load: ${count} saved courses, explicit quick entry ${startCreate}`,async()=>{
 const f=mountPractice(builder,{accountId:'fictional-account',startCreate},async()=>({ok:true,json:async()=>({items:count?[fictionalCourse()]:[]})}))
 assert.equal(f.nodes().filter(n=>n.type==='form').length,0,'No quick form while loading')
 await f.settle()
 assert.equal(f.nodes().filter(n=>n.type==='form').length,startCreate||!count?1:0)
 assert.equal(f.requests.length,1)
 assert.equal(f.requests[0].options.method,'GET','Opening never creates a draft')
 assert.equal(f.requests[0].options.headers['x-hh-account-id'],'fictional-account')
 f.unmount()
})

test('explicit quick start validates title and creates exactly one private first-slide draft only on submit',async()=>{
 const f=mountPractice(builder,{accountId:'fictional-account',startCreate:true},async(_url,options)=>{
  const sent=options.body&&JSON.parse(options.body)
  return {ok:true,json:async()=>sent?{item:{...fictionalCourse(),draft:sent.course}}:{items:[fictionalCourse()]}}
 })
 await f.settle()
 const submit=()=>f.find('form').props.onSubmit({preventDefault(){}})
 submit();await f.settle()
 assert.equal(f.requests.length,1,'Blank title does not POST')
 f.find('input',p=>p.required).props.onChange({target:{value:'  Fictional new course  '}});f.flush()
 submit();await f.settle()
 assert.equal(f.requests.length,2)
 const sent=JSON.parse(f.requests[1].options.body)
 assert.equal(f.requests[1].options.method,'POST')
 assert.equal(f.requests[1].options.headers['x-hh-account-id'],'fictional-account')
 assert.equal(sent.action,'create')
 assert.equal(sent.course.title,'Fictional new course')
 assert.equal(sent.course.description,'')
 assert.equal(sent.course.locale,'en')
 assert.equal(sent.course.slides.length,1)
 assert.equal(sent.course.slides[0].kind,'text')
 assert.match(sent.course.slides[0].id,/^[0-9a-f-]{36}$/)
 assert.equal(f.nodes().filter(n=>n.type==='form').length,0,'Confirmed draft opens editor')
 assert.ok(f.nodes().some(n=>n.type==='input'&&n.props.value==='Fictional new course'))
 assert.ok(!f.requests.some(r=>r.options.body&&JSON.parse(r.options.body).action==='publish'))
 f.unmount()
})

test('load failure stays recoverable without showing an empty or auto-created course',async()=>{
 let fail=true
 const f=mountPractice(builder,{startCreate:true},async()=>({ok:!fail,json:async()=>fail?{error:'FICTIONAL_UNAVAILABLE'}:{items:[]}}))
 await f.settle()
 assert.equal(f.nodes().filter(n=>n.type==='form').length,0)
 assert.ok(f.nodes().some(n=>n.props.role==='status'))
 fail=false
 f.find('button',p=>p.children==='Try again').props.onClick();f.flush();await f.settle()
 assert.equal(f.nodes().filter(n=>n.type==='form').length,1)
 assert.equal(f.requests.length,2)
 assert.ok(f.requests.every(r=>r.options.method==='GET'))
 f.unmount()
})

test('old account response cannot replace the newest account course selection',async()=>{
 let finishOld
 const f=mountPractice(builder,{accountId:'fictional-old'},async(_url,options)=>options.headers['x-hh-account-id']==='fictional-old'?new Promise(resolve=>{finishOld=resolve}):({ok:true,json:async()=>({items:[fictionalCourse('Newest fictional course')]})}))
 f.update({accountId:'fictional-new'});await f.settle()
 finishOld({ok:true,json:async()=>({items:[fictionalCourse('Old fictional course')]})});await f.settle()
 assert.ok(f.nodes().some(n=>n.type==='input'&&n.props.value==='Newest fictional course'))
 assert.ok(!f.nodes().some(n=>n.type==='input'&&n.props.value==='Old fictional course'))
 assert.ok(f.requests.every(r=>r.options.method==='GET'))
 f.unmount()
})

for(const meditationType of ['audio','video','embed'])test(`actual quick-start ${meditationType} keeps one private first slide and authored title`,async()=>{
 const f=mountPractice(builder,{accountId:'fictional-account',startCreate:true,meditationType},async(_url,options)=>{
  const sent=options.body&&JSON.parse(options.body)
  return {ok:true,json:async()=>sent?{item:{...fictionalCourse(),draft:sent.course}}:{items:[]}}
 })
 await f.settle()
 const submit=()=>f.find('form').props.onSubmit({preventDefault(){}})
 submit();await f.settle()
 assert.equal(f.requests.length,1,'Blank title must not create a meditation either')
 f.find('input',p=>p.required).props.onChange({target:{value:'  Fictional authored first slide  '}});f.flush()
 submit();await f.settle()
 assert.equal(f.requests.length,2,'Only explicit valid submission creates one draft')
 const request=f.requests[1],sent=JSON.parse(request.options.body)
 assert.equal(request.options.method,'POST')
 assert.equal(request.options.headers['x-hh-account-id'],'fictional-account')
 assert.deepEqual(Object.keys(sent).sort(),['action','course'])
 assert.equal(sent.action,'create')
 assert.equal(sent.course.title,'Fictional authored first slide')
 assert.equal(sent.course.description,'')
 assert.equal(sent.course.locale,'en')
 assert.equal(sent.course.slides.length,1,'One real makeSlide result, never an empty or duplicate draft')
 assert.equal(sent.course.slides[0].kind,['audio','video'].includes(meditationType)?meditationType:'text','Only supported meditation modes change the initial media kind')
 assert.match(sent.course.slides[0].id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
 assert.equal(sent.course.slides[0].title,'')
 assert.equal(sent.course.slides[0].body,'')
 assert.ok(!f.requests.some(r=>r.options.body&&JSON.parse(r.options.body).action==='publish'))
 assert.equal(f.nodes().filter(n=>n.type==='form').length,0,'Confirmed private draft opens the editor')
 f.unmount()
})
