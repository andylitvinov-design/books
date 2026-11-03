import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('../scripts/verify-relationships-assessments.mjs',import.meta.url),'utf8');
const helper=source.slice(source.indexOf('async function downloadAccountReport('),source.indexOf('async function publicTopicButton('));
async function run({locale='ru',count=1,visible=true,enabled=true,clickError=false,downloadError=false}={}){
 const events=[],file={kind:'actual-download'};
 const action={async click(){events.push('click');if(clickError)throw new Error('click failed')}};
 const page={getByRole(role,options){assert.equal(role,'button');assert.deepEqual(options,{name:locale==='ru'?'Скачать отчёт':'Download report',exact:true});return action},waitForEvent(event,options){assert.equal(event,'download');assert.deepEqual(options,{timeout:60000});events.push('wait');return downloadError?Promise.reject(new Error('download failed')):Promise.resolve(file)}};
 const expect=actual=>{assert.equal(actual,action);return{async toHaveCount(n){assert.equal(count,n)},async toBeVisible(){assert.ok(visible)},async toBeEnabled(){assert.ok(enabled)}}};
 const navigationMarker=(actual,event)=>{assert.equal(actual,page);events.push(event)};
 try{const value=await new Function('expect','navigationMarker',`${helper};return downloadAccountReport`)(expect,navigationMarker)(page,locale);assert.equal(value,file);assert.deepEqual(events,['before-report-download','wait','click','report-download-received']);return events}
 catch(error){if(clickError||downloadError)assert.ok(events.includes('report-download-failed'));throw error}
}
test('actual account PDF helper waits for unique ready localized action and observes click/download together',async()=>{await run();await run({locale:'en'})});
for(const [name,input]of Object.entries({missing:{count:0},duplicate:{count:2},hidden:{visible:false},disabled:{enabled:false},clickFailure:{clickError:true},downloadFailure:{downloadError:true},bothFailures:{clickError:true,downloadError:true}}))test(`PDF helper rejects ${name}`,async()=>{await assert.rejects(run(input))});
test('PDF and failure evidence requirements are retained',()=>{
 assert.match(source,/const file=await downloadAccountReport\(page,locale\),bytes=await readFile\(await file\.path\(\)\)/);
 assert.match(source,/bytes\.subarray\(0,8\)\.toString\(\),'%PDF-1\.4'/);
 assert.match(source,/assert\.ok\(bytes\.length>12000\)/);
 assert.match(source,/path:output\+'\/failure\.png'/);
 assert.match(source,/output\+'\/navigation-diagnostics\.json'/);
});
