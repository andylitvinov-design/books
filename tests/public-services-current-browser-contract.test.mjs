import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {measureIdeasOrderedLayout,ideasQuoteGeometryProblems} from '../scripts/helpers/ideas-quote-geometry.mjs'
import {createElement} from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import {renderToStaticMarkup} from 'react-dom/server'
import * as dao from '../data/dao-hexagrams.mjs'
import * as guidance from '../lib/ideas-guidance.mjs'
import * as enquiry from '../lib/whatsapp-enquiry.js'
import * as receipt from '../lib/practitioners/enquiry-receipt.mjs'
import {sourceModule} from './helpers/current-source-render.mjs'
import {ALCHEMY_PANEL_IDS,assertAlchemyPanelOrder} from '../scripts/helpers/alchemy-panel-contract.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const noInteraction=()=>{throw new Error('No external action or interaction in static source proof')}
const staticHooks={useState:value=>[typeof value==='function'?value():value,noInteraction],useRef:value=>({current:value}),useEffect:()=>{},useLayoutEffect:()=>{}}
const cssModule={default:new Proxy({}, {get:(_,key)=>String(key)})}
const iconNames=['ArrowRight','ArrowUpRight','BookOpen','ChevronDown','Compass','Flower2','Gift','Paperclip','ClipboardCheck','HeartHandshake','Quote','X','Sparkles','Sprout','Sun','LockKeyhole','CheckCircle2','MessageCircle','Send','ShieldCheck']
const icons=Object.fromEntries(iconNames.map(name=>[name,'span']))
const Link=({prefetch,children,...props})=>createElement('a',props,children)
const Image=({fill,unoptimized,priority,...props})=>createElement('img',props)
const {FreeDiagnosticStart}=sourceModule(read('components/free-diagnostic-start.tsx'),'free-diagnostic-start.tsx',{
  'react/jsx-runtime':jsxRuntime,react:staticHooks,'lucide-react':icons,
  '@/lib/coaching/intake-model':{COACHING_TOPICS:[{id:'personal',label:{en:'Personal',ru:'Личное',es:'Personal'}}]},
  '@/lib/coaching/diagnostic-enquiry.mjs':{DIAGNOSTIC_START_KEY:'synthetic-unused'},
  './free-diagnostic-start.module.css':cssModule,
})
const {CompactLeadCapture}=sourceModule(read('components/compact-lead-capture.tsx'),'compact-lead-capture.tsx',{
  'react/jsx-runtime':jsxRuntime,react:staticHooks,'lucide-react':icons,
  'next/navigation':{usePathname:()=>'/en/services/free-situation-review'},
  '@/components/static-portrait':{StaticPortrait:Image},
  '@/lib/practitioners/enquiry-receipt.mjs':receipt,
  '@/lib/whatsapp-enquiry':enquiry,
  './compact-lead-capture.module.css':cssModule,
})

test('actual compact diagnostic JSX is one controlled phone-only step, without a premature enquiry',()=>{
  for(const locale of ['en','ru','es']){
    const html=renderToStaticMarkup(createElement(FreeDiagnosticStart,{locale,compact:true,contactValue:'+14165550123',onContactChange:noInteraction}))
    assert.match(html,/id="free-diagnostic-start"/)
    assert.match(html,/data-free-diagnostic-start="true"/)
    assert.match(html,/data-free-diagnostic-phone-only="true"/)
    assert.equal((html.match(/<input\b/g)||[]).length,1)
    assert.match(html,/<input[^>]*type="tel"[^>]*required=""[^>]*value="\+14165550123"/)
    assert.doesNotMatch(html,/<select|<textarea|type="email"|type="checkbox"/)
    assert.match(html,/<button type="submit"/)
  }
})

