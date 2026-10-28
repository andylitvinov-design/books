import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { publicJourneyRequestDiagnostic, publicJourneyRequestDecision, installPublicJourneyFence } from '../scripts/helpers/public-journey-verifier.mjs'
const origin='http://127.0.0.1:3100'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const fixtures=[['/holistic-house-icon/192','public-app-icon-192'],['/holistic-house-icon/512','public-app-icon-512'],['/course-icon/192','public-course-icon-192'],['/course-icon/512','public-course-icon-512'],['/opora-course-icon/192','public-opora-course-icon-192'],['/opora-course-icon/512','public-opora-course-icon-512']]
function initial(source,name){let node;const visit=n=>{if(ts.isVariableDeclaration(n)&&n.name.getText()===name)node=n.initializer;ts.forEachChild(n,visit)};visit(ts.createSourceFile('source.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX));assert.ok(node);return node.getText()}
const request=url=>({url,method:'GET',body:'',navigation:false,resourceType:'image',prefetch:false,prefetchSignals:{purposePrefetch:false,nextRouterPrefetch:false,rsc:false}})
const diag=(url,decision='unplanned-route')=>publicJourneyRequestDiagnostic(request(url),decision,origin)

test('six icon IDs are exact source-backed sizes, not generic icon or image permissions',()=>{
  const map=vm.runInNewContext('('+initial(read('scripts/helpers/public-journey-verifier.mjs'),'diagnosticGeneratedIconPaths')+')',Object.create(null),{timeout:1000})
  assert.deepEqual(Array.from(map,pair=>Array.from(pair)),fixtures)
  for(const [family,variable] of [['course-icon','value'],['opora-course-icon','requested'],['holistic-house-icon','requested']]){
    const expression=initial(read('app/'+family+'/[size]/route.js'),'size')
    for(const size of ['192','512'])assert.equal(vm.runInNewContext('('+expression+')',{[variable]:size},{timeout:1000}),Number(size))
    for(const size of ['191','513','PRIVATE_SIZE'])assert.ok(!vm.runInNewContext('('+expression+')',{[variable]:size},{timeout:1000}))
  }
  for(const [path,id] of fixtures){
    const result=diag(origin+path);assert.equal(result.sourceId,id);assert.equal(result.routeShape,'unclassified');assert.equal(result.path,'[redacted]')
    assert.equal(publicJourneyRequestDecision(request(origin+path),origin),'unplanned-route')
    for(const suffix of ['/','/private'])assert.equal(diag(origin+path+suffix).sourceId,'unclassified')
  }
})

test('media shape is separate from source identity and never reveals route parameters or permits proxy access',()=>{
  const source=read('app/media/[series]/[file]/route.ts')
  assert.match(source,/const \{ series, file \} = await params/)
  assert.match(source,/getRemoteMediaResponse\(series, file, revision\)/);assert.match(source,/status: 307/)
  for(const path of ['/media/PRIVATE_SERIES/PRIVATE_FILE','/media/PRIVATE_SERIES/PRIVATE_FILE.png','/media/PRIVATE_SERIES/PRIVATE_FILE?private=PRIVATE_QUERY']){
    const result=diag(origin+path)
    assert.equal(result.routeShape,'media-two-segment-route');assert.equal(result.sourceId,'unclassified');assert.equal(result.path,'[redacted]')
    assert.equal(publicJourneyRequestDecision(request(origin+path),origin),'unplanned-route')
    assert.doesNotMatch(JSON.stringify(result),/PRIVATE|\/media\/|\.png|private=/)
  }
  for(const path of ['/media','/media/one','/media/one/two/three','/media//two','/media/one/two/','/unknown/PRIVATE_FILE.png','/course-icon/191']){
    const result=diag(origin+path);assert.equal(result.routeShape,'unclassified');assert.equal(result.sourceId,'unclassified')
  }
})

test('cross-origin, credentials, fragments and private-text cannot inherit safe-looking identity or shape',()=>{
  for(const path of [...fixtures.map(([path])=>path),'/media/PRIVATE_SERIES/PRIVATE_FILE']){
    for(const url of ['https://foreign.invalid'+path,'http://user:password@127.0.0.1:3100'+path,origin+path+'#PRIVATE_FRAGMENT']){
      const result=diag(url);assert.equal(result.routeShape,'unclassified');assert.equal(result.sourceId,'unclassified')
      assert.ok(['http','https'].includes(result.urlScheme))
      assert.doesNotMatch(JSON.stringify({...result,urlScheme:undefined}),/PRIVATE|foreign|password|user|http/)
    }
    assert.equal(publicJourneyRequestDiagnostic(request(origin+path),'unplanned-route').routeShape,'unclassified','Missing trusted loopback origin cannot classify a route')
    const result=diag(origin+path+'?private=PRIVATE_QUERY','private-text')
    assert.equal(result.routeShape,'redacted');assert.equal(result.sourceId,'redacted');assert.equal(result.path,'[redacted]');assert.equal(result.queryShape,'redacted')
    assert.doesNotMatch(JSON.stringify(result),/PRIVATE|private=/)
  }
})

test('image and media classifications preserve aborts, fatal counts, external separation and20-sample bound',async()=>{
  let callback;const actions=[]
  const fence=await installPublicJourneyFence({route:async(_,fn)=>{callback=fn}},origin,['PRIVATE_INPUT'])
  const send=async url=>callback({request:()=>({url:()=>url,method:()=> 'GET',postData:()=>'',isNavigationRequest:()=>false,resourceType:()=> 'image',headers:()=>({})}),
    continue:async()=>assert.fail('passive label must not permit a request'),fulfill:async()=>assert.fail('no fabricated response'),abort:async()=>actions.push('abort')})
  for(const [path] of fixtures)await send(origin+path)
  await send(origin+'/media/PRIVATE_INPUT/private')
  for(let i=0;i<25;i++)await send(origin+'/media/PRIVATE_SERIES_'+i+'/PRIVATE_FILE_'+i+'.png')
  await send('https://foreign.invalid/media/PRIVATE_SERIES/PRIVATE_FILE.png')
  const summary=fence.summary();assert.equal(actions.length,33);assert.equal(summary.violations.length,32);assert.equal(summary.blockedExternalResources,1);assert.equal(summary.anonymousTalismanReads,0)
  assert.equal(summary.requestDiagnostics.length,20);assert.equal(summary.requestDiagnostics[6].routeShape,'redacted')
  assert.ok(summary.requestDiagnostics.slice(7).every(item=>item.sourceId==='unclassified'&&item.routeShape==='media-two-segment-route'))
  assert.doesNotMatch(JSON.stringify(summary),/PRIVATE|\/media\/|foreign|\.png/)
  assert.throws(()=>fence.assertNoSideEffects('unknown remains fatal'),/no private-text, API, write or external navigation/)
})
