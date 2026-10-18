import test from 'node:test'
import assert from 'node:assert/strict'
import { runInNewContext } from 'node:vm'
import { readFileSync } from 'node:fs'
import { CSP_PREHYDRATION_SCRIPT } from '../lib/csp-prehydration.js'

test('parser guard cannot overwrite a deliberately pinned Home exit with stale archive history',()=>{
 const listeners=new Map(), replacements=[]
 const window={location:{href:'https://house.example/en/app/portrait#personal-reports',replace:url=>replacements.push(url)},
 addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:()=>{}}
 runInNewContext(CSP_PREHYDRATION_SCRIPT,{window})
 window.__hhCspHardDestination='https://house.example/'
 listeners.get('popstate')({stopImmediatePropagation(){}})
 assert.deepEqual(replacements,['https://house.example/'])
 assert.equal(window.__cspPreHydration.destination,'https://house.example/')
 listeners.get('pageshow')({persisted:true})
 assert.equal(window.__hhCspHardDestination,undefined)
 listeners.get('popstate')({stopImmediatePropagation(){}})
 assert.equal(replacements[1],'https://house.example/en/app/portrait#personal-reports')
})

test('hydrated history guard preserves pending exit and clears it for restored visits',()=>{
 const source=readFileSync(new URL('../components/csp-navigation-boundary.tsx',import.meta.url),'utf8')
 const start=source.indexOf('    const onPopState = '),end=source.indexOf('    document.addEventListener',start)
 const handlerSource=source.slice(start,end).replace('(event?: Event)','(event)').replaceAll('(event as PageTransitionEvent)','event')
 const replacements=[]
 const window={location:{href:'https://house.example/en/app/portrait#personal-reports',replace:url=>replacements.push(url)},__hhCspHardDestination:'https://house.example/'}
 const handler=new Function('window','crossesPolicy','interruptedRouterNavigation',handlerSource+';return onPopState;')(window,()=>false,{current:false})
 let stopped=0;handler({type:'popstate',stopImmediatePropagation(){stopped++}})
 assert.deepEqual(replacements,['https://house.example/']);assert.equal(stopped,1)
 handler({type:'pageshow',persisted:true,stopImmediatePropagation(){stopped++}})
 assert.equal(window.__hhCspHardDestination,undefined)
 assert.equal(replacements.length,1,'Back restoration must not bounce to the old exit')
 assert.match(source,/window\.__hhCspHardDestination = url\.href;\s+event\.stopImmediatePropagation\(\);\s+window\.location\.assign\(url\.href\)/)
})
