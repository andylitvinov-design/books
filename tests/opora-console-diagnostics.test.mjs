import assert from 'node:assert/strict'
import test from 'node:test'
import { EventEmitter } from 'node:events'
import { classifyOporaConsole as classify, observeOporaConsole } from '../scripts/helpers/opora-public-entry-verifier.mjs'
test('only closed categories survive hostile and oversized inputs', () => {
 for (const [text, category] of [['Hydration failed because SECRET','hydration'],['In HTML, X cannot be a child of SECRET','dom_nesting'],['Each child in a list should have a unique SECRET','react_key'],['The result of getServerSnapshot should be cached SECRET','uncached_snapshot'],['Maximum update depth exceeded SECRET','render_loop']]) assert.equal(classify(text),category)
 for (const text of [null,{},new Proxy({}, {get(){throw Error('no access')}}),Symbol('SECRET'),{toString(){throw Error('no coercion')}},'x'.repeat(4097),'https://SECRET.invalid/?token=SECRET','Hydration failed'+'x'.repeat(4096)]) assert.equal(classify(text),'unclassified')
})
test('bounded passive listener records no arguments, locations, raw values or late events', () => {
 const page = new EventEmitter(), observer=observeOporaConsole(page,{runtime:'isolated'})
 const msg=(type,text)=>({type:()=>type,text:()=>text,args(){throw Error('args forbidden')},location(){throw Error('location forbidden')}})
 page.emit('console',msg('log','SECRET'))
 page.emit('console',{type(){throw Error('SECRET')}})
 page.emit('console',{type:()=> 'error',text(){throw Error('SECRET')}})
 for(let n=0;n<70;n++) page.emit('console',msg(n%2?'warning':'error','Hydration failed SECRET https://private.invalid/?token=SECRET'))
 const result=observer.stop()
 assert.equal(result.events.length,64);assert.equal(result.dropped,6);assert.equal(result.unreadable,2)
 for(const event of result.events) {assert.deepEqual(Object.keys(event),['atMs','type','category']);assert.equal(event.category,'hydration');assert.ok(event.atMs>=0&&event.atMs<=3600000)}
 assert.doesNotMatch(JSON.stringify(result),/SECRET|private|token|https/)
 assert.equal(page.listenerCount('console'),0)
 page.emit('console',msg('error','SECRET'));assert.deepEqual(observer.stop(),result)
 result.events[0].category='SECRET';assert.equal(observer.stop().events[0].category,'hydration')
})
test('partial setup detaches its own listener, cleanup failure cannot throw or retain messages',()=>{
 const page=new EventEmitter(), on=page.on.bind(page)
 page.on=(...args)=>{on(...args);throw Error('SECRET')}
 assert.throws(()=>observeOporaConsole(page,{runtime:'isolated'}),/observer unavailable/);assert.equal(page.listenerCount('console'),0)
 const other=new EventEmitter(), observer=observeOporaConsole(other,{runtime:'isolated'})
 other.off=()=>{throw Error('SECRET')}
 assert.equal(observer.stop().cleanupErrors,1)
 other.emit('console',{type(){throw Error('must never run')}})
 assert.equal(observer.stop().cleanupErrors,1);assert.equal(observer.stop().unreadable,0)
})

test('console observer refuses non-isolated runtime before attaching',()=> { const page=new EventEmitter(); for(const runtime of [undefined,'production','development']) assert.throws(()=>observeOporaConsole(page,{runtime}), /Isolated OPORA/); assert.equal(page.eventNames().length,0) })

test('dual attach and detach failure leaves any retained listener inert', () => {
 const page = new EventEmitter(), on = page.on.bind(page)
 let reads = 0
 page.on = (...args) => { on(...args); throw Error('SECRET attachment') }
 page.off = () => { throw Error('SECRET detachment') }
 assert.throws(() => observeOporaConsole(page, { runtime: 'isolated' }), /observer unavailable/)
 assert.equal(page.listenerCount('console'), 1, 'Artificial broken detach retains listener')
 page.emit('console', { type() { reads++; return 'error' }, text() { reads++; return 'Hydration failed SECRET' } })
 page.emit('console', new Proxy({}, { get() { reads++; throw Error('SECRET getter') } }))
 assert.equal(reads, 0, 'Unavailable observer must never inspect subsequent messages')
})
