// Offline source-composition fixture: real guarded workspace JSX, Consultations,
// ProfileDomains, report renderers and conversation children. Synthetic hook/key
// scheduling is NOT React DOM, browser, database/RLS or authenticated E2E proof.
// Subscription/billing, unrelated panels, icons and PDF generation are explicit
// leaves; no report/conversation identity, filter, handler or effect is replaced.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {parse, ts, nodes, text, descendants} from './current-source-render.mjs'
import * as conversationState from '../../lib/practitioners/conversation-state.js'
import * as reportSummary from '../../lib/profile/report-summary.js'
import * as cabinetUx from '../../lib/app/cabinet-ux.js'
import * as profileOffers from '../../lib/profile/profile-service-offers.js'
import * as contracts from '../../lib/assessments/contracts.js'
import * as conversationPolicy from '../../lib/practitioners/conversation-policy.js'
export {nodes,text}
export const read = path => readFileSync(new URL('../../'+path,import.meta.url),'utf8')
export const deferred = () => {let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve}}
export const reply = value => ({ok:true,json:async()=>value})
const denied = () => {throw Error('Unexpected external operation in cabinet fixture')}
const style = new Proxy({},{get:(_,key)=>String(key)})

export function cabinetFixture({page='portrait',locale='en',data,request='',state='ready',transport=denied,workspaceSource=read('components/app/app-workspace.jsx'),conversationSource=read('components/app/practice-request-conversation.jsx'),expressSource=read('components/app/practice-express-reports.jsx'),profileSource=read('components/app/profile-domains.jsx'),panelSource=read('components/app/personal-analysis-panel.jsx')}={}) {
  const instances=new Map(),requests=[],scrolls=[],callbacks=[],timers=new Map(),listeners=new Map()
  let current,tree,dirty=true,effects=[],visited,mounted=true,nextTimer=0
  const eq=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]))
  const slot=initial=>{const index=current.index++;return current.slots[index]??=initial()}
  const hooks={
    useState(initial){const s=slot(()=>({value:typeof initial==='function'?initial():initial}));return [s.value,value=>{const next=typeof value==='function'?value(s.value):value;if(!Object.is(next,s.value)){s.value=next;dirty=true}}]},
    useRef(initial){return slot(()=>({current:initial}))},
    useEffect(effect,deps){const s=slot(()=>({}));if(!eq(s.deps,deps)){s.deps=deps;effects.push(()=>{s.cleanup?.();s.cleanup=effect()})}},
    useMemo(fn,deps){const s=slot(()=>({}));if(!eq(s.deps,deps)){s.value=fn();s.deps=deps}return s.value},
  }
  const element=(type,props,key)=>{assert.ok(typeof type==='string'||typeof type==='function','Actual JSX dependency exists');return {type,props:props||{},key}}
  const jsx={jsx:element,jsxs:element,Fragment:'fragment'}
  const listen=(target,name,handler)=>{const key=target+name;if(!listeners.has(key))listeners.set(key,new Set());listeners.get(key).add(handler)}
  const unlisten=(target,name,handler)=>assert.ok(listeners.get(target+name)?.delete(handler),'Cleanup exact listener')
  const document={visibilityState:'visible',addEventListener:(n,h)=>listen('document',n,h),removeEventListener:(n,h)=>unlisten('document',n,h),getElementById:()=>({scrollIntoView:()=>scrolls.push('archive')})}
  const window={location:{hash:''},addEventListener:(n,h)=>listen('window',n,h),removeEventListener:(n,h)=>unlisten('window',n,h),setInterval:(fn,ms)=>{const id=++nextTimer;timers.set(id,{fn,ms});return id},clearInterval:id=>timers.delete(id),setTimeout:denied}
  const globals={window,document,navigator:{onLine:true},URL,URLSearchParams,Date,Intl,AbortController,requestAnimationFrame:fn=>fn(),crypto:{randomUUID:denied},fetch:async(path,options={})=>{requests.push({path,options});return transport(path,options)},XMLHttpRequest:denied,WebSocket:denied,localStorage:new Proxy({},{get:denied}),sessionStorage:new Proxy({},{get:denied})}
  function compile(source,name,modules={},bindings={}) {
    parse(source,name)
    const compiledModule={exports:{}}
    const code=ts.transpileModule(source,{fileName:name,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
    runInNewContext(code,{...globals,...bindings,module: compiledModule,exports:compiledModule.exports,require:name=>{assert.ok(Object.hasOwn(modules,name),'Unapproved dependency '+name);return modules[name]}},{filename:name,timeout:5000})
    return compiledModule.exports
  }
  const icons=Object.fromEntries('ArrowDownToLine ArrowUpRight FileText LockKeyhole Pin ArrowRight Brain CalendarDays ChevronDown Flower2 HeartHandshake Leaf MessageCircle Sparkles Plus Save Send ShieldCheck House UserRound ClipboardList BarChart3 BookOpen Users'.split(' ').map(name=>[name,'icon-'+name]))
  const base={'react':hooks,'react/jsx-runtime':jsx,'next/link':{default:'a'},'next/image':{default:'img'},'lucide-react':icons}
  const conversation=compile(conversationSource,'practice-request-conversation.jsx',{...base,'@/lib/practitioners/conversation-state':conversationState,'./practice-request-conversation.module.css':{default:style}}).default
  const panel=compile(panelSource,'personal-analysis-panel.jsx',{...base,'./personal-analysis.css':{},'@/lib/profile/practitioner-report-pdf':{generatePractitionerReportPdf:denied},'@/components/app/saved-sessions-panel':{SavedSessionsPanel:'saved-sessions-leaf'}})
  const express=compile(expressSource,'practice-express-reports.jsx',{...base,'./practice-express-reports.module.css':{default:style}})
  const profile=compile(profileSource,'profile-domains.jsx',{...base,'next/dynamic':{default:()=> 'development-program-leaf'},'@/lib/documents/recommendation':{recommendationItemType:denied},'@/lib/profile/profile-service-offers':profileOffers,'@/lib/profile/report-summary':reportSummary,'./profile-domains.css':{},'./profile-refresh.css':{}})
  const COPY=compile(read('components/app/copy.js'),'copy.js').COPY
  const file=parse(workspaceSource,'app-workspace.jsx')
  // Resolve the genuine parent imports before binding tested children. An
  // unrelated lookalike/renamed export must not stand in for the actual import.
  function imported(name,path,exported) {
    const matches=file.statements.filter(n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.text===path)
    assert.equal(matches.length,1,'Exact parent import '+path)
    const clause=matches[0].importClause
    assert.ok(exported==='default'?clause?.name?.text===name:clause?.namedBindings?.elements?.some(n=>n.name.text===name&&(n.propertyName?.text||n.name.text)===exported),'Exact imported binding '+name)
  }
  imported('PracticeRequestConversation','./practice-request-conversation','default')
  imported('PersonalAnalysisPanel','@/components/app/personal-analysis-panel','PersonalAnalysisPanel')
  imported('reportTimeline','@/lib/app/cabinet-ux','reportTimeline')
  imported('COPY','./copy','COPY')
  imported('SubscriptionProvider','@/components/app/subscription-access','SubscriptionProvider')
  for(const [name,path] of [['ProfileDomains','@/components/app/profile-domains'],['ClientExpressReports','@/components/app/practice-express-reports']]) {
    const declarations=descendants(file).filter(n=>ts.isVariableDeclaration(n)&&n.name.getText(file)===name)
    assert.equal(declarations.length,1,'One actual dynamic binding '+name)
    const init=declarations[0].initializer
    assert.ok(ts.isCallExpression(init)&&init.expression.getText(file)==='dynamic')
    const loads=descendants(init).filter(n=>ts.isCallExpression(n)&&n.expression.kind===ts.SyntaxKind.ImportKeyword)
    assert.equal(loads.length,1);assert.equal(loads[0].arguments[0].text,path)
    assert.ok(descendants(init).some(n=>ts.isPropertyAccessExpression(n)&&n.name.text===name),'Exact dynamic named export '+name)
  }
  const declaration=name=>{const matches=file.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.equal(matches.length,1,'One actual '+name);return matches[0]}
  const workspace=declaration('AppWorkspace'),firstGuard=workspace.body.statements.findIndex(ts.isIfStatement)
  assert.ok(firstGuard>=0,'Actual top-level signed-in guards exist')
  const suffix=workspace.body.statements.slice(firstGuard).map(n=>n.getText(file)).join('\n')
  assert.ok(ts.isReturnStatement(workspace.body.statements.at(-1)),'Actual final workspace return')
  const bindings={...icons,COPY,ProfileDomains:profile.ProfileDomains,PersonalAnalysisPanel:panel.PersonalAnalysisPanel,ClientExpressReports:express.ClientExpressReports,PracticeRequestConversation:conversation,reportTimeline:cabinetUx.reportTimeline,consultationStyles:style,
    // Leaves keep actual parent children and keys; they do not synthesize reports.
    SubscriptionProvider:'subscription-provider-leaf',PostSignupInstallOffer:'install-offer-leaf',CabinetJourney:'journey-leaf',CabinetToday:'today-leaf',InstallHolisticHouse:'install-leaf',Preferences:'preferences-leaf',CabinetGuestOverview:'guest-overview-leaf',CourseGuestLanding:'course-guest-leaf',
    Link:'a',Image:'img',RequestForm:'request-form-leaf',RemoteGoalPhoto:'remote-photo-leaf',ServiceReviews:'reviews-leaf',
    load:()=>callbacks.push('reload'),dismissInstallOffer:denied,logout:denied,signin:denied,setData:denied,setDeleted:denied,
    appFetch:denied,consultationPhotoFor:denied,consultationPriceFor:denied,message:denied,
  }
  const code=declaration('dateLabel').getText(file)+'\n'+declaration('Consultations').getText(file)+`\nexport function WorkspaceProjection({data,locale,page,request,state}) {
    const c=COPY[locale],root='/'+locale+'/app',recordId=null,deleted=false,busy=false,error=null,stressSignup=false,signinAttempted={current:false},savedInstallContext=false,installOfferAccountId=null,nativeApp=false;
    const searchParams=new URLSearchParams(request?{request}:{});
    ${suffix}
  }`
  const Parent=compile(code,'workspace-projection.tsx',{'react/jsx-runtime':jsx},{...bindings,...hooks}).WorkspaceProjection
  let props={data,locale,page,request,state}
  function component(type,p,path){visited.add(path);let entry=instances.get(path);if(!entry){entry={type,index:0,slots:[]};instances.set(path,entry)}assert.equal(entry.type,type,'Stable type at keyed path');entry.index=0;const previous=current;current=entry;const result=type(p);current=previous;return render(result,path+'.r')}
  function render(node,path){
    if(Array.isArray(node))return node.map((child,i)=>render(child,path+'.'+i))
    if(!node||typeof node!=='object'||!('type'in node))return node
    path+=':'+String(node.key??'')
    if(typeof node.type==='function')return component(node.type,node.props,path)
    if(node.props.ref)node.props.ref.current={scrollIntoView:()=>scrolls.push(path)}
    return {...node,props:{...node.props,children:render(node.props.children,path+'.c')}}
  }
  function flush(){for(let i=0;dirty&&mounted;i++){assert.ok(i<30,'No fixture render loop');dirty=false;effects=[];visited=new Set();tree=component(Parent,props,'workspace');for(const [path,entry] of instances)if(!visited.has(path)){for(const s of entry.slots)s.cleanup?.();instances.delete(path)}for(const effect of effects)effect()}}
  const f={requests,scrolls,callbacks,timers,listeners,flush,get tree(){return tree},get props(){return props},nodes:()=>nodes(tree),text:()=>text(tree),
    update(next){props={...props,...next};dirty=true;flush()},
    find(predicate){const found=nodes(tree).filter(predicate);assert.equal(found.length,1,'One actual rendered target');return found[0]},
    async settle(){await new Promise(resolve=>setImmediate(resolve));flush();await new Promise(resolve=>setImmediate(resolve));flush()},
    async click(predicate){const target=f.find(predicate);assert.equal(typeof target.props.onClick,'function','Real action exists');await target.props.onClick();flush();await f.settle()},
    unmount(){mounted=false;for(const entry of instances.values())for(const s of entry.slots)s.cleanup?.();instances.clear()},
  };flush();return f
}

// Actual participant authorization function, with only a synthetic row/query.
export async function participantScope(actor,row,requestId) {
  const source=read('lib/practitioners/client-messages.js'),file=parse(source)
  const selected=file.statements.filter(n=>(ts.isFunctionDeclaration(n)&&n.name?.text==='participant')||(ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(file)==='admittedStatuses')))
  assert.equal(selected.length,2)
  const code=selected.map(n=>n.getText(file)).join('\n')+'\nmodule.exports=participant'
  const participantModule={exports:{}}
  runInNewContext(code,{module: participantModule,...contracts,...conversationPolicy},{timeout:5000})
  return participantModule.exports({query:async(sql,args)=>{assert.equal(args[0],requestId);return {rows:row?[row]:[]}}},actor,requestId)
}