test('legacy holistic variant preserves four actions, while current page mounts only the three-choice entry',()=>{
  const {IdeasDiscovery}=sourceModule(read('components/ideas-discovery.tsx'),'ideas-discovery.tsx',{
    'react/jsx-runtime':jsxRuntime,react:staticHooks,'lucide-react':icons,
    'next/link':{default:Link},'next/navigation':{useRouter:()=>({push:noInteraction})},
    '@/components/dao-hexagram-glyph':{DaoHexagramGlyph:()=>createElement('span',{'data-proof-glyph':true})},
    '@/components/compact-lead-capture':{CompactLeadCapture},
    '@/data/dao-hexagrams.mjs':dao,
    '@/lib/dao-divination.mjs':{drawRandomHexagram:noInteraction},
    '@/lib/ideas-guidance.mjs':guidance,
    '@/lib/ideas-preview-rotation.mjs':{rotateIdeasPreviewAphorisms:noInteraction},
    '@/lib/ideas-coaching-handoff':{stageIdeasCoachingQuestion:noInteraction},
    '@/lib/practitioners/remote-energy-support':{stageRemoteSupportLandingIntention:noInteraction},
    './ideas-discovery.module.css':cssModule,
    '@/components/tests-coaching-switchboard':{TestsCoachingSwitchboard:noInteraction},
  })
  for(const locale of ['en','ru','es']){
    const html=renderToStaticMarkup(createElement(IdeasDiscovery,{locale,variant:'holistic'}))
    assert.match(html,/data-holistic-entry="true"/)
    assert.equal((html.match(/data-ideas-tao="true"/g)||[]).length,1)
    assert.match(html,/<button type="submit" form="ideas-question-form"[^>]*data-ideas-tao="true"/)
    assert.match(html,new RegExp('<a href="/'+locale+'/services/remote-energy-support"[^>]*data-ideas-energy-support="true"'))
    assert.doesNotMatch(html,/data-ideas-personal-diagnostic|data-ideas-free-coaching/)
    assert.deepEqual([...html.matchAll(/data-ideas-(tao|energy-support|meditations|talismans)="true"/g)].map(match=>match[1]),
      ['tao','energy-support','meditations','talismans'])
    assert.match(html,/<a href="#meditation-practices"[^>]*data-ideas-meditations="true"/)
    assert.match(html,/<a href="#talismans"[^>]*data-ideas-talismans="true"/)

  }
  const page=read('app/[locale]/holistic-support/page.tsx')
  assert.match(page,/<HolisticSupportChoices locale=\{locale\} \/>/)
  assert.doesNotMatch(page,/<IdeasDiscovery locale=\{locale\} variant="holistic"/)
  assert.doesNotMatch(page,/data-holistic-path|<FreeDiagnosticStart|<CompactLeadCapture/)
  const script=read('scripts/verify-holistic-master-browser.mjs')
  assert.doesNotMatch(script,/data-holistic-path|personal-insights-master/)
  for(const text of ['[data-holistic-choose]','[data-ideas-tao]','[data-holistic-talismans-cta]',
    'await dao.tap()','await insight.tap()','await energy.tap()','await control.tap()','await practitioner.tap()',
    'await control.click({trial:true})','box.width >= 44 && box.height >= 44',
    "['home', 'analysis', 'courses', 'profile', 'alchemy', 'pro', 'temple']"])assert.ok(script.includes(text),text)
  assert.match(script,/private question and intention never enter storage or cookies/i)
  assert.match(page,/id="meditation-practices"[^>]*data-holistic-meditations/)
  assert.match(page,/id="talismans"[^>]*data-holistic-talismans/)

})

