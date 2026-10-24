// Synthetic fixture only: no API, database, real account or client records.
import test from 'node:test'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const require = createRequire(import.meta.url)
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {jsx,jsxs}=require('react/jsx-runtime');
const root=fileURLToPath(new URL('../',import.meta.url));
function helper(path){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(root+'/lib/practitioners/'+path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports});return module.exports;}
const quotaHelper=helper('service-quota.js'),requestHelper=helper('practice-requests.mjs');
function fixture({total=0,used=2,busy=false,owner=false,data=true,onboarding=false,panel=null,mutate=(source)=>source}={}){
 let state=[],cursor=0,route='',scrolled='';
 const quota={tier:'hobby',limit:10,used,remaining:Math.max(0,10-used),canAdd:used<10};
 state[0]=data?{practiceActivated:!onboarding,practitioner:{id:'synthetic',status:'approved',slug:'synthetic',profile:{displayName:'Fixture'}},services:Array.from({length:used},(_,i)=>({id:'s'+i,status:'published'})),requests:Array.from({length:total},(_,i)=>({id:'r'+i,status:'requested'})),serviceQuota:quota}:null;
 state[2]=busy;state[3]=panel;
 const react={useState(initial){const i=cursor++;if(!(i in state))state[i]=typeof initial==='function'?initial():initial;return [state[i],v=>state[i]=typeof v==='function'?v(state[i]):v]},useMemo:f=>f(),useEffect:()=>{}};
 function load(path){const module={exports:{}};const code=ts.transpileModule(mutate(fs.readFileSync(root+'/components/app/'+path,'utf8'),path),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText;
 const req=name=>{if(name==='react')return react;if(name==='react/jsx-runtime')return{jsx,jsxs,Fragment:React.Fragment};if(name==='lucide-react')return new Proxy({}, {get:(_,k)=>props=>jsx('icon',{...props,name:k})});if(name.endsWith('.css'))return{__esModule:true,default:new Proxy({}, {get:(_,k)=>k})};if(name.includes('service-quota'))return quotaHelper;if(name.includes('public-service-links'))return {getPublicServiceDetailHref:()=>'/synthetic'};if(name.includes('practice-requests.mjs'))return requestHelper;if(name==='./practice-requests-overview')return load('practice-requests-overview.jsx');return{__esModule:true,default:props=>jsx('div',{'data-stub':name,children:props.children})}};
 vm.runInNewContext(code,{module,exports:module.exports,require:req,URL,URLSearchParams,window:{location:{href:'https://example.test/en/app/practice'},history:{replaceState:(_,__,url)=>route=url}},document:{getElementById:id=>({scrollIntoView(){scrolled=id}})},requestAnimationFrame:()=>0,cancelAnimationFrame(){},console});return module.exports;}
 const Workspace=load('practice-workspace.jsx').default;
 function render(){cursor=0;const nodes=[];function visit(node,parents=[]){if(node==null||typeof node==='boolean')return;if(Array.isArray(node)){node.forEach(n=>visit(n,parents));return}if(typeof node!=='object'||!node.props)return;if(typeof node.type==='function'){visit(node.type(node.props),parents);return}nodes.push({node,parents});visit(node.props.children,[...parents,node]);}visit(Workspace({locale:'en',ownerTools:owner?jsx('span',{children:'Synthetic owner tools'}):null}));return nodes;}
 return {render,state,html(){cursor=0;return renderToStaticMarkup(jsx(Workspace,{locale:'en',ownerTools:owner?jsx('span',{children:'Synthetic owner tools'}):null}))},get route(){return route},get scrolled(){return scrolled}};
}
function text(n){if(n==null||typeof n==='boolean')return '';if(Array.isArray(n))return n.map(text).join('');if(typeof n!=='object')return String(n);return text(n.props.children)}

const byClass=(rows,name)=>rows.filter(x=>x.node.props.className===name)
const actionButtons=rows=>rows.filter(x=>x.node.type==='button'&&/Add my service|Add your service/.test(text(x.node)))
function verifyOverview(f,used){
  const html=f.html()
  const rows=f.render()
  const [cta]=byClass(rows,'hh-practice-top-cta')
  assert.equal(byClass(rows,'hh-practice-top-cta').length,1,'exactly one quota/action block')
  assert.equal(cta.node.props['data-practice-service-action'],true,'relocated action retains scoped styling marker')
  assert.equal(cta.parents.some(n=>n.type==='details'&&!n.props.open),false,'action not hidden in disclosure')
  const inbox=rows.findIndex(x=>x.node.props.className==='hh-practice-v4-requests')
  const metrics=rows.findIndex(x=>x.node.props.className==='hh-practice-overview')
  const analytics=rows.findIndex(x=>x.node.props.id==='hh-practice-v4-analytics')
  assert.ok(inbox>=0&&inbox<rows.indexOf(cta)&&rows.indexOf(cta)<metrics&&metrics<analytics,'requests first, action before metrics and analytics')
  assert.ok(html.indexOf('class="hh-practice-top-cta"')<html.indexOf('class="hh-practice-overview"'),'actual SSR order')
  assert.ok(text(cta.node).includes(used+' / 10'),'numeric used / limit remains visible')
  const [button]=byClass(rows,'hh-practice-top-cta-button')
  assert.equal(button.node.props.disabled,used===10,'quota remains enforced')
  assert.equal(actionButtons(rows).length,used===10?0:1,'no duplicate empty-inbox action')
  const [grid]=byClass(rows,'hh-practice-v4-grid')
  assert.equal(rows.filter(x=>x.node.type==='button'&&x.parents.includes(grid.node)).length,8,'eight shortcuts retained')
  return button.node
}
function verifyFocused(f){
  const rows=f.render()
  assert.equal(byClass(rows,'hh-practice-top-cta').length,0,'overview action unmounted during focused work')
  assert.equal(byClass(rows,'hh-practice-v4-requests').length,0,'requests preview unmounted during focused work')
  const panels=rows.filter(x=>x.node.props['data-practice-detail-panel']==='services')
  assert.equal(panels.length,1,'single existing Services panel')
  assert.equal(panels[0].parents.some(n=>n.type==='details'&&!n.props.open),false,'editor is not hidden in disclosure')
}
for(const owner of [false,true])for(const total of [0,1])for(const used of [2,10])for(const busy of [false,true]){
  test(`service visibility: owner=${owner}, requests=${total}, used=${used}, busy=${busy}`,()=>{
    const f=fixture({owner,total,used,busy})
    const button=verifyOverview(f,used)
    if(used<10){
      // Busy navigation was allowed before this repair and remains unchanged.
      button.props.onClick()
      assert.equal(f.state[3],'services')
      assert.equal(f.state[7],1,'existing create-request increment')
      assert.ok(f.route.includes('panel=services'))
      verifyFocused(f)
    }
  })
}
test('loading/anonymous-without-data does not expose practitioner actions',()=>{
  const f=fixture({data:false})
  assert.equal(byClass(f.render(),'hh-practice-top-cta').length,0)
  assert.equal(actionButtons(f.render()).length,0)
  assert.ok(f.html().includes('aria-busy="true"'))
})
test('onboarding keeps its existing shortcut and does not duplicate activated quota action',()=>{
  const f=fixture({onboarding:true,used:0})
  const rows=f.render()
  assert.equal(byClass(rows,'hh-practice-top-cta').length,0)
  assert.equal(actionButtons(rows).length,1)
  actionButtons(rows)[0].node.props.onClick()
  assert.equal(f.scrolled,'hh-practice-onboarding')
  assert.equal(f.state[3],null)
  assert.ok(f.html().includes('id="hh-practice-onboarding"'))
})
test('direct Services panel preserves one-workbench contract',()=>verifyFocused(fixture({panel:'services'})))
test('negative mutation: moving quota action after metrics is rejected',()=>{
  const mutate=(s,path)=>{
    if(path!=='practice-workspace.jsx')return s
    const start=s.indexOf('    {!needsOnboarding&&!activePanel&&<div className="hh-practice-top-cta"')
    const end=s.indexOf('      </div>}',start)+'      </div>}'.length
    const block=s.slice(start,end);assert.ok(start>0&&end>start)
    return s.slice(0,start)+s.slice(end).replace('    {!needsOnboarding&&!activePanel&&p?.slug',block+'\n    {!needsOnboarding&&!activePanel&&p?.slug')
  }
  assert.throws(()=>verifyOverview(fixture({mutate}),2),/requests first/)
})
test('negative mutation: removal of active-panel visibility guard is rejected',()=>{
  const mutate=(s,path)=>path==='practice-workspace.jsx'?s.replace('{!needsOnboarding&&!activePanel&&<div className="hh-practice-top-cta"','{!needsOnboarding&&<div className="hh-practice-top-cta"'):s
  assert.throws(()=>verifyFocused(fixture({panel:'services',mutate})),/overview action unmounted/)
})
test('negative mutation: duplicate empty-inbox action is rejected',()=>{
  const mutate=(s,path)=>path==='practice-workspace.jsx'?s.replace('showServiceAction={needsOnboarding}','showServiceAction={true}'):s
  assert.throws(()=>verifyOverview(fixture({mutate}),2),/no duplicate/)
})
test('negative mutation: quota-disabled guard removal is rejected',()=>{
  const mutate=(s,path)=>path==='practice-workspace.jsx'?s.replace('disabled={!serviceQuota.canAdd}','disabled={false}'):s
  assert.throws(()=>verifyOverview(fixture({used:10,mutate}),10),/quota remains enforced/)
})

function verifyScopedStyles(css){
  const rules=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map(([,selectors,declarations])=>({selectors:selectors.trim().split(/,\s*/),declarations:declarations.trim()}))
    .filter(rule=>rule.selectors.some(selector=>/^\.hh-app \.hh-practice-marketplace \.hh-practice-(top-cta|top-cta-button|marketplace-cta-note)/.test(selector)))
  assert.equal(rules.length,8,'six desktop and two mobile action rules')
  for(const {selectors,declarations} of rules){
    assert.equal(selectors.length,2,'only original and explicitly scoped relocated action')
    const expected=selectors[0]==='.hh-app .hh-practice-marketplace .hh-practice-top-cta'
      ?'.hh-app .hh-practice-top-cta[data-practice-service-action]'
      :selectors[0].replace('.hh-app .hh-practice-marketplace ','.hh-app [data-practice-service-action] ')
    assert.equal(selectors[1],expected,'relocated scope shares exact original declarations')
    assert.ok(declarations.length)
  }
  const blocks=rules.map(rule=>rule.declarations.replace(/\s+/g,''))
  assert.ok(blocks.includes('display:flex;flex-direction:column;gap:7px;max-width:none;margin:0019px;'))
  assert.ok(blocks.some(block=>block.includes('width:100%;min-height:55px;padding:12px17px;')))
  assert.ok(blocks.includes('display:flex;align-items:center;flex-wrap:wrap;gap:5px;margin:02px;color:#7b695c;font:65011px/1.35system-ui,sans-serif;'))
  assert.ok(blocks.includes('margin-bottom:15px;gap:6px'))
  assert.ok(blocks.includes('min-height:51px;padding:10px13px;font-size:14px'))
}
test('relocated action inherits exact marketplace action styling through narrow selectors',()=>{
  verifyScopedStyles(fs.readFileSync(root+'/components/app/practice-dashboard.css','utf8'))
})
test('negative mutation: missing relocated stylesheet scope is rejected',()=>{
  const css=fs.readFileSync(root+'/components/app/practice-dashboard.css','utf8')
  assert.throws(()=>verifyScopedStyles(css.replaceAll('[data-practice-service-action]','[data-other-action]')),/relocated scope/)
})
test('negative mutation: missing relocated DOM styling marker is rejected',()=>{
  const mutate=(s,path)=>path==='practice-workspace.jsx'?s.replace(' data-practice-service-action',''):s
  assert.throws(()=>verifyOverview(fixture({mutate}),2),/scoped styling marker/)
})
