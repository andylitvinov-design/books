import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { mount, findPart, findButton, nodes, textOf, deferred, account, courseA, courseB, courseView } from './helpers/course-ui-harness.mjs'
const closed = course => courseView({ ...course, status: 'closed', revision: course.revision + 1 })
function fixture() {
 const pending=deferred()
 const h=mount('my-course',{props:{data:account('owner-a')},fetcher:(_path,_options,body)=>body ? pending.promise : courseView(courseA)})
 return {h,pending}
}
test('close uses exact owner/course/revision and duplicate confirmation sends one command',async()=>{
 const {h,pending}=fixture();await h.settle();const close=findPart(h.tree,'CourseEntrySelector').props.onCloseCourse
 const first=close();assert.equal(await close(),false);await h.settle();const writes=h.calls.filter(c=>c.body)
 assert.equal(writes.length,1);assert.deepEqual(writes[0].body,{action:'close',expectedRevision:courseA.revision,courseId:courseA.id});assert.equal(writes[0].options.headers['X-HH-Account-ID'],'owner-a')
 pending.resolve(closed(courseA));assert.equal(await first,true);await h.settle();assert.equal(findPart(h.tree,'CourseEntrySelector').props.course.status,'closed');h.unmount()
})
for(const change of ['owner','course','unmount'])test(`pending close cannot replace state after ${change} changes`,async()=>{
 const {h,pending}=fixture();await h.settle();const close=findPart(h.tree,'CourseEntrySelector').props.onCloseCourse;const first=close();await h.settle()
 if(change==='owner'){h.render({data:account('owner-b')});await h.settle()}
 if(change==='course')await h.backTo('?courseId=course-b')
 if(change==='unmount')h.unmount()
 pending.resolve(closed(courseA));assert.equal(await first,false);await h.settle()
 if(change!=='unmount')assert.notEqual(findPart(h.tree,'CourseEntrySelector')?.props.course?.status,'closed')
 assert.equal(h.calls.filter(c=>c.body).length,1);h.unmount()
})
test('close rejects a response identifying another course',async()=>{
 const {h,pending}=fixture();await h.settle();const promise=findPart(h.tree,'CourseEntrySelector').props.onCloseCourse();pending.resolve(closed(courseB));assert.equal(await promise,false);await h.settle();assert.equal(findPart(h.tree,'CourseEntrySelector').props.course.id,courseA.id);h.unmount()
})