test('canonical twelve-journey matrix retains changed-intent privacy, geometry, artifacts and fail-closed guards',()=>{
  const script=read('scripts/verify-holistic-master-browser.mjs')
  assert.match(script,/for \(const locale of \["en","ru","es"\]\)\s*for \(const width of \[320,390,430\]\) await verify\(webkit,locale,width\)/)
  assert.match(script,/for \(const locale of \["en","ru","es"\]\) await verify\(chromium,locale,390\)/)
  assert.match(script,/assert\.equal\(evidence\.length, 12/)
  assert.match(script,/\["meditations", "energy", "dao"\]/)
  for(const text of ['await question.fill(copy[locale].question)','await question.fill(copy[locale].intention)',
    'assert.equal(await panel.locator("[data-ideas-result]").count(), 0',
    'await page.reload({waitUntil:"domcontentloaded"})','assert.equal(await handoff.inputValue(), ""',
    'await handoff.fill(copy[locale].intention)', 'copy[locale].reset + " ×"',
    'assert.equal(await nextScreen.locator("[data-lead-saved]").count(), 0','geometry.document <= geometry.viewport + 2',
    'document.documentElement.scrollWidth <= innerWidth + 1','ideas-pine-sharp.avif','page.screenshot(',
    '"/acceptance.json"','page.on("pageerror"','assert.deepEqual(errors, []',
    'createHolisticBrowserIsolation(browser', 'await isolation.assertClean()', 'await isolation.close()',
    'assert.deepEqual(guardFailures, []', 'primaryFailure = error','guardFailures.push("BROWSER_CLOSE_FAILED")',
    'box.width > 200 && box.height >= 80', 'last.y + last.height < 844 - 40',
    'geometryForMeditations.expected) <= 2', 'videoHeight - geometryForMeditations.audioHeight) <= 2',
    'shortHeight - (568-142)) <= 2', 'shortAudio - shortHeight) <= 2',
    'beforeTitle', 'beforeId', 'privateBrowserPersistence(page', 'privateRequestLeak(request',
    'current three-choice journey does not silently copy a Dao question']) assert.ok(script.includes(text),text)
  assert.doesNotMatch(script,/assert\.equal\(await root\.getAttribute\("id"\), "temple-psychic-insights"/)
  assert.doesNotMatch(script,/dispatchEvent\(|force:\s*true|browser\.newPage\(/)
  const canonical=read('scripts/verify-holistic-support-browser.mjs')
  for(const text of ['createHolisticBrowserIsolation(browser','await isolation.assertClean()','await isolation.close()',
    'assert.equal(evidence.length, 8','await dao.tap()','await diagnostic.tap()',
    'bounds.width > 200 && bounds.height >= 80','last.y + last.height < height - 40',
    'privateBrowserPersistence(page','privateRequestLeak(request','primaryFailure = err']) assert.ok(canonical.includes(text),text)
  assert.doesNotMatch(canonical,/browser\.newPage\(|dispatchEvent\(|force:\s*true/)

})

test('actual express page keeps inline mounted state while standalone hub remains a conditional modal',async()=>{
  const {expressFixture,turn}=await import('./helpers/personal-express-parent-fixture.mjs')
  const {diagnosisFixture}=await import('./helpers/diagnosis-parent-fixture.mjs')
  for(const locale of ['en','ru','es']){
    const f=expressFixture({locale}),phone=()=>f.find('input',p=>p.type==='tel'),consent=()=>f.find('input',p=>p.type==='checkbox')
    assert.equal(phone().hidden,true,'Initial chooser is mounted but hidden, not detached');f.reveal()
    for(const selected of ['energy','situation']){
      f.select(selected);assert.equal(phone().props.autoComplete,'tel-national');assert.equal(phone().props.value,'');assert.equal(consent().props.checked,false)
      assert.equal(f.nodes().filter(n=>n.type==='select').length,1);assert.equal(f.nodes().filter(n=>n.type==='input'&&n.props.type==='radio').length,2)
      f.phone('4165550123');for(const channel of ['whatsapp','telegram']){f.send(channel);await turn(f)}assert.equal(f.env.requests.length,0);assert.equal(f.env.popups.length,0)
      f.consent();f.escape();assert.equal(phone().hidden,true);assert.equal(f.env.document.activeElement.id,'express-reveal');assert.equal(f.env.document.body.style.overflow,'auto')
      f.anchor();assert.equal(phone().props.value,'4165550123');assert.equal(consent().props.checked,true,'Same-key fold preserves explicit consent');assert.equal(phone().hidden,false)
    }
    assert.equal(f.env.requests.length,0);assert.equal(f.links().length,0);f.unmount()
    // This component still exists on the hub; its close/remount contract is separate.
    const hub=diagnosisFixture({locale,pathname:'/'+locale+'/services/free-consultation'});hub.select('wu-xing-free');hub.phone('4165550123');hub.consent();hub.close();assert.equal(hub.nodes().filter(n=>n.type==='input').length,0);hub.select('wu-xing-free');assert.equal(hub.find('input',p=>p.type==='tel').props.value,'');assert.equal(hub.find('input',p=>p.type==='checkbox').props.checked,false);hub.unmount()
  }
  const script=read('scripts/verify-public-services-production.mjs')
  for(const text of ['One localized personal express enquiry','Folded chooser remains mounted; folding is not cancellation','Each new focus key requires fresh consent','Same-key folding preserves current phone','Same-key folding preserves explicit consent','await diagnosisIsolation.assertClean()','await expect(reveal).toBeFocused()',"page.keyboard.press('Escape')",'createFreeReviewViewportIsolation(browser'])assert.ok(script.includes(text),text)
  const freeEntry=script.slice(script.indexOf('// Read-only EN/RU/ES acceptance for the CURRENT three free entry routes.'))
  assert.doesNotMatch(freeEntry,/route\.continue\(|page\.route\(|context\(\)\.newPage\(|sharedPhone|data-compact-lead-form/)
  assert.match(freeEntry,/if \(diagnosisIsolation\) await diagnosisIsolation\.close\(\)/)
})

test('Spanish browser checks exact ordered panels and retains every mobile geometry/payment gate',()=>{
  const source=read('components/alchemy-soul-landing.tsx')
  const names=[...source.matchAll(/data-alchemy-panel="([^"]+)"/g)].map(match=>match[1])
  assert.deepEqual(names,ALCHEMY_PANEL_IDS)
  assertAlchemyPanelOrder(names.map(name=>({name})))
  assert.throws(()=>assertAlchemyPanelOrder(names.slice(1).map(name=>({name}))))
  assert.throws(()=>assertAlchemyPanelOrder([...names].reverse().map(name=>({name}))))
  const browser=read('scripts/verify-public-services-production.mjs')
  assert.match(browser,/assertAlchemyPanelOrder\(panelHeights\)/)
  assert.match(browser,/panelHeights\.filter\(p => p\.name !== "reviews" && p\.height > p\.max\)/)
  assert.match(browser,/await assertAlchemyPaymentsExpanded\(main, expect, width\)/)
})

test('320px Ideas correction stays scoped to the nested Temple result card without weakening readability',async()=>{
  const css=read('components/ideas-discovery.module.css')
  assert.match(css,/@media \(max-width: 360px\) \{\s*\.root \[data-tests-coaching-temple\] > \.results \{ margin-inline: -6px; \}\s*\}/)
  assert.match(read('components/tests-coaching-switchboard.tsx'),/path === "temple" \? <div data-tests-coaching-temple>/)
  const browser=read('scripts/verify-ideas-mobile-browser.mjs')
  assert.match(browser,/import \{ measureIdeasOrderedLayout, ideasQuoteGeometryProblems \} from "\.\/helpers\/ideas-quote-geometry\.mjs";/)
  // Independent source/native-backed ES geometry, not an expected value derived
  // from the production predicate: the actual375px screenshot has259px rows.
  const tables={
    320:[[0,320,20,0,0],[20,280,5,1,0],[26,268,0,0,0],[26,268,14,1,0],[41,238,0,0,0],[35,250,2,1,-6],[38,244,4,1,0],[43,234,0,0,0]],
    375:[[0,375,20,0,0],[20,335,7,1,0],[28,319,0,0,0],[28,319,14,1,0],[43,289,0,0,0],[43,289,7,1,0],[51,273,6,1,0],[58,259,0,0,0]],
  }
  const layerNames=['shell','ideas','hub','detail','temple','result','section','list']
  const box=(left,width,padding=0,border=0,margin=0,top=400,height=500)=>({left,right:left+width,width,top,bottom:top+height,height,
    paddingLeft:padding,paddingRight:padding,borderLeft:border,borderRight:border,marginLeft:margin,marginRight:margin,
    clientWidth:width-2*border,scrollWidth:width-2*border,untransformed:true,blockMetrics:true})
  function putRows(layout,left,width) {
    const padding=layout.quotes.viewport===320?9:10
    layout.quotes.rows=Array.from({length:3},(_,i)=>({box:box(left,width,padding,1,0,500+i*110,100),
      text:[{box:box(left+padding+1,width-2*(padding+1),0,0,0,510+i*110,70),lines:[{left:left+padding+3,right:left+width-padding-3}]}]}))
    layout.rows=layout.quotes.rows.map(({box})=>({...box}))
  }
  function fixture(width,stage) {
    const layers=Object.fromEntries(layerNames.map((name,i)=>[name,box(...tables[width][i])]))
    const layout={middle:box(50,200,0,0,0,830,100),after:box(50,200,0,0,0,940,100),quotes:{hierarchy:true,stage,shellKind:'spanish',count:3,viewport:width,layers}}
    putRows(layout,layers.list.left,layers.list.width)
    return layout
  }
  const measureStart=browser.indexOf('async function measureOrderedLayout(')
  const measureEnd=browser.indexOf('\nasync function verify(',measureStart)
  assert.ok(measureStart>=0&&measureEnd>measureStart,'actual atomic wrapper exists')
  const measure=runInNewContext('('+browser.slice(measureStart,measureEnd)+')',{measureIdeasOrderedLayout})
  const fragments={
    preview:['    const previewLayout = await measureOrderedLayout(', '    assert.equal(await hub.locator("[data-ideas-preview] details")'],
    result:['    const responseLayout = await measureOrderedLayout(', '    const readingOrder = daoResult.locator('],
  }
  async function execute(layout,stage,width) {
    const [start,end]=fragments[stage];assert.equal(browser.split(start).length,2);assert.equal(browser.split(end).length,2)
    const body=browser.slice(browser.indexOf(start),browser.indexOf(end,browser.indexOf(start)))
    let measurements=0,writes=0,screenshots=0
    const scope={async evaluate(reader,names){
      assert.equal(reader,measureIdeasOrderedLayout,'actual atomic DOM reader, not a replacement')
      assert.deepEqual({...names},{middle:stage==='preview'?'[data-ideas-dao-card]':'[data-ideas-dao]',after:'[data-ideas-dao-promos]'})
      measurements++;return structuredClone(layout)
    }}
    await runInNewContext('(async()=>{'+body+'})()',{
      assert,measureOrderedLayout:measure,ideasQuoteGeometryProblems,locale:'es',width,label:'synthetic-es-'+width,output:'synthetic-only',
      hub:{locator(selector){assert.equal(selector,'[data-ideas-preview]');return scope}},daoResult:scope,
      async writeFile(path,body){assert.match(path,stage==='preview'?/aphorism-preview-geometry/:/aphorism-result-geometry/);assert.deepEqual(JSON.parse(body),layout);writes++},
      page:{async screenshot(){screenshots++}},
    })
    assert.equal(measurements,1);assert.equal(writes,1);assert.equal(screenshots,0,'valid geometry never invokes failure screenshots')
  }
  for(const stage of ['preview','result'])for(const width of [320,375]){
    const valid=fixture(width,stage)
    assert.equal(valid.rows[0].width,width===320?234:259)
    await execute(valid,stage,width)
    const row=structuredClone(valid);row.quotes.rows[1].box.right-=20;row.quotes.rows[1].box.width-=20
    await assert.rejects(execute(row,stage,width),/row-content-width/,'narrowed quote must fail actual caller')
    const list=structuredClone(valid);list.quotes.layers.list.right-=20;list.quotes.layers.list.width-=20
    putRows(list,list.quotes.layers.list.left,list.quotes.layers.list.width)
    await assert.rejects(execute(list,stage,width),/list-content-width/,'narrowed parent cannot define its own success')
    const inset=structuredClone(valid);const section=inset.quotes.layers.section
    section.paddingLeft=section.paddingRight=20
    const left=section.left+section.borderLeft+20,right=section.right-section.borderRight-20
    inset.quotes.layers.list=box(left,right-left);putRows(inset,left,right-left)
    await assert.rejects(execute(inset,stage,width),/section-inset-budget/,'fully reflowed oversized inset remains independently bounded')
    const overflow=structuredClone(valid);overflow.quotes.rows[0].text[0].lines[0].right+=100
    await assert.rejects(execute(overflow,stage,width),/text-line-overflow/,'actual text readability guard remains fatal')
  }
})

test('Home acceptance follows current six direct routes and the deferred guide, retaining paid first-fold checks',()=>{
  const script=read('scripts/verify-home-consultation-first-screen.mjs')
  assert.match(script,/\['services', 'academy', 'business', 'tests', 'ideas', 'cabinet'\]/)
  assert.match(script,/\['\/explore\/energy', '\/explore\/love', '\/explore\/business', '\/client\/tests', '\/books', '\/app'\]/)
  assert.match(script,/data-home-offer-primary="review"/)
  assert.match(script,/data-home-conversation-guide/)
  assert.match(script,/book\.y >= 0 && book\.y \+ book\.height <= 844 - 72/)
  assert.match(script,/book\.height >= 44 && review\.height >= 44/)
  assert.doesNotMatch(script,/data-home-free-diagnosis-banner|data-home-start/)
})

test('Business replacement preserves strict current questionnaire checks and fixed-price consented paths',()=>{
  const script=read('scripts/verify-business-quiz-mobile.mjs')
  assert.match(script,/directionTestContract\(locale,'business',ids\)/)
  assert.match(script,/assertDirectionTestState\(page,contract,\{expanded:true\}\)/)
  assert.match(script,/\[\['express','50','30'\],\['full','100','60'\]\]/)
  assert.match(script,/services\/free-situation-review\?topic=business/)
  assert.match(script,/consent\.isChecked\(\),false/)
  assert.match(script,/button\[type="submit"\].*isDisabled\(\),true/)
  const css=read('components/business-consulting-landing.module.css')
  assert.match(css,/\.offerLink,\.contactButton\{width:100%!important;min-height:44px!important/)
  assert.match(css,/\.offerDirectLink\{min-height:44px;font-size:11px\}/)
})

test('Tantra acceptance preserves five intentions in the single real compactPhone chooser with synthetic-only submits',()=>{
  const source=read('components/tantra-initiation-choice.tsx')
  assert.match(source,/<ContactChannelChooser\s+key=\{intent\}\s+compactPhone\s+stayAfterSave/)
  const script=read('scripts/verify-contact-channel-chooser-browser.mjs')
  assert.match(script,/\['free', 'personal', 'session', 'answers', 'feedback'\]/)
  assert.match(script,/Exactly one current compact phone chooser/)
  assert.match(script,/Each request requires fresh consent/)
  assert.match(script,/Phone stays out of messenger URL/)
  assert.match(script,/publicQaRequestAction\(route\.request\(\)\.url\(\),route\.request\(\)\.method\(\),origin\)/)
  assert.match(script,/unexpectedRequests\.push\("UNEXPECTED_MUTATION_REQUEST"\)/)
  assert.match(script,/assert\.deepEqual\(guardFailures,\[\]/)
  assert.match(script,/page\.route\("\*\*\/api\/service-enquiries"/)
  assert.match(script,/receiptRedirect = false/)
  const dao=script.slice(script.indexOf('const daoForm ='),script.indexOf('if (name === "chromium"',script.indexOf('const daoForm =')))
  assert.doesNotMatch(dao,/button\[type="submit"\]/)
  assert.match(dao,/consent\.isChecked\(\),false/)
  assert.match(dao,/submissions\.length,previous,"Contact cannot bypass consent"/)
})
