import test from 'node:test';
import assert from 'node:assert/strict';
import {mountHolistic, nodes, text, readHolistic, assertClosedHolisticChoices} from './helpers/holistic-current-source-fixture.mjs';
import {containsPrivateText, privateRequestLeak, privateBrowserPersistence} from '../scripts/helpers/holistic-browser-privacy.mjs';

const copy = {
  en:{title:'Holistic Support',question:'How can I find clarity this week?',changed:'I want calm before an important decision.',reset:'New question'},
  ru:{title:'Холистическая поддержка',question:'Как прояснить мой выбор на этой неделе?',changed:'Хочу больше спокойствия перед важным решением.',reset:'Новый вопрос'},
  es:{title:'Apoyo holístico',question:'¿Cómo aclarar mi situación esta semana?',changed:'Quiero calma antes de una decisión importante.',reset:'Otra pregunta'},
};
const has = marker => node => Boolean(node.props[marker]);
const byId = id => node => node.props.id === id;

for (const locale of ['en','ru','es']) {
  test(locale + ': actual chooser is id-less/three-choice and mounts Dao only after explicit selection', () => {
    const h = mountHolistic('choices', locale);
    assertClosedHolisticChoices(h.tree, locale);
    assert.equal(text(h.find(byId('holistic-journey-title'))), copy[locale].title);
    h.find(node => node.props['data-holistic-choose'] === 'dao').props.onClick(); h.flush();
    assert.equal(h.find(node => node.props['data-holistic-choose'] === 'dao').props['aria-expanded'], true);
    const panel = h.find(has('data-holistic-dao-screen'));
    assert.equal(panel.props.id, 'dao-guidance');
    assert.equal(h.find(node => node.type === 'ideas-engine').props.variant, 'holistic-dao');
    assert.equal(nodes(h.find(has('data-holistic-first-screen'))).some(has('data-holistic-dao-screen')), false,
      'Dao is a sibling destination, not a pre-mounted hero engine');
    h.find(node => node.props['data-holistic-choose'] === 'dao').props.onClick(); h.flush();
    assertClosedHolisticChoices(h.tree, locale);
  });

  test(locale + ': actual Dao form, changed-intent invalidation and localized reset remain private', () => {
    const h = mountHolistic('dao', locale), t = copy[locale];
    assert.equal(nodes(h.tree).filter(has('data-ideas-preview')).length, 0);
    assert.equal(nodes(h.tree).filter(has('data-ideas-energy-support')).length, 0);
    assert.equal(nodes(h.tree).filter(has('data-ideas-result')).length, 0);
    assert.equal(h.find(has('data-ideas-free-diagnostic')).props.href,
      '/' + locale + '/services/free-consultation#free-diagnosis-options');
    const submit = () => {h.find(byId('ideas-question-form')).props.onSubmit({preventDefault(){}}); h.flush();};
    const fill = value => {h.find(byId('ideas-question')).props.onChange({target:{value}}); h.flush();};
    submit(); assert.equal(h.draws, 0); assert.equal(h.find(byId('ideas-question')).props['aria-invalid'], true);
    fill(t.question); submit(); assert.equal(h.draws, 1);
    const answer = h.find(has('data-ideas-result'));
    assert.equal(answer.props.lang, locale);
    assert.equal(answer.props['data-ideas-result'], 'dao');
    assert.ok(text(h.find(has('data-ideas-dao-summary'))).length > 25);
    assert.equal(nodes(h.tree).filter(has('data-ideas-dao-promos')).length, 0);
    fill(t.changed);
    assert.equal(nodes(h.tree).filter(has('data-ideas-result')).length, 0, 'Changing intent must remove stale answer');
    submit(); assert.equal(h.draws, 2);
    h.find(node => node.props['aria-controls'] === 'ideas-dao-details').props.onClick(); h.flush();
    h.find(node => node.type === 'button' && text(node) === t.reset + ' ×').props.onClick(); h.flush();
    assert.equal(h.find(byId('ideas-question')).props.value, '');
    assert.equal(nodes(h.tree).filter(has('data-ideas-result')).length, 0);
  });
}

