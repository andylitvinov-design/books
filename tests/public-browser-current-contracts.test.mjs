import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {sourceModule, jsx, nodes, denied} from './helpers/current-source-render.mjs';
import * as whatsapp from '../lib/whatsapp-enquiry.js';
import {paidServiceContract, assertPaidServiceCards} from '../scripts/helpers/services-paid-contract.mjs';
import {remoteFinderGeometry, assertRemoteFinderGeometry} from '../scripts/helpers/remote-finder-geometry.mjs';
import {holisticFirstScreenDiagnostics} from '../scripts/helpers/holistic-first-screen-diagnostics.mjs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const render = value => Array.isArray(value) ? value.map(render) : !value || typeof value !== 'object' ? value :
  typeof value.type === 'function' ? render(value.type(value.props)) :
    {...value, props:{...value.props, children:render(value.props.children)}};

function paidCards(locale, source = read('components/services-studio-offers.tsx'), {mode='online',topic='all',visibleOnly=false}={}) {
  const core = sourceModule(read('data/core-service-offers.ts'), 'core-service-offers.ts');
  const state = sourceModule(read('components/services-explorer-state.tsx'), 'services-explorer-state.tsx', {
    'react/jsx-runtime':jsx, react:{createContext:()=>({Provider:'provider'}), useContext:()=>({mode,topic}),useState:denied},
  });
  const {ServicesStudioOffers} = sourceModule(source, 'services-studio-offers.tsx', {
    'react/jsx-runtime':jsx, 'next/link':{default:'a'}, 'next/image':{default:'img'},
    'lucide-react':Object.fromEntries(['ArrowRight','ChevronDown','ClipboardCheck','ShieldCheck'].map(name=>[name,'icon'])),
    '@/components/static-portrait':{StaticPortrait:'portrait'},
    '@/components/contact-channel-chooser':{ContactChannelChooser:'chooser'},
    '@/components/services-explorer-state':state, '@/data/core-service-offers':core,
    '@/lib/whatsapp-enquiry':whatsapp, './services-studio-offers.module.css':{default:{}},
  });
  const tree = render(ServicesStudioOffers({locale}));
  const paid = nodes(tree).filter(node => Object.hasOwn(node.props,'data-services-studio-paid'));
  assert.equal(paid.length,1); assert.equal(paid[0].props.hidden,false); assert.equal(paid[0].props.lang,locale);
  const cards = nodes(paid[0]).filter(node => Object.hasOwn(node.props,'data-services-studio-card') && (!visibleOnly || !node.props.hidden));
  // Execute the actual browser snapshot callback over the actual current-source
  // card composition; no browser, network, provider or account state is invoked.
  const dom = cards.map(card => ({
    getAttribute:name=>card.props[name] ?? null,
    querySelectorAll:selector=>{
      assert.equal(selector,'h3 a[href]');
      return nodes(card).filter(node=>node.type==='h3').flatMap(heading=>nodes(heading)
        .filter(node=>node.type==='a' && node.props.href).map(link=>({getAttribute:name=>link.props[name] ?? null})));
    },
  }));
  return {evaluateAll:async callback=>callback(dom)};
}

test('actual current Services composition has exact six ordered paid identities and locale routes', async () => {
  for (const locale of ['en','ru','es']) await assertPaidServiceCards(paidCards(locale),locale,'source-only');
  assert.throws(()=>paidServiceContract('xx'));
  assert.throws(()=>paidServiceContract('en','unknown'));
  for (const locale of ['en','ru','es']) {
    for (const mode of ['online','toronto']) await assertPaidServiceCards(
      paidCards(locale,undefined,{mode,topic:'business',visibleOnly:true}),locale,'current business subset','business');
    await assertPaidServiceCards(paidCards(locale,undefined,{topic:'reiki',visibleOnly:true}),locale,'current online-only Reiki','reiki');
    await assert.rejects(()=>assertPaidServiceCards(paidCards(locale),locale,'all is not a business filter','business'));
  }
});

