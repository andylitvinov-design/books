import test from 'node:test'
import assert from 'node:assert/strict'
import {mount,nodes,findPart,deferred,account,courseA,courseB,courseView} from './helpers/course-ui-harness.mjs'

const closed=(course=courseA,revision=8)=>({...course,status:'closed',stage:4,revision})
const view=course=>courseView(course,{courses:[course],access:{tier:'free',activeCourseCount:course.status==='closed'?0:1,activeCourseLimit:1,multiCourseEnabled:false}})
const starts=h=>h.calls.filter(call=>call.body?.action==='start')
const writes=h=>h.calls.filter(call=>call.body)
function accept(h){
 const buttons=nodes(h.tree).filter(node=>node.type==='button'&&Object.hasOwn(node.props,'data-opora-week-one-accept'))
 assert.equal(buttons.length,1,'the real week-one affirmative enrolment button is rendered')
 return buttons[0]
}
function fixture(){
 const pending=[]
 const current=new Map([[courseA.id,closed(courseA)],[courseB.id,closed(courseB,12)]])
 const props={data:account('owner-a'),locale:'en'}
 const h=mount('my-course',{props,search:'?program=stress&courseId='+courseA.id,fetcher:(path,_options,body)=>{
  const id=body?.courseId||new URL(path,'https://synthetic.example').searchParams.get('courseId')||courseA.id
  if(!body)return view(current.get(id))
  if(body.action==='start'){
   const wait=deferred();pending.push({wait,body});return wait.promise
  }
  assert.equal(body.action,'intake','no other command is implied by fast enrolment')
  const prior=current.get(id)
  const updated={...prior,focusTags:body.focusTags,stage:2,revision:prior.revision+1}
  current.set(id,updated);return view(updated)
 }})
 return {h,pending,current,props,async finish(index=0){
  const {wait,body}=pending[index]
  const updated={...current.get(body.courseId),status:'active',stage:1,revision:body.expectedRevision+1}
  current.set(updated.id,updated);wait.resolve(view(updated));await h.settle()
 }}
}

test('fast legacy restart requires an explicit acceptance and pending duplicates send one owner-bound command',async()=>{
 const f=fixture(),{h}=f;await h.settle()
 assert.equal(writes(h).length,0)
 h.render(f.props);await h.settle();assert.equal(writes(h).length,0,'render/effects never enrol')
 const button=accept(h);assert.equal(button.props.disabled,false)
 button.props.onClick();button.props.onClick();await h.settle()
 assert.equal(starts(h).length,1);assert.equal(writes(h).length,1)
 assert.deepEqual(starts(h)[0].body,{action:'start',consent:true,courseId:courseA.id,newCourse:false,expectedRevision:8})
 assert.equal(starts(h)[0].options.headers['X-HH-Account-ID'],'owner-a')
 assert.equal(starts(h)[0].options.credentials,'same-origin')
 assert.equal(starts(h)[0].options.cache,'no-store')
 assert.equal(accept(h).props.disabled,true)
 await f.finish();assert.equal(h.calls.filter(call=>call.body?.action==='intake').length,1)
 h.unmount()
})

test('successful same-ID restart revokes its retained acceptance but a fresh later enrolment remains possible',async()=>{
 const f=fixture(),{h}=f;await h.settle()
 const retained=accept(h).props.onClick
 retained();await h.settle();await f.finish()
 assert.equal(starts(h).length,1)
 assert.ok(findPart(h.tree,'CourseR3Steps'),'successful start advanced to the current baseline flow')
 retained();await h.settle()
 assert.equal(starts(h).length,1,'an accepted render cannot send another stale start command')
 // A later server-confirmed closure is a new legitimate enrolment opportunity,
 // even though the legacy free course row keeps the same ID.
 f.current.set(courseA.id,closed(courseA,12))
 await h.backTo('?program=stress&courseId='+courseA.id)
 const fresh=accept(h);assert.equal(fresh.props.disabled,false)
 assert.equal(starts(h).length,1,'reopening the invitation still does not auto-start')
 fresh.props.onClick();await h.settle()
 assert.equal(starts(h).length,2)
 assert.equal(starts(h)[1].body.courseId,courseA.id);assert.equal(starts(h)[1].body.expectedRevision,12)
 await f.finish(1);assert.equal(starts(h).length,2)
 fresh.props.onClick();await h.settle();assert.equal(starts(h).length,2,'the fresh accepted render is revoked too')
 h.unmount()
})

for(const change of ['owner','course','unmount'])test('retained fast acceptance cannot start after '+change+' changes',async()=>{
 const f=fixture(),{h}=f;await h.settle();const retained=accept(h).props.onClick
 if(change==='owner'){h.render({data:account('owner-b'),locale:'en'});await h.settle()}
 if(change==='course')await h.backTo('?program=stress&courseId='+courseB.id)
 if(change==='unmount')h.unmount()
 retained();await h.settle();assert.equal(writes(h).length,0)
 h.unmount()
})

for(const change of ['owner','course','unmount'])test('pending fast start cannot continue intake or accept again after '+change+' changes',async()=>{
 const f=fixture(),{h}=f;await h.settle();const retained=accept(h).props.onClick
 retained();await h.settle();assert.equal(starts(h).length,1)
 if(change==='owner'){h.render({data:account('owner-b'),locale:'en'});await h.settle()}
 if(change==='course')await h.backTo('?program=stress&courseId='+courseB.id)
 if(change==='unmount')h.unmount()
 retained();await h.settle();assert.equal(starts(h).length,1)
 await f.finish();assert.equal(starts(h).length,1)
 assert.equal(h.calls.filter(call=>call.body?.action==='intake').length,0,'stale response cannot advance this account/course')
 if(change!=='unmount')assert.equal(findPart(h.tree,'CourseR3Steps'),undefined,'stale start must not replace the current invitation')
 h.unmount()
})
