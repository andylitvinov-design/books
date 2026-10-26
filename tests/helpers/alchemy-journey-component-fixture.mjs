// Actual chooser + actual PhoneCountryInput handler integration for the complete
// Alchemy journey adapter. Parent selector geometry is not DOM/browser evidence;
// actual parent props/locks are independently exercised by the lifecycle suite.
import assert from 'node:assert/strict'
import {runInNewContext} from 'node:vm'
import {environment,mount,turn,readContactSource} from './contact-component-fixture.mjs'
import {createCompactAlchemyRegistrationProfile} from '../../scripts/helpers/contact-channel-verifier.mjs'
import {ALCHEMY_REFERENCE} from '../../scripts/helpers/alchemy-enquiry-journey-verifier.mjs'
export function alchemyJourneyComponentFixture({locale='en',mutateSource,throwClick=false}={}) {
 const contexts=[],events=[]
 const sourceURL=`http://127.0.0.1:3100/${locale}/services/alchemy-of-soul`
 const profile=createCompactAlchemyRegistrationProfile(sourceURL,{referenceCode:ALCHEMY_REFERENCE})
 let active
 const browser={newContext:async()=>{
  const env=environment(locale,{pathname:profile.sourcePath}),originalOpen=env.window.open
  let f,handler,init,pageHandler,closed=false,selected='60',locked=false,unroutes=0
  class Storage {
   getItem(key){return env.storage.get(key)??null}removeItem(key){env.storage.delete(key)}
   setItem(key,value){env.writes.push([key,value]);env.storage.set(key,value)}
  }
  env.window.sessionStorage=new Storage()
  const evaluate=async(fn,arg)=>{
   const value=await runInNewContext('('+fn.toString()+')(arg)',{window:env.window,sessionStorage:env.window.sessionStorage,Storage,DOMException,document:env.document,arg,URL,Object,Error})
   return value===undefined?undefined:structuredClone(value)
  }
  const dispatch=async(url,method,type,raw)=>{
   let resolve;const response=new Promise(done=>{resolve=done})
   const route={request:()=>({url:()=>url,method:()=>method,resourceType:()=>type,postData:()=>raw}),
    abort:async()=>resolve({ok:false,status:403,json:async()=>({saved:false})}),
    fetch:async()=>({url:()=>url,status:()=>200,dispose:async()=>{}}),
    fulfill:async value=>resolve(value.response||{ok:value.status<300,status:value.status,json:async()=>JSON.parse(value.body)}),
   }
   await handler(route);return response
  }
  env.fetch=async(url,options)=>{assert.equal(url,'/api/service-enquiries');env.requests.push(options.body);return dispatch('http://127.0.0.1:3100'+url,options.method,'fetch',options.body)}
  const draft=new URL(profile.whatsappUrl);draft.searchParams.set('text',draft.searchParams.get('text').replace(/\n\n(?:Enquiry|Заявка): HH-[A-F0-9]{12}$/,''))
  const props={locale,whatsappUrl:draft.href,compactPhone:true,compactTrigger:true,stayAfterSave:true,publicTopic:profile.description,onSubmissionLockChange:value=>{locked=value}}
  const source=readContactSource('components/contact-channel-chooser.tsx')
  function locator(selector) {
   const nodes=()=>{
    if(selector==='[data-alchemy-booking-formats]')return [{type:'div',props:{},hidden:false}]
    if(selector.startsWith('[data-alchemy-format='))return [{type:'button',hidden:false,props:{'aria-pressed':selected===selector.match(/="([^"]+)/)[1],disabled:locked,onClick:()=>{selected=selector.match(/="([^"]+)/)[1]}}}]
    return f.nodes().map(n=>({...n,props:{...n.props,...n.props.attributes}})).filter(n=>{
     const type=n.type==='acquisition-link'?'a':n.type
     const tag=selector.match(/^([a-z]+)/)?.[1];if(tag&&type!==tag)return false
     const clauses=[...selector.matchAll(/\[([\w-]+)(?:="([^"]+)")?\]/g)]
     return clauses.every(([,key,value])=>Object.hasOwn(n.props,key)&&(value===undefined||String(n.props[key])===value))
    })
   }
   const one=()=>{const matches=nodes();assert.equal(matches.length,1,selector);return matches[0]}
   return {selector,nodes,locator,
    getAttribute:async key=>one().props[key]===undefined?null:String(one().props[key]),
    fill:async value=>{one().props.onChange({target:{value}});f.flush()},
    selectOption:async value=>{one().props.onChange({target:{value}});f.flush()},
    check:async()=>{one().props.onChange({target:{checked:true}});f.flush()},
    click:async()=>{events.push(['click',selector]);if(throwClick&&selector.includes('contact-channel-submit'))throw Error('synthetic click failure');assert.notEqual(one().props.disabled,true);one().props.onClick();f.flush();await turn(f)},
   }
  }
  const page={url:()=>sourceURL,context:()=>context,on:()=>{},locator,evaluate,isClosed:()=>closed,close:async()=>{closed=true;f?.unmount()},
   goto:async url=>{assert.ok(handler,'Guard before navigation');await dispatch(url,'GET','document');},
  }
  const context={route:async(pattern,fn)=>{assert.equal(pattern,'**/*');handler=fn;events.push(['route'])},
   unroute:async(pattern,fn)=>{assert.equal(pattern,'**/*');assert.equal(fn,handler);unroutes++;handler=null},
   routeWebSocket:async()=>{},exposeBinding:async(name,fn)=>{env.window[name]=async()=>fn()},on:(name,fn)=>{assert.equal(name,'page');pageHandler=fn},
   addInitScript:async(fn,arg)=>{init=()=>evaluate(fn,arg)},newPage:async()=>{assert.ok(handler);await init();f=mount('contact-channel-chooser','ContactChannelChooser',props,env,{sourceOverride:mutateSource?mutateSource(source):source});pageHandler(page);events.push(['page']);return page},
   close:async()=>{closed=true;f?.unmount();handler=null},
  }
  const record={env,context,get f(){return f},get closed(){return closed},get unroutes(){return unroutes},originalOpen}
  contexts.push(record);active=record;return context
 }}
 const expect=actual=>{
  const after=async run=>{await turn(active.f);return run()}
  return {toHaveCount:n=>after(()=>assert.equal(actual.nodes().length,n,actual.selector)),
   toBeVisible:()=>after(()=>{assert.equal(actual.nodes().length,1,actual.selector);assert.equal(actual.nodes()[0].hidden,false,actual.selector)}),
   toBeEnabled:()=>after(()=>assert.notEqual(actual.nodes()[0].props.disabled,true,actual.selector)),
   toBeDisabled:()=>after(()=>assert.equal(actual.nodes()[0].props.disabled,true,actual.selector)),
   toHaveAttribute:(key,value)=>after(async()=>assert.equal(await actual.getAttribute(key),value)),
   toContainText:value=>after(()=>assert.ok(JSON.stringify(actual.nodes()[0].props.children).includes(value))),
   toHaveURL:value=>after(()=>{assert.equal(actual.url(),value);assert.deepEqual(active.env.navigations,[])}),
   not:{toBeChecked:()=>after(()=>assert.equal(actual.nodes()[0].props.checked,false))},
  }
 }
 expect.poll=read=>({toBe:async value=>{await turn(active.f);assert.equal(await read(),value)}})
 return {contexts,events,expect,source:{url:()=>sourceURL,viewportSize:()=>({width:390,height:844}),context:()=>({browser:()=>browser})}}
}
