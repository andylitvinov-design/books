import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const source = readFileSync(new URL('../components/contact-channel-chooser.tsx', import.meta.url), 'utf8')
const checkbox = source.slice(source.indexOf('<input type="checkbox"'), source.indexOf('<span>{c.consent}</span>'))
const body = checkbox.match(/onPointerDown=\{event => \{([\s\S]*?)\n\s*\}\}/)?.[1]
assert.ok(body, 'Extract the actual production checkbox handler, not a rewritten model')
const run = new Function('event', body)
function probe(overrides={}) {
  const calls=[]
  const target={disabled:false,focus:options=>calls.push(options)}
  Object.defineProperty(target,'checked',{get:()=>false,set:()=>assert.fail('Pointer handling must not change checked')})
  const event={defaultPrevented:false,isPrimary:true,button:0,currentTarget:target,
    preventDefault:()=>assert.fail('No cancellation'),stopPropagation:()=>assert.fail('No propagation change'),...overrides}
  run(event)
  assert.equal(target.checked,false)
  return calls
}
for (const pointerType of ['mouse','touch','pen']) test('primary '+pointerType+' focuses without scrolling or granting consent',()=>assert.deepEqual(probe({pointerType}),[{preventScroll:true}]))
for (const [name,override] of [['already canceled',{defaultPrevented:true}],['secondary pointer',{isPrimary:false}],['middle button',{button:1}],['right button',{button:2}],['unknown primary',{isPrimary:undefined}]]) test(name+' stays untouched',()=>assert.deepEqual(probe(override),[]))
test('disabled input is untouched',()=>assert.deepEqual(probe({currentTarget:{disabled:true,focus:()=>assert.fail('disabled focus')}}),[]))
test('focus failure is not hidden with fallback focus or retry',()=>{
  let count=0
  assert.throws(()=>run({defaultPrevented:false,isPrimary:true,button:0,currentTarget:{disabled:false,focus:()=>{count++;throw new Error('unsupported')}}}),/unsupported/)
  assert.equal(count,1)
})
test('native consent and keyboard semantics remain intact',()=>{
  assert.match(checkbox,/type="checkbox" required checked=\{consent\} disabled=\{locked \|\| busy\}/)
  assert.match(checkbox,/onChange=\{event => \{ setConsent\(event.target.checked\); \}\}/)
  assert.doesNotMatch(body,/setConsent|checked|preventDefault|stopPropagation|setTimeout|scrollTo|requestAnimationFrame/)
  assert.doesNotMatch(checkbox,/onKey|onFocus|onClick|onPointerUp|onPointerCancel|tabIndex|role=/)
  assert.equal((source.match(/onPointerDown=/g)||[]).length,1)
  assert.match(source,/const \[consent, setConsent\] = useState\(false\)/)
  assert.match(source,/\|\| !consent/)
})

for (const [name,guard,event] of [
  ['cancellation','event.defaultPrevented || ',{defaultPrevented:true}],
  ['primary pointer','!event.isPrimary || ',{isPrimary:false}],
  ['left button','event.button !== 0 || ',{button:2}],
  ['disabled input',' || event.currentTarget.disabled',{disabled:true}],
]) test('negative control catches removed '+name+' guard',()=>{
  const mutant=body.replace(guard,'')
  assert.notEqual(mutant,body)
  let focused=false
  new Function('event',mutant)({defaultPrevented:false,isPrimary:true,button:0,...event,
    currentTarget:{disabled:Boolean(event.disabled),focus:()=>{focused=true}}})
  assert.equal(focused,true,'This mutant would violate the unchanged no-focus guard expectation')
})