// Exercise the actual parent's return clauses and bootstrap callback, without
// importing its unrelated client/provider modules or performing OAuth.
let guestBoundary
function authenticatedWorkspaceBoundary(){
 if(guestBoundary)return guestBoundary
 const parse=path=>ts.createSourceFile(path,readFileSync(new URL('../'+path,import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
 const workspace=parse('components/app/app-workspace.jsx')
 const parent=workspace.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='AppWorkspace');assert.ok(parent)
 const returns=parent.body.statements.filter(ts.isReturnStatement);assert.equal(returns.length,1,'the actual parent must have one direct final return')
 const finalReturn=returns[0]
 const children=[]
 const visit=node=>{if(ts.isJsxSelfClosingElement(node)&&node.tagName.getText(workspace)==='MyCourse')children.push(node);ts.forEachChild(node,visit)}
 visit(finalReturn);assert.equal(children.length,1)
 const guards=[];let child=children[0]
 while(child!==finalReturn.expression){
  const ancestor=child.parent;assert.ok(ancestor)
  if(ts.isBinaryExpression(ancestor)){
   assert.equal(child,ancestor.right);assert.equal(ancestor.operatorToken.kind,ts.SyntaxKind.AmpersandAmpersandToken)
   guards.push('('+ancestor.left.getText(workspace)+')')
  }else if(ts.isConditionalExpression(ancestor)){
   assert.ok(child===ancestor.whenTrue||child===ancestor.whenFalse)
   guards.push((child===ancestor.whenTrue?'':'!')+'('+ancestor.condition.getText(workspace)+')')
  }else assert.ok(ts.isJsxElement(ancestor)||ts.isJsxFragment(ancestor)||ts.isJsxExpression(ancestor)||ts.isParenthesizedExpression(ancestor))
  child=ancestor
 }
 assert.ok(guards.some(value=>value.includes('onboardingState')))
 const early=parent.body.statements.filter(node=>ts.isIfStatement(node)&&ts.isReturnStatement(node.thenStatement))
 assert.ok(early.length>=5)
 const load=parent.body.statements.filter(ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations]).find(node=>node.name.getText(workspace)==='load')
 assert.ok(ts.isCallExpression(load.initializer));assert.equal(load.initializer.expression.getText(workspace),'useCallback')
 const callback=load.initializer.arguments[0];assert.ok(ts.isArrowFunction(callback))
 const guest=parse('components/app/course-guest-landing.jsx')
 const copy=guest.statements.filter(ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations]).find(node=>node.name.getText(guest)==='COPY');assert.ok(copy)
 const landing=guest.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='CourseGuestLanding');assert.ok(landing)
 const compact=landing.body.statements.filter(node=>ts.isIfStatement(node)&&node.expression.getText(guest).includes('compact'))
 assert.equal(compact.length,2,'generic Google entry and OPORA preview remain distinct')
 const source=`const COPY=${copy.initializer.getText(guest)};
 export function render(scope){
 const {state,data,page='course',locale='en',busy=false,stressSignup=false,error=null,deleted=false,signin,load}=scope;
 const c={loading:'Loading',legacy:'Legacy',nonDiagnostic:'Not diagnostic'},signinAttempted={current:false};
 ${early.map(node=>node.getText(workspace)).join('\n')}
 return ${guards.join('&&')} ? (${children[0].getText(workspace)}) : null;
 }
 export function compactGuest(${landing.parameters[0].getText(guest)})${landing.body.getText(guest)}
 export async function signedOutBootstrap(){
 const page='course',loadEpoch={current:0},calls=[];let state,data,error;
 const setError=value=>{error=value},setData=value=>{data=value},setState=value=>{state=value};
 const appFetch=async(...args)=>{calls.push(args);throw Object.assign(new Error('SYNTHETIC_SIGNED_OUT'),{status:401})};
 await (${callback.getText(workspace)})();return {state,data,error,calls};
 }`
 const exports={};const jsx=(type,props)=>({type,props})
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText,{
  exports,useState:value=>[typeof value==='function'?value():value,()=>{}],require:name=>{assert.equal(name,'react/jsx-runtime');return {jsx,jsxs:jsx}},
  CourseGuestLanding:'CourseGuestLanding',CabinetGuestOverview:'CabinetGuestOverview',Course14DayOverview:'Course14DayOverview',MyCourse:'MyCourse',OporaFirstWeekInvite:'OporaFirstWeekInvite',
  Leaf:'Leaf',LockKeyhole:'LockKeyhole',ArrowRight:'ArrowRight',Link:'Link',styles:new Proxy({},{get:(_object,key)=>key}),message:()=> 'Synthetic error',
 })
 guestBoundary=exports;return guestBoundary
}

// Authenticated catalog enrolment uses its explicit Create action, not a second
// confirmation: owner request 2026-10-19 and the deliberate #1118 migration.
const legacyClosed=(course=courseA,revision=8)=>({...course,status:'closed',stage:4,revision})
const legacyView=course=>courseView(course,{courses:[course],access:{tier:'free',activeCourseCount:course.status==='closed'?0:1,activeCourseLimit:1,multiCourseEnabled:false}})
const enrolmentWrites=h=>h.calls.filter(call=>call.body)
function legacyFixture(){
 const current=new Map([[courseA.id,legacyClosed()],[courseB.id,legacyClosed(courseB,12)]])
 const pending=[],catalogs=[],props={data:account('owner-a'),locale:'en'}
 const h=mount('my-course',{props,fetcher:(path,_options,body)=>{
  const id=body?.courseId||new URL(path,'https://synthetic.example').searchParams.get('courseId')||courseA.id
  if(!body)return legacyView(current.get(id))
  assert.equal(body.action,'start','a generic start must not imply intake, sharing, or another write')
  const wait=deferred();pending.push({wait,body});return wait.promise
 }})
 return {h,current,pending,props,catalogs,
  async catalog(){
   await h.settle()
   const entry=findPart(h.tree,'CourseEntrySelector')
   if(entry){entry.props.onOpen();await h.settle()}
   const dashboard=findPart(h.tree,'MyCoursesDashboard')
   assert.ok(dashboard,'closed courses remain in history before New')
   assert.equal(dashboard.props.canAddCourse,true)
   dashboard.props.onNew();await h.settle()
   const part=findPart(h.tree,'CoursePresetCatalog');assert.ok(part)
   const catalog=mount('course-preset-catalog',{props:part.props});catalogs.push(catalog)
   await catalog.settle();return catalog
  },
  async finish(index=0,overrides={}){
   const {wait,body}=pending[index]
   const updated={...current.get(body.courseId),status:'active',stage:1,revision:body.expectedRevision+1,...overrides}
   current.set(updated.id,updated);wait.resolve(legacyView(updated));await h.settle()
  },
  dispose(){for(const catalog of catalogs)catalog.unmount();h.unmount()}
 }
}
function createPersonal(catalog){
 const buttons=nodes(catalog.tree).filter(node=>node.type==='button'&&textOf(node).trim()==='Create my personal course')
 assert.equal(buttons.length,1,'use the actual visible personal-course Create button')
 return buttons[0]
}
async function retireLegacy(f,change){
 const {h}=f
 if(change==='owner'){h.render({data:account('owner-b'),locale:'en'});await h.settle()}
 if(change==='logout'){
  const guest=authenticatedWorkspaceBoundary().render({state:'signed-out',data:null,signin:()=>{},load:()=>{}})
  assert.equal(nodes(guest).filter(node=>node.type==='MyCourse').length,0)
  assert.equal(nodes(guest).filter(node=>node.type==='CourseGuestLanding').length,1)
  h.unmount() // React removes the private child at the actual parent auth boundary.
 }
 if(change==='course')await h.backTo('?courseId='+courseB.id)
 if(change==='cancel'){const back=findButton(h.tree,'My courses');assert.ok(back);back.props.onClick();await h.settle()}
 if(change==='unmount')h.unmount()
}

