import test from 'node:test'
import assert from 'node:assert/strict'
import * as programs from '../lib/inner-growth/course-programs.js'
import {mount,findPart,findButton,nodes,deferred,account,courseA,courseView} from './helpers/course-ui-harness.mjs'
const scales=['load','tension','functioning'].map(key=>({id:'hh-weekly-pulse::weekly.'+key,label:key}))
const extraModules={
 '@/lib/inner-growth/course-strategy':{courseMeasuredProfile:()=>({eligible:scales,scales}),courseRecommendedTests:()=>[],courseSuggestedFocus:()=>scales},
 '@/lib/inner-growth/course-programs':{...programs,suggestCourseProgramScales:()=>scales},
 './course-completion-review':{default:Object.assign(()=>null,{testName:'CourseCompletionReview'})},
 './course-focus-picker':{default:Object.assign(()=>null,{testName:'CourseFocusPicker'})},
}
const current={...courseA,stage:3,focusTags:['stress','mood','energy'],presetId:null,testKeys:['hh-weekly-pulse']}
const selection={answers:{F1:null,F5:2},goal:'AS5',moduleId:'AS5'}
test('module choice stays a draft until measured scales are explicitly confirmed',async()=>{
 const slow=deferred(),writes=[],errors=[]
 const h=mount('course-r3-steps',{props:{stage:3,locale:'en',data:account('owner-a'),state:courseView(current),busy:false,root:'/en/app',isCourseCurrent:()=>true,onError:e=>errors.push(e),onState(){},onCourseCommand:async(action,body)=>{writes.push({action,body});return slow.promise}},extraModules,fetcher:()=>assert.fail('must use parent guarded command')})
 await h.settle()
 const finder=findPart(h.tree,'AntiStressModuleFinder');assert.ok(finder)
 assert.equal(finder.props.nextIsScaleReview,true)
 finder.props.onStart(selection)
 await h.settle()
 assert.equal(writes.length,0,'choosing a module alone must never start the course')
 const review=findPart(h.tree,'CourseCompletionReview');assert.ok(review)
 assert.equal(review.props.compactResults,true)
 assert.deepEqual(Array.from(review.props.suggested,s=>s.id),scales.map(s=>s.id))
 const first=review.props.onSuggested(),second=review.props.onSuggested()
 await h.settle()
 assert.equal(writes.length,1,'only explicit scale consent should post once')
 assert.equal(writes[0].action,'choose-goals')
 assert.deepEqual(Array.from(writes[0].body.scaleKeys),scales.map(s=>s.id))
 assert.equal(writes[0].body.moduleId,'AS5')
 assert.equal(writes[0].body.moduleGoal,'AS5')
 assert.equal(JSON.stringify(writes[0].body.moduleAnswers),JSON.stringify(selection.answers))
 assert.equal(writes[0].body.expectedRevision,current.revision)
 slow.resolve(courseView({...current,stage:4}));await Promise.all([first,second])
 assert.ok(!errors.some(Boolean));h.unmount()
})
test('user can edit scale priorities without losing the selected module',async()=>{
 const writes=[]
 const h=mount('course-r3-steps',{props:{stage:3,locale:'ru',data:account('owner-a'),state:courseView(current),busy:false,root:'/ru/app',isCourseCurrent:()=>true,onError:e=>{if(e)assert.fail(e)},onState(){},onCourseCommand:async(action,body)=>{
   writes.push({action,body});return courseView({...current,stage:4})
 }},extraModules,fetcher:()=>assert.fail('must not send unscoped requests')})
 await h.settle()
 findPart(h.tree,'AntiStressModuleFinder').props.onStart(selection)
 await h.settle()
 await findPart(h.tree,'CourseCompletionReview').props.onAlternative()
 await h.settle()
 const picker=findPart(h.tree,'CourseFocusPicker');assert.ok(picker)
 picker.props.onSetPrimaryScale(scales[1].id)
 await h.settle()
 await findPart(h.tree,'CourseFocusPicker').props.onContinue()
 assert.equal(writes.length,1)
 assert.deepEqual(Array.from(writes[0].body.scaleKeys),[scales[1].id,scales[0].id,scales[2].id])
 assert.equal(writes[0].body.moduleId,selection.moduleId)
 h.unmount()
})
test('stale module finder cannot send its answers after account lifetime changes',async()=>{
 const parent=mount('my-course',{enterCourse:true,props:{data:account('owner-a')},search:'?courseId=course-a',fetcher:()=>courseView(current)})
 await parent.settle();const guarded=findPart(parent.tree,'CourseR3Steps').props
 const child=mount('course-r3-steps',{props:{...guarded,stage:3},extraModules,fetcher:()=>assert.fail('direct request forbidden')})
 await child.settle();const finder=findPart(child.tree,'AntiStressModuleFinder');assert.ok(finder)
 parent.render({data:account('owner-b')});await parent.settle();const before=parent.calls.filter(c=>c.body).length
 await finder.props.onStart(selection);await child.settle()
 assert.equal(parent.calls.filter(c=>c.body).length,before)
 child.unmount();parent.unmount()
})