test('exact paid browser contract rejects source mutations, not merely a changed count', async () => {
  const source=read('components/services-studio-offers.tsx');
  for (const [from,to] of [
    ['id: "monthly-support"','id: "business"'],
    ['href: "/" + locale + "/services/personal-support"','href: "/" + locale + "/services/retired-support"'],
    ['session("hypnotherapy"),',''],
    ['session("alchemy"),','session("alchemy"), session("alchemy"),'],
    ['session("alchemy"),\n    session("hypnotherapy"),','session("hypnotherapy"),\n    session("alchemy"),'],
    ['href: "/" + locale + "/services/personal-support"','href: "/en/services/personal-support"'],
  ]) {
    const changed=source.replace(from,to); assert.notEqual(changed,source,from);
    await assert.rejects(()=>assertPaidServiceCards(paidCards('es',changed),'es','mutated source'));
  }
});

const sample = overrides => ({navCount:1,navVisible:true,finderVisible:true,nav:{x:0,y:700,width:390,height:70},navDisplay:'grid',
  finder:{x:10,y:600,width:370,height:40},editorFocused:false,paddingBottom:70,
  viewport:{x:0,y:0,width:390,height:844},...overrides});

test('finder requires visible clearance initially and after natural tap; editing keeps actual viewport and reserved clearance', () => {
  const initial=sample();
  for (const phase of ['initial','restored']) {
    assertRemoteFinderGeometry(initial,{phase,label:'synthetic'});
    for (const bad of [sample({navCount:0}),sample({nav:null}),sample({navDisplay:'none'}),
      sample({editorFocused:true}),sample({navVisible:false}),sample({finderVisible:false}),sample({nav:{x:0,y:1000,width:390,height:70}}),sample({finder:{x:10,y:680,width:370,height:40}}),
      sample({finder:{x:-2,y:600,width:370,height:40}}),sample({finder:{x:10,y:-2,width:370,height:40}}),
      sample({finder:{x:10,y:600,width:390,height:40}}),sample({finder:{x:10,y:600,width:370,height:NaN}})]) {
      assert.throws(()=>assertRemoteFinderGeometry(bad,{phase,label:'synthetic'}));
    }
  }
  const editing=sample({nav:{x:0,y:0,width:0,height:0},navDisplay:'none',navVisible:false,editorFocused:true});
  assertRemoteFinderGeometry(editing,{phase:'editing',label:'synthetic',baseline:initial});
  for (const bad of [{...editing,editorFocused:false},{...editing,navDisplay:'grid'},
    {...editing,nav:initial.nav},{...editing,paddingBottom:0},
    {...editing,viewport:{x:0,y:0,width:390,height:620}},
    {...editing,viewport:{x:0,y:650,width:390,height:844}}]) {
    assert.throws(()=>assertRemoteFinderGeometry(bad,{phase:'editing',label:'synthetic',baseline:initial}));
  }
  assert.throws(()=>assertRemoteFinderGeometry(editing,{phase:'editing',label:'synthetic'}));
});

test('finder sample executes one passive DOM read with actual focused/hidden navigation and visual viewport offsets', async () => {
  let evaluations=0;
  const editor={},nav={getBoundingClientRect:()=>({x:0,y:0,width:0,height:0})},finder={getBoundingClientRect:()=>({x:10,y:150,width:300,height:44})};
  const page={evaluate:async callback=>{
    evaluations++;
    return runInNewContext('('+callback.toString()+')()',{
      document:{activeElement:editor,body:{},querySelectorAll:selector=>{assert.equal(selector,'.mobile-bottom-navigation');return [nav]},
        querySelector:selector=>({'#remote-intention':editor,'[data-remote-find-options]':finder}[selector] ?? assert.fail(selector))},
      window:{visualViewport:{offsetLeft:2,offsetTop:20,width:320,height:400}},
      getComputedStyle:node=>node===nav?{display:'none'}:{paddingBottom:'76px'},
    });
  }};
  const actual=await remoteFinderGeometry(page);
  assert.equal(evaluations,1); assert.equal(actual.editorFocused,true); assert.equal(actual.navDisplay,'none');
  assert.equal(actual.paddingBottom,76); assert.deepEqual(JSON.parse(JSON.stringify(actual.viewport)),{x:2,y:20,width:320,height:400});
  assertRemoteFinderGeometry(actual,{phase:'editing',label:'synthetic DOM',baseline:sample()});
});