test('legacy closed course restarts its exact identity only after renewed consent',async()=>{
 const f=legacyFixture(),{h}=f;await h.settle()
 assert.equal(enrolmentWrites(h).length,0,'initial render/effects must not enrol')
 const entry=findPart(h.tree,'CourseEntrySelector');assert.ok(entry);entry.props.onOpen();await h.settle()
 assert.equal(enrolmentWrites(h).length,0,'opening history must not enrol')
 const catalog=await f.catalog()
 assert.equal(enrolmentWrites(h).length,0,'New and the actual catalog render must not enrol')
 h.render(f.props);await h.settle();catalog.render(findPart(h.tree,'CoursePresetCatalog').props);await catalog.settle()
 assert.equal(enrolmentWrites(h).length,0,'rerender/effects are not affirmative consent')
 assert.match(textOf(h.tree),/Your course choices, optional notes and practice progress are saved privately in your account when you start/)
 const button=createPersonal(catalog);assert.equal(button.props.disabled,false)
 button.props.onClick();button.props.onClick();await h.settle()
 const writes=enrolmentWrites(h);assert.equal(writes.length,1,'explicit click starts once; a pending duplicate cannot enrol again')
 assert.deepEqual(writes[0].body,{action:'start',consent:true,courseId:courseA.id,newCourse:false,expectedRevision:8})
 assert.equal(writes[0].options.headers['X-HH-Account-ID'],'owner-a')
 assert.equal(writes[0].options.credentials,'same-origin');assert.equal(writes[0].options.cache,'no-store')
 catalog.render(findPart(h.tree,'CoursePresetCatalog').props);await catalog.settle()
 assert.equal(createPersonal(catalog).props.disabled,true)
 await f.finish();assert.equal(enrolmentWrites(h).length,1,'personal enrolment does not imply teacher sharing or extra writes')
 assert.ok(findPart(h.tree,'CourseR3Steps'),'the accepted start enters the personal intake flow')
 f.dispose()
})

test('accepted personal restart revokes its old Create callback but a fresh later closed-course click succeeds',async()=>{
 const f=legacyFixture(),{h}=f,catalog=await f.catalog(),retained=createPersonal(catalog).props.onClick
 retained();await h.settle();await f.finish();assert.equal(enrolmentWrites(h).length,1)
 retained();await h.settle();assert.equal(enrolmentWrites(h).length,1,'same-ID success revokes the accepted render')
 f.current.set(courseA.id,legacyClosed(courseA,12))
 await h.backTo('?view=courses');const freshCatalog=await f.catalog()
 assert.equal(enrolmentWrites(h).length,1,'a new closed-course offer still requires a fresh affirmative click')
 const fresh=createPersonal(freshCatalog);assert.equal(fresh.props.disabled,false);fresh.props.onClick();await h.settle()
 assert.equal(enrolmentWrites(h).length,2)
 assert.deepEqual(enrolmentWrites(h)[1].body,{action:'start',consent:true,courseId:courseA.id,newCourse:false,expectedRevision:12})
 assert.equal(enrolmentWrites(h)[1].options.headers['X-HH-Account-ID'],'owner-a')
 await f.finish(1);fresh.props.onClick();await h.settle();assert.equal(enrolmentWrites(h).length,2)
 f.dispose()
})

