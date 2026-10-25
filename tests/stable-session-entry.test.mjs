import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8')
for(const locale of ['en','ru','es'])test(locale+': first offer stays stable until deliberate manual navigation',()=>{
 const hooks=[],timers=[],effects=[];let cursor=0
 const jsx=(type,props)=>({type,props:props||{}})
 const modules={
  'react/jsx-runtime':{jsx,jsxs:jsx},react:{
   useState(initial){const at=cursor++;if(!(at in hooks))hooks[at]=initial;return [hooks[at],update=>{hooks[at]=typeof update==='function'?update(hooks[at]):update}]},
   useRef(initial){const at=cursor++;return hooks[at]??(hooks[at]={current:initial})},useEffect(effect){effects.push(effect)},
  },'next/image':{default:'img'},'next/link':{default:'a'},
  'lucide-react':{ArrowRight:'span',ChevronLeft:'span',ChevronRight:'span'},
  '@/components/static-portrait':{StaticPortrait:'img'},'./services-conversion-hero.module.css':{default:{}},
 }
 const exports={}
 const source=ts.transpileModule(read('components/home-section-carousel.tsx'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText
 runInNewContext(source,{exports,window:{matchMedia:()=>({matches:false}),setInterval:callback=>{timers.push(callback);return timers.length},clearInterval:()=>{}},document:{visibilityState:'visible'},require:name=>{assert.ok(Object.hasOwn(modules,name),name);return modules[name]}})
 const render=()=>{cursor=0;effects.length=0;const tree=exports.HomeSectionCarousel({locale});effects.forEach(effect=>effect());const nodes=[];function walk(n){if(Array.isArray(n))return n.forEach(walk);if(n&&typeof n==='object'){nodes.push(n);walk(n.props?.children)}}walk(tree);return nodes}
 let nodes=render()
 assert.equal(timers.length,0,'no clock may replace the offer or CTA')
 assert.equal(nodes.find(n=>n.props['data-home-slide']).props['data-home-slide'],'services')
 const paid=nodes.find(n=>n.props['data-home-first-screen-cta']==='paid')
 assert.equal(paid.props.href,'/'+locale+'/services#consultation')
 for(const callback of timers)callback()
 nodes=render();assert.equal(nodes.find(n=>n.props['data-home-slide']).props['data-home-slide'],'services')
 nodes.filter(n=>n.type==='button').at(-1).props.onClick();nodes=render()
 assert.equal(nodes.find(n=>n.props['data-home-slide']).props['data-home-slide'],'academy','manual next still works')
})
test('one existing session selector precedes the long services catalogue',()=>{
 const page=read('app/[locale]/services/page.tsx')
 assert.equal((page.match(/<PublicConsultationCta/g)||[]).length,1)
 assert.ok(page.indexOf('<PublicConsultationCta')<page.indexOf('<ServicesStudioOffers'))
 assert.match(page,/id="consultation" serviceBooking/)
})