test('independent current-source checks reject pre-mounted/old hero and stale-result regressions', () => {
  const chooser = readHolistic('components/holistic-support-choices.tsx');
  for (const changed of [chooser.replace('useState(false)', 'useState(true)'),
    chooser.replace('data-holistic-first-screen data-holistic-three-choices', 'id="temple-psychic-insights" data-holistic-first-screen data-holistic-three-choices'),
    chooser.replace('data-holistic-choose="meditations"','data-holistic-choose="retired"')]) {
    assert.notEqual(changed, chooser);
    assert.throws(() => assertClosedHolisticChoices(mountHolistic('choices','en',{sourceOverride:changed}).tree,'en'));
  }
  const engine = readHolistic('components/ideas-discovery.tsx');
  const changed = engine.replace('setQuestion(event.target.value); setError(false); setAttachmentError(false); setResult(null);',
    'setQuestion(event.target.value); setError(false); setAttachmentError(false);');
  assert.notEqual(changed, engine);
  const h = mountHolistic('dao','en',{sourceOverride:changed});
  h.find(byId('ideas-question')).props.onChange({target:{value:copy.en.question}}); h.flush();
  h.find(byId('ideas-question-form')).props.onSubmit({preventDefault(){}}); h.flush();
  h.find(byId('ideas-question')).props.onChange({target:{value:copy.en.changed}}); h.flush();
  assert.throws(() => assert.equal(nodes(h.tree).filter(has('data-ideas-result')).length, 0));
});

test('privacy guard rejects raw/encoded private URLs and bodies without retaining payloads', async () => {
  for (const t of Object.values(copy)) {
    for (const encoded of [t.question, encodeURIComponent(t.question), new URLSearchParams({q:t.question}).toString().slice(2)]) {
      assert.equal(containsPrivateText('prefix' + encoded + 'suffix',[t.question]), true);
      assert.equal(privateRequestLeak({url:()=> 'http://127.0.0.1:3100/?q=' + encoded,postData:()=>null},[t.question]),true);
      assert.equal(privateRequestLeak({url:()=> 'http://127.0.0.1:3100/api/no',postData:()=>JSON.stringify({value:encoded})},[t.question]),true);
    }
  }
  assert.equal(privateRequestLeak({url:()=> 'http://127.0.0.1:3100/en/holistic-support',postData:()=>null},[copy.en.question]),false);
  // Execute the exact persistence predicate in a synthetic browser-shaped realm.
  for (const kind of ['location','cookie','local','session','clean']) {
    const globals = {location:{href:'http://127.0.0.1:3100/en/holistic-support'},document:{cookie:''},localStorage:{},sessionStorage:{}};
    for (const name of ['localStorage','sessionStorage']) Object.defineProperty(globals[name], 'getItem', {value:key => globals[name][key]});
    if (kind === 'location') globals.location.href += '?q=' + encodeURIComponent(copy.en.question);
    if (kind === 'cookie') globals.document.cookie = 'q=' + encodeURIComponent(copy.en.question);
    if (kind === 'local') globals.localStorage.private = copy.en.question;
    if (kind === 'session') globals.sessionStorage.private = copy.en.question;
    const {runInNewContext} = await import('node:vm');
    const page = {evaluate:async (fn,values) => runInNewContext('(' + fn.toString() + ')(values)',{...globals,values,URLSearchParams})};
    assert.equal(await privateBrowserPersistence(page,[copy.en.question]), kind !== 'clean', kind);
  }
});