for(const change of ['owner','course','logout','unmount','cancel'])test('retained personal Create cannot start after '+change+' changes',async()=>{
 const f=legacyFixture(),{h}=f,catalog=await f.catalog(),retained=createPersonal(catalog).props.onClick
 assert.equal(enrolmentWrites(h).length,0)
 await retireLegacy(f,change);retained();await h.settle()
 assert.equal(enrolmentWrites(h).length,0,'retired catalog intent is not renewed consent')
 f.dispose()
})

for(const change of ['owner','course','logout','unmount','cancel'])test('pending personal start cannot accept stale results after '+change+' changes',async()=>{
 const f=legacyFixture(),{h}=f,catalog=await f.catalog(),retained=createPersonal(catalog).props.onClick
 retained();await h.settle();assert.equal(enrolmentWrites(h).length,1)
 await retireLegacy(f,change);retained();await h.settle();assert.equal(enrolmentWrites(h).length,1)
 await f.finish();assert.equal(enrolmentWrites(h).length,1,'late response must not cause intake, sharing, or another start')
 if(change!=='unmount')assert.equal(findPart(h.tree,'CourseR3Steps'),undefined,'late start must not replace current owner/course/view')
 f.dispose()
})

test('personal restart rejects a response identifying another course',async()=>{
 const f=legacyFixture(),{h}=f,catalog=await f.catalog();createPersonal(catalog).props.onClick();await h.settle()
 await f.finish(0,{id:courseB.id})
 assert.equal(enrolmentWrites(h).length,1)
 assert.equal(findPart(h.tree,'CourseR3Steps'),undefined)
 assert.ok(findPart(h.tree,'CoursePresetCatalog'),'failed identity validation leaves the original selection in place')
 assert.match(textOf(h.tree),/COURSE_SELECTION_CHANGED/)
 f.dispose()
})

test('signed-out parent offers only its actual Google CTA and keeps enrolment and OPORA preview distinct',async()=>{
 const boundary=authenticatedWorkspaceBoundary(),bootstrap=await boundary.signedOutBootstrap()
 assert.equal(bootstrap.state,'signed-out');assert.equal(bootstrap.data,null)
 assert.equal(bootstrap.calls.length,1);assert.equal(bootstrap.calls[0].length,1);assert.equal(bootstrap.calls[0][0],'bootstrap')
 let signins=0
 const scope={...bootstrap,signin:()=>{signins++},load:()=>{}}
 for(const state of ['loading','signed-out','error','unavailable']){
  const tree=boundary.render({...scope,state})
  assert.equal(nodes(tree).filter(node=>node.type==='MyCourse').length,0,'guest/loading/error must not mount private course')
 }
 const tree=boundary.render(scope),landing=nodes(tree).find(node=>node.type==='CourseGuestLanding');assert.ok(landing)
 assert.equal(landing.props.compact,true);assert.equal(landing.props.onStart,scope.signin)
 const guest=boundary.compactGuest(landing.props)
 const button=nodes(guest).find(node=>node.type==='button'&&Object.hasOwn(node.props,'data-course-google-signin'));assert.ok(button)
 assert.match(textOf(button),/Continue with Google/);assert.equal(button.props.disabled,false);assert.equal(button.props.onClick,scope.signin)
 assert.equal(signins,0,'guest rendering never starts OAuth or enrolment')
 button.props.onClick();assert.equal(signins,1,'only the explicit guest CTA requests sign-in, not course start')
 const stressTree=boundary.render({...scope,stressSignup:true}),stressLanding=nodes(stressTree).find(node=>node.type==='CourseGuestLanding')
 const stress=boundary.compactGuest(stressLanding.props),invite=nodes(stress).find(node=>node.type==='OporaFirstWeekInvite')
 assert.ok(invite);assert.equal(invite.props.signedOut,true);assert.equal(invite.props.onAccept,scope.signin);assert.equal(signins,1,'OPORA preview does not auto-accept')
 assert.equal(nodes(boundary.render({...scope,state:'ready',data:null})).some(node=>node.type==='MyCourse'),false)
 assert.equal(nodes(boundary.render({...scope,state:'ready',data:{account:{id:'owner-a',onboardingState:'pending'}}})).some(node=>node.type==='MyCourse'),false)
 assert.equal(nodes(boundary.render({...scope,state:'ready',data:{account:{id:'owner-a',onboardingState:'active'}}})).filter(node=>node.type==='MyCourse').length,1)
})
