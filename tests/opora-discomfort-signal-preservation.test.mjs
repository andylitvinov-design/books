import * as skillV5 from '../lib/inner-growth/anti-stress-skills-v5.js'
import * as phaseCatalog from '../lib/inner-growth/trauma-phase-catalog.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import * as moments from '../lib/inner-growth/course-moment-trends.js'
import * as adaptation from '../lib/inner-growth/course-adaptation.js'
import * as welcome from '../lib/inner-growth/course-welcome.js'
import * as courseSequence from '../lib/inner-growth/course-slide-sequence.js'
import * as dayOne from '../lib/inner-growth/anti-stress-day-one.js'
import * as oporaStateJourney from '../lib/inner-growth/opora-state-journey.js'
import { lessonFor, COURSE_CONTENT_VERSION, COURSE_CONTENT_V3, COURSE_CONTENT_V4 } from '../lib/inner-growth/lesson-library.js'

// Self-contained actual-component harness: reusable on canonical and billing branches.
const source=readFileSync(new URL('../components/app/course-slide-player.jsx',import.meta.url),'utf8')
const nodes=tree=>!tree||typeof tree!=='object'?[]:Array.isArray(tree)?tree.flatMap(nodes):[tree,...nodes(tree.props?.children)]
const textOf=tree=>tree==null||typeof tree==='boolean'?'':typeof tree!=='object'?String(tree):Array.isArray(tree)?tree.map(textOf).join(' '):textOf(tree.props?.children)
function mount(_name,{props}){
  const slots=[];let index=0,pending=[],dirty=false,tree,serial=0,network=0,focused=null,focusCount=0
  const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]))
  const hooks={
    useState(initial){const i=index++;slots[i]??={value:typeof initial==='function'?initial():initial};return [slots[i].value,value=>{slots[i].value=typeof value==='function'?value(slots[i].value):value;dirty=true}]},
    useRef(initial){return slots[index++]??={current:initial}},
    useMemo(fn,deps){const i=index++;if(!same(slots[i]?.deps,deps))slots[i]={value:fn(),deps};return slots[i].value},
    useEffect(fn,deps){const i=index++;if(!same(slots[i]?.deps,deps))pending.push(()=>{slots[i]?.cleanup?.();slots[i]={deps,cleanup:fn()}})},
  }
  const dependencies={'@/lib/inner-growth/trauma-phase-catalog':phaseCatalog,react:hooks,'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'Fragment'},
    'lucide-react':new Proxy({},{get:(_,key)=>String(key)}),'./course-guided-timer':{default:()=>null},'./course-practice-voice':{default:()=>null},
    '@/lib/inner-growth/anti-stress-skills-v5':skillV5,'@/lib/inner-growth/course-slide-sequence':courseSequence,'@/lib/inner-growth/course-adaptation':adaptation,'@/lib/inner-growth/course-moment-trends':moments,'@/lib/inner-growth/course-welcome':welcome,'@/lib/inner-growth/anti-stress-day-one':dayOne,'@/lib/inner-growth/opora-state-journey':oporaStateJourney,'./opora-state-journey':{default:()=>null},'./opora-module-activity':{default:()=>null},'./anti-stress-practice-lab':{default:'AntiStressPracticeLab'},'./course-lesson-result':{default:'CourseLessonResult'},'./anti-stress-method-activity':{default:()=>null},'./anti-stress-day-one':{default:()=>null,DayOneChoices:()=>null,DayOneFocusPicker:()=>null},'./course-slide-player.module.css':{default:new Proxy({},{get:(_,key)=>String(key)})}}
  const runtime={exports:{},require:name=>{assert.ok(dependencies[name],name);return dependencies[name]},
    document:{body:{style:{overflow:''}},addEventListener(){},removeEventListener(){}},
    crypto:{randomUUID:()=>`synthetic-${++serial}`},fetch(){network++;throw Error('No network in player fixture')},console}
  vm.runInNewContext(ts.transpileModule(source,{fileName:'course-slide-player.jsx',compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,runtime)
  const render=()=>{index=0;pending=[];dirty=false;tree=runtime.exports.default(props)
    for(const node of nodes(tree))if(node.props?.ref&&typeof node.type==='string')node.props.ref.current={focus(){focused=node;focusCount++},querySelector(){return {focus(){},scrollTo(){}}},querySelectorAll(){return []}}
    pending.forEach(fn=>fn())
  }
  render()
  return {get tree(){return tree},get network(){return network},get focused(){return focused},get focusCount(){return focusCount},async settle(){for(let i=0;i<25;i++){await Promise.resolve();if(dirty)render()}},unmount(){slots.forEach(s=>s?.cleanup?.())}}
}

for(const locale of ['en','ru']) for(const version of [COURSE_CONTENT_VERSION,COURSE_CONTENT_V3,COURSE_CONTENT_V4]) {
  test(`discomfort history survives neutral practice; final comfort remains independently editable (${locale}, ${version})`,async()=>{
    for(const laterChoice of [null,'comfortable','neutral','skip']) {
      const saved=[];let otherSaves=0
      const data={cycle:{id:'cycle-a',day:1,preferences:{length:'standard',imagery:'optional'}},
        lesson:lessonFor('calm_regulation',1,locale,'standard',version),target:{label:'Synthetic focus'},progress:{practiceCount:0}}
      const h=mount('course-slide-player',{props:{locale,data,onClose(){},onCheckin:async()=>{otherSaves++;return true},onPreferences:async()=>{otherSaves++;return true},onSession:async body=>{saved.push(body);return true}}})
      const byData=key=>nodes(h.tree).find(n=>n.props?.[key]!==undefined)
      const click=async node=>{assert.ok(node);node.props.onClick();await h.settle()}
      assert.equal(byData('data-course-global-discomfort'),undefined,'dedicated footer shortcut remains removed')
      for(let i=0;i<40&&byData('data-slide-kind').props['data-slide-kind']!=='feedback';i++)await click(nodes(h.tree).find(n=>n.type==='button'&&n.props.className==='primary'))
      const initialFocusCount=h.focusCount
      assert.equal(h.focused?.type,'h2')
      await click(nodes(byData('data-course-comfort')).find(n=>n.type==='button'&&textOf(n).trim()===(locale==='ru'?'Было некомфортно':'Uncomfortable')))
      const panel=byData('data-course-discomfort-support')
      assert.ok(panel);assert.equal(saved.length,0)
      assert.equal(h.focusCount,initialFocusCount+1,'opening support refocuses its heading')
      assert.equal(h.focused,nodes(panel).find(n=>n.type==='h2'))
      await click(nodes(panel).find(n=>n.type==='button'&&textOf(n)===(locale==='ru'?'Нейтральная практика':'Choose a neutral practice')))
      assert.equal(h.focusCount,initialFocusCount+2,'neutral return refocuses the lesson heading')
      assert.equal(h.focused?.type,'h2')
      assert.ok(nodes(h.tree).includes(h.focused))
      for(let step=0;step<40;step++) {
        const content=byData('data-slide-kind')
        if(content.props['data-slide-kind']==='feedback')break
        const skip=nodes(h.tree).find(n=>n.type==='button'&&n.props.className==='skip')
        const next=nodes(h.tree).find(n=>n.type==='button'&&n.props.className==='primary')
        await click(skip||next)
      }
      assert.equal(byData('data-slide-kind').props['data-slide-kind'],'feedback')
      assert.equal(saved.length,0)
      if(laterChoice){
        const group=byData('data-course-comfort')
        const label=laterChoice==='comfortable'?(locale==='ru'?'Комфортно':'Comfortable')
          :laterChoice==='neutral'?(locale==='ru'?'Нейтрально или терпимо':'Neutral or manageable'):(locale==='ru'?'Не хочу отвечать':'Prefer not to say')
        await click(nodes(group).find(n=>n.type==='button'&&textOf(n).trim()===label))
      }
      await click(nodes(h.tree).find(n=>n.type==='button'&&n.props.className==='primary'))
      assert.equal(saved.length,1)
      assert.equal(saved[0].comfort,laterChoice||'uncomfortable')
      assert.equal(saved[0].feedback,'uncomfortable')
      assert.equal(saved[0].adaptationChoice,'skip','comfort changes never automatically choose a future adaptation')
      assert.equal(saved[0].practiceWindow,'practice_v15')
      assert.equal(otherSaves,0);assert.equal(h.network,0)
      h.unmount()
    }
  })
}

for(const locale of ['en','ru'])test(`AS1.8 explicit return from neutral support refocuses the lesson (${locale})`,async()=>{
 const h=mount('course-slide-player',{props:{locale,data:{cycle:{day:1},programme:{id:'stress'},lesson:{id:'first',title:'First',antiStress:{},sections:[]},progress:{}},onClose(){},onCheckin(){throw Error('No write')},onSession(){throw Error('No write')}}})
 const byData=key=>nodes(h.tree).find(n=>n.props?.[key]!==undefined)
 assert.equal(byData('data-course-global-discomfort'),undefined)
 for(let i=0;i<30&&!nodes(h.tree).some(n=>typeof n.props?.onDiscomfort==='function');i++){nodes(h.tree).find(n=>n.type==='button'&&n.props.className==='primary').props.onClick();await h.settle()}
 nodes(h.tree).find(n=>typeof n.props?.onDiscomfort==='function').props.onDiscomfort();await h.settle()
 nodes(byData('data-course-discomfort-support')).find(n=>n.type==='button').props.onClick();await h.settle()
 const child=nodes(h.tree).find(n=>typeof n.props?.onReturnToPractice==='function');assert.ok(child);assert.equal(child.props.neutralMode,true)
 const before=h.focusCount;child.props.onReturnToPractice();await h.settle()
 assert.equal(h.focusCount,before+1);assert.equal(h.focused?.type,'h2');assert.ok(nodes(h.tree).includes(h.focused));assert.equal(h.network,0);h.unmount()
})

for(const locale of ['en','ru'])test(`neutral choice hides main and reflection labs without erasing earlier answers (${locale})`,async()=>{
 const saved=[]
 const h=mount('course-slide-player',{props:{locale,data:{cycle:{day:2},programme:{id:'stress'},lesson:{id:'lab',title:'Lab',antiStress:{},practiceV4:{},sections:[],workbook:{}},progress:{}},onClose(){},onCheckin(){throw Error('No early write')},onSession:async body=>{saved.push(body);return true}}})
 const find=key=>nodes(h.tree).find(n=>n.props?.[key]!==undefined)
 const advance=async()=>{const button=nodes(h.tree).find(n=>n.type==='button'&&n.props.className==='primary');assert.ok(button);await button.props.onClick();await h.settle()}
 while(find('data-slide-kind').props['data-slide-kind']!=='ritual')await advance()
 const main=nodes(h.tree).find(n=>n.type==='AntiStressPracticeLab'&&n.props.part==='main');assert.ok(main)
 main.props.onChange('switched');await h.settle()
 assert.equal(find('data-course-global-discomfort'),undefined)
 while(find('data-slide-kind').props['data-slide-kind']!=='feedback')await advance()
 nodes(find('data-course-comfort')).find(n=>n.type==='button'&&textOf(n).trim()===(locale==='ru'?'Было некомфортно':'Uncomfortable')).props.onClick();await h.settle()
 nodes(find('data-course-discomfort-support')).find(n=>n.type==='button').props.onClick();await h.settle()
 while(find('data-slide-kind').props['data-slide-kind']!=='ritual'){nodes(h.tree).find(n=>n.type==='button'&&n.props.className==='back').props.onClick();await h.settle()}
 let sawSymbol=false
 for(let i=0;i<12&&find('data-slide-kind').props['data-slide-kind']!=='completion';i++){
   assert.equal(nodes(h.tree).some(n=>n.type==='AntiStressPracticeLab'),false)
   if(find('data-slide-kind').props['data-slide-kind']==='symbol')sawSymbol=true
   await advance()
 }
 assert.equal(sawSymbol,true);assert.equal(saved.length,1);assert.equal(saved[0].practiceLab.main,'switched');assert.equal(saved[0].feedback,'uncomfortable');assert.equal(h.network,0);h.unmount()
})