test('support first-screen diagnosis is passive and preserves the original strict 40px fold requirement', async () => {
  const fonts=[];fonts.status='loaded';Object.defineProperty(fonts,'ready',{get:denied});
  const node={getBoundingClientRect:()=>({x:16,y:511,width:288,height:92})};
  const page={evaluate:async callback=>runInNewContext('('+callback.toString()+')()',{
    window:{visualViewport:{width:320,height:568,offsetLeft:0,offsetTop:0,scale:1}},
    document:{fonts,documentElement:{clientWidth:320,clientHeight:568},querySelectorAll:()=>[node]},
    innerWidth:320,innerHeight:568,scrollX:0,scrollY:0,devicePixelRatio:1,matchMedia:()=>({matches:true}),
    getComputedStyle:()=>({fontFamily:'Georgia',fontSize:'31px',lineHeight:'32.24px'}),
  })};
  const captured=await holisticFirstScreenDiagnostics(page);
  assert.equal(captured.viewport.height,568);assert.equal(captured.fontStatus,'loaded');
  assert.equal(captured.elements['[data-holistic-choose]'][0].y,511);
  const script=read('scripts/verify-holistic-support-browser.mjs');
  const assertion=script.match(/    assert\.ok\(last && last\.y \+ last\.height < height - 40,[\s\S]*?first mobile screen"\);/)?.[0];
  assert.ok(assertion,'Original strict first-screen clause must not change');
  const check=new Function('last','height','assert','label',assertion);
  check({y:400,height:127.999},568,assert,'synthetic');
  for(const last of [null,{y:400,height:128},{y:511,height:92}]) assert.throws(()=>check(last,568,assert,'synthetic'));
  assert.doesNotMatch(read('scripts/helpers/holistic-first-screen-diagnostics.mjs'),/\.ready|\.focus\(|\.blur\(|scrollIntoView|waitFor/);
});

const topicsScript=read('scripts/verify-holistic-topics-browser.mjs');
const topicsStart=topicsScript.indexOf('            assert.equal(await meditation.locator("a").getAttribute("href")');
const topicsEnd=topicsScript.indexOf('            const currentTitle',topicsStart);
assert.ok(topicsStart>=0 && topicsEnd>topicsStart);
const checkTopicTargets=new (Object.getPrototypeOf(async function(){}).constructor)(
  'meditation','talisman','expert','page','assert','label','locale',topicsScript.slice(topicsStart,topicsEnd));

async function topicTargets(locale, topic, {source=read('components/holistic-support-topic-filter.tsx'),collectionCount=1,gateCount=1,uploads=0,privateLinks=0}={}) {
  const {HolisticSupportTopicFilter}=sourceModule(source,'holistic-support-topic-filter.tsx',{
    'react/jsx-runtime':jsx,react:{useState:()=>[topic,denied]},'next/link':{default:'a'},'next/image':{default:'img'},
    'lucide-react':Object.fromEntries(['ArrowRight','BriefcaseBusiness','Heart','HeartPulse'].map(name=>[name,'icon'])),
    './holistic-support-topic-filter.module.css':{default:{}},
  });
  const tree=render(HolisticSupportTopicFilter({locale}));
  const offering=id=>({locator:selector=>{assert.equal(selector,'a');return {getAttribute:async name=>{
    assert.equal(name,'href');const card=nodes(tree).find(node=>node.props['data-holistic-topic-card']===id);
    const anchors=nodes(card).filter(node=>node.type==='a');assert.equal(anchors.length,1);return anchors[0].props.href;
  }}}});
  const gallery={count:async()=>1,locator:selector=>{
    if(selector==='a[href="/'+locale+'/app"]')return {waitFor:async options=>assert.deepEqual(options,{state:'visible'}),count:async()=>gateCount};
    if(selector==='[data-talisman-upload], input[type="file"]')return {count:async()=>uploads};
    if(selector==='a[target="_blank"]')return {count:async()=>privateLinks};
    assert.fail(selector);
  }};
  const page={locator:selector=>{assert.equal(selector,'#talismans[data-holistic-talismans]');return {count:async()=>collectionCount,locator:selector=>{assert.equal(selector,'[data-support-talismans]');return gallery}}}};
  await checkTopicTargets(offering('meditation'),offering('talisman'),offering('expert'),page,assert,'synthetic topic',locale);
}

test('actual topic offers target same-page anonymous collection in all nine current locale/topic states', async()=>{
  for(const locale of ['en','ru','es']) for(const topic of ['business','love','health']) await topicTargets(locale,topic);
  const source=read('components/holistic-support-topic-filter.tsx');
  const changed=source.replace('if (offer === "talisman") return "#talismans";','if (offer === "talisman") return "/" + locale + "/academy/symbolic/artifacts-talismans";');
  assert.notEqual(changed,source);
  await assert.rejects(()=>topicTargets('en','business',{source:changed}));
  for(const options of [{collectionCount:0},{collectionCount:2},{gateCount:0},{gateCount:2},{uploads:1},{privateLinks:1}])
    await assert.rejects(()=>topicTargets('en','business',options));
});

// Execute the complete actual Topics matrix/listener/verdict/teardown runner.
// Only the native UI body is inert; no browser/network/customer operation occurs.
async function runTopicsLifecycle({phase='clean', uiFailure=false, closeFailure=false, writeFailure=false}={}, raw=read('scripts/verify-holistic-topics-browser.mjs')) {
  const start='          const response = await page.goto(';
  const end='          assert.deepEqual(errors, [], label + " no runtime errors");';
  assert.equal(raw.split(start).length,2); assert.equal(raw.split(end).length,2);
  let source=raw.slice(0,raw.indexOf(start))+'          await topicsUi();\n'+raw.slice(raw.indexOf(end));
  const imports=source.match(/^import .*;\n/gm);
  assert.equal(imports.length,4);
  source=source.replace(/^import .*;\n/gm,'');
  const loader='const require = createRequire(import.meta.url);';
  const drivers='const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");';
  assert.equal(source.split(loader).length,2); assert.equal(source.split(drivers).length,2);
  source=source.replace(loader,'').replace(drivers,'const {chromium,webkit}=drivers;');
  const state={contexts:0,contextsClosed:0,browsersClosed:0,emissions:0,privateReads:0,writeAttempts:[],artifacts:{},logs:[],uiCalls:0};
  const primary=new Error('PRIMARY_UI_ERROR'); const writeError=new Error('ARTIFACT_WRITE_FAILED');
  const privateError={};
  for (const key of ['message','stack','name']) Object.defineProperty(privateError,key,{get(){state.privateReads++;return 'SYNTHETIC_PRIVATE_MARKER';}});
  const emit=fn=>{state.emissions++;fn(privateError);};
  function driver(name){return {name:()=>name,async launch(){const callbacks=[];return {callbacks,async close(){state.browsersClosed++;if(phase==='browser-close')callbacks.forEach(emit);if(closeFailure)throw Error('BROWSER_CLOSE_SYNTHETIC_FAILURE');}};}};}
  const isolation=async browser=>{
    state.contexts++;let callback;
    return {page:{on(event,fn){assert.equal(event,'pageerror');callback=fn;browser.callbacks.push(fn);if(phase==='early')emit(fn);},async screenshot(){}},
      async assertClean(){},summary:()=>({anonymousTalismansReads:1}),async close(){state.contextsClosed++;if(phase==='context-close')emit(callback);if(phase==='isolation-failure')throw Error('ISOLATION_CLOSE_SYNTHETIC_FAILURE');}};
  };
  let error=null;
  try {
    await runInNewContext('(async()=>{'+source+'})()',{
      assert,drivers:{chromium:driver('chromium'),webkit:driver('webkit')},createHolisticBrowserIsolation:isolation,process:{env:{}},
      async topicsUi(){state.uiCalls++;if(uiFailure)throw primary;},async mkdir(){},
      async writeFile(path,body){state.writeAttempts.push(path);state.artifacts[path]=JSON.parse(body);if(writeFailure)throw writeError;},
      console:{log:(...v)=>state.logs.push(v),error:(...v)=>state.logs.push(v)},
    });
  } catch (caught) {error=caught;}
  return {state,error,primary,writeError};
}
const topicsResults='artifacts/holistic-topic-mobile/results.json';
const topicsDiagnostics='artifacts/holistic-topic-mobile/runtime-diagnostics.json';
function assertTopicsArtifacts(result) {
  assert.deepEqual(result.state.writeAttempts,[topicsResults,topicsDiagnostics],'both final artifacts must be attempted after teardown');
  assert.equal(result.state.privateReads,0,'pageerror payload fields are never read');
  assert.doesNotMatch(JSON.stringify({state:result.state,error:result.error?.message}),/SYNTHETIC_PRIVATE_MARKER/,'no private marker in diagnostics, logs or assertion error');
}
test('actual Topics runner completes both engines and all18 journeys before truthful final artifacts',async()=>{
  const result=await runTopicsLifecycle();assert.equal(result.error,null);assertTopicsArtifacts(result);
  assert.equal(result.state.contexts,18);assert.equal(result.state.contextsClosed,18);assert.equal(result.state.browsersClosed,2);assert.equal(result.state.uiCalls,18);
  assert.equal(result.state.artifacts[topicsResults].length,18);
  assert.deepEqual(result.state.artifacts[topicsDiagnostics],{runtimeErrors:[],cleanupFailures:[],completedJourneys:18});
});
for (const phase of ['early','context-close','browser-close']) test('actual Topics runner rejects categorical pageerror at '+phase+' and writes final evidence',async()=>{
  const result=await runTopicsLifecycle({phase});assert.equal(result.error?.code,'ERR_ASSERTION');assert.match(result.error.message,/PAGE_ERROR/);assertTopicsArtifacts(result);
  assert.ok(result.state.emissions>0);assert.equal(result.state.contextsClosed,result.state.contexts);assert.ok(result.state.browsersClosed>0);
  const diagnostics=result.state.artifacts[topicsDiagnostics];assert.equal(diagnostics.runtimeErrors.length,result.state.emissions);assert.ok(diagnostics.runtimeErrors.every(e=>e.code==='PAGE_ERROR'&&/^(chromium|webkit):(en|ru|es):(320|390|430)$/.test(e.label)));
  if(phase==='browser-close'){assert.equal(result.state.emissions,18);assert.equal(result.state.artifacts[topicsResults].length,18);assert.match(result.error.message,/browser teardown/);}
});
test('actual Topics runner preserves primary UI failure through late errors, browser-close failure and artifact failure',async()=>{
  const result=await runTopicsLifecycle({phase:'browser-close',uiFailure:true,closeFailure:true,writeFailure:true});assert.equal(result.error,result.primary);assertTopicsArtifacts(result);
  assert.equal(result.state.contextsClosed,1);assert.equal(result.state.browsersClosed,1);assert.equal(result.state.artifacts[topicsResults].length,0);
  assert.equal(result.state.artifacts[topicsDiagnostics].runtimeErrors.length,1);assert.deepEqual(result.state.artifacts[topicsDiagnostics].cleanupFailures,['BROWSER_CLOSE_FAILED']);
});
for (const phase of ['isolation-failure','browser-failure','write-failure']) test('actual Topics runner surfaces '+phase+' without suppressing final artifact attempts',async()=>{
  const result=await runTopicsLifecycle({phase:phase==='isolation-failure'?phase:'clean',closeFailure:phase==='browser-failure',writeFailure:phase==='write-failure'});assert.ok(result.error);assertTopicsArtifacts(result);
  assert.equal(result.state.contextsClosed,result.state.contexts);assert.ok(result.state.browsersClosed>0);
  if(phase==='write-failure')assert.equal(result.error,result.writeError);
  else assert.match(result.error.message,phase==='browser-failure'?/BROWSER_CLOSE_FAILED/:/ISOLATION_CLOSE_FAILED/);
});
test('actual Topics runner retains mandatory18 completion gate when one width is dropped',async()=>{
  const raw=read('scripts/verify-holistic-topics-browser.mjs');assert.equal(raw.split('const width of [320, 390, 430]').length,2);
  const result=await runTopicsLifecycle({},raw.replace('const width of [320, 390, 430]','const width of [320, 390]'));
  assert.equal(result.error?.code,'ERR_ASSERTION');assert.match(result.error.message,/All eighteen/);assertTopicsArtifacts(result);assert.equal(result.state.artifacts[topicsResults].length,12);
});