test('forged clinical-only finder selection cannot enter scale review or write goals',async()=>{
 const writes=[],errors=[]
 const h=mount('course-r3-steps',{props:{stage:3,locale:'en',data:account('owner-a'),state:courseView(current),busy:false,root:'/en/app',isCourseCurrent:()=>true,onError:e=>errors.push(e),onState(){},onCourseCommand:async(...args)=>writes.push(args)},extraModules,fetcher:()=>assert.fail('direct request forbidden')})
 await h.settle()
 findPart(h.tree,'AntiStressModuleFinder').props.onStart({...selection,moduleId:'AS4',goal:'AS4'})
 await h.settle()
 assert.equal(writes.length,0)
 assert.equal(findPart(h.tree,'CourseCompletionReview'),undefined)
 assert.ok(errors.includes('COURSE_MODULE_FINDER_INVALID'))
 h.unmount()
})

for(const locale of ['en','ru'])test(`actual ${locale} Finder renders scale-review CTA and blocks clinical-only start`,async()=>{
 const writes=[]
 const profile={scales:['load','tension','functioning'].map(key=>({id:'hh-weekly-pulse::weekly.'+key,testKey:'hh-weekly-pulse',score:4,min:0,max:10,recent:true,measuredAt:new Date().toISOString(),resultId:'synthetic-weekly'}))}
 const h=mount('antistress-module-finder',{props:{locale,profile,nextIsScaleReview:true,onStart:selection=>writes.push(selection)}})
 await h.settle()
 const label=locale==='ru'?'Далее · подтвердить шкалы':'Next · confirm focus scales'
 assert.ok(findButton(h.tree,label))
 findButton(h.tree,locale==='ru'?'Работа с травмой со специалистом':'Clinician-supported trauma care').props.onClick()
 await h.settle()
 for(const button of nodes(h.tree).filter(node=>node.type==='button'&&node.props.className==='startButton'))assert.equal(button.props.disabled,true)
 const start=findButton(h.tree,label);assert.equal(start.props.disabled,true);start.props.onClick()
 assert.equal(writes.length,0)
 h.unmount()
})

for(const moduleId of ['AS1','AS2','AS3','AS5','AS6'])test(`${moduleId} scale review separates pinned outcome from supporting focus`,async()=>{
 const h=mount('course-r3-steps',{props:{stage:3,locale:'en',data:account('owner-a'),state:courseView(current),busy:false,root:'/en/app',isCourseCurrent:()=>true,onError(){},onState(){},onCourseCommand:()=>assert.fail('review cannot write')},extraModules})
 await h.settle();findPart(h.tree,'AntiStressModuleFinder').props.onStart({...selection,moduleId,goal:moduleId});await h.settle()
 const review=findPart(h.tree,'CourseCompletionReview')
 assert.equal(review.props.moduleId,moduleId)
 assert.equal(review.props.routerVersion,'opora-trauma-1.3-20261015')
 assert.equal(review.props.t.mainSkillTitle,'Priority among supporting focus areas')
 assert.ok(nodes(h.tree).find(node=>node.props?.['data-course-module-primary']!==undefined))
 const rows=scales.map(scale=>({...scale,testKey:'hh-weekly-pulse',resultId:'owned',min:0,max:10,score:4}))
 const actual=mount('course-completion-review',{props:{...review.props,profile:{scales:[...rows,{...rows[0],id:'hh-weekly-pulse::weekly.energy',resultId:'other-locale-run'}]},confirmedStatuses:[{key:'hh-weekly-pulse',resultId:'owned',instrumentLocale:'en'}],optionByKey:new Map()}})
 const measured=nodes(actual.tree).filter(node=>node.type==='li'&&node.props?.['data-antistress-measure-role'])
 const primaries=measured.filter(node=>node.props['data-antistress-measure-role']==='primary')
 assert.equal(primaries.length,['AS2','AS6'].includes(moduleId)?1:0)
 if(primaries.length)assert.equal(primaries[0].key,'hh-weekly-pulse::weekly.'+(moduleId==='AS2'?'load':'functioning'))
 assert.equal(measured.length,3,'Different saved result or language must remain excluded')
 actual.unmount();h.unmount()
})
