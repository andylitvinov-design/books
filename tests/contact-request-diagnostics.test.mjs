import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { blockedApiDetails } from '../scripts/helpers/contact-request-diagnostics.mjs';
const origin = 'http://127.0.0.1:3100';
const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const details = (suffix, extra = {}, phase = 'academy') => blockedApiDetails({url: origin + suffix, resourceType: 'fetch', navigation: false, ...extra}, origin, phase);

test('only exact source-backed API reads receive fixed aliases, never permission', () => {
  for (const [path, kind] of [['/api/app/bootstrap', 'account-bootstrap'], ['/api/app/bootstrap?view=portrait', 'portrait-bootstrap'], ['/api/app/auth/contact-profile', 'contact-profile'], ...['en','ru','es'].map(locale => ['/api/academy/reiki-guide?course=yggdrasil&locale=' + locale, 'yggdrasil-guide'])]) {
    assert.equal(details(path).apiKind, kind);
    assert.deepEqual(Object.keys(details(path)).sort(), ['apiKind','framePageAtBlock','navigation','resourceType','scenarioPhase']);
  }
  assert.match(read('components/academy-discovery.tsx'), /<AcademyMyCourses locale=\{locale\}/);
  assert.match(read('components/academy-hub.tsx'), /<AcademyDiscovery locale=\{locale\}/);
  assert.match(read('components/home-personal-space.tsx'), /appFetch\("bootstrap\?view=portrait"/);
  assert.match(read('components/contact-channel-chooser.tsx'), /fetch\("\/api\/app\/auth\/contact-profile"/);
  assert.match(read('components/yggdrasil-initiation-form.tsx'), /"\/api\/academy\/reiki-guide\?course=yggdrasil&locale=" \+ locale/);
  assert.equal((read('components/compact-lead-capture.tsx').match(/fetch\(/g) || []).length, 1);
  assert.match(read('components/compact-lead-capture.tsx'), /fetch\("\/api\/service-enquiries", \{\s*method: "POST"/);
});

test('credentials, unknown queries, private paths and lookalike origins remain unclassified', () => {
  for (const url of [origin+'/api/app/bootstrap?accountId=PRIVATE',origin+'/api/app/bootstrap?view=portrait&token=PRIVATE',origin+'/api/app/bootstrap?view=portrait&view=portrait',origin+'/api/app/bootstrap?',origin+'/api/app/bootstrap#PRIVATE',origin+'/api/app/course',origin+'/api/app/academy-energywork',origin+'/api/app/auth/contact-profile?email=PRIVATE',origin+'/api/academy/reiki-guide?locale=en&course=yggdrasil',origin+'/api/academy/reiki-guide?course=yggdrasil&locale=fr',origin.replace('127.0.0.1','localhost')+'/api/app/bootstrap',origin.replace('3100','3101')+'/api/app/bootstrap','https://127.0.0.1:3100/api/app/bootstrap','http://PRIVATE@127.0.0.1:3100/api/app/bootstrap',origin+'/other/../api/app/bootstrap',' '+origin+'/api/app/bootstrap','not-a-url',null,'x'.repeat(2049)]) {
    const result=details('',{url});assert.equal(result.apiKind,'unclassified');assert.doesNotMatch(JSON.stringify(result),/PRIVATE|accountId|token=|3100/);
  }
  assert.equal(blockedApiDetails({url:'https://example.test/api/app/bootstrap'},'https://example.test','academy').apiKind,'unclassified');
});

test('frame-page and phase are separately fixed observation aliases, not initiator claims', () => {
  for(const locale of ['en','ru','es'])for(const [path,alias] of [['academy/reiki/tantra-reiki/free-initiation','tantra'],['academy/reiki/yggdrasil/free-initiation','yggdrasil'],['academy','academy'],['services/dao-health-profile','dao'],['academy/temple-studies','temple']]) {
    const result=details('/api/app/bootstrap',{frameUrl:()=>origin+'/'+locale+'/'+path},'dao-save');
    assert.equal(result.framePageAtBlock,alias);assert.equal(result.scenarioPhase,'dao-save');
  }
  for(const frameUrl of [origin+'/academy',origin+'/fr/academy',origin+'/en/academy?PRIVATE',origin+'/en/academy#PRIVATE','https://example.test/en/academy','about:blank',()=>{throw Error('PRIVATE')},null]) {
    const result=details('/api/app/bootstrap',{frameUrl});assert.equal(result.framePageAtBlock,'unclassified');assert.doesNotMatch(JSON.stringify(result),/PRIVATE/);
  }
  const bad=details('/api/app/bootstrap',{resourceType:'PRIVATE',navigation:'PRIVATE'},'PRIVATE');
  assert.equal(bad.scenarioPhase,'unclassified');assert.equal(bad.resourceType,'unclassified');assert.equal(bad.navigation,false);
});

test('all diagnostic additions erase to the exact current browser-script preimage', () => {
  let script=read('scripts/verify-contact-channel-chooser-browser.mjs');
  assert.match(script,/requestPhase = "dao-save";\s*await submit\.click\(\)/);
  assert.match(script,/await saved\.waitFor\([^\n]+\);\s*requestPhase = "dao-receipt"/);
  assert.match(script,/assert\.deepEqual\(blocked,\[\],'No real API\/write\/provider operation attempted outside the exact synthetic enquiry'\)/);
  assert.match(script,/return route\.abort\('blockedbyclient'\)/);
  // Failure-only branch diagnostics preserve the independently reviewed denial policy.
  script=script.replace('import { createAnonymousAcademyBootstrapFixture, appendBootstrapFixtureFailure }','import { createAnonymousAcademyBootstrapFixture }')
    .replace('const fixtureFailures = [];\n','')
    .replace('          try {\n          appendBootstrapFixtureFailure(fixtureFailures,bootstrapFixture,blocked,requestPhase);\n          } catch { /* Diagnostics cannot replace either original final assertion. */ }\n','')
    .replace('results,errors,fixtureFailures,failure:','results,errors,failure:')
    .replace('  try {\n  await writeFile(', '  await writeFile(')
    .replace('\n  } catch { if (!failure) failure = new Error("CONTACT_DIAGNOSTIC_WRITE_FAILED"); }','')
    .replace('try { console.log("PASS browser messenger handoff on Chromium and WebKit",results.length); } catch { throw new Error("CONTACT_DIAGNOSTIC_LOG_FAILED"); }','console.log("PASS browser messenger handoff on Chromium and WebKit",results.length);');
  // Separately reviewed denial fixture is removed explicitly, not mistaken for a diagnostic allowance.
  script=script.replace('import { createAnonymousAcademyBootstrapFixture } from "./helpers/anonymous-bootstrap-fixture.mjs";\n','')
    .replace('        const bootstrapFixture = createAnonymousAcademyBootstrapFixture(origin, locale);\n','')
    .replace('          if (await bootstrapFixture.tryFulfill(route, requestPhase)) return;\n','')
    .replace("          assert.equal(bootstrapFixture.denials,1,'Exactly one observed anonymous Academy probe receives the explicit auth denial');\n",'')
  script=script.replace('import { blockedApiDetails } from "./helpers/contact-request-diagnostics.mjs";\n\n','')
    .replace('        let requestPhase = "setup";\n','')
    .replace(/,\n              \.\.\.\(url\.pathname\.startsWith\('\/api\/'\) \? blockedApiDetails\([^\n]+ : \{\}\)/,'')
    .replace(/,phase:"(?:tantra|yggdrasil|academy)"/g,'')
    .replace(/^            requestPhase = (?:item\.phase|"(?:dao-entry|dao-save|dao-receipt|temple)");\n/gm,'');
  const bytes=Buffer.from(script);const hash=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  assert.equal(hash,'b8eefb67657bdf8fa65d71f8b7696170648db8d3');
});

test('actual Academy effect can initiate bootstrap on mount and pageshow, never owner reads after a denied bootstrap', async () => {
  const source=read('components/academy-my-courses.tsx');
  assert.match(source,/if \(!boot\?\.account\?\.id \|\| boot\.account\.onboardingState !== 'active'\) return/);
  for(const locale of ['en','ru','es']) {
    const callbacks=[],events=new Map(),reads=[],snapshots=[];
    const react={useEffect:fn=>callbacks.push(fn),useState:()=>[null,value=>snapshots.push(value)]};
    const imports={'react':react,'next/image':{default:'img'},'next/link':{default:'a'},'lucide-react':{},'react/jsx-runtime':{},
      '@/lib/app/client-fetch':{appFetch:async(...args)=>{reads.push(args);throw Error('SYNTHETIC_DENIED')}},
      '@/lib/inner-growth/course-presets':{getCoursePreset:()=>null},'@/data/academy/energywork-ai-schema':{energyworkSequence:()=>[],energyworkLessonRanges:()=>[]},'./academy-my-courses.module.css':{default:{}}};
    const env={exports:{},require:name=>{assert.ok(Object.hasOwn(imports,name),name);return imports[name]},AbortController,
      document:{visibilityState:'visible',addEventListener:()=>{},removeEventListener:()=>{}},window:{addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:()=>{}}};
    runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,env);
    assert.equal(env.exports.AcademyMyCourses({locale}),null);assert.equal(callbacks.length,1);
    const cleanup=callbacks[0]();await Promise.resolve();await Promise.resolve();
    assert.equal(reads.length,1);assert.equal(reads[0][0],'bootstrap');assert.equal(reads[0][2],'GET');
    events.get('pageshow')();await Promise.resolve();await Promise.resolve();
    assert.equal(reads.length,2);assert.ok(reads.every(args=>args[0]==='bootstrap'));assert.ok(snapshots.every(value=>value===null));
    cleanup();
  }
});

test('actual client-fetch maps bootstrap to its exact first-party GET and rejects denied responses', async () => {
  const reads=[];const env={exports:{},fetch:async(url,options)=>{reads.push({url,options});return{ok:false,status:401,json:async()=>({error:'AUTH_REQUIRED'})}}};
  runInNewContext(ts.transpileModule(read('lib/app/client-fetch.js'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,env);
  await assert.rejects(env.exports.appFetch('bootstrap',undefined,'GET'),e=>e.status===401&&e.code==='AUTH_REQUIRED');
  assert.equal(reads.length,1);assert.equal(reads[0].url,'/api/app/bootstrap');assert.equal(reads[0].options.method,'GET');
  assert.equal(reads[0].options.credentials,'same-origin');assert.equal(reads[0].options.body,undefined);
});
