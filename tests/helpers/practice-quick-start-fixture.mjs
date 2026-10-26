// Runs real JSX handlers/effects with deterministic hooks and fictional responses.
// Child editors are explicit boundary markers, not browser or backend acceptance.
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { randomUUID } from 'node:crypto'
import ts from 'typescript'
import { normalizeVideoPresentation } from '../../lib/practitioners/presentation-contract.js'
import { TRADITION_COURSES } from '../../lib/personal-coaching/traditions.js'

const element=(type,props)=>{assert.ok(typeof type==='string'||typeof type==='function','Undefined or unsupported JSX component');return {type,props:props||{}}}
const blocked=()=>{throw new Error('External operation is not allowed in this fixture')}
const icons=Object.fromEntries(['BookOpen','ChevronRight','FileText','Headphones','Search','Leaf','Film','FolderOpen','LockKeyhole','Plus','Image','Link2','ArrowUp','ArrowDown','Trash2','Share2','Save','Eye','Globe2','Download','ExternalLink','Copy','MessageCircleQuestion','AlignLeft','Pencil','X'].map(name=>[name,`icon-${name}`]))
export function mountPractice(source,props={},respond=async()=>({ok:true,status:200,json:async()=>({items:[]})})){
 let slots=[],index=0,dirty=true,pending=[],tree
 const requests=[],urls=[]
 const window={location:{search:'',href:'https://fixture.invalid/en/app/practice',origin:'https://fixture.invalid'},history:{state:null,replaceState:(_s,_t,url)=>urls.push(url)},confirm:blocked}
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]))
 const hooks={
  useState(initial){const i=index++;if(!slots[i])slots[i]={value:typeof initial==='function'?initial():initial};return [slots[i].value,value=>{const next=typeof value==='function'?value(slots[i].value):value;if(!Object.is(next,slots[i].value)){slots[i].value=next;dirty=true}}]},
  useRef(initial){const i=index++;if(!slots[i])slots[i]={current:initial};return slots[i]},
  useEffect(effect,deps){const i=index++;if(!slots[i]||!same(slots[i].deps,deps)){const previous=slots[i];slots[i]={deps,cleanup:previous?.cleanup};pending.push(()=>{slots[i].cleanup?.();slots[i].cleanup=effect()})}},
 }
 const imports={react:hooks,'react/jsx-runtime':{jsx:element,jsxs:element,Fragment:'fragment'},'lucide-react':icons,
  '@supabase/supabase-js':{createClient:blocked},'@/components/session-photo-uploader':{preparePhoto:blocked},
  './course-slide-recorder':{default:'course-recorder'},'./practice-material-preview':{default:'material-preview'},
  './practitioner-articles':{default:'articles'},'./practitioner-course-builder':{default:'course-builder'},
  './practice-report-materials':{default:'report-materials'},'next/dynamic':{default:(loader,options)=>{
   assert.match(String(loader),/^\(\)\s*=>\s*Promise\.resolve\(\)\.then\(\(\)\s*=>\s*require\(['"]\.\/compact-video-composer['"]\)\)$/,'Unexpected dynamic loader')
   assert.equal(options.ssr,false);return 'video-composer'
  }},
  '@/lib/practitioners/presentation-contract.js':{normalizeVideoPresentation},
  '@/lib/personal-coaching/traditions.js':{TRADITION_COURSES},
  './practitioner-course-builder.module.css':{default:{}},'./practice-materials.module.css':{default:{}},
 }
 const moduleValue={exports:{}}
 const code=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 vm.runInNewContext(code,{module:moduleValue,exports:moduleValue.exports,require:id=>{assert.ok(Object.hasOwn(imports,id),'Unexpected import: '+id);return imports[id]},window,URL,URLSearchParams,crypto:{randomUUID},fetch:async(url,options)=>{
  assert.ok(['/api/app/practice/courses','/api/app/practice/report-materials'].includes(url),'Unexpected request: '+url)
  assert.equal(options.credentials,'same-origin');requests.push({url,options});return respond(url,options)
 }})
 function flush(){for(let count=0;dirty;count++){assert.ok(count<30,'Render loop');dirty=false;index=0;pending=[];tree=moduleValue.exports.default(props);for(const run of pending)run()}}
 function nodes(){const out=[];const visit=node=>{if(Array.isArray(node))return node.forEach(visit);if(!node||typeof node!=='object'||!('type'in node))return;out.push(node);visit(node.props.children)};visit(tree);return out}
 const api={requests,urls,flush,nodes,find:(type,predicate=()=>true)=>{const found=nodes().find(n=>n.type===type&&predicate(n.props));assert.ok(found,'Missing '+type);return found},update:next=>{props={...props,...next};dirty=true;flush()},unmount:()=>{for(const slot of slots)slot?.cleanup?.()},settle:async()=>{for(let i=0;i<12;i++){await Promise.resolve();flush()}}}
 flush();return api
}
export function fictionalCourse(title='Fictional saved course'){
 return {id:'fictional-course',slug:'fictional-course',status:'draft',revision:1,draft:{title,description:'',locale:'en',slides:[{id:'fictional-slide',kind:'text',title:'Fictional screen',body:'Fictional content'}]}}
}
