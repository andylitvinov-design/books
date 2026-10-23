import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { nextMobileKeyboardOcclusion as next } from '../lib/mobile-keyboard-occlusion.mjs'
const sample = (changes = {}) => ({width:390,layoutHeight:844,visibleHeight:844,scale:1,hasViewport:true,editing:false,...changes})
function contract(fn) {
 let state=fn(null,sample())
 assert.equal(state.occluded,false)
 state=fn(state,sample({editing:true}));assert.equal(state.occluded,false,'Text focus without keyboard keeps navigation visible')
 state=fn(state,sample({editing:false}));assert.equal(state.occluded,false,'Checkbox focus without keyboard does not change nav geometry')
 state=fn(state,sample({editing:true,visibleHeight:510}));assert.equal(state.occluded,true,'Actual keyboard occlusion hides bar')
 state=fn(state,sample({editing:false,visibleHeight:510}));assert.equal(state.occluded,true,'Blur/checkbox pointerdown cannot restore bar while keyboard remains')
 state=fn(state,sample({editing:false,visibleHeight:700}));assert.equal(state.occluded,true,'Partial viewport recovery retains geometry')
 state=fn(state,sample({editing:false,layoutHeight:760,visibleHeight:760}));assert.equal(state.occluded,false,'Keyboard recovery with browser chrome restores navigation')
 state=fn(state,sample({editing:false,layoutHeight:760,visibleHeight:760}));assert.equal(state.occluded,false,'Settled shorter viewport does not relatch')
 assert.equal(fn(null,sample({editing:true,visibleHeight:780})).occluded,false,'Browser chrome is not a keyboard')
 assert.equal(fn(null,sample({editing:true,visibleHeight:500,scale:2})).occluded,false,'Pinch zoom is not keyboard evidence')
 assert.equal(fn(null,sample({editing:true,visibleHeight:500,hasViewport:false})).occluded,false,'Missing API keeps navigation accessible')
 assert.equal(fn(null,sample({width:1365,editing:true,visibleHeight:500})).occluded,false,'Desktop unaffected')
 assert.equal(fn(null,sample({visibleHeight:NaN})).occluded,false,'Invalid geometry fails visible')
}
test('focus → normal consent pointer sequence keeps fixed navigation stable until actual viewport recovery',()=>contract(next))
test('resizing layout with keyboard preserves pre-focus height and orientation reset does not retain hidden bar',()=>{
 let s=next(null,sample());s=next(s,sample({editing:true}));s=next(s,sample({editing:true,layoutHeight:510,visibleHeight:510}));assert.equal(s.occluded,true)
 s=next(s,sample({width:844,layoutHeight:390,visibleHeight:390,editing:false}));assert.equal(s.occluded,false)
})
test('component wires geometry and focus events without reading contact values or altering consent',()=>{
 const s=readFileSync(new URL('../components/mobile-bottom-navigation.tsx',import.meta.url),'utf8')
 assert.match(s,/nextMobileKeyboardOcclusion\(keyboardState,/)
 assert.match(s,/const onLayoutChange = \(\) => \{ updateKeyboardOcclusion\(\); measureHeight\(\); dockToViewport\(\); \}/)
 for(const event of ['focusin','focusout']){assert.ok(s.includes(`document.addEventListener('${event}', onLayoutChange)`));assert.ok(s.includes(`document.removeEventListener('${event}', onLayoutChange)`))}
 assert.match(s,/viewport\?\.addEventListener\('resize', onLayoutChange/)
 assert.match(s,/element\.removeAttribute\('data-keyboard-occluded'\)/)
 assert.doesNotMatch(s,/activeElement\??\.(?:value|checked)|\.check\(|\.click\(|\.submit\(/)
 const css=readFileSync(new URL('../app/ia-v2.css',import.meta.url),'utf8')
 assert.match(css,/\.ia222-bottom-navigation\[data-keyboard-occluded\] \{\s*display: none !important;/)
 assert.doesNotMatch(css,/:focus\)\s*\.ia222-bottom-navigation/)
 assert.match(css,/scroll-padding-bottom: var\(--ia222-bottom-height, calc\(76px \+ env\(safe-area-inset-bottom\)\)\)/)
})
const source=readFileSync(new URL('../lib/mobile-keyboard-occlusion.mjs',import.meta.url),'utf8')
for(const [name,from,to] of [
 ['focus-only hiding','Boolean(editing && loss >= threshold)','Boolean(editing)'],
 ['immediate blur restoration',`loss >= threshold
    :`,`editing && loss >= threshold
    :`],
 ['no recovery',`loss >= threshold
    :`,`true
    :`],
 ['missing API hidden','!hasViewport || width > 767','width > 767'],
 ['desktop hidden','width > 767 ||','false ||'],
 ['zoom hidden','Math.abs(scale - 1) > 0.05','false'],
]) test('rejects '+name,async()=>{assert.ok(source.includes(from));const m=await import('data:text/javascript,'+encodeURIComponent(source.replace(from,to)));assert.throws(()=>contract(m.nextMobileKeyboardOcclusion))})
