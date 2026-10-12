// Actual reviewed dormant transport, enabled only in an isolated minimal app.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,symlinkSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {spawnSync,execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url),root=fileURLToPath(new URL('../',import.meta.url));
const output=join(root,'artifacts/ga4-bfcache-proof');mkdirSync(output,{recursive:true});
const source=path=>readFileSync(join(root,path),'utf8');
assert.match(source('lib/public-analytics.ts'),/PUBLIC_ANALYTICS_AVAILABLE = false;/);
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const clean=()=>git('status','--porcelain','--untracked-files=all','--','.',':(exclude)artifacts/**');
assert.equal(clean(),'','exact clean checkout required');
const fixture=mkdtempSync(join(tmpdir(),'hh-ga4-bfcache-'));
const put=(path,body)=>{mkdirSync(dirname(join(fixture,path)),{recursive:true});writeFileSync(join(fixture,path),body);};
symlinkSync(resolve(root,'node_modules'),join(fixture,'node_modules'),'dir');
const prefix='tests/fixtures/ga4-bfcache-transport',hashes=JSON.parse(source(prefix+'/source-manifest.json'));
assert.equal(Object.keys(hashes).length,3);
for(const [path,hash]of Object.entries(hashes)){
 const body=source(prefix+'/'+path+'.source');assert.equal(createHash('sha256').update(body).digest('hex'),hash,'exact reviewed transport snapshot');put(path,body);
}
const policyPaths=['middleware.ts','lib/canonical-redirect.js','data/site-metadata.js','components/csp-navigation-boundary.tsx','lib/csp-prehydration.js','lib/native/client.ts'];
const policyHashes={};for(const path of policyPaths){const body=source(path);put(path,body);policyHashes[path]=createHash('sha256').update(body).digest('hex');}
const off=readFileSync(join(fixture,'lib/public-analytics.ts'),'utf8');assert.equal(off.split('PUBLIC_ANALYTICS_AVAILABLE = false;').length,2);
put('lib/public-analytics.ts',off.replace('PUBLIC_ANALYTICS_AVAILABLE = false;','PUBLIC_ANALYTICS_AVAILABLE = true;'));
put('package.json',JSON.stringify({name:'ga4-isolated-bfcache-proof',private:true,type:'module'}));
put('next.config.mjs','export default {poweredByHeader:false};\n');
put('tsconfig.json',JSON.stringify({compilerOptions:{target:'ES2017',lib:['dom','dom.iterable','esnext'],strict:true,noEmit:true,module:'esnext',moduleResolution:'bundler',allowJs:true,checkJs:false,jsx:'preserve',esModuleInterop:true,resolveJsonModule:true,isolatedModules:true,skipLibCheck:true,plugins:[{name:'next'}],paths:{'@/*':['./*']}},include:['next-env.d.ts','**/*.ts','**/*.tsx','.next/types/**/*.ts'],exclude:['node_modules']}));
for(const group of ['public','private'])put('app/('+group+')/layout.tsx',`import {headers} from 'next/headers';
import {AnalyticsConsent} from '@/components/analytics-consent';
import {CspNavigationBoundary} from '@/components/csp-navigation-boundary';
import {CSP_PREHYDRATION_SCRIPT} from '@/lib/csp-prehydration';
${group==='public'?"import {Ga4Analytics} from '@/components/ga4-analytics';":''}
export default async function Layout({children}:{children:React.ReactNode}){const h=await headers();const nonce=h.get('x-nonce')??undefined;const cspClass=h.get('x-csp-class')??'restricted';return <html lang="en"><head><script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{__html:CSP_PREHYDRATION_SCRIPT}}/></head><body data-csp-class={cspClass}><CspNavigationBoundary/>${group==='public'?'<Ga4Analytics nonce={nonce}/>':''}{children}<AnalyticsConsent/></body></html>;}`);
put('components/controls.tsx',`"use client";
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {AnalyticsPreferences} from '@/components/analytics-consent';
import {emitPublicAnalyticsEvent} from '@/lib/public-analytics';
export function Controls(){const router=useRouter();const[draft,setDraft]=useState('');
useEffect(()=>{document.documentElement.dataset.ga4FixtureReady='true';},[]);
return <main><h1>Synthetic BFCache consent proof</h1><AnalyticsPreferences/><label>Ephemeral draft<input id="ga4-draft" value={draft} onChange={event=>setDraft(event.target.value)}/></label>
<button id="ga4-push" onClick={()=>router.push('/en/app/ga4-proof-only?secret=SYNTHETIC_PRIVATE_QUERY')}>Private document</button>
<button onClick={()=>emitPublicAnalyticsEvent('free_situation_assessment_click')}>Synthetic acquisition</button></main>;
}`);
for(const path of ['app/(public)/page.tsx','app/(public)/privacy/page.tsx','app/(public)/privacy/ga4-proof-only/page.tsx','app/(private)/en/app/ga4-proof-only/page.tsx'])put(path,"import {Controls} from '@/components/controls';export default function Page(){return <Controls/>;}");
// Raw cat-file retains parent headers even in actions/checkout's depth-1 clone.
const parents=git('cat-file','-p','HEAD').split('\n\n')[0].split('\n').filter(line=>line.startsWith('parent ')).map(line=>line.slice(7));
writeFileSync(join(output,'provenance.json'),JSON.stringify({commit:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),parents,fixtureOnly:true,productionAvailability:false,hashes,next:require('next/package.json').version,react:require('react/package.json').version,policyHashes,policyPreserved:['middleware/CSP/referrer headers','CSP navigation and prehydration','async nonce root uses headers()'],excludedScope:['full application routes and UI','actual native platform','PWA/service workers']},null,2));
const env={PATH:process.env.PATH,HOME:tmpdir(),NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_GA_MEASUREMENT_ID:'G-3WX7PDD52N',NODE_OPTIONS:'--max-old-space-size=512',CIRCLE_NODE_TOTAL:'2'};
const built=spawnSync(process.execPath,[require.resolve('next/dist/bin/next'),'build'],{cwd:fixture,env,encoding:'utf8',timeout:300000,maxBuffer:20*1024*1024});
writeFileSync(join(output,'build.log'),(built.stdout||'')+(built.stderr||''));assert.equal(built.status,0,'minimal transport fixture builds');
const compiled=JSON.parse(readFileSync(join(fixture,'.next/server/app-paths-manifest.json'),'utf8'));
for(const route of ['/(public)/privacy/ga4-proof-only/page','/(private)/en/app/ga4-proof-only/page'])assert.ok(compiled[route],'synthetic page must be a compiled route: '+route);
writeFileSync(join(output,'compiled-route-manifest.json'),JSON.stringify(compiled,null,2));
assert.match(source('lib/public-analytics.ts'),/PUBLIC_ANALYTICS_AVAILABLE = false;/);assert.equal(clean(),'','source remains exact and disabled');
writeFileSync(join(output,'fixture-path.txt'),fixture+'\n');
