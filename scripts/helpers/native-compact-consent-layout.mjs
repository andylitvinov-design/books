import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import { assertDaoVerifierBoundary } from './dao-free-entry-verifier.mjs'
import { boundedBestEffort } from './browser-failure-evidence.mjs'

export function extractCompactDockLayoutEffect(source) {
  const marker = '  useEffect(() => {\n    const element = nav.current;'
  assert.equal(source.split(marker).length, 2, 'Exactly one authored dock layout effect')
  const start = source.indexOf(marker) + '  useEffect(() => {'.length
  const end = source.indexOf('\n  }, [hidden, locale]);', start)
  assert.ok(end > start, 'Authored dock layout cleanup has an explicit boundary')
  return stripTypeScriptTypes('(function(nav) {' + source.slice(start, end) + '\n})')
}

// Independent synthetic geometry, not a copy/read of protected site styles.
// The measured dock custom property changes root height by the observed 69px.
export const nativeCompactConsentFixture = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
html{scroll-behavior:auto}body{margin:0;height:2400px;padding-bottom:var(--ia222-bottom-height,69px);font-family:sans-serif}
[data-contact-channel-chooser]{position:absolute;left:37px;top:1300px;width:316px}
form{margin:0;height:210px;position:relative}input[type=tel]{position:absolute;left:0;top:18px;width:280px;height:44px;font-size:16px}
label{position:absolute;left:0;top:90px;width:300px;height:40px;display:flex;align-items:center;gap:8px}
input[type=checkbox]{width:22px;height:22px;margin:0}span{font-size:16px}
.mobile-bottom-navigation{position:fixed;left:0;right:0;bottom:0;height:69px;background:#eee}
body:has(input[type=tel]:focus){--ia222-bottom-height:0px!important}
body:has(input[type=tel]:focus) .mobile-bottom-navigation{display:none}
</style></head><body><div data-contact-channel-chooser data-compact-phone-trigger="true"><form>
<input type="tel" aria-label="Synthetic phone"><label><input type="checkbox" required><span data-consent-text>One synthetic reply</span></label>
</form></div><nav class="mobile-bottom-navigation" aria-label="Synthetic navigation"></nav></body></html>`

// Locator actions scroll automatically; low-level mouse/touch coordinates do
// not. Establish the same visible, hit-tested target before every native case.
export async function prepareNativeConsentTarget(page, target) {
  await target.scrollIntoViewIfNeeded()
  const box=await target.boundingBox(), viewport=page.viewportSize()
  assert.ok(box&&viewport,'Native consent target has viewport geometry')
  const x=box.x+box.width/2,y=box.y+box.height/2
  assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&box.width>0&&box.height>0
    &&x>=0&&x<viewport.width&&y>=0&&y<viewport.height,'Native consent target center is inside viewport')
  assert.equal(await target.evaluate((node,point)=>node.contains(document.elementFromPoint(point.x,point.y)),{x,y}),
    true,'Native consent target receives its prepared coordinate')
  return{x,y}
}

export function installNativeConsentProbe() {
  const consent=document.querySelector('input[type="checkbox"]'),phone=document.querySelector('input[type="tel"]')
  const label=consent.closest('label'),nav=document.querySelector('nav')
  const state=window.__nativeConsentLayout={events:[],dropped:0,inputs:0,changes:0,trustedInputs:0,trustedChanges:0}
  const types=['pointerdown','pointerup','pointercancel','mousedown','mouseup','click','focusout','focusin','input','change','keydown']
  const targetKind=node=>!(node instanceof Node)?0:node===consent?1:node===phone?2:label.contains(node)?3:nav.contains(node)?4:node===document.body?5:0
  const number=value=>Number.isFinite(value)?Math.round(Math.max(-1000000,Math.min(1000000,value))*10)/10:null
  const snapshot=(event,phase=0)=>{
    const rect=consent.getBoundingClientRect()
    const clearance=getComputedStyle(document.body).getPropertyValue('--ia222-bottom-height')
    return{type:event?types.indexOf(event.type):-1,phase,trusted:!!event?.isTrusted,
      pointerId:number(event?.pointerId),primary:!!event?.isPrimary,button:number(event?.button),
      x:number(event?.clientX),y:number(event?.clientY),target:targetKind(event?.target),focus:targetKind(document.activeElement),
      height:number(document.documentElement.scrollHeight),scrollY:number(window.scrollY),
      clearance:number(parseFloat(clearance)),clearanceZero:clearance.trim()==='0px',
      inlineHeight:number(parseFloat(document.body.style.getPropertyValue('--ia222-bottom-height'))),
      important:document.body.style.getPropertyPriority('--ia222-bottom-height')==='important',
      checked:consent.checked,connected:consent.isConnected,disabled:consent.disabled,
      top:number(rect.top),left:number(rect.left),width:number(rect.width),controlHeight:number(rect.height),
      navHeight:number(nav.getBoundingClientRect().height)}
  }
  window.__nativeConsentLayoutSnapshot=()=>({...state,current:snapshot()})
  for(const type of types)for(const capture of [true,false])document.addEventListener(type,event=>{
    if(state.events.length<48)state.events.push(snapshot(event,capture?1:2));else state.dropped++
  },{capture,passive:true})
  for(const type of ['input','change'])consent.addEventListener(type,event=>{
    state[type==='input'?'inputs':'changes']++
    if(event.isTrusted)state[type==='input'?'trustedInputs':'trustedChanges']++
  },{passive:true})
}

// Emit only fixed-schema fixture evidence before teardown; never log the
// thrown exception, field values, text, URLs, or arbitrary page properties.
export function sanitizeNativeConsentFailure(kind,stage,raw) {
  const kinds=['mouse-checkbox','mouse-label','touch-checkbox','touch-label','keyboard','mouse-outside','disable-on-release','detach-on-release']
  const stages=['setup','prepare','gesture','counts','geometry','hold-release','clearance','cleanup','final-counts']
  const number=value=>typeof value==='number'&&Number.isFinite(value)?Math.round(Math.max(-1000000,Math.min(1000000,value))*10)/10:null
  const record=value=>{
    const out={}
    for(const key of ['type','phase','pointerId','button','x','y','target','focus','height','scrollY','clearance','inlineHeight','top','left','width','controlHeight','navHeight'])out[key]=number(value?.[key])
    for(const key of ['trusted','primary','important','checked','connected','disabled','clearanceZero'])out[key]=value?.[key]===true
    return out
  }
  return{schema:1,kind:kinds.includes(kind)?kind:'unknown',stage:stages.includes(stage)?stage:'unknown',
    inputs:number(raw?.inputs),changes:number(raw?.changes),trustedInputs:number(raw?.trustedInputs),trustedChanges:number(raw?.trustedChanges),
    dropped:number(raw?.dropped),current:record(raw?.current),events:Array.isArray(raw?.events)?raw.events.slice(0,48).map(record):[]}
}

export async function preserveNativeConsentFailure(page,kind,stage,log=console.error,timeoutMs=1000) {
  let raw
  const outcome=await boundedBestEffort(async()=>{raw=await page.evaluate(()=>window.__nativeConsentLayoutSnapshot?.())},timeoutMs)
  try{log('NATIVE_COMPACT_CONSENT_FAILURE',JSON.stringify({...sanitizeNativeConsentFailure(kind,stage,raw),outcome}))}catch{}
}

export async function assertNativeCompactConsentLayout(browser, expect, { origin }) {
  assertDaoVerifierBoundary(origin)
  const source = await readFile(new URL('../../components/mobile-bottom-navigation.tsx', import.meta.url), 'utf8')
  const effect = extractCompactDockLayoutEffect(source)
  // The public service matrix uses a 390px desktop context. Touch capability
  // adds genuine touchscreen coverage without changing its viewport model.
  const context = await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:false,serviceWorkers:'block'})
  let blocked = 0
  await context.route('**/*', async route => {blocked++;await route.abort('blockedbyclient')})
  const errors = []
  try {
    for (const kind of ['mouse-checkbox','mouse-label','touch-checkbox','touch-label','keyboard','mouse-outside','disable-on-release','detach-on-release']) {
      const page = await context.newPage()
      page.on('pageerror', () => errors.push(kind))
      let stage='setup'
      try {
        await page.setContent(nativeCompactConsentFixture)
        await page.evaluate(effectSource => {
          window.__nativeConsentLayoutCleanup = (0,eval)(effectSource)({current:document.querySelector('nav')})
        }, effect)
        await page.evaluate(installNativeConsentProbe)
        const phone=page.getByLabel('Synthetic phone',{exact:true}),consent=page.locator('input[type="checkbox"]')
        stage='prepare'
        await phone.fill('synthetic-only')
        const target=kind==='touch-label'||kind==='mouse-label'?page.locator('[data-consent-text]'):consent
        const {x,y}=await prepareNativeConsentTarget(page,target)
        await expect(phone).toBeFocused()
        await expect(page.locator('nav')).toBeHidden()
        await expect.poll(()=>page.locator('body').evaluate(node=>getComputedStyle(node).getPropertyValue('--ia222-bottom-height').trim())).toBe('0px')
        const initialHeight=await page.evaluate(()=>document.documentElement.scrollHeight)
        if(kind.endsWith('on-release'))await consent.evaluate((node,mode)=>{
          node.addEventListener('pointerup',()=>{if(mode==='disable-on-release')node.disabled=true;else node.remove()},{once:true})
        },kind)
        stage='gesture'
        if(kind==='keyboard') {
          await page.keyboard.press('Tab');await expect(consent).toBeFocused();await page.keyboard.press('Space')
        } else if(kind==='mouse-checkbox') await consent.check()
        else if(kind==='mouse-label') await page.locator('[data-consent-text]').click()
        else {
          if(kind.startsWith('touch'))await page.touchscreen.tap(x,y)
          else {
            await page.mouse.move(x,y);await page.mouse.down()
            if(kind==='mouse-outside')await page.mouse.move(10,100)
            await page.mouse.up()
          }
        }
        const wanted=['mouse-outside','disable-on-release','detach-on-release'].includes(kind)?0:1
        stage='counts'
        await expect.poll(()=>page.evaluate(()=>{
          const s=window.__nativeConsentLayout;return{inputs:s.inputs,changes:s.changes,trustedInputs:s.trustedInputs,trustedChanges:s.trustedChanges}
        })).toEqual({inputs:wanted,changes:wanted,trustedInputs:wanted,trustedChanges:wanted})
        stage='geometry'
        const state=await page.evaluate(()=>window.__nativeConsentLayout)
        if(kind!=='keyboard') {
          assert.ok(state.events.some(event=>event.type===0&&event.trusted),kind+' native press exists')
          assert.ok(state.events.some(event=>event.type===1&&event.trusted),kind+' native release exists')
          // Physical down/up must share geometry. A browser may deliver a
          // compatibility click later using its already-resolved native target.
          for(const event of state.events.filter(event=>event.type===0||event.type===1)) {
            assert.equal(event.height,initialHeight,kind+' root height remains stable through '+event.type)
            assert.equal(event.clearanceZero,true,kind+' computed clearance remains exactly zero through '+event.type)
          }
        }
        if(wanted)await expect(consent).toBeChecked()
        else if(kind!=='detach-on-release')await expect(consent).not.toBeChecked()
        stage='hold-release'
        await expect.poll(()=>page.locator('body').evaluate(node=>node.style.getPropertyPriority('--ia222-bottom-height'))).toBe('')
        // Some WebKit touch gestures retain editor focus. Prove hold cleanup
        // first; only then use native Tab to test normal post-edit clearance.
        stage='clearance'
        if(await phone.evaluate(node=>node===document.activeElement))await page.keyboard.press('Tab')
        await expect.poll(()=>page.locator('body').evaluate(node=>getComputedStyle(node).getPropertyValue('--ia222-bottom-height').trim())).toBe('69px')
        assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight),initialHeight+69,kind+' normal clearance restores after native completion')
        assert.equal(blocked,0,'Native consent fixture remains fully offline')
        stage='cleanup'
        await page.evaluate(()=>{window.__nativeConsentLayoutCleanup();delete window.__nativeConsentLayoutCleanup})
        // Recheck after restoration, optional Tab and effect teardown: an
        // earlier count must not hide a delayed second native activation.
        stage='final-counts'
        assert.deepEqual(await page.evaluate(()=>{
          const s=window.__nativeConsentLayout;return{inputs:s.inputs,changes:s.changes,trustedInputs:s.trustedInputs,trustedChanges:s.trustedChanges}
        }),{inputs:wanted,changes:wanted,trustedInputs:wanted,trustedChanges:wanted},kind+' final trusted consent counts after cleanup')
      } catch(error) {
        await preserveNativeConsentFailure(page,kind,stage)
        throw error
      } finally {
        await page.evaluate(()=>{window.__nativeConsentLayoutCleanup?.();delete window.__nativeConsentLayoutCleanup}).catch(()=>{})
        await page.close()
      }
    }
    assert.deepEqual(errors,[]);assert.equal(blocked,0)
    console.log('PASS native compact consent gestures preserve root height through release and restore dock clearance without network')
  } finally {await context.close()}
}