test('actual energy form consumes the legacy in-memory bridge once; separate manually reviewed goals never survive remount', async () => {
  const {sourceModule,jsx,denied}=await import('./helpers/current-source-render.mjs');
  // A new JS realm models an empty browser memory bridge; all transport is denied.
  const bridge=sourceModule(readHolistic('lib/practitioners/remote-energy-support.js'),'remote-energy-support.js',{},
    {window:{},document:new Proxy({},{get:denied})});
  function booking(locale) {
    const values=[];let index=0,first=true,tree;const effects=[];
    const hooks={useMemo:fn=>fn(),useEffect:fn=>{if(first)effects.push(fn);},useState:initial=>{
      const key=index++;if(!Object.hasOwn(values,key))values[key]=typeof initial==='function'?initial():initial;
      return [values[key],next=>{values[key]=typeof next==='function'?next(values[key]):next;}];
    }};
    const {RemoteEnergySupportBooking}=sourceModule(readHolistic('components/remote-energy-support-booking.tsx'),'remote-energy-support-booking.tsx',{
      react:hooks,'react/jsx-runtime':jsx,'next/link':{default:'a'},'next/navigation':{useRouter:()=>({push:denied})},
      '@/lib/practitioners/remote-energy-support':bridge,'./remote-energy-support-booking.module.css':{default:{}},
    });
    const flush=()=>{index=0;tree=RemoteEnergySupportBooking({locale,masters:[],preferredPractitioner:''});};
    flush();first=false;for(const effect of effects)effect();flush();
    return {field:()=>nodes(tree).find(byId('remote-intention')),flush};
  }
  for(const locale of ['en','ru','es']) {
    assert.equal(booking(locale).field().props.value,'','New three-choice energy route starts without a staged Dao question');
    bridge.stageRemoteSupportLandingIntention(copy[locale].question);
    const legacy=booking(locale);
    assert.equal(legacy.field().props.value,copy[locale].question,'Existing legacy bridge remains supported, not deleted');
    assert.equal(bridge.takeRemoteSupportLandingIntention(),'','Actual destination consumed bridge once');
    assert.equal(booking(locale).field().props.value,'','Remount does not restore a consumed bridge');
    const current=booking(locale);
    current.field().props.onChange({target:{value:copy[locale].changed}});current.flush();
    assert.equal(current.field().props.value,copy[locale].changed);
    assert.equal(booking(locale).field().props.value,'','Separate manually reviewed intent remains memory-only');
  }
});


// Run only the exact new finder assertion block with synthetic locator objects;
// browser launch, network, provider operations and private storage stay unavailable.
const finderSource = readHolistic('scripts/verify-holistic-master-browser.mjs');
const finderStart = finderSource.indexOf('    const focusChoices = nextScreen.locator(');
const finderEnd = finderSource.indexOf('    assert.equal(await privateBrowserPersistence',finderStart);
assert.ok(finderStart>=0 && finderEnd>finderStart);
const runFinderBlock = new (Object.getPrototypeOf(async function(){}).constructor)(
 'nextScreen','handoff','page','assert','label','width',finderSource.slice(finderStart,finderEnd));
async function syntheticFinder({count=5, premature=false, findVisible=true, chipY=10, findY=600, pressed='true', expanded='true', specialists=1, emptyStatus=0}={}) {
 const trace=[];let found=false;
 const chip={boundingBox:async()=>({y:chipY}),tap:async()=>trace.push('select-focus'),getAttribute:async name=>{assert.equal(name,'aria-pressed');return pressed}};
 const chips={count:async()=>count,first:()=>chip};
 const find={isVisible:async()=>findVisible,boundingBox:async()=>({y:findY,height:40}),tap:async()=>{assert.deepEqual(trace,['select-focus']);trace.push('find-options');found=true},getAttribute:async name=>{assert.equal(name,'aria-expanded');return expanded}};
 const offers={isVisible:async()=>premature,waitFor:async options=>{assert.equal(options.state,'visible');assert.equal(found,true);trace.push('results-visible')},locator:selector=>({count:async()=>selector==='[data-remote-support-specialist]'?specialists:selector==='[role="status"]'?emptyStatus:assert.fail(selector)})};
 const nextScreen={locator:selector=>({'[data-remote-focus-chip]':chips,'[data-remote-find-options]':find,'#remote-results':offers}[selector]??assert.fail(selector))};
 const page={locator:selector=>{assert.equal(selector,'.mobile-bottom-navigation');return {first:()=>({boundingBox:async()=>({y:700})})}}};
 await runFinderBlock(nextScreen,{boundingBox:async()=>({y:100})},page,assert,'synthetic only',390);
 assert.deepEqual(trace,['select-focus','find-options','results-visible']);
}
test('actual finder verifier requires five focus chips, explicit Find and published results or honest empty state', async()=>{
 await syntheticFinder();await syntheticFinder({specialists:0,emptyStatus:1});
 for(const options of [{count:4},{count:6},{premature:true},{findVisible:false},{chipY:120},{findY:700},{pressed:'false'},{expanded:'false'},{specialists:0,emptyStatus:0}])
  await assert.rejects(()=>syntheticFinder(options),{code:'ERR_ASSERTION'});
});
