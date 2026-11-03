import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const source=readFileSync(new URL('../scripts/verify-app-r1.mjs',import.meta.url),'utf8')
const start=source.indexOf('async function chooseVisibleTest(')
const fragment=source.slice(start,source.indexOf('// Exact approved public hero',start))
async function scenario({scoped=false,missing=false,duplicate=false,wrongTitle=false,blocked=false,hidden=false,moreDuplicate=false,customizerDuplicate=false,customizerClosed=false,customizerNoop=false}={}){
 let expanded=false,checked=false,moreClicks=0,customizerOpen=!customizerClosed
 const name='Personality Baseline'
 const page={getByRole:(role,options)=>({role,...options,outer:false})}
 const choice={count:1,check:async()=>{if(blocked)throw Error('blocked');checked=true}}
 const row={filter({has}){assert.equal(has.outer,false,'has selector must be relative, without outer explorer root');assert.equal(has.exact,true);assert.equal(has.name,name);return this},
 get count(){return expanded&&!missing&&!hidden?(duplicate?2:1):0},isVisible:async()=>row.count>0,
 getByRole(role,{name:label,exact}){assert.equal(label,name);assert.equal(exact,true);return role==='heading'?{count:wrongTitle?0:1}:choice}}
 const customizer={count:async()=>customizerDuplicate?2:1,getAttribute:async()=> String(customizerOpen),visible:true,click:async()=>{if(!customizerNoop)customizerOpen=true}}
 const more={count:async()=>expanded?0:(moreDuplicate?2:1),click:async()=>{expanded=true;moreClicks++}}
 const empty={count:async()=>0,isVisible:async()=>false}
 const target={...(scoped?{page:()=>page}:{}),locator(selector){if(selector==='button[aria-controls="hh-test-customizer"]')return customizer;assert.equal(selector,'article');return row},getByRole(role,options){
  if(role==='heading'||role==='checkbox')return {...page.getByRole(role,options),outer:scoped}
  const label=String(options.name)
  if(label.includes('Choose my own'))return customizer
  if(label.includes('Show all matching'))return more
  return empty
 }}
 const expect=value=>({toHaveCount:async n=>assert.equal(typeof value.count==='function'?await value.count():value.count,n),toBeVisible:async()=>assert.equal(value===row?row.count>0:value.visible,true),toBeChecked:async()=>assert.equal(checked,true),toHaveAttribute:async(key,value)=>{assert.equal(key,'aria-expanded');assert.equal(await customizer.getAttribute(key),value)}})
 await new Function('expect',fragment+';return chooseVisibleTest')(expect)(target,name)
 assert.equal(checked,true);assert.equal(moreClicks,1)
}
test('visible-test helper selects exact unique card with Page or nested account root',async()=>{await scenario();await scenario({scoped:true});await scenario({scoped:true,customizerClosed:true})})
for(const option of ['missing','duplicate','wrongTitle','blocked','hidden','moreDuplicate','customizerDuplicate'])test('visible-test helper rejects '+option,()=>assert.rejects(scenario({scoped:true,[option]:true})))
test('all caller modes retain exact selection and no positional card fallback',()=>{
 assert.doesNotMatch(fragment,/\.first\(|\.nth\(/)
 for(const call of ['chooseVisibleTest(target,name)','chooseVisibleTest(explorer,name)','chooseVisibleTest(page,name)'])assert.ok(source.includes(call),call)
 assert.match(fragment,/testPage\.page\(\):testPage/)
 assert.match(source,/await expect\(checked\)\.toHaveCount\(1\)/)
})

test('visible-test helper rejects an inert closed filter toggle',()=>assert.rejects(scenario({scoped:true,customizerClosed:true,customizerNoop:true})))
